/**
 * Typography Canvas Renderer
 *
 * Renders word-by-word animations to a 2D canvas.
 * Handles 30 FPS animation, text layout, effects, and audio sync.
 *
 * Performance optimized:
 * - RequestAnimationFrame for smooth 60 FPS capable
 * - Offscreen canvas for text measurement
 * - Minimal state mutations
 */

import type {
  AnimationSequence,
  LayoutConfiguration,
  RenderMetrics,
  SegmentEmotion,
  WordAnimation,
} from './types';

import { animatedIconService } from './animatedIconService';
import { animatedEmojiService } from './animatedEmojiService';
import { TypographyReelImageIntegrator } from '../imageAssets';
import type { TypographyReelImageIntegration } from '../imageAssets';

// ─── Composition primitives ──────────────────────────────────────────────────

/** Direction a word travels in FROM during its entry animation. */
export type EntryDirection = 'top' | 'bottom' | 'left' | 'right' | 'fade' | 'pop';

/** Which side of the word an accompanying icon/emoji is placed on. */
export type IconSide = 'right' | 'left' | 'top';

/**
 * Per-word composition plan produced by the layout composer (renderPhraseStack)
 * and consumed by renderWordAnimation. Carries position, entry motion, relative
 * size and icon placement so a phrase reads like a designed layout, not a stack.
 */
export interface SlotPlan {
  x: number;                    // horizontal offset from canvas centre (px, pre-scale handled by caller)
  y: number;                    // vertical offset from canvas centre (px)
  sizeBoost?: number;           // multiplies rendered scale (hero focus); default 1
  entryDirection?: EntryDirection;
  iconSide?: IconSide;
  colorOverride?: string;       // per-word color (secondary accent / connective tint)
  rotation?: number;            // radians — subtle tilt for script accents
  emotion?: SegmentEmotion;     // sentence emotion — drives animated icon selection
  is3D?: boolean;               // true → render with 3D extrusion (the phrase hero only)
}

// Re-export from pure module so callers can import from one place
export { deterministicNoise } from './deterministicNoise';
import { deterministicNoise } from './deterministicNoise';

// ─── Renderer Class ────────────────────────────────────────────────────────

