/**
 * textures — OffscreenCanvas pre-rendered soft-edge bitmap cache.
 *
 * Bakes four textures at startup: smoke (layered radial gradient blobs),
 * bokeh (lens-blur disc), lensflare (starburst core + streaks), sparkdust
 * (tight point glow). The bitmaps are reusable across all primitives.
 *
 * Call initTextures() once from MotionStage before playback starts.
 * All draw helpers are null-safe — they degrade to a no-op if called
 * before baking completes or if OffscreenCanvas is unavailable.
 */

const TEXTURE_CACHE = new Map<string, ImageBitmap>();
let _initPromise: Promise<void> | null = null;

// ── Public init (idempotent) ─────────────────────────────────────────

/**
 * Pre-bake all textures. Fire-and-forget from MotionStage on mount.
 * Returns the same promise on repeated calls — never double-bakes.
 */
export function initTextures(): Promise<void> {
  if (_initPromise) return _initPromise;
  _initPromise = _bakeAll().catch(() => {
    // OffscreenCanvas unavailable or createImageBitmap missing — silent degrade
  });
  return _initPromise;
}

async function _bakeAll(): Promise<void> {
  const [smoke, bokeh, lensflare, sparkdust] = await Promise.all([
    _bakeSmoke(128),
    _bakeBokeh(64),
    _bakeLensFlare(256),
    _bakeSparkDust(96),
  ]);
  TEXTURE_CACHE.set('smoke', smoke);
  TEXTURE_CACHE.set('bokeh', bokeh);
  TEXTURE_CACHE.set('lensflare', lensflare);
  TEXTURE_CACHE.set('sparkdust', sparkdust);
}

// ── Bake functions ───────────────────────────────────────────────────

async function _oc(size: number): Promise<[OffscreenCanvas, OffscreenCanvasRenderingContext2D]> {
  const oc = new OffscreenCanvas(size, size);
  const g = oc.getContext('2d');
  if (!g) throw new Error('OffscreenCanvas 2d unavailable');
  return [oc, g];
}

async function _bakeSmoke(size: number): Promise<ImageBitmap> {
  const [oc, g] = await _oc(size);
  // 6 overlapping blobs at different offsets = organic cloud shape
  const configs = [
    [0, 0, 0.42], [0.14, -0.10, 0.36], [-0.18, 0.12, 0.34],
    [0.06, 0.22, 0.30], [-0.10, -0.18, 0.32], [0.20, 0.14, 0.28],
  ];
  for (const [ox, oy, rFrac] of configs) {
    const cx = size / 2 + (ox as number) * size;
    const cy = size / 2 + (oy as number) * size;
    const r = (rFrac as number) * size;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.065)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.03)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
  }
  return createImageBitmap(oc);
}

async function _bakeBokeh(size: number): Promise<ImageBitmap> {
  const [oc, g] = await _oc(size);
  const c = size / 2;
  const gr = g.createRadialGradient(c, c, 0, c, c, c);
  gr.addColorStop(0,    'rgba(255,255,255,0.95)');
  gr.addColorStop(0.30, 'rgba(255,255,255,0.65)');
  gr.addColorStop(0.65, 'rgba(255,255,255,0.15)');
  gr.addColorStop(0.88, 'rgba(255,255,255,0.04)');
  gr.addColorStop(1,    'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
  // Soft aperture ring (lens diffraction)
  g.strokeStyle = 'rgba(255,255,255,0.18)';
  g.lineWidth = size * 0.055;
  g.beginPath(); g.arc(c, c, c * 0.76, 0, Math.PI * 2); g.stroke();
  return createImageBitmap(oc);
}

async function _bakeLensFlare(size: number): Promise<ImageBitmap> {
  const [oc, g] = await _oc(size);
  const c = size / 2;
  // Core radial glow
  const gr = g.createRadialGradient(c, c, 0, c, c, c);
  gr.addColorStop(0,    'rgba(255,255,255,1)');
  gr.addColorStop(0.06, 'rgba(255,255,255,0.92)');
  gr.addColorStop(0.18, 'rgba(255,250,230,0.38)');
  gr.addColorStop(0.45, 'rgba(255,240,200,0.08)');
  gr.addColorStop(1,    'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);

  // Cross-shaped lens streaks (horizontal + vertical)
  for (const angle of [0, Math.PI / 2]) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const sg = g.createLinearGradient(
      c - cos * c, c - sin * c,
      c + cos * c, c + sin * c,
    );
    sg.addColorStop(0,    'rgba(255,255,255,0)');
    sg.addColorStop(0.42, 'rgba(255,255,255,0.35)');
    sg.addColorStop(0.5,  'rgba(255,255,255,0.55)');
    sg.addColorStop(0.58, 'rgba(255,255,255,0.35)');
    sg.addColorStop(1,    'rgba(255,255,255,0)');
    g.save();
    g.translate(c, c); g.rotate(angle); g.translate(-c, -c);
    g.fillStyle = sg;
    g.fillRect(0, c - size * 0.022, size, size * 0.044);
    g.restore();
  }

  // 8 radial spike lines
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const len = i % 2 === 0 ? c * 0.82 : c * 0.55;
    const sg = g.createLinearGradient(c, c, c + Math.cos(a) * len, c + Math.sin(a) * len);
    sg.addColorStop(0, 'rgba(255,255,255,0.4)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = sg;
    g.lineWidth = i % 2 === 0 ? size * 0.018 : size * 0.009;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(c, c);
    g.lineTo(c + Math.cos(a) * len, c + Math.sin(a) * len);
    g.stroke();
  }
  return createImageBitmap(oc);
}

async function _bakeSparkDust(size: number): Promise<ImageBitmap> {
  const [oc, g] = await _oc(size);
  const c = size / 2;
  // Very tight, bright core → warm falloff
  const gr = g.createRadialGradient(c, c, 0, c, c, c);
  gr.addColorStop(0,    'rgba(255,255,255,1)');
  gr.addColorStop(0.12, 'rgba(255,255,220,0.85)');
  gr.addColorStop(0.30, 'rgba(255,220,150,0.30)');
  gr.addColorStop(0.60, 'rgba(255,200,100,0.06)');
  gr.addColorStop(1,    'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.beginPath(); g.arc(c, c, c, 0, Math.PI * 2); g.fill();
  return createImageBitmap(oc);
}

// ── Null-safe draw helpers ───────────────────────────────────────────

/** Draw soft smoke cloud — silently skips if texture not loaded. */
export function drawSmoke(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number,
  alpha: number,
): void {
  const bmp = TEXTURE_CACHE.get('smoke');
  if (!bmp) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(bmp, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
}

/** Draw soft bokeh disc with additive blend. */
export function drawBokeh(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number,
  alpha: number,
): void {
  const bmp = TEXTURE_CACHE.get('bokeh');
  if (!bmp) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.drawImage(bmp, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
}

/** Draw lens flare starburst with additive blend. */
export function drawLensFlare(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number,
  alpha: number,
): void {
  const bmp = TEXTURE_CACHE.get('lensflare');
  if (!bmp) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.drawImage(bmp, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
}

/** Draw tight sparkle point glow with additive blend. */
export function drawSparkDust(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  size: number,
  alpha: number,
): void {
  const bmp = TEXTURE_CACHE.get('sparkdust');
  if (!bmp) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  ctx.drawImage(bmp, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
}
