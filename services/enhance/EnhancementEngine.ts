// EnhancementEngine — the WebGL pre-pass at the heart of Studio Mode.
//
// Pipeline (see docs/designs/AI_AUTO_VIDEO_ENHANCEMENT_ENGINE.md §3):
//   <video> ──▶ [this engine: WebGL shader chain] ──▶ offscreen canvas
//   captionRenderer.ts then draws the offscreen canvas instead of the raw video,
//   so captions / camera crop / MediaRecorder export all keep working untouched.
//
// Every failure mode degrades to "engine inactive" so a broken GL context can
// never break playback or export — the caller falls back to drawing the raw
// <video> element. Nothing here throws inside the render loop.
import { EnhanceParams, NEUTRAL_PARAMS } from './types';

// Shared shader bodies. The same GLSL serves WebGL2 (ES 3.00) and WebGL1
// (ES 1.00); only the version header + a few #define macros differ, so there is
// ONE source of truth for the math. SAMPLE()/FRAGCOLOR/IN/OUT are version-mapped.
const VERT_BODY = `
IN vec2 a_pos;
OUT vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, a_pos.y * -0.5 + 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Full-resolution, single-pass professional grade. Runs on EVERY pixel in float:
// edge-preserving bilateral denoise (not a destructive blur) → frequency-separation
// skin smoothing + hair/feature detail + clarity → white balance/exposure/contrast/
// saturation → analytic relight. This is the quality win over the 2D fallback,
// which had to downscale the face to 480px (softening) and round-trip 8-bit pixels.
const FRAG_BODY = `
uniform sampler2D u_tex;
uniform vec2  u_texel;        // 1/width, 1/height
uniform float u_exposure;     // stops
uniform float u_contrast;
uniform float u_saturation;
uniform vec3  u_wbGain;
uniform float u_temperature;  // -1..1 warm/cool
uniform float u_denoise;      // 0..1
uniform float u_sharpen;      // 0..2 global
uniform vec4  u_face;         // cx, cy, rx, ry (normalized); rx<=0 => disabled
uniform float u_faceSharpen;  // 0..1.5
uniform float u_skinSmooth;   // 0..1
uniform float u_relight;      // 0..1

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

// Trapezoid membership for soft skin gating.
float ramp(float x, float a0, float a1, float b1, float b0) {
  if (x <= a0 || x >= b0) return 0.0;
  if (x < a1) return (x - a0) / (a1 - a0);
  if (x <= b1) return 1.0;
  return (b0 - x) / (b0 - b1);
}
// Skin membership in YCbCr (excludes eyes, lips, teeth, hair).
float skinWeight(vec3 c) {
  float r = c.r * 255.0, g = c.g * 255.0, b = c.b * 255.0;
  float cb = 128.0 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  float cr = 128.0 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return ramp(cb, 77.0, 92.0, 122.0, 138.0) * ramp(cr, 130.0, 140.0, 168.0, 182.0);
}

void main() {
  vec3 orig = SAMPLE(v_uv).rgb;
  float lo = lum(orig);

  // --- Edge-preserving bilateral denoise (5x5, joint spatial+range) ---
  // Real denoise: averages flat areas but STOPS at edges (no smearing across
  // hair/face boundaries), unlike the old box blur that softened everything.
  vec3 bilat = vec3(0.0);
  float wsum = 0.0;
  for (int dy = -2; dy <= 2; dy++) {
    for (int dx = -2; dx <= 2; dx++) {
      vec3 s = SAMPLE(v_uv + vec2(float(dx), float(dy)) * u_texel).rgb;
      float sd = float(dx * dx + dy * dy);
      float cd = lum(s) - lo;
      float w = exp(-sd / 4.5) * exp(-(cd * cd) / 0.010);
      bilat += s * w;
      wsum += w;
    }
  }
  bilat /= max(wsum, 1e-4);

  // Low (denoised) / detail (high-freq) / mid (broad blur for clarity).
  vec3 low = mix(orig, bilat, clamp(u_denoise, 0.0, 1.0));
  vec3 detail = orig - low;
  vec3 mid = vec3(0.0);
  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      mid += SAMPLE(v_uv + vec2(float(dx), float(dy)) * u_texel * 3.0).rgb;
    }
  }
  mid /= 9.0;
  vec3 clarityBand = low - mid;

  // Region weights from the face ellipse (+ an up-shifted hair ellipse).
  float faceW = 0.0, hairFeather = 0.0;
  if (u_face.z > 0.0) {
    vec2 d = (v_uv - u_face.xy) / max(u_face.zw, vec2(1e-4));
    faceW = 1.0 - smoothstep(0.7, 1.2, length(d));
    vec2 hd = vec2(d.x / 1.45, (d.y + 0.35) / 1.7);
    hairFeather = 1.0 - smoothstep(0.8, 1.15, length(hd));
  }

  float dmag = length(detail);
  float edge = clamp(dmag * 6.0, 0.0, 1.0);
  float skinW = skinWeight(orig);
  float nonSkin = 1.0 - skinW;

  // Detail multiplier on the high-frequency band:
  //  - smooth flat skin (remove texture), keep edges
  //  - sharpen face structure
  //  - boost hair / non-skin features (gradient-gated so noise isn't amplified)
  float smoothAmt = u_skinSmooth * skinW * (1.0 - edge) * faceW;
  float sharpFace = u_faceSharpen * edge * faceW;
  float hairBoost = (0.5 + u_faceSharpen) * nonSkin * smoothstep(0.04, 0.11, dmag) * hairFeather;
  float detailMul = 1.0 - smoothAmt + sharpFace + hairBoost;
  float clW = (0.4 + 0.6 * edge) * 0.30 * max(faceW, hairFeather);

  vec3 c = low + detail * detailMul + detail * (u_sharpen * 0.5) + clarityBand * clW;

  // White balance + temperature + exposure + contrast + saturation.
  c *= u_wbGain;
  c.r *= 1.0 + 0.3 * u_temperature;
  c.b *= 1.0 - 0.3 * u_temperature;
  c *= exp2(u_exposure);
  c = (c - 0.5) * u_contrast + 0.5;
  float L = lum(c);
  c = mix(vec3(L), c, u_saturation);

  // --- Virtual studio lighting (analytic; no extra textures) ---
  if (u_relight > 0.0) {
    float amt = u_relight;
    if (u_face.z > 0.0) {
      vec2 fd = (v_uv - u_face.xy) / max(u_face.zw, vec2(1e-4));
      float fill = (1.0 - smoothstep(0.2, 1.6, length(fd))) * 0.22 * amt; // screen-style shadow lift
      c = 1.0 - (1.0 - c) * (1.0 - fill);
      vec2 kd = (v_uv - (u_face.xy + vec2(-u_face.z * 0.5, -u_face.w * 0.55))) / max(u_face.zw, vec2(1e-4));
      c += (1.0 - smoothstep(0.0, 1.3, length(kd))) * 0.16 * amt; // 45 deg key
    }
    float vig = 1.0 - smoothstep(0.36, 0.95, length(v_uv - vec2(0.5, 0.45))) * 0.2 * amt;
    c *= vig; // separation vignette
  }

  FRAGCOLOR = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