export class TypographyRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  sequence: AnimationSequence;
  layout: LayoutConfiguration;

  // Image assets (optional, loaded from backend API)
  imageAssets: TypographyReelImageIntegration[] = [];
  imageBitmaps: Map<string, ImageBitmap> = new Map();
  selectedImageId: string | null = null;
  selectedWordId: string | null = null;

  // Performance tracking
  frameCount = 0;
  lastFrameTime = 0;
  fps = 0;
  droppedFrames = 0;
  consecutiveDroppedFrames = 0;
  lastDropWarningTime = 0;
  lastHealthCheckFrame = 0;
  private prevMemoryMB = 0;

  // Audio playback clock interpolation
  private lastAudioTime = -1;
  private lastAudioSystemTime = 0;
  private interpolatedTime = 0;

  // Exact word-level sync: text appears precisely when the word is spoken.
  // A non-zero lead made words fire ahead of the audio; for word-by-word
  // typography the viewer reads the word AS it is heard, so the offset is 0.
  // (Kept as a named constant so it can be tuned per-style if ever needed.)
  private static readonly ANTICIPATION_OFFSET_SEC = 0.0;

  // Metrics
  metrics: RenderMetrics = {
    fps: 60,
    frameTime: 16.67,
    droppedFrames: 0,
    memoryUsageMB: 0,
  };

  // Offscreen canvas for text measurement
  private measureCanvas: HTMLCanvasElement;

  private noisePattern: CanvasPattern | null = null;
  private lastActiveWordId: string | null = null;
  // Linger/hold state
  private lastRenderedIdx = -1;
  private lastRenderedEnd = 0;
  // Reduced to just the exit animation window — longer lingers caused old phrases
  // to hold frozen on-screen until the new phrase started (visual overlap).
  private static readonly LINGER_HOLD_SEC = 0.17; // one exit-animation window only
  // Slate-wipe state — enforces a clean blank screen between phrase blocks.
  private lastActivePhraseStartIdx = -1;
  private slateWipeUntil = 0; // playbackTime before which new phrase is blocked
  private static readonly SLATE_WIPE_SEC = 0.1; // ~3 frames blank between phrases
  private emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu;

  /**
   * Pre-computed phrase groups for stacking layout.
   * Each group = consecutive words < 0.4s apart, max 4 words.
   */
  private phraseGroups: Array<{ startIdx: number; endIdx: number }> = [];

  /**
   * Bounded LRU cache for canvas measureText results.
   * Key: `${ctx.font}|${displayText}` → width in px.
   *
   * Calling measureText every frame for every word is O(n·fps) and forces a
   * font engine round-trip each time. With 4 words per phrase at 30fps that's
   * 120 font measurements per second for data that only changes when the font
   * string or text changes — which for a given word animation is never.
   *
   * Cap at 512 entries to bound memory; evict the oldest on overflow.
   */
  private readonly textWidthCache = new Map<string, number>();
  private static readonly TEXT_CACHE_MAX = 512;

  private measureTextCached(text: string): number {
    const key = `${this.ctx.font}|${text}`;
    const cached = this.textWidthCache.get(key);
    if (cached !== undefined) return cached;
    const width = this.ctx.measureText(text).width;
    if (this.textWidthCache.size >= TypographyRenderer.TEXT_CACHE_MAX) {
      // Evict oldest entry (Map iteration order = insertion order)
      this.textWidthCache.delete(this.textWidthCache.keys().next().value!);
    }
    this.textWidthCache.set(key, width);
    return width;
  }

  get scaleFactor(): number {
    return Math.min(this.layout.width / 1080, this.layout.height / 1920);
  }

  constructor(
    canvasElement: HTMLCanvasElement,
    sequence: AnimationSequence
  ) {
    this.canvas = canvasElement;
    const ctx = canvasElement.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.sequence = sequence;
    this.layout = sequence.layout;

    // Setup offscreen canvas for text measurement
    this.measureCanvas = document.createElement('canvas');
    this.measureCanvas.width = this.layout.width;
    this.measureCanvas.height = this.layout.height;

    // Set canvas size - DO NOT apply DPI scaling, let CSS handle it
    this.canvas.width = this.layout.width;
    this.canvas.height = this.layout.height;

    // Set CSS size to match
    this.canvas.style.width = `${this.layout.width}px`;
    this.canvas.style.height = `${this.layout.height}px`;

    // Generate texture noise pattern if configured
    if (this.layout.backgroundType === 'textured_solid') {
      const textureOpacity = this.layout.backgroundTextureOpacity !== undefined ? this.layout.backgroundTextureOpacity : 0.15;
      const noiseCanvas = this.generateNoisePattern(textureOpacity);
      if (noiseCanvas) {
        this.noisePattern = this.ctx.createPattern(noiseCanvas, 'repeat');
      }
    }

    // Initialize
    this.preloadFonts();
    this.computePhraseGroups(); // Pre-compute phrase groups for stacking
  }

  private generateNoisePattern(opacity: number): HTMLCanvasElement | null {
    const width = 256;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Seeded PRNG (mulberry32) so the grain is identical on every instance —
    // preview and exported video share the same texture (reproducible render).
    let s = 0x9e3779b9;
    const rand = () => {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    for (let i = 0; i < data.length; i += 4) {
      const noise = (rand() - 0.5) * 50; // deterministic offset around 0
      data[i] = 128 + noise;     // R
      data[i + 1] = 128 + noise;   // G
      data[i + 2] = 128 + noise;   // B
      data[i + 3] = opacity * 255; // Alpha
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  async loadImageAssets(assets: TypographyReelImageIntegration[]): Promise<void> {
    this.imageAssets = assets;
    this.imageBitmaps.clear();

    // Preload image bitmaps from blob URLs
    for (const asset of assets) {
      try {
        const response = await fetch(asset.blobUrl);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        this.imageBitmaps.set(asset.assetId, bitmap);
      } catch (err) {
        console.warn(`[typography] Failed to load image asset ${asset.assetId}:`, err);
      }
    }
  }

  // ─── Main Render Loop ──────────────────────────────────────────────────

  render(currentTime: number, audioElement?: HTMLAudioElement, onWordTrigger?: (word: WordAnimation) => void): void {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;

    // Track FPS
    if (deltaTime > 0) {
      this.fps = Math.round(1000 / deltaTime);
      this.metrics.fps = this.fps;
      this.metrics.frameTime = deltaTime;
    }
    this.lastFrameTime = now;
    this.frameCount++;

    // ─── Frame Drop Detection ──────────────────────────────────────────────
    // Line 100: Detect frame drops (30 FPS threshold = 33.3ms per frame)
    const FRAME_DROP_THRESHOLD_MS = 33.3;
    if (deltaTime > FRAME_DROP_THRESHOLD_MS) {
      this.droppedFrames++;
      this.consecutiveDroppedFrames++;

      // Line 105: Log warning to console for frame drops
      console.warn(
        `Frame drop: ${deltaTime.toFixed(1)}ms (${this.fps} FPS) - consider lowering quality`
      );

      // Line 109: Throttle warnings to avoid log spam (max 1 warning per 500ms)
      const now = performance.now();
      if (now - this.lastDropWarningTime > 500) {
        console.warn(
          `[Render Performance] Consistent frame drops detected. Device may struggle with current settings.`
        );
        this.lastDropWarningTime = now;
      }
    } else {
      // Reset consecutive counter on good frames
      this.consecutiveDroppedFrames = 0;
    }

    // Line 119: Track dropped frames in metrics
    this.metrics.droppedFrames = this.droppedFrames;

    // ─── Memory Tracking ───────────────────────────────────────────────────
    // Track memory usage every frame
    if (typeof (performance as any).memory !== 'undefined') {
      this.metrics.memoryUsageMB = (performance as any).memory.usedJSHeapSize / 1024 / 1024;

      // Warn if memory usage is high
      if (this.metrics.memoryUsageMB > 500) {
        console.warn(`[typography] High memory usage: ${this.metrics.memoryUsageMB.toFixed(1)} MB`);
      }

      // Memory spike detection (track previous frame's memory)
      const memoryIncrease = this.metrics.memoryUsageMB - this.prevMemoryMB;
      if (memoryIncrease > 50) {  // 50 MB increase is a spike
        console.warn(`[typography] Memory spike: +${memoryIncrease.toFixed(1)} MB`);
      }
      this.prevMemoryMB = this.metrics.memoryUsageMB;
    }

    // Log memory stats periodically (every second at 30 FPS = every 30 frames)
    if (this.frameCount % 30 === 0) {
      console.log(`[typography] Memory: ${this.metrics.memoryUsageMB.toFixed(1)} MB, FPS: ${this.fps}`);
    }

    // Line 130: Check frame health every 30 frames
    if (this.frameCount - this.lastHealthCheckFrame >= 30) {
      this.checkFrameHealth();
      this.lastHealthCheckFrame = this.frameCount;
    }

    // ── High-precision clock interpolation ──────────────────────────────────
    // HTML5 audio.currentTime only updates at ~4–10 Hz (browser throttled).
    // We interpolate between updates using performance.now() for sub-millisecond
    // accuracy, then apply a 50ms anticipation offset so text appears just as
    // the brain processes the incoming audio word.
    let playbackTime = currentTime / 1000;
    if (audioElement) {
      if (!audioElement.paused) {
        const sysNow = performance.now();
        // Detect new audio timestamp from the browser
        if (this.lastAudioTime !== audioElement.currentTime) {
          this.lastAudioTime = audioElement.currentTime;
          this.lastAudioSystemTime = sysNow;
          this.interpolatedTime = audioElement.currentTime;
        } else if (this.lastAudioSystemTime > 0) {
          // Interpolate: apply elapsed real-time since last audio tick
          const elapsed = (sysNow - this.lastAudioSystemTime) / 1000;
          const rate = audioElement.playbackRate || 1.0;
          this.interpolatedTime = this.lastAudioTime + elapsed * rate;
        } else {
          this.interpolatedTime = audioElement.currentTime;
        }
        // Apply anticipation offset: text leads audio by 50ms
        playbackTime = this.interpolatedTime + TypographyRenderer.ANTICIPATION_OFFSET_SEC;
      } else {
        // Paused/scrubbing — use direct audio time (no anticipation)
        this.lastAudioTime = -1;
        this.lastAudioSystemTime = 0;
        playbackTime = audioElement.currentTime;
      }
    }

    // Clear canvas with background color
    this.ctx.fillStyle = this.layout.backgroundColor || '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply texture overlay if configured
    if (this.noisePattern) {
      this.ctx.fillStyle = this.noisePattern;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.sequence.animations.length === 0) {
      return; // Nothing to render
    }

    // ── Find active animation ───────────────────────────────────────────────
    // Find the word whose time window contains the current playback time
    let activeIdx = -1;
    let activeAnimation: WordAnimation | null = null;

    for (let i = 0; i < this.sequence.animations.length; i++) {
      const anim = this.sequence.animations[i];
      const elapsed = playbackTime - anim.startTime;
      if (elapsed >= 0 && elapsed < anim.duration) {
        if (activeAnimation === null || anim.startTime > activeAnimation.startTime) {
          activeAnimation = anim;
          activeIdx = i;
        }
      }
    }

    // ── Phrase-stacking render ─────────────────────────────────────────────
    // Instead of replacing words one-by-one (teleprompter effect), we build
    // small phrase blocks on screen. Words in the same phrase stack vertically,
    // creating spatial dynamics and readable context before the screen clears.
    if (activeAnimation && activeIdx !== -1) {
      if (activeAnimation.wordId !== this.lastActiveWordId) {
        this.lastActiveWordId = activeAnimation.wordId;
        onWordTrigger?.(activeAnimation);
      }

      this.lastRenderedIdx = activeIdx;
      this.lastRenderedEnd = activeAnimation.startTime + activeAnimation.duration;

      const phrase = this.findPhraseForWord(activeIdx);
      const thisPhraseStart = phrase ? phrase.startIdx : activeIdx;

      // ── SLATE WIPE: detect phrase change → enforce blank-screen gap ───────
      // When the active phrase changes, block the new phrase from entering for
      // SLATE_WIPE_SEC so the old phrase's exit animation fully completes before
      // any new text appears. This prevents the "two phrases on screen" overlap.
      if (thisPhraseStart !== this.lastActivePhraseStartIdx) {
        if (this.lastActivePhraseStartIdx >= 0) {
          // Phrase boundary crossed — force a clean slate
          this.slateWipeUntil = playbackTime + TypographyRenderer.SLATE_WIPE_SEC;
        }
        this.lastActivePhraseStartIdx = thisPhraseStart;
      }

      // During slate wipe: render nothing (blank screen). The old phrase's
      // exit animation already ran via the gap-fill exit timing.
      if (playbackTime < this.slateWipeUntil) {
        // blank — do not render any phrase
      } else if (phrase && phrase.endIdx > phrase.startIdx) {
        this.renderPhraseStack(phrase, activeIdx, playbackTime);
      } else {
        this.renderWordAnimation(activeAnimation, playbackTime, 1.0, { x: 0, y: 0 });
      }
    } else if (
      this.lastRenderedIdx >= 0 &&
      playbackTime - this.lastRenderedEnd >= 0 &&
      playbackTime - this.lastRenderedEnd < TypographyRenderer.LINGER_HOLD_SEC
    ) {
      // Brief linger = exactly one exit-animation window after the phrase ends.
      // Keeps the phrase visible while it plays its slide-down exit — after which
      // the screen goes blank until the next phrase's slate-wipe window clears.
      const heldAnim = this.sequence.animations[this.lastRenderedIdx];
      if (heldAnim) {
        const holdTime = heldAnim.startTime + heldAnim.duration * 0.85;
        const phrase = this.findPhraseForWord(this.lastRenderedIdx);
        if (phrase && phrase.endIdx > phrase.startIdx) {
          this.renderPhraseStack(phrase, this.lastRenderedIdx, holdTime);
        } else {
          this.renderWordAnimation(heldAnim, holdTime, 1.0, { x: 0, y: 0 });
        }
      }
    } else {
      this.lastActiveWordId = null;
    }

    // Render image overlays if available
    if (this.imageAssets.length > 0) {
      this.renderImageOverlays(playbackTime);
    }

    // Draw watermark if configured
    if (this.layout.watermarkText) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.20; // 20% opacity
      this.ctx.font = `600 28px "Inter"`;
      this.ctx.fillStyle = this.layout.watermarkText.startsWith('#') || this.layout.backgroundColor === '#F5F2EB' ? '#1A1A1A' : '#FFFFFF';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText(this.layout.watermarkText, this.layout.width / 2, this.layout.height - 100);
      this.ctx.restore();
    }

    // Draw visual safe-zone corner anchor progress/badge at 25% opacity
    this.drawCornerAnchorBadge();

    // Persistent spatial anchor (bottom-left) — gives the empty background depth.
    // Driven by playbackTime (not wall-clock) so export frames are reproducible.
    this.drawSpatialAnchor(playbackTime);
  }

  private renderImageOverlays(playbackTime: number): void {
    for (const asset of this.imageAssets) {
      const bitmap = this.imageBitmaps.get(asset.assetId);
      if (!bitmap) continue;

      // Check if this image should be visible at this time
      if (playbackTime < asset.startTime || playbackTime > asset.endTime) {
        continue;
      }

      // Calculate opacity based on fade-in/fade-out
      let opacity = 1.0;
      const fadeInDuration = 0.2;
      const fadeOutDuration = 0.2;

      if (playbackTime < asset.startTime + fadeInDuration) {
        opacity = (playbackTime - asset.startTime) / fadeInDuration;
      } else if (playbackTime > asset.endTime - fadeOutDuration) {
        opacity = (asset.endTime - playbackTime) / fadeOutDuration;
      }

      // Get target position and size
      const { x, y, width, height, rotation, blendMode } = asset;

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
      this.ctx.globalCompositeOperation = (blendMode || 'normal') as GlobalCompositeOperation;

      // Apply rotation if specified
      if (rotation) {
        this.ctx.translate(x + width / 2, y + height / 2);
        this.ctx.rotate(rotation);
        this.ctx.translate(-(x + width / 2), -(y + height / 2));
      }

      // Draw the image
      this.ctx.drawImage(bitmap, x, y, width, height);
      this.ctx.restore();

      // Draw selection box if this image is selected
      if (asset.assetId === this.selectedImageId) {
        this.ctx.save();
        this.ctx.strokeStyle = '#A78BFA';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);
        this.ctx.strokeRect(x, y, width, height);

        // Draw corner handles
        const handleSize = 8;
        const handles = [
          [x, y],
          [x + width, y],
          [x, y + height],
          [x + width, y + height],
          [x + width / 2, y],
          [x, y + height / 2],
          [x + width / 2, y + height],
          [x + width, y + height / 2],
        ];

        this.ctx.fillStyle = '#A78BFA';
        for (const [hx, hy] of handles) {
          this.ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        }

        this.ctx.restore();
      }
    }
  }

  // ─── Word Animation Renderer ───────────────────────────────────────────

  private renderWordAnimation(
    anim: WordAnimation,
    currentTime: number,
    globalOpacity = 1.0,
    slot: SlotPlan = { x: 0, y: 0 },
    scaleMultiplier = 1.0
  ): void {
    const offset = { x: slot.x, y: slot.y };
    const sizeBoost = slot.sizeBoost ?? 1.0;
    const entryDirection: EntryDirection = slot.entryDirection ?? 'fade';
    const elapsed = currentTime - anim.startTime;

    // Calculate animation phase (entry, hold, exit)

    let animationProgress = 0;
    let phase: 'entry' | 'hold' | 'exit' = 'entry';

    if (elapsed < anim.timing.entryDuration) {
      animationProgress = elapsed / anim.timing.entryDuration;
      phase = 'entry';
    } else if (elapsed < anim.timing.entryDuration + anim.timing.holdDuration) {
      animationProgress = 1.0;
      phase = 'hold';
    } else {
      const exitStart = anim.timing.entryDuration + anim.timing.holdDuration;
      animationProgress = Math.max(
        0,
        1 - (elapsed - exitStart) / anim.timing.exitDuration
      );
      phase = 'exit';
    }

    // Apply easing
    const easedProgress = this.applyEasing(
      animationProgress,
      phase === 'entry' ? anim.timing.entryEasing : anim.timing.exitEasing
    );

    // Calculate visual properties (animation-type specific motion)
    const totalWordProgress = Math.max(0, Math.min(1, elapsed / anim.duration));
    const properties = this.calculateAnimationProperties(
      anim,
      easedProgress,
      totalWordProgress
    ) as any;

    // ── HYBRID ANIMATION ENGINE ───────────────────────────────────────────────
    // Replaces per-animation-type entry/exit with a unified professional system:
    //
    //  ENTRY  — spring pop: 0.30 → ~1.14 → 1.00  (punchEaseOut overshoot)
    //           opacity fast-ramp: 0 → 1 in first 40% of entry window
    //           + any horizontal/vertical offset from the animation type is kept
    //
    //  HOLD   — subtle breathing pulse (±1.5%) so text feels alive, not frozen
    //           scale drift removed (continuous grow looked mechanical)
    //
    //  EXIT   — smooth scale-fade: 1.00 → 0.88, opacity 1 → 0 (ease-in)
    //           No Y slide — scale-fade reads as "receding" without being jerky
    //
    // Animation-type switch cases still control X/Y movement during entry
    // (e.g. slide-left drifts from left; slide-up rises from below). The
    // hybrid engine then overrides scale+opacity so ALL types share the same
    // professional spring pop / clean scale-fade envelope.

    const effScale = scaleMultiplier * sizeBoost;
    if (phase === 'entry') {
      // Spring pop: start at 30%, overshoot to ~114%, settle at 100%
      const springScale = 0.30 + 0.70 * this.punchEaseOut(easedProgress);
      // Opacity fast-ramp: fully opaque by the time the overshoot peaks
      const fastOpacity = Math.min(1, easedProgress * 2.5);
      properties.scale = Math.max(0, springScale) * effScale;
      properties.opacity = fastOpacity;
    } else if (phase === 'hold') {
      // Gentle sinusoidal breathing — ±1.5% pulse over the hold window
      const breathe = 1.0 + Math.sin(totalWordProgress * Math.PI * 2) * 0.015;
      properties.scale = breathe * effScale;
      properties.opacity = 1.0;
    } else {
      // EXIT — words hold FULLY SOLID: no zoom-out, no opacity fade. Text stays
      // at 100% until the phrase clears as a unit. (Opacity reduction removed per
      // request — the text never fades while on screen.)
      properties.scale = effScale;
      properties.opacity = 1.0;
    }

    // Apply offset positioning (phrase stack slot offsets from renderPhraseStack)
    properties.x = (properties.x || this.layout.width / 2) + offset.x;
    properties.y = (properties.y || this.layout.height / 2) + offset.y;

    // ── DIRECTIONAL ENTRY ──────────────────────────────────────────────────
    // During entry, slide the word IN from its assigned direction (≈130px of
    // travel, eased). The spring scale/opacity above composes with this slide,
    // so each word arrives with both a pop AND a motivated direction. Exit and
    // hold add no slide — the word rests where the layout placed it.
    if (phase === 'entry' && entryDirection !== 'fade' && entryDirection !== 'pop') {
      const travel = 130 * this.scaleFactor;
      const d = (1 - easedProgress) * travel; // full at start → 0 at settle
      switch (entryDirection) {
        case 'top': properties.y -= d; break; // drops down from above
        case 'bottom': properties.y += d; break; // rises up from below
        case 'left': properties.x -= d; break; // slides in from the left
        case 'right': properties.x += d; break; // slides in from the right
      }
    }

    // Tell renderText which side to place the emoji / animated icon
    properties.iconSide = slot.iconSide ?? 'right';

    // ── ANIMATED LOTTIE ICON (hero words only) ─────────────────────────────
    // For the primary keyword of each phrase, draw an emotion-keyed Lottie
    // animation beside the word. It appears at the same spring timing as the
    // text, on the opposite side from the emoji so they don't collide.
    const isHeroWord = (anim.style.fontWeight || 0) >= 900;
    if (isHeroWord && slot.emotion) {
      const iconCanvas = animatedIconService.getFrame(
        slot.emotion,
        anim.startTime + (anim.duration * totalWordProgress)
      );
      if (iconCanvas) {
        const iconSize = (anim.style.fontSize || 80) * this.scaleFactor * (slot.sizeBoost ?? 1) * 0.65;
        const iconX = properties.x;
        const iconY = (properties.y || this.layout.height / 2) - iconSize / 2;
        // Place icon on the opposite side from the slot's iconSide (emoji side)
        const iconOffsetX = (slot.iconSide === 'left')
          ? iconSize * 0.6   // icon goes right when emoji is left
          : -iconSize * 0.6; // icon goes left when emoji is right
        this.ctx.save();
        this.ctx.globalAlpha = Math.min(1, easedProgress * 2.5) * globalOpacity;
        this.ctx.drawImage(iconCanvas, iconX + iconOffsetX - iconSize / 2, iconY, iconSize, iconSize);
        this.ctx.restore();
      }
    }

    // Per-word color override (secondary accent / connective tint for the collage trio)
    if (slot.colorOverride) {
      properties.color = slot.colorOverride;
      properties.gradientColors = undefined; // solid color, no gradient
    }

    // Subtle tilt for script accents (settles to its resting angle on entry)
    if (slot.rotation) {
      const tiltProgress = phase === 'entry' ? easedProgress : 1;
      properties.rotation = (properties.rotation || 0) + slot.rotation * tiltProgress;
    }

    // Store eased progress for animations (e.g. bouncing emoji)
    properties.progress = easedProgress;
    properties.phase = phase;
    properties.totalProgress = totalWordProgress;
    // Absolute playback time (same basis as the hero Lottie icon above) so the
    // animated emoji's frame is driven by the timeline, not wall-clock — keeps
    // exported frames reproducible.
    properties.playbackTime = anim.startTime + anim.duration * totalWordProgress;
    properties.type = anim.type; // Pass animation type down for custom clipping/styling

    // Forward the style's typographic decisions so the renderer honors them.
    // (Previously these were dropped, forcing the renderer to invent its own
    //  universal shadow/stroke — the cause of the "cheap 3D" look.)
    properties.textCase = anim.style.textCase;
    properties.letterSpacing = anim.style.letterSpacing;
    properties.fontStyle = anim.style.fontStyle;
    properties.strokeColor = anim.style.strokeColor;
    properties.strokeWidth = anim.style.strokeWidth;
    properties.shadowColor = anim.style.shadowColor;
    properties.shadowBlur = anim.style.shadowBlur;
    properties.is3D = slot.is3D; // only the phrase hero gets 3D extrusion

    // Render text with styling
    this.renderText(anim.text, properties, globalOpacity);
  }

  private calculateAnimationProperties(
    anim: WordAnimation,
    progress: number,
    totalProgress: number
  ) {
    const base = {
      x: this.layout.width / 2,
      y: this.layout.height / 2,
      scale: 1.0,
      opacity: 1.0,
      rotation: 0,
      color: anim.style.color,
      fontSize: anim.style.fontSize || 52,
      fontFamily: anim.style.fontFamily || 'Space Grotesk',
      fontWeight: anim.style.fontWeight || 700,
      gradientColors: anim.style.gradientColors,
    };

    // Apply animation type
    switch (anim.type) {
      case 'fade-in':
        return {
          ...base,
          opacity: progress,
        };

      case 'slide-left':
        return {
          ...base,
          x: base.x - (1 - progress) * 100,
          opacity: progress,
        };

      case 'slide-right':
        return {
          ...base,
          x: base.x + (1 - progress) * 100,
          opacity: progress,
        };

      case 'slide-up':
        return {
          ...base,
          y: base.y + (1 - progress) * 100,
          opacity: progress,
        };

      case 'scale-up':
        return {
          ...base,
          scale: 0.8 + progress * 0.2,
          opacity: progress,
        };

      case 'bounce-in': {
        // Overshoots to 115% then settles at 100% — no scaleAmount multiplier
        // so the final resting scale is always 1.0, not a larger value
        return {
          ...base,
          scale: Math.max(0, this.punchEaseOut(progress)),
          opacity: Math.min(1, progress * 5),
        };
      }

      case 'pop-slide-up': {
        // Violent spring: scale slams to 130% then snaps to 100% — pure punch
        const popProgress = this.punchEaseOut(progress);
        return {
          ...base,
          scale: Math.max(0, popProgress),
          y: base.y + (1 - this.overshootEaseOut(progress)) * 45,
          opacity: Math.min(1.0, progress * 6), // Instant appear
        };
      }

      case 'whip-pan':
        // Fast whip from left (-400px)
        return {
          ...base,
          x: base.x - (1 - progress) * 400,
          opacity: Math.min(1.0, progress * 4),
        };

      case 'mask-reveal':
        // Handled in renderText via clipping
        return { ...base, opacity: progress };

      case 'scale-pop':
        // Pop dynamically using totalProgress
        const scaleAmountVal = anim.scaleAmount || 1.3;
        const popScale = totalProgress < 0.25
          ? 1.0 + (totalProgress / 0.25) * (scaleAmountVal - 1.0)
          : 1.0 + Math.max(0, 1.0 - (totalProgress - 0.25) / 0.75) * (scaleAmountVal - 1.0) * 0.15;
        return {
          ...base,
          scale: popScale,
          color: anim.colorTransition || anim.style.color,
        };

      case 'typewriter':
        // Handled by clip region in renderText
        return { ...base, opacity: 1.0 };

      case 'glitch':
        // RGB channel shift — deterministic jitter (seeded by word + phase)
        const glitchTime = Math.sin(totalProgress * Math.PI * 12);
        const glitchJitter = (deterministicNoise(anim.wordId, totalProgress) - 0.5) * 15;
        return {
          ...base,
          x: base.x + (glitchTime > 0.8 || glitchTime < -0.8 ? glitchJitter : 0),
          opacity: glitchTime > 0.9 ? 0.6 : 1.0,
        };

      case 'glow-pulse':
        return {
          ...base,
          opacity: 0.6 + Math.sin(totalProgress * Math.PI * 6) * 0.4,
        };

      case 'shake':
        // Continuous organic shake — deterministic direction (seeded by word + phase)
        const shakeVal = Math.sin(totalProgress * Math.PI * 12) * 8 * (1.0 - totalProgress);
        const shakeDirX = deterministicNoise(anim.wordId + 'x', totalProgress) > 0.5 ? 1 : -1;
        const shakeDirY = deterministicNoise(anim.wordId + 'y', totalProgress) > 0.5 ? -1 : 1;
        return {
          ...base,
          x: base.x + shakeVal * shakeDirX,
          y: base.y + shakeVal * shakeDirY,
        };

      case 'slide-down':
        return {
          ...base,
          y: base.y - (1 - progress) * 100,
          opacity: progress,
        };

      case 'rotate-in':
        return {
          ...base,
          rotation: (1 - progress) * Math.PI * 2,
          scale: progress,
          opacity: progress,
        };

      case 'blur-in':
        return {
          ...base,
          opacity: progress,
          scale: 0.9 + progress * 0.1,
        };

      case 'color-flash':
        const flashColor = totalProgress < 0.3
          ? anim.colorTransition || anim.style.color
          : anim.style.color;
        return {
          ...base,
          color: flashColor,
          opacity: 1.0,
        };

      case 'aurora':
        return {
          ...base,
          opacity: 0.8 + Math.sin(totalProgress * Math.PI * 4) * 0.2,
          scale: 1.0 + Math.sin(totalProgress * Math.PI * 2) * 0.06,
        };

      case 'fire':
        const flameOffset = Math.sin(totalProgress * Math.PI * 15) * 5;
        return {
          ...base,
          y: base.y - Math.abs(flameOffset),
          scale: 0.95 + Math.sin(totalProgress * Math.PI * 6) * 0.05,
          opacity: progress,
        };

      case 'shimmer':
        return {
          ...base,
          opacity: 0.7 + Math.sin(totalProgress * Math.PI * 8) * 0.3,
        };

      case 'wave':
        return {
          ...base,
          x: base.x + Math.sin(totalProgress * Math.PI * 4) * 20,
          y: base.y + Math.cos(totalProgress * Math.PI * 6) * 15,
          opacity: progress,
        };

      case 'kinetic':
        const bounceAmount = Math.sin(totalProgress * Math.PI * 2) * 0.08;
        return {
          ...base,
          scale: 1.0 + bounceAmount,
          opacity: progress,
        };

      case 'karaoke':
        // Filled color reveals as progress increases
        return {
          ...base,
          color: anim.colorTransition || anim.style.color,
          opacity: 1.0,
        };

      default:
        return base;
    }
  }

  // ─── Text Rendering ───────────────────────────────────────────────────

  private renderText(
    text: string,
    properties: any,
    globalOpacity: number
  ): void {
    const {
      x = this.layout.width / 2,
      y = this.layout.height / 2,
      scale = 1.0,
      opacity = 1.0,
      color = '#FFFFFF',
      rotation = 0,
      fontSize = 52,
      fontFamily = 'Space Grotesk',
      fontStyle = 'normal',
      fontWeight = 700,
      letterSpacing = 0,
      textCase = 'normal',
      type = '',
    } = properties;

    // Validate inputs
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return; // Don't render empty text
    }

    // Extract emoji and clean text
    const emojiMatch = text.match(this.emojiRegex);
    const emoji = emojiMatch ? emojiMatch[0] : null;
    const cleanText = text.replace(this.emojiRegex, '').trim();

    // Validate if anything remains to be rendered
    if (cleanText.length === 0 && !emoji) {
      return;
    }

    // Process text case
    let displayText = cleanText;
    if (cleanText.length > 0) {
      if (textCase === 'uppercase') {
        displayText = cleanText.toUpperCase();
      } else if (textCase === 'lowercase') {
        displayText = cleanText.toLowerCase();
      } else if (textCase === 'capitalize') {
        displayText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1).toLowerCase();
      }
    }

    // Save context state
    this.ctx.save();

    // Apply opacity (fixed squaring bug where opacity was multiplied by itself)
    this.ctx.globalAlpha = Math.max(0, Math.min(1, opacity * globalOpacity));

    // Handle mask reveal clipping if applicable
    if (type === 'mask-reveal' && cleanText.length > 0) {
      const progress = opacity; // opacity stores phase progress in mask-reveal case
      this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}"`;
      const textWidth = this.measureTextCached(displayText);
      const leftBound = -textWidth / 2;
      const clipWidth = textWidth * progress;

      this.ctx.beginPath();
      this.ctx.rect(x + leftBound, y - fontSize, clipWidth, fontSize * 2);
      this.ctx.clip();
    }

    // Transform from center point
    this.ctx.translate(x, y);
    if (rotation !== 0) {
      this.ctx.rotate(rotation);
    }
    if (scale !== 1 && scale > 0) {
      this.ctx.scale(scale, scale);
    }

    // Text style
    const scaleFactor = this.scaleFactor;
    const fontWeightNum = Math.max(100, Math.min(900, fontWeight));

    // Pixel sizing scaled by scaleFactor. Hero words (weight 900) that are SHORT
    // (≤6 chars, e.g. "STOP", "FAST") auto-boost to 230px so punchy keywords fill
    // the frame and command attention; longer hero words stay at their 180px base.
    const isHeroWord = fontWeightNum >= 900;
    const effectiveFontSize = (isHeroWord && cleanText.length > 0 && cleanText.length <= 6)
      ? Math.max(fontSize, 230)
      : fontSize;
    const fontSizeNum = Math.max(8, Math.min(400, effectiveFontSize * scaleFactor));
    this.ctx.font = `${fontStyle} ${fontWeightNum} ${fontSizeNum}px "${fontFamily}"`;

    let textWidth = 0;
    if (cleanText.length > 0) {
      textWidth = this.measureTextCached(displayText);
    }

    let textFillStyle: string | CanvasGradient = color || '#FFFFFF';
    if (properties.gradientColors && Array.isArray(properties.gradientColors) && properties.gradientColors.length > 0 && textWidth > 0) {
      const grad = this.ctx.createLinearGradient(-textWidth / 2, -fontSizeNum * 0.4, textWidth / 2, fontSizeNum * 0.4);
      const n = properties.gradientColors.length;
      properties.gradientColors.forEach((c: string, idx: number) => {
        grad.addColorStop(idx / Math.max(1, n - 1), c);
      });
      textFillStyle = grad;
    }

    this.ctx.fillStyle = textFillStyle;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Apply letterSpacing if supported
    if ('letterSpacing' in this.ctx) {
      (this.ctx as any).letterSpacing = `${letterSpacing || 0}px`;
    }

    // Determine highlight box styling
    const isBgBox = this.layout.emphasisStyle === 'bg-box' && fontSizeNum >= 80 && cleanText.length > 0;

    if (isBgBox) {
      this.ctx.save();
      // Apply shadow to background box
      this.ctx.shadowColor = properties.shadowColor || 'rgba(0, 0, 0, 0.4)';
      this.ctx.shadowBlur = properties.shadowBlur || 8;
      this.ctx.shadowOffsetX = properties.shadowOffsetX !== undefined ? properties.shadowOffsetX : 2;
      this.ctx.shadowOffsetY = properties.shadowOffsetY !== undefined ? properties.shadowOffsetY : 3;

      const paddingX = fontSizeNum * 0.4;
      const paddingY = fontSizeNum * 0.25;
      const boxWidth = textWidth + paddingX * 2;
      const boxHeight = fontSizeNum + paddingY * 2;
      const boxX = -boxWidth / 2;
      const boxY = -boxHeight / 2;

      this.ctx.fillStyle = color; // Accent color
      this.drawRoundedRect(this.ctx, boxX, boxY, boxWidth, boxHeight, fontSizeNum * 0.3);
      this.ctx.fill();
      this.ctx.restore();

      // Draw text in charcoal/black over box
      this.ctx.fillStyle = '#1A1A1A';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    } else {
      // SUBTLE DEPTH SHADOW — soft and low-opacity so text lifts off the
      // background for legibility, WITHOUT the heavy 3D/bubble look. A style can
      // still override via properties.shadow*; otherwise we apply a tasteful
      // default: a soft blur with a small downward offset, scaled to font size.
      if (properties.shadowColor) {
        this.ctx.shadowColor = properties.shadowColor;
        this.ctx.shadowBlur = properties.shadowBlur || 0;
        this.ctx.shadowOffsetX = properties.shadowOffsetX || 0;
        this.ctx.shadowOffsetY = properties.shadowOffsetY || 0;
      } else {
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
        this.ctx.shadowBlur = Math.max(4, fontSizeNum * 0.08);
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = Math.max(2, fontSizeNum * 0.04);
      }
    }

    // Draw text if any
    if (cleanText.length > 0) {
      // ── 3D EXTRUSION (the single most-important word only) ─────────────────
      // Gated on properties.is3D, which renderPhraseStack sets true ONLY for the
      // phrase hero slot. For the lone single-word render path (no flag), fall
      // back to the weight check so a solo important word still gets depth.
      // Draws the glyphs repeatedly, stepping down-right in a darkened shade, to
      // build a solid extruded block behind the front face.
      const apply3D = properties.is3D !== undefined ? properties.is3D : isHeroWord;
      if (apply3D) {
        const depth = Math.max(4, Math.round(fontSizeNum * 0.07));
        const sideColor = this.darkenColor(typeof color === 'string' ? color : '', 0.55);
        this.ctx.save();
        this.ctx.shadowColor = 'transparent';
        this.ctx.fillStyle = sideColor;
        for (let i = depth; i >= 1; i--) {
          this.ctx.fillText(displayText, i, i); // step down-right
        }
        this.ctx.restore();
      }

      // ── Optional outline stroke — ONLY when the style explicitly defines one ──
      // (used for dark-background legibility). Flat cinematic styles set no stroke.
      if (properties.strokeColor && properties.strokeWidth) {
        this.ctx.save();
        this.ctx.shadowColor = 'transparent'; // shadow belongs to the fill, not the outline
        this.ctx.strokeStyle = properties.strokeColor;
        this.ctx.lineWidth = properties.strokeWidth * scaleFactor;
        this.ctx.lineJoin = 'round';
        this.ctx.strokeText(displayText, 0, 0);
        this.ctx.restore();
      }

      // Front face fill — sits on top of the extrusion, casts the depth shadow
      this.ctx.fillText(displayText, 0, 0);
    }

    // ── DYNAMIC ICON SOLVER ────────────────────────────────────────────────
    // The icon is NOT pinned to one corner. Its side (right/left/top), size and
    // glow are chosen per word: bigger for hero words, tinted with the word's
    // emotion color, and flipped to the opposite side if the chosen side would
    // push it past the frame edge. It shares the word's spring + a bouncier pop.
    // ── NATIVE EMOJI RENDERING ────────────────────────────────────────────────
    // Render the emoji character directly with canvas fillText using the OS emoji
    // font stack. This is instant (no CDN round-trip), always works offline, and
    // renders at native resolution with the bouncier spring scale.
    const entryProgress = properties.progress !== undefined ? properties.progress : 1;
    if (emoji && entryProgress > 0) {
      const emojiSize = fontSizeNum * (isHeroWord ? 0.80 : 0.58);
      const gapPx = 24 * scaleFactor;

      // Edge-flip guard: if chosen side would clip the frame, flip it
      let side: IconSide = (properties.iconSide as IconSide) || 'right';
      const rightEdgeX = x + textWidth / 2 + gapPx + emojiSize;
      const leftEdgeX = x - textWidth / 2 - gapPx - emojiSize;
      if (side === 'right' && rightEdgeX > this.layout.width - 20) side = 'left';
      if (side === 'left' && leftEdgeX < 20) side = 'right';

      let emojiX: number;
      let emojiY: number;
      if (side === 'top') {
        emojiX = 0;
        emojiY = -fontSizeNum * 0.5 - emojiSize * 0.6 - gapPx * 0.4;
      } else if (side === 'left') {
        emojiX = -textWidth / 2 - gapPx - emojiSize * 0.5;
        emojiY = 0;
      } else {
        emojiX = textWidth / 2 + gapPx + emojiSize * 0.5;
        emojiY = 0;
      }

      // Bouncier independent spring: 0 → 1.3 → 1.0
      const ec1 = 3.5;
      const ec3 = ec1 + 1;
      const emojiSpring = Math.max(0,
        1 + ec3 * Math.pow(entryProgress - 1, 3) + ec1 * Math.pow(entryProgress - 1, 2)
      );

      this.ctx.save();
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.translate(emojiX, emojiY);
      this.ctx.scale(emojiSpring, emojiSpring);

      // ── TRUE ANIMATED EMOJI (Noto Lottie) with native-glyph fallback ────────
      // Try a real animated frame first (a laughing face that opens its mouth,
      // not just a zoom). If none is available — emoji not in Noto's set, or a
      // CDN load still in flight — fall back to the static OS glyph so nothing
      // ever disappears. The emojiSpring scale above applies to both paths.
      const animEmoji = animatedEmojiService.getFrame(
        emoji,
        properties.playbackTime ?? 0
      );
      if (animEmoji) {
        this.ctx.drawImage(
          animEmoji,
          -emojiSize / 2,
          -emojiSize / 2,
          emojiSize,
          emojiSize
        );
      } else {
        // OS emoji font stack — renders natively at any size, no CDN needed
        this.ctx.font = `${emojiSize}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(emoji, 0, 0);
      }
      this.ctx.restore();
    }

    // Restore context
    this.ctx.restore();
  }

  // ─── Easing Functions ───────────────────────────────────────────────────

  private applyEasing(
    progress: number,
    easing: string
  ): number {
    switch (easing) {
      case 'ease-out':
        return 1 - Math.pow(1 - progress, 3); // Cubic ease-out
      case 'ease-in':
        return Math.pow(progress, 3); // Cubic ease-in
      case 'ease-in-out':
        return progress < 0.5
          ? 4 * Math.pow(progress, 3)
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      case 'overshoot-ease-out':
        return this.overshootEaseOut(progress);
      case 'linear':
      default:
        return progress;
    }
  }

  private overshootEaseOut(progress: number, s = 1.70158): number {
    const p = progress - 1;
    return p * p * ((s + 1) * p + s) + 1;
  }


  // ─── Phrase Stacking System ───────────────────────────────────────────────

  /**
   * Pre-computes phrase groups from the animation sequence.
   * Groups consecutive words with < 0.4s silence between them (max 4 per phrase —
   * the tight collage packer handles 1–4 lines per phrase).
   * Called once after sequence loads — O(n) build, O(log n) lookup.
   */
  private computePhraseGroups(): void {
    const anims = this.sequence.animations;
    this.phraseGroups = [];
    if (!anims.length) return;

    let phraseStart = 0;
    for (let i = 1; i <= anims.length; i++) {
      const isLast = i === anims.length;
      if (!isLast) {
        const prev = anims[i - 1];
        const curr = anims[i];
        // Silence gap between end of previous word and start of next
        const gap = curr.startTime - (prev.startTime + prev.duration);
        const phraseLen = i - phraseStart;
        // New phrase: natural pause (> 0.4s) OR max 4 words reached
        if (gap > 0.4 || phraseLen >= 4) {
          this.phraseGroups.push({ startIdx: phraseStart, endIdx: i - 1 });
          phraseStart = i;
        }
      } else {
        this.phraseGroups.push({ startIdx: phraseStart, endIdx: i - 1 });
      }
    }
  }

  /** Returns the phrase group containing wordIdx, or null. */
  private findPhraseForWord(wordIdx: number): { startIdx: number; endIdx: number } | null {
    for (const phrase of this.phraseGroups) {
      if (wordIdx >= phrase.startIdx && wordIdx <= phrase.endIdx) {
        return phrase;
      }
    }
    return null;
  }

  /**
   * Renders a phrase as a vertical stack of words.
   *
   * Visual contract:
   * - Active word      → full animated entry with spring physics
   * - Already-spoken   → static at 65% opacity (provides reading context)
   * - Future words     → completely hidden (no placeholder clutter)
   *
   * The phrase block clears entirely when the next phrase begins.
   */
  private renderPhraseStack(
    phrase: { startIdx: number; endIdx: number },
    activeIdx: number,
    playbackTime: number
  ): void {
    const anims = this.sequence.animations;
    const phraseWords = anims.slice(phrase.startIdx, phrase.endIdx + 1);
    const sf = this.scaleFactor;
    const phraseSize = phraseWords.length;

    // ── Composition + roles ─────────────────────────────────────────────────
    const heroIdx = this.heroSlotIndex(phraseWords);
    // Secondary = the non-hero word with the most weight (gets the script-accent
    // teal treatment); everything else is a charcoal connective.
    let secondaryIdx = -1;
    let secWeight = -1;
    phraseWords.forEach((w, i) => {
      if (i === heroIdx) return;
      const weight = (w.style.fontWeight || 0) + (w.intensity || 0) * 10;
      if (weight > secWeight) { secWeight = weight; secondaryIdx = i; }
    });
    const composition = this.composePhrase(phrase.startIdx, phraseSize, heroIdx);

    // Per-word color trio (matches the reference collages):
    //   hero       → keeps its emotion accent (no override)
    //   secondary  → teal/sky (the script accent)
    //   connective → charcoal / soft white
    const lightBg = this.bgLuminance() > 0.5;
    const secColor = lightBg ? '#0E7C86' : '#40C4FF';
    const conColor = lightBg ? '#2B2B2B' : '#E8E8E8';

    // ── TIGHT INTERLOCKING VERTICAL PACK ────────────────────────────────────
    // Instead of spacing lines apart, words HUG: gaps are computed from cap
    // heights × a tightness < 1 so adjacent words slightly overlap their
    // bounding boxes (ascenders/descenders interleave). Combined with the
    // template's strong horizontal offsets, small words tuck into the negative
    // space beside the big hero — the dense, collage feel of the references.
    const TIGHT = 0.82;
    const effSizes = phraseWords.map((w, i) =>
      this.effectiveRenderedFontSize(w) * sf * (composition[i]?.sizeBoost ?? 1)
    );
    const caps = effSizes.map(s => s * 0.70); // cap-height approximation

    const yPos: number[] = new Array(phraseSize).fill(0);
    for (let i = 1; i < phraseSize; i++) {
      yPos[i] = yPos[i - 1] + (caps[i - 1] / 2 + caps[i] / 2) * TIGHT;
    }
    const blockMid = (yPos[0] + yPos[phraseSize - 1]) / 2;
    const yOffsets = yPos.map(p => p - blockMid);

    // EXACT TIMING: every word appears precisely at its own startTime — no
    // artificial stagger. (The old waterfall delayed slot N by N×0.1s, pushing
    // later words out of sync with the audio.) Words still cascade naturally
    // because their transcript startTimes are sequential.
    phraseWords.forEach((anim, phraseWordIdx) => {
      const absoluteIdx = phrase.startIdx + phraseWordIdx;
      const isActive = absoluteIdx === activeIdx;
      const hasAppeared = anim.startTime <= playbackTime + 0.06;

      const plan = composition[phraseWordIdx] ?? { x: 0, y: 0 };
      const isHero = phraseWordIdx === heroIdx;
      const isSecondary = phraseWordIdx === secondaryIdx;

      const slot: SlotPlan = {
        x: (plan.x ?? 0) * sf,
        y: yOffsets[phraseWordIdx] ?? 0,
        sizeBoost: plan.sizeBoost ?? 1,
        entryDirection: plan.entryDirection ?? 'fade',
        iconSide: plan.iconSide ?? 'right',
        colorOverride: isHero ? undefined : (isSecondary ? secColor : conColor),
        rotation: isSecondary ? -0.10 : 0,
        emotion: anim.emotion,
        is3D: isHero, // ONLY the single most-important word gets 3D extrusion
      };

      if (isActive) {
        this.renderWordAnimation(anim, playbackTime, 1.0, slot);
      } else if (hasAppeared) {
        // Already-spoken words stay at FULL opacity (no dimming) — they build the
        // collage. Rendered at their hold frame so they sit static beside the
        // active word.
        const finalTime = anim.startTime + anim.duration * 0.8;
        this.renderWordAnimation(anim, finalTime, 1.0, slot);
      }
    });
  }

  /**
   * The font size a word will actually render at, mirroring renderText:
   * short hero words (≤6 chars) boost to 230px, others use their style size.
   */
  private effectiveRenderedFontSize(anim: WordAnimation): number {
    const isHero = (anim.style.fontWeight || 0) >= 900;
    const clean = anim.text.replace(this.emojiRegex, '').trim();
    const base = anim.style.fontSize || 80;
    if (isHero && clean.length > 0 && clean.length <= 6) return Math.max(base, 230);
    return base;
  }

  /** Index of the highest-emphasis word in a phrase (the "hero"), or -1. */
  private heroSlotIndex(words: WordAnimation[]): number {
    let best = -1;
    let bestWeight = -1;
    words.forEach((w, i) => {
      const weight = (w.style.fontWeight || 0) + (w.intensity || 0) * 10;
      if (weight > bestWeight) { bestWeight = weight; best = i; }
    });
    return best;
  }

  /**
   * Curated composition library. Returns a per-slot plan (X lean in 1080-base px,
   * entry direction, icon side, size boost). Picks a template deterministically
   * from the phrase's start index so the reel cycles through varied, intentional
   * layouts instead of one rigid staircase.
   */
  private composePhrase(
    startIdx: number,
    size: number,
    heroIdx: number
  ): Array<{ x: number; entryDirection: EntryDirection; iconSide: IconSide; sizeBoost: number }> {
    // Seeded pseudo-random picker — varied across phrases yet DETERMINISTIC for a
    // given phrase (so exported video matches preview). Uses the FNV noise hash
    // with a salt so different decisions decorrelate. Replaces the old
    // `startIdx % N` cycling that made the arrangement feel repetitive.
    const pick = <T>(arr: T[], salt: string): T =>
      arr[Math.floor(deterministicNoise(salt + startIdx, 0) * arr.length) % arr.length];

    if (size === 1) {
      return [{ x: 0, entryDirection: 'pop', iconSide: 'right', sizeBoost: 1.08 }];
    }

    if (size === 2) {
      const two = [
        // Split diagonal — top word from left, bottom from right
        [{ x: -32, entryDirection: 'left' as EntryDirection, iconSide: 'right' as IconSide, sizeBoost: 1 },
        { x: 32, entryDirection: 'right' as EntryDirection, iconSide: 'left' as IconSide, sizeBoost: 1 }],
        // Vertical drop/rise
        [{ x: 18, entryDirection: 'top' as EntryDirection, iconSide: 'left' as IconSide, sizeBoost: 1 },
        { x: -18, entryDirection: 'bottom' as EntryDirection, iconSide: 'right' as IconSide, sizeBoost: 1 }],
      ];
      return pick(two, 'two');
    }

    if (size === 4) {
      // 4-line creative arrangements. Words stay readably sized (no tiny shrink).
      const quad: Array<Array<{ x: number; entryDirection: EntryDirection; iconSide: IconSide; sizeBoost: number }>> = [
        // ZIGZAG — alternating left/right, energetic
        [{ x: -58, entryDirection: 'left', iconSide: 'right', sizeBoost: 1 },
        { x: 58, entryDirection: 'right', iconSide: 'left', sizeBoost: 1 },
        { x: -58, entryDirection: 'left', iconSide: 'right', sizeBoost: 1 },
        { x: 58, entryDirection: 'right', iconSide: 'left', sizeBoost: 1 }],
        // CASCADE — staircase down-right, all drop from top
        [{ x: -66, entryDirection: 'top', iconSide: 'right', sizeBoost: 1 },
        { x: -22, entryDirection: 'top', iconSide: 'right', sizeBoost: 1 },
        { x: 22, entryDirection: 'top', iconSide: 'left', sizeBoost: 1 },
        { x: 66, entryDirection: 'top', iconSide: 'left', sizeBoost: 1 }],
        // HERO_QUAD — hero centered & big, the other three tuck around it
        [0, 1, 2, 3].map((i) => i === heroIdx
          ? { x: 0, entryDirection: 'pop' as EntryDirection, iconSide: 'right' as IconSide, sizeBoost: 1.28 }
          : { x: (i % 2 === 0 ? -78 : 78), entryDirection: (i < heroIdx ? 'top' : 'bottom') as EntryDirection, iconSide: (i % 2 === 0 ? 'left' : 'right') as IconSide, sizeBoost: 0.95 }),
      ];
      return pick(quad, 'quad');
    }

    // 3-word templates. When a clear hero exists, favor focus/split layouts —
    // these recreate the reference collages: a huge hero with small words tucked
    // into its negative space (strong X offset so they sit beside, not over it).
    const focusTemplates: Array<Array<{ x: number; entryDirection: EntryDirection; iconSide: IconSide; sizeBoost: number }>> = [
      // HERO_FOCUS — hero dominates center; others tuck to opposite corners, small
      [0, 1, 2].map((i) => i === heroIdx
        ? { x: 0, entryDirection: 'pop' as EntryDirection, iconSide: 'right' as IconSide, sizeBoost: 1.3 }
        : { x: (i < heroIdx ? -95 : 95), entryDirection: (i < heroIdx ? 'top' : 'bottom') as EntryDirection, iconSide: (i < heroIdx ? 'left' : 'right') as IconSide, sizeBoost: 0.95 }),
      // SPLIT_EMPHASIS — connectives stack on the left, hero punches bottom-right
      [0, 1, 2].map((i) => i === heroIdx
        ? { x: 30, entryDirection: 'bottom' as EntryDirection, iconSide: 'right' as IconSide, sizeBoost: 1.22 }
        : { x: -88, entryDirection: 'left' as EntryDirection, iconSide: 'left' as IconSide, sizeBoost: 0.95 }),
    ];
    const flowTemplates: Array<Array<{ x: number; entryDirection: EntryDirection; iconSide: IconSide; sizeBoost: number }>> = [
      // DIAGONAL_RIGHT — staircase down-right
      [{ x: -55, entryDirection: 'left', iconSide: 'right', sizeBoost: 1 },
      { x: 0, entryDirection: 'bottom', iconSide: 'right', sizeBoost: 1 },
      { x: 55, entryDirection: 'right', iconSide: 'left', sizeBoost: 1 }],
      // DIAGONAL_LEFT — staircase down-left
      [{ x: 55, entryDirection: 'right', iconSide: 'left', sizeBoost: 1 },
      { x: 0, entryDirection: 'bottom', iconSide: 'right', sizeBoost: 1 },
      { x: -55, entryDirection: 'left', iconSide: 'right', sizeBoost: 1 }],
      // CASCADE_DOWN — all drop from top, slight right lean
      [{ x: -28, entryDirection: 'top', iconSide: 'right', sizeBoost: 1 },
      { x: 8, entryDirection: 'top', iconSide: 'right', sizeBoost: 1 },
      { x: 40, entryDirection: 'top', iconSide: 'left', sizeBoost: 1 }],
      // CENTER_PUNCH — centered, alternating L/R entries
      [{ x: 0, entryDirection: 'left', iconSide: 'right', sizeBoost: 1 },
      { x: 0, entryDirection: 'right', iconSide: 'left', sizeBoost: 1 },
      { x: 0, entryDirection: 'left', iconSide: 'right', sizeBoost: 1 }],
    ];

    // ~55% of phrases with a clear hero use a focus/collage layout; the rest
    // flow — chosen pseudo-randomly per phrase so the reel never feels patterned.
    const hasClearHero = heroIdx >= 0;
    if (hasClearHero && deterministicNoise('mode' + startIdx, 0) < 0.55) {
      return pick(focusTemplates, 'focus');
    }
    return pick(flowTemplates, 'flow');
  }

  /**
   * Aggressive snap-&-pop spring — overshoots to ~120% then settles to 100%,
   * matching cubic-bezier(0.34, 1.56, 0.64, 1). Peak hits around the midpoint
   * of the entry (~frame 3 of an 8-frame entry), then eases back down.
   * c1=2.59 is tuned so the overshoot peak ≈ 1.20.
   */
  private punchEaseOut(t: number): number {
    const c1 = 2.59; // overshoot peak ≈ 1.20 (vs 1.70158 → ~1.10)
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // ─── Font Preloading ──────────────────────────────────────────────────

  private preloadFonts(): void {
    // Trigger font loading for common fonts used in themes
    const fonts = [
      'Space Grotesk',
      'Playfair Display',
      'Inter',
      'Montserrat',
      'Cinzel',
      'Satisfy',
      'Pacifico',
      'Alex Brush',
    ];

    for (const font of fonts) {
      const doc = new FontFaceObserver(font);
      doc.load().catch(() => {
        console.warn(`Failed to load font: ${font}`);
      });
    }

    // Also preload italic faces used for poetic connective words, so they're
    // ready before first paint (avoids a flash of upright fallback text).
    if ((document as any).fonts) {
      ['Playfair Display', 'Satisfy'].forEach((f) => {
        (document as any).fonts.load(`italic 400 16px "${f}"`).catch(() => { });
      });
    }
  }

  // ─── Frame Health Check ───────────────────────────────────────────────

  private checkFrameHealth(): void {
    if (this.fps < 20) {
      console.error(
        `[typography] CRITICAL: FPS dropped below 20 (current: ${this.fps} FPS)`
      );
    } else if (this.fps < 30) {
      console.warn(
        `[typography] WARNING: FPS below 30 FPS threshold (current: ${this.fps} FPS)`
      );
    }
  }

  // ─── Get Metrics ──────────────────────────────────────────────────────

  getMetrics(): RenderMetrics {
    if (typeof (performance as any).memory !== 'undefined') {
      this.metrics.memoryUsageMB = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return this.metrics;
  }

  private drawCornerAnchorBadge(): void {
    this.ctx.save();
    this.ctx.globalAlpha = 0.25;

    // Corner coordinates (top-right safe zone)
    const x = this.layout.width - 90;
    const y = 90;
    const radius = 24;

    // Draw branding/crosshair vector circle
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = this.layout.backgroundColor === '#F5F2EB' ? '#1A1A1A' : '#FFFFFF';
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius - 8, 0, Math.PI * 2);
    this.ctx.fillStyle = this.layout.backgroundColor === '#F5F2EB' ? '#1A1A1A' : '#FFFFFF';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(x, y, 4, 0, Math.PI * 2);
    this.ctx.fillStyle = this.layout.backgroundColor === '#F5F2EB' ? '#FFFFFF' : '#000000';
    this.ctx.fill();

    this.ctx.restore();
  }

  /**
   * Persistent spatial anchor — a small dark vector "spark" in the bottom-left
   * corner that stays on screen the whole video. It gives the otherwise empty
   * background a physical anchor point and a sense of depth (the role the little
   * black cat plays in the reference reel). Opacity 0.8, color adapts to bg.
   */
  private drawSpatialAnchor(playbackTime: number): void {
    const sf = this.scaleFactor;
    const cx = 80 * sf;
    const cy = this.layout.height - 130 * sf;
    const r = 34 * sf;

    // Dark mark on light bg, light mark on dark bg
    const lum = this.bgLuminance();
    const markColor = lum > 0.5 ? '#1A1A1A' : '#F5F2EB';

    // Slow continuous rotation: 360° over 30s, derived from PLAYBACK time (not
    // wall-clock) so a given frame always renders the same angle — reproducible export.
    const rotation = ((playbackTime % 30) / 30) * Math.PI * 2;

    this.ctx.save();
    this.ctx.globalAlpha = 0.25; // reduced from 0.8 — subtle depth, not a distraction
    this.ctx.fillStyle = markColor;
    this.ctx.translate(cx, cy);
    this.ctx.rotate(rotation);

    // 4-point sparkle/star: two crossed concave diamonds → clean editorial accent
    this.ctx.beginPath();
    const inner = r * 0.28;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;        // tip direction
      const tipX = Math.cos(a) * r;
      const tipY = Math.sin(a) * r;
      const midA = a + Math.PI / 4;        // valley between tips
      const valX = Math.cos(midA) * inner;
      const valY = Math.sin(midA) * inner;
      if (i === 0) this.ctx.moveTo(tipX, tipY);
      else this.ctx.lineTo(tipX, tipY);
      this.ctx.lineTo(valX, valY);
    }
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  /** Perceptual luminance (0–1) of the layout background color. */
  private bgLuminance(): number {
    const hex = (this.layout.backgroundColor || '#000000').replace('#', '');
    if (hex.length !== 6) return 0;
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Darkens a hex color by `amount` (0–1) for the 3D extrusion side faces.
   * Falls back to a neutral dark shade for non-hex colors (e.g. gradient text).
   */
  private darkenColor(color: string, amount: number): string {
    const hex = (color || '').replace('#', '');
    if (hex.length !== 6) return 'rgba(0,0,0,0.55)';
    const f = 1 - Math.max(0, Math.min(1, amount));
    const r = Math.round(parseInt(hex.slice(0, 2), 16) * f);
    const g = Math.round(parseInt(hex.slice(2, 4), 16) * f);
    const b = Math.round(parseInt(hex.slice(4, 6), 16) * f);
    return `rgb(${r},${g},${b})`;
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

// ─── Font Loading Helper ──────────────────────────────────────────────────

class FontFaceObserver {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  async load(): Promise<void> {
    if ((document as any).fonts) {
      await (document as any).fonts.load(`12px "${this.name}"`);
    }
  }
}

// ─── Canvas Utility Functions ──────────────────────────────────────────────

export function createCanvasRenderer(
  element: HTMLCanvasElement,
  sequence: AnimationSequence
): TypographyRenderer {
  return new TypographyRenderer(element, sequence);
}

export function measureText(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: number
): { width: number; height: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { width: 0, height: 0 };
  }

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);

  return {
    width: metrics.width,
    height: fontSize, // Approximate
  };
}
