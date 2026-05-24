import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, remap, easeInOutCubic } from '../easing';

// Pixel grid config
const COLS = 24;
const ROWS_BASE = 14;

// Deterministic per-pixel reveal threshold using LCG shuffle
function pixelThreshold(col: number, row: number, cols: number, rows: number): number {
  // Spread pixels based on a shuffled index so reveals look random not sequential
  const idx = row * cols + col;
  // LCG — gives good visual randomness
  const n = ((idx * 1103515245 + 12345) >>> 8) % (cols * rows);
  return n / (cols * rows);
}

export const pixelTransition = (
  { ctx, width: W, height: H, t01, palette }: PrimitiveContext,
  params: PrimitiveParams,
): void => {
  const label = params.text ?? '';

  // Adjust row count to match aspect ratio
  const rows = Math.round(ROWS_BASE * (H / W) * (COLS / ROWS_BASE));
  const cols = COLS;

  const cellW = W / cols;
  const cellH = H / rows;

  // Phase: dissolve IN (pixels appear 0→0.5), hold with reveal (0.5), dissolve OUT (0.5→1.0)
  const dissolveIn  = clamp01(remap(t01, 0.00, 0.40));
  const dissolveOut = clamp01(remap(t01, 0.60, 1.00));

  // progress drives how many pixels are visible (0 = none, 1 = all)
  const progress = easeInOutCubic(dissolveIn) * (1 - easeInOutCubic(dissolveOut));

  if (progress < 0.002) return;

  ctx.save();

  // ── Pixel grid ──────────────────────────────────────────────────────────────
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const threshold = pixelThreshold(c, r, cols, rows);

      // A pixel is ON when progress > threshold
      if (progress <= threshold) continue;

      // How far past threshold (used for per-pixel fade in)
      const localP = clamp01((progress - threshold) / 0.15);

      const px = c * cellW;
      const py = r * cellH;

      // Colour: mix between palette colours in a checker pattern for retro feel
      const checker = (r + c) % 3;
      const baseColor = checker === 0 ? palette.primary
                      : checker === 1 ? palette.accent
                      : palette.secondary;

      ctx.globalAlpha = localP * (0.85 + ((r * 7 + c * 11) % 100) / 1000 * 0.15);
      ctx.fillStyle = baseColor;

      // Pixels shrink/grow: start as tiny dot, expand to full cell
      const scale = 0.15 + localP * 0.85;
      const pw = cellW * scale;
      const ph = cellH * scale;
      const ox = (cellW - pw) / 2;
      const oy = (cellH - ph) / 2;

      ctx.fillRect(px + ox, py + oy, pw, ph);
    }
  }

  ctx.restore();

  // ── Central text reveal ─────────────────────────────────────────────────────
  if (label) {
    const textFade = clamp01(remap(progress, 0.50, 0.85));
    if (textFade < 0.01) return;

    ctx.save();
    const fs = Math.min(W * 0.07, H * 0.10, 72);
    ctx.font = `900 ${fs}px 'Segoe UI', 'Arial Black', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Pixel-art style: hard black shadow offset
    const shadowOff = Math.round(fs * 0.06);
    ctx.globalAlpha = textFade * 0.9;
    ctx.fillStyle = '#000000';
    ctx.fillText(label, W / 2 + shadowOff, H / 2 + shadowOff);

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = textFade;
    ctx.fillText(label, W / 2, H / 2);

    ctx.restore();
  }
};