const VERT_ES3 = `#version 300 es
#define IN in
#define OUT out
${VERT_BODY}`;
const FRAG_ES3 = `#version 300 es
precision highp float;
#define SAMPLE(uv) texture(u_tex, uv)
#define FRAGCOLOR o_color
in vec2 v_uv;
out vec4 o_color;
${FRAG_BODY}`;
const VERT_ES1 = `#version 100
#define IN attribute
#define OUT varying
precision highp float;
${VERT_BODY}`;
const FRAG_ES1 = `#version 100
precision highp float;
#define SAMPLE(uv) texture2D(u_tex, uv)
#define FRAGCOLOR gl_FragColor
varying vec2 v_uv;
${FRAG_BODY}`;

const GL_UNIFORMS = [
  'u_tex', 'u_texel', 'u_exposure', 'u_contrast', 'u_saturation',
  'u_wbGain', 'u_temperature', 'u_denoise', 'u_sharpen', 'u_face',
  'u_faceSharpen', 'u_skinSmooth', 'u_relight',
];

/**
 * Trapezoidal membership: 0 below a0, ramps to 1 across [a0,a1], 1 across
 * [a1,b1], ramps back to 0 across [b1,b0]. Used for soft skin-tone gating.
 */
function ramp(x: number, a0: number, a1: number, b1: number, b0: number): number {
  if (x <= a0 || x >= b0) return 0;
  if (x < a1) return (x - a0) / (a1 - a0);
  if (x > b1) return (b0 - x) / (b0 - b1);
  return 1;
}

type AnyGL = WebGL2RenderingContext | WebGLRenderingContext;

export class EnhancementEngine {
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private gl: AnyGL | null = null;
  private glVersion = 0; // 2 = WebGL2, 1 = WebGL1
  private program: WebGLProgram | null = null;
  private tex: WebGLTexture | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private supported = false;
  private contextLost = false;
  private width = 0;
  private height = 0;
  private warned = new Set<string>();
  // Render mode: 'webgl' when the shader chain is live, '2d' for the canvas-
  // filter fallback (always available), 'none' only if even 2D fails.
  private mode: 'webgl' | '2d' | 'none' = 'none';
  // The 2D fallback gets its OWN canvas. A canvas can only ever vend one context
  // type, so we must never call getContext('2d') on the WebGL canvas.
  private canvas2d: HTMLCanvasElement | null = null;
  private ctx2d: CanvasRenderingContext2D | null = null;

