/**
 * hyperImpactRenderer — deterministic canvas compositor for the
 * "Hyper-Impact Bold" (Hormozi Gradient) template.
 *
 * The keyword line is filled with a vertical orange→yellow gradient, stroked in
 * black (paint-order: stroke fill), and dropped on a deep shadow. The two
 * framing lines are pure white with the same heavy stroke. Because every value
 * is drawn explicitly, the output PNG matches the live <HyperImpactPreview>
 * exactly — no reliance on an AI image model to render legible text.
 *
 * Mirrors the geometry in components/HyperImpactPreview.tsx.
 */

import { HyperImpactLines } from '../types';

export interface HyperImpactRenderOptions {
  /** Output width in px. Height is derived from the aspect ratio. Default 1280. */
  width?: number;
  /** Aspect ratio of the canvas. Default '16:9'. */
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:5' | 'ORIGINAL';
  /** Heavy condensed display font stack (Anton/Montserrat Black preloaded). */
  fontFamily?: string;
}

const KEYWORD_GRADIENT_STOPS: Array<[number, string]> = [
  [0.0, '#F97316'], // deep orange (top)
  [0.5, '#FBBF24'], // amber
  [1.0, '#FDE047'], // bright yellow (bottom)
];

const ASPECT_TO_RATIO: Record<string, number> = {
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:5': 4 / 5,
  ORIGINAL: 16 / 9,
};

function dims(width: number, aspectRatio: string): [number, number] {
  const ratio = ASPECT_TO_RATIO[aspectRatio] ?? 16 / 9;
  return [Math.round(width), Math.round(width / ratio)];
}

/**
 * Ensure the heavy display fonts are ready before measuring/drawing, so the
 * first render isn't laid out with a fallback metric.
 */
export async function ensureHyperFonts(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await Promise.all([
      (document as Document).fonts.load('900 120px Anton'),
      (document as Document).fonts.load('900 120px Montserrat'),
    ]);
    await (document as Document).fonts.ready;
  } catch {
    /* font loading is best-effort */
  }
}

/** Apply a faux-italic slant to mirror the CSS `italic` look on condensed fonts. */
function withSlant<T>(ctx: CanvasRenderingContext2D, draw: () => T): T {
  ctx.save();
  ctx.transform(1, 0, -0.12, 1, 0, 0); // skewX ≈ -7°
  const result = draw();
  ctx.restore();
  return result;
}

/** Shrink the font until the text fits within maxWidth. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  startPx: number,
  maxWidth: number,
): number {
  let size = startPx;
  ctx.font = `900 ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 8) {
    size -= 2;
    ctx.font = `900 ${size}px ${family}`;
  }
  return size;
}

interface DrawLineOpts {
  ctx: CanvasRenderingContext2D;
  text: string;
  centerX: number;
  baselineY: number;
  fontPx: number;
  family: string;
  strokePx: number;
  fill: string | CanvasGradient;
}

function drawStrokedLine({ ctx, text, centerX, baselineY, fontPx, family, strokePx, fill }: DrawLineOpts): void {
  withSlant(ctx, () => {
    ctx.font = `900 ${fontPx}px ${family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    // Deep drop shadow under the whole glyph stack.
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = fontPx * 0.06;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = fontPx * 0.05;

    // Stroke first (paint-order: stroke fill) so the fill sits cleanly on top.
    ctx.strokeStyle = '#000';
    ctx.lineWidth = strokePx;
    ctx.strokeText(text, centerX, baselineY);
    ctx.restore();

    // Fill (gradient for keyword, white for framing lines).
    ctx.fillStyle = fill;
    ctx.fillText(text, centerX, baselineY);
  });
}

/**
 * Render the Hyper-Impact Bold thumbnail to a PNG data URL.
 * Draws the (optional) subject image, a contrast scrim, then the 3 stacked lines.
 */
