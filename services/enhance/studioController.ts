// StudioController — the single object App holds to drive Studio Mode.
//
// Responsibilities:
//   - analyze(video):  scene classify + auto-levels + before score (run once on upload)
//   - processFrame():  per-frame WebGL enhance -> returns drawable for the renderer
//   - afterScore():    score the enhanced output for the before/after readout
//
// Designed to be cheap per frame (only the GL pass + an occasional face refresh)
// and totally fault tolerant: if anything fails, processFrame returns null and
// the renderer draws the raw <video> instead.
import { EnhancementEngine } from './EnhancementEngine';
import { classifyScene } from './SceneClassifier';
import { presetFor } from './presets';
import { scoreFrame } from './qualityScore';
import { detectFaceRegion, ensureFaceDetector } from './faceRegion';
import { EnhanceParams, FaceRegion, QualityResult, SceneType } from './types';

export interface StudioAnalysis {
  scene: SceneType;
  params: EnhanceParams;
  before: QualityResult | null;
  supported: boolean;
}

const FACE_REFRESH_MS = 110; // re-detect ~9x/sec; the rect is EMA-smoothed between

/** Exponential moving average of a face rect (a = blend toward `b`). */
function emaFace(a: FaceRegion, b: FaceRegion, alpha: number): FaceRegion {
  return {
    cx: a.cx + (b.cx - a.cx) * alpha,
    cy: a.cy + (b.cy - a.cy) * alpha,
    rx: a.rx + (b.rx - a.rx) * alpha,
    ry: a.ry + (b.ry - a.ry) * alpha,
  };
}

export class StudioController {
  private engine = new EnhancementEngine();
  private params: EnhanceParams | null = null;
  /** The AI auto-computed baseline (scene preset + auto-levels) for "reset". */
  private autoBaseline: EnhanceParams | null = null;
  private scene: SceneType = 'generic';
  private lastFaceTs = 0;
  private faceClock = 0;
  private analyzing = false;
  private analyzeToken = 0;
  // Temporally-stabilized face rect: `faceTarget` is the (EMA-smoothed) detection,
  // `faceCurrent` is interpolated toward it EVERY frame so the enhanced ellipse
  // never pops or jitters (was a flicker source). See processFrame.
  private faceTarget: FaceRegion | null = null;
  private faceCurrent: FaceRegion | null = null;
  private lastTimeSec = -1;

  isSupported(): boolean {
    return this.engine.isSupported();
  }

  /** 'webgl' (full) or '2d' (global-filter fallback) or 'none'. */
  getMode(): 'webgl' | '2d' | 'none' {
    return this.engine.getMode();
  }

  /** Precise path for diagnostics: 'webgl2' | 'webgl1' | '2d' | 'none'. */
  getGlInfo(): string {
    return this.engine.getGlInfo();
  }

  getScene(): SceneType {
    return this.scene;
  }

  /**
   * Analyze a freshly loaded clip. Always resolves. The returned token guards
   * against a stale analyze finishing after a newer upload (re-upload race).
   */
  async analyze(video: HTMLVideoElement): Promise<StudioAnalysis> {
    const token = ++this.analyzeToken;
    this.analyzing = true;
    // Fresh clip → clear temporal denoise history + face-rect smoothing state.
    this.engine.resetTemporal();
    this.faceTarget = null;
    this.faceCurrent = null;
    this.lastTimeSec = -1;

    const srcW = video.videoWidth || 0;
    const srcH = video.videoHeight || 0;

    // Before score from the raw frame.
    const before = srcW && srcH ? scoreFrame(video, srcW, srcH) : null;

    // Auto-levels from the actual pixels.
    if (srcW && srcH) this.engine.analyze(video, srcW, srcH);

    // Set usable params IMMEDIATELY from a generic preset + auto-levels, so the
    // enhancement works the instant the user taps Apply — it must never wait on
    // (or be left null by) the network scene-classify below.
    this.params = this.engine.applyAutoLevels(presetFor('generic'));
    this.autoBaseline = { ...this.params };

    // Warm the face detector (non-blocking for the rest).
    ensureFaceDetector().catch(() => {});

    // Scene classification (network; may take a few seconds, may fail -> generic).
    const scene = await classifyScene(video);

    // If a newer analyze started, drop this result (params from the generic
    // baseline above already stand for the current clip).
    if (token !== this.analyzeToken) {
      return { scene, params: this.params, before, supported: this.engine.isSupported() };
    }

    this.scene = scene;
    this.params = this.engine.applyAutoLevels(presetFor(scene));
    this.autoBaseline = { ...this.params };
    this.analyzing = false;

    return { scene, params: this.params, before, supported: this.engine.isSupported() };
  }

