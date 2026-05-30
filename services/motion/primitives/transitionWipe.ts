/**
 * transition-wipe — multi-directional wipe between two solid colors with optional text.
 * Two phases: cover screen with palette.primary, then reveal back to transparent
 * so the next beat shows through.
 *
 * Supports multiple wipe directions via params.direction:
 *   'diagonal' (default), 'left-to-right', 'top-to-bottom', 'circle-expand'
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { easeInOutCubic, clamp01, remap } from '../easing';

export const transitionWipe = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  const direction = (p.direction as string) || 'diagonal';
  const text = p.text || '';

  // Phase A (0 → 0.5): primary color sweeps in, covers screen.
  // Phase B (0.5 → 1): the band sweeps off, revealing.
  const phase = t01 < 0.5 ? easeInOutCubic(t01 / 0.5) : 1 - easeInOutCubic((t01 - 0.5) / 0.5);

  // Envelope fade — soften the in/out so we don't pop a hard black/primary
  // frame at t01=0 or t01=1.
  let envelope = 1;
  if (t01 < 0.05) envelope = t01 / 0.05;
  else if (t01 > 0.95) envelope = (1 - t01) / 0.05;
  if (envelope <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = envelope;

  // Direction-specific rendering
  if (direction === 'left-to-right') {
    drawLeftToRightWipe(ctx, phase, t01, width, height, palette, intensity);
  } else if (direction === 'top-to-bottom') {
    drawTopToBottomWipe(ctx, phase, t01, width, height, palette, intensity);
  } else if (direction === 'circle-expand') {
    drawCircleExpandWipe(ctx, phase, t01, width, height, palette, intensity);
  } else {
    // Default diagonal
    const diag = Math.hypot(width, height);
    const bandW = diag * 0.45;
    const leading = phase * (diag + bandW) - bandW;

    if (t01 < 0.5) {
      ctx.fillStyle = palette.primary;
      ctx.beginPath();
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
  }

  // Optional text overlay - wrapped and centered
  if (text) {
    drawWipeText(ctx, text, width, height, palette, envelope);
  }

  ctx.restore();
};

function drawLeftToRightWipe(
  ctx: CanvasRenderingContext2D,
  phase: number,
  t01: number,
  w: number,
  h: number,
  palette: any,
  intensity: number,
) {
  const leading = phase * w;
  if (t01 < 0.5) {
    ctx.fillStyle = palette.primary;
    ctx.fillRect(0, 0, leading, h);
  } else {
    ctx.fillStyle = palette.primary;
    ctx.fillRect(leading, 0, w - leading, h);
  }
  ctx.fillStyle = palette.accent;
  ctx.fillRect(leading - 8, 0, 12, h);
}

function drawTopToBottomWipe(
  ctx: CanvasRenderingContext2D,
  phase: number,
  t01: number,
  w: number,
  h: number,
  palette: any,
  intensity: number,
) {
  const leading = phase * h;
  if (t01 < 0.5) {
    ctx.fillStyle = palette.primary;
    ctx.fillRect(0, 0, w, leading);
  } else {
    ctx.fillStyle = palette.primary;
    ctx.fillRect(0, leading, w, h - leading);
  }
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, leading - 8, w, 12);
}

function drawCircleExpandWipe(
  ctx: CanvasRenderingContext2D,
  phase: number,
  t01: number,
  w: number,
  h: number,
  palette: any,
  intensity: number,
) {
  const cx = w / 2;
  const cy = h / 2;
  const maxDist = Math.hypot(w / 2, h / 2);
  const radius = phase * maxDist;

  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawWipeText(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
  palette: any,
  alpha: number,
) {
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;
  ctx.font = `bold ${Math.min(w, h) * 0.1}px 'Inter', 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.text;

  const maxWidth = w * 0.8;
  const lines = wrapText(text, ctx, maxWidth);
  const lineHeight = Math.min(w, h) * 0.12;
  const totalHeight = lines.length * lineHeight;
  const startY = (h - totalHeight) / 2;

  lines.forEach((line, idx) => {
    ctx.fillText(line, w / 2, startY + idx * lineHeight);
  });

  ctx.restore();
}

function wrapText(text: string, ctx: CanvasRenderingContext2D, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const measured = ctx.measureText(testLine).width;
    if (measured > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

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