  /** Auto-levels measured from the pixels (set by analyze()). */
  private autoWb: [number, number, number] = [1, 1, 1];
  private autoExposure = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    // ALWAYS establish the 2D fallback first as a guaranteed baseline. This makes
    // it impossible to end up in a dead 'none' state when the browser can do 2D
    // canvas at all. WebGL is then attempted as an optional upgrade on top.
    this.init2dFallback();
    this.initGl();
  }

  /** True if ANY enhancement path is available (WebGL2 or the 2D fallback). */
  isSupported(): boolean {
    return this.mode !== 'none';
  }

  /** Which path is ACTUALLY live right now. Never lies. */
  getMode(): 'webgl' | '2d' | 'none' {
    if (this.mode === 'webgl' && !this.contextLost && this.gl && this.program) return 'webgl';
    if (this.ctx2d) return '2d';
    return 'none';
  }

  /** Precise live path for diagnostics: 'webgl2' | 'webgl1' | '2d' | 'none'. */
  getGlInfo(): string {
    if (this.getMode() === 'webgl') return this.glVersion === 2 ? 'webgl2' : 'webgl1';
    return this.getMode();
  }

  /** The drawable the renderer should composite instead of the raw <video>. */
  get output(): HTMLCanvasElement | OffscreenCanvas {
    // Return the canvas that the last successful process() actually wrote to.
    if (this.getMode() === 'webgl') return this.canvas;
    if (this.canvas2d) return this.canvas2d;
    return this.canvas;
  }

  private warnOnce(key: string, ...msg: unknown[]) {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    console.warn('[EnhancementEngine]', ...msg);
  }

  private initGl() {
    const c = this.canvas as HTMLCanvasElement;
    const attrs: WebGLContextAttributes = {
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,            // captionRenderer drawImage()s the GL canvas
      failIfMajorPerformanceCaveat: false,    // accept software WebGL over the lossy 2D path
      powerPreference: 'high-performance',
      antialias: false, depth: false, stencil: false,
    };
    const tryCtx = (id: string): AnyGL | null => {
      try { return c.getContext(id, attrs) as AnyGL | null; } catch { return null; }
    };

    // Prefer WebGL2 (ES 3.00); fall back to WebGL1 (ES 1.00) before the 2D path.
    // Each candidate must LINK and pass a pixel-readback verification — link
    // success alone doesn't prove the driver renders the shader correctly.
    const gl2 = tryCtx('webgl2');
    if (gl2 && this.bringUpProgram(gl2, VERT_ES3, FRAG_ES3) && this.verifyGpu(gl2)) {
      this.gl = gl2; this.glVersion = 2; this.supported = true; this.mode = 'webgl';
      this.attachLostHandlers(c, VERT_ES3, FRAG_ES3);
      return;
    }
    const gl1 = tryCtx('webgl') || tryCtx('experimental-webgl');
    if (gl1 && this.bringUpProgram(gl1, VERT_ES1, FRAG_ES1) && this.verifyGpu(gl1)) {
      this.gl = gl1; this.glVersion = 1; this.supported = true; this.mode = 'webgl';
      this.attachLostHandlers(c, VERT_ES1, FRAG_ES1);
      return;
    }

    this.warnOnce('nogl', 'No usable WebGL (blocklisted/unsupported); using 2D fallback');
    this.gl = null;
    if (this.mode !== '2d') this.init2dFallback();
  }

  private attachLostHandlers(c: HTMLCanvasElement, vert: string, frag: string) {
    c.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.contextLost = true;
      this.mode = '2d';
      if (!this.ctx2d) this.init2dFallback();
      this.warnOnce('lost', 'GL context lost; switched to 2D enhancement');
    });
    c.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
      this.program = null;
      this.tex = null;
      if (this.gl && this.bringUpProgram(this.gl, vert, frag) && this.verifyGpu(this.gl)) {
        this.mode = 'webgl';
      }
      this.warned.delete('lost');
    });
  }

  private compile(gl: AnyGL, type: number, src: string): WebGLShader | null {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      this.warnOnce('compile', 'shader compile failed:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  /** Compile+link the program and set up the fullscreen quad + texture. Does NOT
   *  touch `this.mode` — the caller owns mode after verification. */
  private bringUpProgram(gl: AnyGL, vert: string, frag: string): boolean {
    try {
      const vs = this.compile(gl, gl.VERTEX_SHADER, vert);
      const fs = this.compile(gl, gl.FRAGMENT_SHADER, frag);
      if (!vs || !fs) return false;
      const prog = gl.createProgram();
      if (!prog) return false;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        this.warnOnce('link', 'program link failed:', gl.getProgramInfoLog(prog));
        return false;
      }
      this.program = prog;

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a_pos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      this.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

      gl.useProgram(prog);
      for (const name of GL_UNIFORMS) this.uniforms[name] = gl.getUniformLocation(prog, name);
      return gl.getError() === gl.NO_ERROR;
    } catch (e) {
      this.warnOnce('bringup', 'GL program bring-up threw:', e);
      return false;
    }
  }

  /** Prove the shader actually transforms pixels: feed mid-gray, force +1 stop
   *  exposure, render 1x1, read back — a working pipeline returns near-white. */
  private verifyGpu(gl: AnyGL): boolean {
    try {
      if (!this.program || !this.tex) return false;
      const c = this.canvas as HTMLCanvasElement;
      c.width = 1; c.height = 1;
      gl.viewport(0, 0, 1, 1);
      gl.useProgram(this.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
      const u = this.uniforms;
      gl.uniform1i(u.u_tex, 0);
      gl.uniform2f(u.u_texel, 1, 1);
      gl.uniform1f(u.u_exposure, 1.0); // +1 stop => 128*2 -> clamp 255
      gl.uniform1f(u.u_contrast, 1.0);
      gl.uniform1f(u.u_saturation, 1.0);
      gl.uniform3f(u.u_wbGain, 1, 1, 1);
      gl.uniform1f(u.u_temperature, 0);
      gl.uniform1f(u.u_denoise, 0);
      gl.uniform1f(u.u_sharpen, 0);
      gl.uniform4f(u.u_face, 0, 0, 0, 0);
      gl.uniform1f(u.u_faceSharpen, 0);
      gl.uniform1f(u.u_skinSmooth, 0);
      gl.uniform1f(u.u_relight, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const out = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
      const ok = out[0] >= 230 && gl.getError() === gl.NO_ERROR && !gl.isContextLost();
      if (!ok) this.warnOnce('verify', 'GPU probe failed (out=' + out.join(',') + '); falling back');
      this.width = 0; this.height = 0; // force a real resize on first process()
      return ok;
    } catch (e) {
      this.warnOnce('verify', 'GPU probe threw:', e);
      return false;
    }
  }

  /**
   * 2D-canvas fallback used when WebGL2 is unavailable. Applies the global
   * adjustments (exposure/contrast/saturation/denoise/temperature) via the
   * GPU-accelerated `ctx.filter`. No face-local pass, but it always works.
   */
  /** Whether `ctx.filter` actually works on this browser (feature-detected). */
  private filterSupported = false;

  private init2dFallback() {
    if (this.mode === 'webgl' && !this.contextLost) return; // webgl live; no fallback needed
    if (!this.canvas2d) this.canvas2d = document.createElement('canvas');
    const ctx = this.canvas2d.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      this.mode = 'none';
      this.warnOnce('no2d', '2D canvas unavailable; enhancement disabled');
      return;
    }
    this.ctx2d = ctx;
    // Behaviorally verify ctx.filter actually alters pixels. Some engines expose
    // the property but silently ignore it; in that case use the per-pixel path.
    this.filterSupported = this.testFilterWorks();
    if (this.mode !== 'webgl') this.mode = '2d';
  }

  /** Draw a known gray with brightness(200%) and confirm the pixel got brighter. */
  private testFilterWorks(): boolean {
    try {
      const t = document.createElement('canvas');
      t.width = 2; t.height = 2;
      const tc = t.getContext('2d', { willReadFrequently: true });
      if (!tc || typeof (tc as any).filter !== 'string') return false;
      const src = document.createElement('canvas');
      src.width = 2; src.height = 2;
      const sc = src.getContext('2d');
      if (!sc) return false;
      sc.fillStyle = 'rgb(100,100,100)';
      sc.fillRect(0, 0, 2, 2);
      (tc as any).filter = 'brightness(200%)';
      tc.drawImage(src, 0, 0);
      (tc as any).filter = 'none';
      const px = tc.getImageData(0, 0, 1, 1).data;
      return px[0] > 150; // 100 * 2 = 200 if filter applied
    } catch {
      return false;
    }
  }

  private process2d(source: CanvasImageSource, srcW: number, srcH: number, params: EnhanceParams): boolean {
    const ctx = this.ctx2d;
    const c = this.canvas2d;
    if (!ctx || !c) return false;
    try {
      if (c.width !== srcW) c.width = srcW;
      if (c.height !== srcH) c.height = srcH;

      ctx.clearRect(0, 0, srcW, srcH);

      if (this.filterSupported) {
        // Fold the gray-world white-balance into the pass: wbGain = maxG * (per-
        // channel ratio). maxG goes into `brightness` (scales all channels), the
        // ratios (all <=1) go into a `multiply` fill. Net = exact per-channel gain.
        const [wgr, wgg, wgb] = params.wbGain;
        const maxG = Math.max(wgr, wgg, wgb, 1e-4);
        const brightness = Math.max(0, Math.pow(2, params.exposure)) * maxG * 100;
        const contrast = Math.max(0, params.contrast) * 100;
        const saturate = Math.max(0, params.saturation) * 100;
        const blur = Math.max(0, params.denoise) * 2.2; // px
        (ctx as any).filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)${blur > 0.05 ? ` blur(${blur.toFixed(2)}px)` : ''}`;
        ctx.drawImage(source, 0, 0, srcW, srcH);
        (ctx as any).filter = 'none';

        // White-balance ratios (only if channels actually differ).
        if (Math.abs(wgr - wgg) > 1e-3 || Math.abs(wgg - wgb) > 1e-3) {
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          ctx.fillStyle = `rgb(${Math.round(255 * wgr / maxG)},${Math.round(255 * wgg / maxG)},${Math.round(255 * wgb / maxG)})`;
          ctx.fillRect(0, 0, srcW, srcH);
          ctx.restore();
        }

        // Manual temperature as a soft warm/cool wash.
        const t = params.temperature ?? 0;
        if (Math.abs(t) > 0.01) {
          ctx.save();
          ctx.globalCompositeOperation = 'soft-light';
          ctx.fillStyle = t > 0 ? `rgba(255,170,70,${0.5 * t})` : `rgba(70,150,255,${0.5 * -t})`;
          ctx.fillRect(0, 0, srcW, srcH);
          ctx.restore();
        }
      } else {
        // Manual per-pixel path (no ctx.filter): exposure, contrast, saturation,
        // white-balance, temperature. Works everywhere.
        ctx.drawImage(source, 0, 0, srcW, srcH);
        this.applyPixelAdjust(ctx, srcW, srcH, params);
      }

      // Face-local enhancement (skin smooth + sharpen) via frequency separation.
      // Runs in 2D too — MediaPipe face detection does NOT require WebGL2.
      if (params.face && (params.skinSmooth > 0 || params.faceSharpen > 0)) {
        this.applyFaceEnhance2d(ctx, srcW, srcH, params);
      }

      // Virtual studio lighting: soft shadow fill + 45° key + separation vignette.
      if ((params.relight ?? 0) > 0) {
        this.applyRelight2d(ctx, srcW, srcH, params);
      }

      // TEMPORAL denoise (motion-gated frame averaging) — removes the frame-to-
      // frame noise/flicker that spatial blur can't touch. Static areas (skin,
      // background) average across frames; moving areas keep full detail (no ghost).
      if ((params.denoise ?? 0) > 0) {
        this.applyTemporalDenoise(ctx, srcW, srcH, params.denoise);
      }
      return true;
    } catch (e) {
      this.warnOnce('process2d', '2D enhance failed, degrading to raw video:', e);
      return false;
    }
  }

  private faceTmp: HTMLCanvasElement | null = null;

  /**
   * Professional face retouch in canvas 2D using FREQUENCY SEPARATION
   * (the YUCI / Photoshop high-pass skin-smoothing technique):
   *   low  = blurred frame (color + tone, no texture)
   *   high = original - low (texture/detail)
   * Smooth ONLY the low-amplitude texture (blemishes/pores) while preserving
   * high-amplitude edges (eyes, lips, nostrils, hair) so skin never looks
   * plastic. Then add a touch of high-frequency back for crisp eyes (sharpen).
   * Processes only the face bounding box for performance; masked to a feathered
   * ellipse so the rest of the frame is untouched.
   */
  private applyFaceEnhance2d(ctx: CanvasRenderingContext2D, srcW: number, srcH: number, p: EnhanceParams) {
    const face = p.face!;
    const cx = face.cx * srcW, cy = face.cy * srcH;
    const rx = face.rx * srcW, ry = face.ry * srcH;
    if (rx < 4 || ry < 4) return;

    // Padded bounding box, clamped to frame. Biased UPWARD + wider so the hair
    // above and around the face is included (hair detail boost works in a ring
    // outside the face ellipse).
    const padX = rx * 1.55;
    const x0 = Math.max(0, Math.floor(cx - padX));
    const x1 = Math.min(srcW, Math.ceil(cx + padX));
    const y0 = Math.max(0, Math.floor(cy - ry * 2.0));
    const y1 = Math.min(srcH, Math.ceil(cy + ry * 1.35));
    const bw = x1 - x0, bh = y1 - y0;
    if (bw < 8 || bh < 8) return;

    // REALTIME: process the face at a capped working resolution. Skin smoothing
    // is inherently low-frequency, so a downscaled pass looks identical but keeps
    // the per-pixel loop + buffer allocations bounded regardless of 1080p/4K input.
    // Higher cap = less softening in the (last-resort) 2D path. WebGL processes
    // at full native resolution; this only matters when no WebGL is available.
    const WORK_MAX = 720;
    const longE = Math.max(bw, bh);
    const scale = longE > WORK_MAX ? WORK_MAX / longE : 1;
    const ww = Math.max(8, Math.round(bw * scale));
    const wh = Math.max(8, Math.round(bh * scale));

    const cvs2d = this.canvas2d as HTMLCanvasElement;
    if (!this.faceTmp) this.faceTmp = document.createElement('canvas');
    if (!this.faceTmp2) this.faceTmp2 = document.createElement('canvas');
    const work = this.faceTmp, lowC = this.faceTmp2;
    if (work.width !== ww) work.width = ww;
    if (work.height !== wh) work.height = wh;
    if (lowC.width !== ww) lowC.width = ww;
    if (lowC.height !== wh) lowC.height = wh;
    const wctx = work.getContext('2d', { willReadFrequently: true });
    const lctx = lowC.getContext('2d', { willReadFrequently: true });
    if (!wctx || !lctx) return;

    // Work layer = the color-graded face box, downscaled (this is "orig" at work res).
    wctx.imageSmoothingEnabled = true;
    wctx.clearRect(0, 0, ww, wh);
    wctx.drawImage(cvs2d, x0, y0, bw, bh, 0, 0, ww, wh);

    // Low-frequency layer = blurred work. Radius scaled to work resolution.
    const blurR = Math.max(1.2, Math.min(rx, ry) * 0.07 * scale);
    lctx.imageSmoothingEnabled = true;
    lctx.clearRect(0, 0, ww, wh);
    if (this.filterSupported) {
      (lctx as any).filter = `blur(${blurR.toFixed(2)}px)`;
      lctx.drawImage(work, 0, 0);
      (lctx as any).filter = 'none';
    } else {
      // Downscale/upscale box-blur fallback.
      const f = Math.max(2, Math.round(blurR));
      const sw = Math.max(1, Math.round(ww / f)), sh = Math.max(1, Math.round(wh / f));
      lctx.drawImage(work, 0, 0, ww, wh, 0, 0, sw, sh);
      lctx.drawImage(lowC, 0, 0, sw, sh, 0, 0, ww, wh);
    }

    // Mid-frequency layer (broad blur) for CLARITY / local contrast — gives the
    // face dimensional "studio" depth (cheekbones, jaw, nose) without color shift.
    if (!this.faceMid) this.faceMid = document.createElement('canvas');
    const midC = this.faceMid;
    if (midC.width !== ww) midC.width = ww;
    if (midC.height !== wh) midC.height = wh;
    const mctx = midC.getContext('2d', { willReadFrequently: true });
    if (!mctx) return;
    mctx.imageSmoothingEnabled = true;
    mctx.clearRect(0, 0, ww, wh);
    if (this.filterSupported) {
      (mctx as any).filter = `blur(${(blurR * 4).toFixed(2)}px)`;
      mctx.drawImage(lowC, 0, 0); // blur the already-low layer = broad tones
      (mctx as any).filter = 'none';
    } else {
      const f = Math.max(3, Math.round(blurR * 4));
      const sw = Math.max(1, Math.round(ww / f)), sh = Math.max(1, Math.round(wh / f));
      mctx.drawImage(lowC, 0, 0, ww, wh, 0, 0, sw, sh);
      mctx.drawImage(midC, 0, 0, sw, sh, 0, 0, ww, wh);
    }

    let orig: ImageData, low: ImageData, mid: ImageData;
    try {
      orig = wctx.getImageData(0, 0, ww, wh);
      low = lctx.getImageData(0, 0, ww, wh);
      mid = mctx.getImageData(0, 0, ww, wh);
    } catch {
      this.warnOnce('faceread', 'face getImageData blocked (tainted); skipping retouch');
      return;
    }
    const od = orig.data, ld = low.data, md = mid.data;

    const smooth = Math.max(0, Math.min(1, p.skinSmooth));
    const sharpen = Math.max(0, Math.min(1.5, p.faceSharpen));
    const CLARITY = 0.33;                              // local-contrast strength
    const HAIR_AMT = Math.min(1.2, 0.5 + sharpen);     // hair/feature detail (capped to limit noise)
    const CLAMP = 45;                                  // soft-clip on added detail (halo/noise guard)
    const EDGE = 13, EDGEi = 1 / EDGE;
    // Normalized ellipse coords (incremental, no per-pixel div).
    const stepFx = 1 / (scale * rx), stepFy = 1 / (scale * ry);
    const baseFx = (x0 - cx) / rx, baseFy = (y0 - cy) / ry;
    // Hair region = a larger ellipse, shifted UP (hair piles above the face).
    const HX = 1 / 1.45, HY = 1 / 1.7, HSHIFT = 0.35;

    for (let y = 0; y < wh; y++) {
      const fy = baseFy + y * stepFy;
      const fy2 = fy * fy;
      const hyv = (fy + HSHIFT) * HY;
      let rowi = y * ww * 4;
      for (let x = 0; x < ww; x++, rowi += 4) {
        const fx = baseFx + x * stepFx;

        // Face ellipse weight (skin smoothing + clarity zone).
        const fd2 = fx * fx + fy2;
        let faceW = 0;
        if (fd2 < 1.44) {
          if (fd2 <= 0.49) faceW = 1;
          else { const t = (Math.sqrt(fd2) - 0.7) * 2; faceW = 1 - t * t * (3 - 2 * t); if (faceW < 0) faceW = 0; }
        }
        // Hair ellipse weight (enlarged + up-shifted) — limits where hair boost runs.
        const hx = fx * HX;
        const hd2 = hx * hx + hyv * hyv;
        let hairFeather = 0;
        if (hd2 < 1.21) {
          if (hd2 <= 0.64) hairFeather = 1;
          else { const t = (Math.sqrt(hd2) - 0.8) * 3.333; hairFeather = 1 - t * t * (3 - 2 * t); if (hairFeather < 0) hairFeather = 0; }
        }
        if (faceW <= 0 && hairFeather <= 0) continue;

        const i = rowi;
        const r = od[i], g = od[i + 1], b = od[i + 2];

        // SKIN-TONE membership in YCbCr — excludes eyes, teeth, lips, hair.
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        const skinW = ramp(cb, 77, 92, 122, 138) * ramp(cr, 130, 140, 168, 182);
        const nonSkin = 1 - skinW;

        // High-frequency detail magnitude (luma) = structure presence.
        const dl = Math.abs(0.299 * (r - ld[i]) + 0.587 * (g - ld[i + 1]) + 0.114 * (b - ld[i + 2]));
        const edge = dl >= EDGE ? 1 : dl * EDGEi;
        // Structure gate for hair/feature detail: 0 on noise (dl<10), full on real
        // strands/edges (dl>26). Higher floor than before so per-frame sensor noise
        // never crosses the gate (was the source of hair shimmer).
        const hairGate = dl <= 10 ? 0 : dl >= 26 ? 1 : (dl - 10) * 0.0625;

        // Per-band multipliers on the FINE detail (orig - low):
        //   - skin smoothing removes texture (skin only, inside face)
        //   - face sharpen crisps edges (inside face)
        //   - hair boost adds detail to non-skin structure (hair, lashes, brows)
        const detailExtra =
          -smooth * skinW * (1 - edge) * faceW +
          sharpen * edge * faceW +
          HAIR_AMT * nonSkin * hairGate * hairFeather;
        // Clarity (mid band) across face + hair region.
        const w = faceW > hairFeather ? faceW : hairFeather;
        const clW = (0.45 + 0.55 * edge) * CLARITY * w;

        let a0 = (od[i] - ld[i]) * detailExtra + (ld[i] - md[i]) * clW;
        let a1 = (od[i + 1] - ld[i + 1]) * detailExtra + (ld[i + 1] - md[i + 1]) * clW;
        let a2 = (od[i + 2] - ld[i + 2]) * detailExtra + (ld[i + 2] - md[i + 2]) * clW;
        // Soft-clip the added detail so no pixel spikes into a halo/noise speckle.
        a0 = a0 > CLAMP ? CLAMP : a0 < -CLAMP ? -CLAMP : a0;
        a1 = a1 > CLAMP ? CLAMP : a1 < -CLAMP ? -CLAMP : a1;
        a2 = a2 > CLAMP ? CLAMP : a2 < -CLAMP ? -CLAMP : a2;

        const o0 = od[i] + a0, o1 = od[i + 1] + a1, o2 = od[i + 2] + a2;
        od[i] = o0 < 0 ? 0 : o0 > 255 ? 255 : o0;
        od[i + 1] = o1 < 0 ? 0 : o1 > 255 ? 255 : o1;
        od[i + 2] = o2 < 0 ? 0 : o2 > 255 ? 255 : o2;
      }
    }
    wctx.putImageData(orig, 0, 0);

    // Composite back, CLIPPED to an ellipse covering the face + hair region so the
    // surrounding frame is untouched. Untouched pixels were left == original.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.35, rx * 1.5, ry * 1.85, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(work, 0, 0, ww, wh, x0, y0, bw, bh);
    ctx.restore();
  }

  private faceTmp2: HTMLCanvasElement | null = null;
  private faceMid: HTMLCanvasElement | null = null;
  private prevData: Uint8ClampedArray | null = null;

  /** Drop the temporal-denoise history (call on a seek / scene cut). */
  resetTemporal() {
    this.prevData = null;
  }

  /**
   * Temporal denoise via a motion-gated IIR. For each pixel, blend the current
   * frame toward the previous OUTPUT by `base·(1−motion)` — static pixels average
   * across frames (noise + flicker cancel), pixels in motion keep full detail so
   * nothing ghosts. One getImageData + one putImageData per frame.
   */
  private applyTemporalDenoise(ctx: CanvasRenderingContext2D, w: number, h: number, denoise: number) {
    let cur: ImageData;
    try {
      cur = ctx.getImageData(0, 0, w, h);
    } catch {
      this.prevData = null;
      return;
    }
    const cd = cur.data;
    const pd = this.prevData;
    if (pd && pd.length === cd.length) {
      const base = Math.min(0.7, 0.4 + denoise * 0.4); // history weight for static px
      const TH = 15, RANGE = 17; // motion ramp on luma diff (TH..TH+RANGE)
      for (let i = 0; i < cd.length; i += 4) {
        const dl = Math.abs(0.299 * (cd[i] - pd[i]) + 0.587 * (cd[i + 1] - pd[i + 1]) + 0.114 * (cd[i + 2] - pd[i + 2]));
        const m = dl <= TH ? 0 : dl >= TH + RANGE ? 1 : (dl - TH) / RANGE;
        const bl = base * (1 - m);
        if (bl > 0.001) {
          cd[i] += (pd[i] - cd[i]) * bl;
          cd[i + 1] += (pd[i + 1] - cd[i + 1]) * bl;
          cd[i + 2] += (pd[i + 2] - cd[i + 2]) * bl;
        }
      }
      ctx.putImageData(cur, 0, 0);
    }
    if (!this.prevData || this.prevData.length !== cd.length) {
      this.prevData = new Uint8ClampedArray(cd.length);
    }
    this.prevData.set(cd);
  }

  /**
   * Virtual studio lighting — simulates a softbox three-point setup with
   * GPU-fast canvas gradients (realtime, no per-pixel loop):
   *   1. FILL: a soft radial 'screen' over the face lifts harsh shadows (screen
   *      brightens darks far more than highlights — exactly a fill light).
   *   2. KEY:  a soft warm highlight from the upper-left (~45°) via 'soft-light'
   *      adds dimension to flat, head-on lighting.
   *   3. VIGNETTE: a gentle edge darken ('multiply') separates the subject from
   *      the wall and draws focus (the "step away from the background" look).
   */
  private applyRelight2d(ctx: CanvasRenderingContext2D, srcW: number, srcH: number, p: EnhanceParams) {
    const amt = Math.max(0, Math.min(1, p.relight ?? 0));
    if (amt <= 0) return;
    ctx.save();

    const face = p.face;
    if (face) {
      const cx = face.cx * srcW, cy = face.cy * srcH;
      const rx = face.rx * srcW, ry = face.ry * srcH;
      const R = Math.max(rx, ry);

      // 1. Fill light — lift face shadows (screen with a soft gray radial).
      const fv = Math.round(64 * amt);
      const fill = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R * 1.6);
      fill.addColorStop(0, `rgba(${fv},${fv},${fv},1)`);
      fill.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = fill;
      ctx.fillRect(cx - R * 1.7, cy - R * 1.7, R * 3.4, R * 3.4);

      // 2. Key light — soft warm highlight from the upper-left (~45°).
      const kx = cx - rx * 0.5, ky = cy - ry * 0.55;
      const key = ctx.createRadialGradient(kx, ky, 0, kx, ky, R * 1.3);
      key.addColorStop(0, `rgba(255,248,236,${0.2 * amt})`);
      key.addColorStop(1, 'rgba(255,248,236,0)');
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = key;
      ctx.fillRect(kx - R * 1.5, ky - R * 1.5, R * 3, R * 3);
    }

    // 3. Separation vignette — gentle edge darken (subject pops off the wall).
    const dark = 255 - Math.round(55 * amt);
    const vig = ctx.createRadialGradient(
      srcW / 2, srcH * 0.42, Math.min(srcW, srcH) * 0.32,
      srcW / 2, srcH * 0.5, Math.max(srcW, srcH) * 0.72
    );
    vig.addColorStop(0, 'rgba(255,255,255,1)');
    vig.addColorStop(1, `rgb(${dark},${dark},${dark})`);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, srcW, srcH);

    ctx.restore();
  }

  /** Per-pixel color grade used when ctx.filter is unavailable. */
  private applyPixelAdjust(ctx: CanvasRenderingContext2D, w: number, h: number, p: EnhanceParams) {
    let img: ImageData;
    try {
      img = ctx.getImageData(0, 0, w, h);
    } catch {
      return; // tainted
    }
    const d = img.data;
    const expo = Math.pow(2, p.exposure);
    const contrast = p.contrast;
    const sat = p.saturation;
    const wr = p.wbGain[0] * (1 + 0.3 * (p.temperature ?? 0));
    const wg = p.wbGain[1];
    const wb = p.wbGain[2] * (1 - 0.3 * (p.temperature ?? 0));
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i] * expo * wr;
      let g = d[i + 1] * expo * wg;
      let b = d[i + 2] * expo * wb;
      // contrast around mid (128)
      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;
      // saturation toward luma
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      r = luma + (r - luma) * sat;
      g = luma + (g - luma) * sat;
      b = luma + (b - luma) * sat;
      d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
      d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
    ctx.putImageData(img, 0, 0);
  }

  private resize(w: number, h: number) {
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    (this.canvas as HTMLCanvasElement).width = w;
    (this.canvas as HTMLCanvasElement).height = h;
  }

  /**
   * Measure clip-specific auto-levels (gray-world white balance + exposure
   * target) from a single frame. Run this once per clip / scene change — NOT
   * per frame. Cheap: samples a small downscale on a throwaway 2D canvas.
   */
  analyze(source: CanvasImageSource, srcW: number, srcH: number) {
    if (!srcW || !srcH) return;
    const w = 64;
    const h = Math.max(1, Math.round((srcH / srcW) * 64));
    const cvs = document.createElement('canvas');
    cvs.width = w;
    cvs.height = h;
    const ctx = cvs.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    try {
      ctx.drawImage(source, 0, 0, w, h);
    } catch {
      return;
    }
    let data: Uint8ClampedArray;
    try {
      data = ctx.getImageData(0, 0, w, h).data;
    } catch {
      return;
    }
    const n = w * h;
    // White balance from NEAR-NEUTRAL pixels only (the real lighting reference).
    // Plain gray-world fails on colored scenes: a pink wall makes it cut red and
    // boost green to "neutralize" the wall, yellow-greening the skin. By averaging
    // only low-saturation, mid-tone pixels we measure the actual cast, not the
    // intentional colors of the scene (wall, clothing, skin).
    let nr = 0, ng = 0, nb = 0, nc = 0;
    let ys = 0;
    for (let p = 0; p < data.length; p += 4) {
      const r = data[p], g = data[p + 1], b = data[p + 2];
      ys += 0.299 * r + 0.587 * g + 0.114 * b;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = mx > 4 ? (mx - mn) / mx : 0;
      const lum = (mx + mn) * 0.5;
      // Near-neutral & well-exposed → part of the lighting reference.
      if (sat < 0.18 && lum > 45 && lum < 235) {
        nr += r; ng += g; nb += b; nc++;
      }
    }

    // Conservative clamp + partial strength: never a heavy color shift.
    const clampGain = (x: number) => Math.max(0.93, Math.min(1.08, x));
    const STRENGTH = 0.6; // blend toward 1.0 so WB is a gentle nudge, not a swing
    const mix1 = (x: number) => 1 + (clampGain(x) - 1) * STRENGTH;
    // Require enough neutral pixels (>=6% of frame) to trust the estimate.
    if (nc > n * 0.06) {
      const rm = nr / nc, gm = ng / nc, bm = nb / nc;
      const gray = (rm + gm + bm) / 3;
      this.autoWb = [
        mix1(rm > 1 ? gray / rm : 1),
        mix1(gm > 1 ? gray / gm : 1),
        mix1(bm > 1 ? gray / bm : 1),
      ];
    } else {
      // No reliable neutral reference (strongly colored scene) → leave WB alone.
      this.autoWb = [1, 1, 1];
    }

    // Exposure: nudge mean luma toward ~118, capped at +/- 0.5 stops.
    const meanY = ys / n;
    const stops = Math.log2(118 / Math.max(8, meanY));
    this.autoExposure = Math.max(-0.5, Math.min(0.5, stops));
  }

  /** The auto-levels measured by analyze(), folded into a param set. */
  applyAutoLevels(params: EnhanceParams): EnhanceParams {
    return {
      ...params,
      exposure: params.exposure + this.autoExposure,
      wbGain: [
        params.wbGain[0] * this.autoWb[0],
        params.wbGain[1] * this.autoWb[1],
        params.wbGain[2] * this.autoWb[2],
      ],
    };
  }

  /**
   * Render one enhanced frame from `source` into the offscreen canvas using the
   * given params. Returns true on success; false means the caller should draw
   * the raw video instead (graceful degrade — never throws).
   */
  process(source: TexImageSource, srcW: number, srcH: number, params: EnhanceParams): boolean {
    if (!srcW || !srcH) return false;

    // Try the WebGL pass first when it is genuinely live.
    if (this.mode === 'webgl' && !this.contextLost && this.gl && this.program && this.tex) {
      if (this.processWebgl(source, srcW, srcH, params)) return true;
      // WebGL failed at RUNTIME (driver/context issue). Permanently degrade to 2D
      // so every subsequent frame uses the fallback instead of returning nothing.
      this.warnOnce('wglrt', 'WebGL draw failed at runtime; permanently switching to 2D');
      this.mode = '2d';
    }

    // 2D fallback path (always available once the constructor ran).
    if (!this.ctx2d) this.init2dFallback();
    if (!this.ctx2d) return false; // truly no 2D context (extremely rare)
    return this.process2d(source as CanvasImageSource, srcW, srcH, params);
  }

  private processWebgl(source: TexImageSource, srcW: number, srcH: number, params: EnhanceParams): boolean {
    const gl = this.gl;
    if (!gl || !this.program || !this.tex) return false;
    try {
      this.resize(srcW, srcH);
      gl.viewport(0, 0, srcW, srcH);
      gl.useProgram(this.program);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

      const u = this.uniforms;
      gl.uniform1i(u.u_tex, 0);
      gl.uniform2f(u.u_texel, 1 / srcW, 1 / srcH);
      gl.uniform1f(u.u_exposure, params.exposure);
      gl.uniform1f(u.u_contrast, params.contrast);
      gl.uniform1f(u.u_saturation, params.saturation);
      gl.uniform3f(u.u_wbGain, params.wbGain[0], params.wbGain[1], params.wbGain[2]);
      gl.uniform1f(u.u_temperature, params.temperature ?? 0);
      gl.uniform1f(u.u_denoise, params.denoise);
      gl.uniform1f(u.u_sharpen, params.sharpen);
      const f = params.face;
      gl.uniform4f(u.u_face, f ? f.cx : 0, f ? f.cy : 0, f ? f.rx : 0, f ? f.ry : 0);
      gl.uniform1f(u.u_faceSharpen, params.faceSharpen);
      gl.uniform1f(u.u_skinSmooth, params.skinSmooth);
      gl.uniform1f(u.u_relight, params.relight ?? 0);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return !gl.isContextLost();
    } catch (e) {
      this.warnOnce('process', 'WebGL frame process failed:', e);
      return false;
    }
  }

  dispose() {
    const gl = this.gl;
    if (!gl) return;
    if (this.program) gl.deleteProgram(this.program);
    if (this.tex) gl.deleteTexture(this.tex);
    this.program = null;
    this.tex = null;
    this.supported = false;
  }
}

export { NEUTRAL_PARAMS };