  isAnalyzing(): boolean {
    return this.analyzing;
  }

  /** Current resolved params (after analyze). Null before first analyze. */
  getParams(): EnhanceParams | null {
    return this.params;
  }

  /** Allow the UI to set params directly (manual slider adjustments). */
  setParams(p: EnhanceParams) {
    this.params = p;
  }

  /** Reset manual adjustments back to the AI auto-computed baseline. */
  resetToAuto(): EnhanceParams | null {
    if (this.autoBaseline) this.params = { ...this.autoBaseline };
    return this.params;
  }

  /**
   * Enhance one frame. Returns the offscreen canvas to draw, or null to signal
   * "draw the raw video" (unsupported, not analyzed yet, or this frame failed).
   */
  processFrame(video: HTMLVideoElement, timeSec: number): CanvasImageSource | null {
    if (!this.params || !this.engine.isSupported()) return null;
    const srcW = video.videoWidth || 0;
    const srcH = video.videoHeight || 0;
    if (!srcW || !srcH) return null;

    // Seek / scene-cut detection → drop temporal-denoise history so we don't ghost
    // across a cut, and snap the face rect instead of lerping across the jump.
    let seeked = false;
    if (this.lastTimeSec >= 0 && Math.abs(timeSec - this.lastTimeSec) > 0.4) {
      this.engine.resetTemporal();
      seeked = true;
    }
    this.lastTimeSec = timeSec;

    // Re-detect the face ~9x/sec and EMA-smooth it into `faceTarget`. Monotonic
    // clock for the MediaPipe timestamp (video.currentTime can jump backward).
    const wall = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (wall - this.lastFaceTs >= FACE_REFRESH_MS || this.lastFaceTs === 0) {
      this.faceClock = Math.max(this.faceClock + 1, Math.round(wall));
      this.lastFaceTs = wall;
      const det = detectFaceRegion(video, this.faceClock);
      if (det) {
        const t = this.faceTarget;
        // Snap on a big jump (new person / fast move), else EMA toward detection.
        const jump = !t || seeked || Math.abs(det.cx - t.cx) + Math.abs(det.cy - t.cy) > 0.18;
        this.faceTarget = jump ? det : emaFace(t!, det, 0.35);
      }
    }

    // Interpolate the APPLIED rect toward the target EVERY frame so the enhanced
    // ellipse glides smoothly instead of stepping at the detection cadence.
    if (this.faceTarget) {
      if (!this.faceCurrent || seeked) this.faceCurrent = this.faceTarget;
      else this.faceCurrent = emaFace(this.faceCurrent, this.faceTarget, 0.4);
      this.params = { ...this.params, face: this.faceCurrent };
    }

    const ok = this.engine.process(video, srcW, srcH, this.params);
    return ok ? this.engine.output : null;
  }

  /** Score the currently-enhanced output (for the "after" readout). */
  afterScore(video: HTMLVideoElement, timeSec: number): QualityResult | null {
    const out = this.processFrame(video, timeSec);
    if (!out) return null;
    return scoreFrame(out, video.videoWidth || 1, video.videoHeight || 1);
  }

  /**
   * Score the LAST already-rendered enhanced frame WITHOUT re-running the whole
   * pipeline. Use after a drawFrame() so a slider drag doesn't double-process.
   */
  scoreOutput(srcW: number, srcH: number): QualityResult | null {
    if (!this.params || !this.engine.isSupported()) return null;
    return scoreFrame(this.engine.output, srcW || 1, srcH || 1);
  }

  dispose() {
    this.engine.dispose();
  }
}
