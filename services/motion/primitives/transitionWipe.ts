/**
 * transition-wipe — diagonal wipe between two solid colors.
 * Two phases: cover screen with palette.primary, then reveal back to transparent
 * so the next beat shows through.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { easeInOutCubic } from '../easing';

export const transitionWipe = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  void intensity;

  // Phase A (0 → 0.5): primary color sweeps in from top-left, covers screen.
  // Phase B (0.5 → 1): the same band sweeps off bottom-right, revealing.
  const phase = t01 < 0.5 ? easeInOutCubic(t01 / 0.5) : 1 - easeInOutCubic((t01 - 0.5) / 0.5);

  // Envelope fade — soften the in/out so we don't pop a hard black/primary
  // frame at t01=0 or t01=1.
  let envelope = 1;
  if (t01 < 0.05) envelope = t01 / 0.05;
  else if (t01 > 0.95) envelope = (1 - t01) / 0.05;
  if (envelope <= 0.01) return;

  // The band's leading edge moves along the screen diagonal.
  // We draw a thick parallelogram, then fill behind it depending on phase.
  const diag = Math.hypot(width, height);
  const bandW = diag * 0.45;
  const leading = phase * (diag + bandW) - bandW;

  ctx.save();
  ctx.globalAlpha = envelope;

  // Solid fill behind the leading edge during cover phase
  if (t01 < 0.5) {
    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    // Fill from origin out to the diagonal cutoff.
    drawDiagonalRegion(ctx, leading, width, height, 'before');
    ctx.fill();
  } else {
    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    drawDiagonalRegion(ctx, leading, width, height, 'after');
    ctx.fill();
  }

  // Trailing accent stripe along the leading edge
  ctx.fillStyle = palette.accent;
  drawDiagonalBand(ctx, leading - bandW * 0.18, leading, width, height);

  ctx.restore();
};

function drawDiagonalRegion(
  ctx: CanvasRenderingContext2D,
  d: number,
  w: number,
  h: number,
  side: 'before' | 'after',
) {
  // The diagonal cut: x + y = d * (w + h) / diag — but to keep this simple,
  // we use a 45-degree-ish line. Parametrize by t along [0, w+h].
  // A point on the line: (d, 0) -> (0, d) if d <= min(w,h); generalizes.
  // For visual purposes, treat d as a value in [0, w+h] for the sum x+y.
  const sum = d; // x + y = sum
  // Polygon vertices that cover one side of the line within the rect.
  if (side === 'before') {
    // Region where x + y <= sum
    ctx.beginPath();
    ctx.moveTo(0, 0);
    if (sum <= w) {
      ctx.lineTo(sum, 0);
      ctx.lineTo(0, sum);
    } else if (sum <= h) {
      ctx.lineTo(w, 0);
      ctx.lineTo(w, sum - w);
      ctx.lineTo(0, sum);
    } else if (sum <= w + h) {
      ctx.lineTo(w, 0);
      ctx.lineTo(w, sum - w);
      ctx.lineTo(sum - h, h);
      ctx.lineTo(0, h);
    } else {
      ctx.lineTo(w, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
    }
    ctx.closePath();
  } else {
    // Region where x + y >= sum
    ctx.beginPath();
    ctx.moveTo(w, h);
    if (sum <= w) {
      ctx.lineTo(sum, 0);
      ctx.lineTo(w, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.lineTo(0, sum);
    } else if (sum <= h) {
      ctx.lineTo(w, sum - w);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.lineTo(0, sum);
    } else if (sum <= w + h) {
      ctx.lineTo(sum - h, h);
      ctx.lineTo(w, h);
      ctx.lineTo(w, sum - w);
    } else {
      // entire rect is past the line, no fill
      return;
    }
    ctx.closePath();
  }
}

function drawDiagonalBand(
  ctx: CanvasRenderingContext2D,
  d1: number,
  d2: number,
  w: number,
  h: number,
) {
  // Two diagonal lines x+y=d1 and x+y=d2 — fill between them inside rect.
  ctx.save();
  ctx.beginPath();
  drawDiagonalRegion(ctx, d2, w, h, 'before');
  ctx.clip();
  ctx.beginPath();
  drawDiagonalRegion(ctx, d1, w, h, 'after');
  ctx.fill();
  ctx.restore();
}