export async function renderHyperImpactThumbnail(
  lines: HyperImpactLines,
  backgroundImageUrl: string | null,
  options: HyperImpactRenderOptions = {},
): Promise<string> {
  const width = options.width ?? 1280;
  const aspectRatio = options.aspectRatio ?? '16:9';
  const family = options.fontFamily ?? "'Anton', 'Montserrat', 'Archivo Black', sans-serif";
  const [w, h] = dims(width, aspectRatio);

  await ensureHyperFonts();

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // ── Background ─────────────────────────────────────────────────────────
  if (backgroundImageUrl) {
    try {
      const img = await loadImage(backgroundImageUrl);
      drawCover(ctx, img, w, h);
    } catch {
      paintFallbackBg(ctx, w, h);
    }
  } else {
    paintFallbackBg(ctx, w, h);
  }

  // Contrast scrim (top + heavier bottom) — matches the preview's gradient overlay.
  const scrim = ctx.createLinearGradient(0, 0, 0, h);
  scrim.addColorStop(0, 'rgba(0,0,0,0.30)');
  scrim.addColorStop(0.5, 'rgba(0,0,0,0.05)');
  scrim.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, w, h);

  // ── Type geometry (lower-middle weighted) ──────────────────────────────
  const hook = (lines.hook || 'UNLOCK').toUpperCase();
  const keyword = (lines.keyword || 'CLAUDE').toUpperCase();
  const benefit = (lines.benefit || '$200 PLAN FREE').toUpperCase();

  const sidePad = w * 0.06;
  const maxTextWidth = w - sidePad * 2;
  // Account for the skew widening the glyph run slightly.
  const fitWidth = maxTextWidth * 0.94;

  const frameStart = h * 0.13;
  const keywordStart = h * 0.30;

  const hookPx = fitFont(ctx, hook, family, frameStart, fitWidth);
  const keywordPx = fitFont(ctx, keyword, family, keywordStart, fitWidth);
  const benefitPx = fitFont(ctx, benefit, family, frameStart, fitWidth);

  const gap = h * 0.025;
  const totalHeight = hookPx + keywordPx + benefitPx + gap * 2;
  // Anchor the block in the lower-middle (bottom padding ≈ 8%).
  let cursor = h - h * 0.08 - totalHeight;
  const centerX = w / 2;

  // Vertical gradient for the keyword, spanning that line's glyph box.
  const keywordTop = cursor + hookPx + gap;
  const keywordGradient = ctx.createLinearGradient(0, keywordTop, 0, keywordTop + keywordPx);
  for (const [stop, color] of KEYWORD_GRADIENT_STOPS) keywordGradient.addColorStop(stop, color);

  // Line 1 — hook (white)
  drawStrokedLine({
    ctx, text: hook, centerX, baselineY: cursor + hookPx,
    fontPx: hookPx, family, strokePx: Math.max(3, hookPx * 0.06), fill: '#FFFFFF',
  });
  cursor += hookPx + gap;

  // Line 2 — keyword (gradient hero)
  drawStrokedLine({
    ctx, text: keyword, centerX, baselineY: cursor + keywordPx,
    fontPx: keywordPx, family, strokePx: Math.max(5, keywordPx * 0.05), fill: keywordGradient,
  });
  cursor += keywordPx + gap;

  // Line 3 — benefit (white)
  drawStrokedLine({
    ctx, text: benefit, centerX, baselineY: cursor + benefitPx,
    fontPx: benefitPx, family, strokePx: Math.max(3, benefitPx * 0.06), fill: '#FFFFFF',
  });

  return canvas.toDataURL('image/png');
}

// ── helpers ───────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = src;
  });
}

/** Draw an image with object-fit: cover semantics. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number): void {
  const ir = img.width / img.height;
  const cr = w / h;
  let dw = w;
  let dh = h;
  let dx = 0;
  let dy = 0;
  if (ir > cr) {
    dh = h;
    dw = h * ir;
    dx = (w - dw) / 2;
  } else {
    dw = w;
    dh = w / ir;
    dy = (h - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

/** Premium dark cinematic fallback when no subject image is supplied. */
function paintFallbackBg(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h * 0.42, h * 0.1, w / 2, h * 0.5, w * 0.75);
  g.addColorStop(0, '#1c1c22');
  g.addColorStop(1, '#08080a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
