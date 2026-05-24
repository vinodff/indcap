/**
 * animated-arrow — hand-drawn-style arrow that strokes onto screen,
 * arrowhead scales in, then bobs to point at something.
 *
 * Direction is set via params.anchor:
 *   top    → curves from bottom-right up to center, pointing UP
 *   bottom → curves from top-right down to center, pointing DOWN
 *   left   → curves from right side to center, pointing LEFT
 *   right  → curves from left side to center, pointing RIGHT
 *   center → curves from off-screen top-left to slightly off-center, pointing DOWN-RIGHT
 *
 * Strokes a quadratic curve (drawn progressively via line dash), then
 * stamps an arrowhead that scales in with elastic.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, easeOutElastic, lerp, remap } from '../easing';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;

interface Path {
  startX: number;
  startY: number;
  ctrlX: number;
  ctrlY: number;
  endX: number;
  endY: number;
  /** angle (radians) the arrowhead should rotate to */
  headAngle: number;
  labelX: number;
  labelY: number;
}

const computePath = (w: number, h: number, anchor: PrimitiveParams['anchor']): Path => {
  switch (anchor) {
    case 'top':
      return {
        startX: w * 0.85,
        startY: h * 0.78,
        ctrlX: w * 0.72,
        ctrlY: h * 0.35,
        endX: w * 0.52,
        endY: h * 0.18,
        headAngle: -Math.PI / 2 - 0.3,
        labelX: w * 0.86,
        labelY: h * 0.84,
      };
    case 'bottom':
      return {
        startX: w * 0.85,
        startY: h * 0.18,
        ctrlX: w * 0.72,
        ctrlY: h * 0.55,
        endX: w * 0.52,
        endY: h * 0.78,
        headAngle: Math.PI / 2 + 0.3,
        labelX: w * 0.86,
        labelY: h * 0.12,
      };
    case 'left':
      return {
        startX: w * 0.86,
        startY: h * 0.62,
        ctrlX: w * 0.55,
        ctrlY: h * 0.42,
        endX: w * 0.22,
        endY: h * 0.5,
        headAngle: Math.PI - 0.1,
        labelX: w * 0.84,
        labelY: h * 0.7,
      };
    case 'right':
      return {
        startX: w * 0.14,
        startY: h * 0.62,
        ctrlX: w * 0.45,
        ctrlY: h * 0.42,
        endX: w * 0.78,
        endY: h * 0.5,
        headAngle: 0 + 0.1,
        labelX: w * 0.1,
        labelY: h * 0.7,
      };
    default:
      // center: arrow from top-left toward the middle
      return {
        startX: w * 0.12,
        startY: h * 0.2,
        ctrlX: w * 0.35,
        ctrlY: h * 0.3,
        endX: w * 0.48,
        endY: h * 0.48,
        headAngle: Math.PI / 4,
        labelX: w * 0.04,
        labelY: h * 0.14,
      };
  }
};

const sampleCurve = (path: Path, t: number) => {
  // Quadratic Bezier
  const omt = 1 - t;
  const x = omt * omt * path.startX + 2 * omt * t * path.ctrlX + t * t * path.endX;
  const y = omt * omt * path.startY + 2 * omt * t * path.ctrlY + t * t * path.endY;
  return { x, y };
};

export const animatedArrow = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  const anchor = p.anchor || 'center';

  // Stroke-on (0 → 0.35), head scale (0.35 → 0.55), bob (0.55 → 0.9), fade (0.9 → 1)
  const strokeT = easeOutCubic(clamp01(remap(t01, 0, 0.35)));
  const headT = easeOutElastic(clamp01(remap(t01, 0.35, 0.55)));
  const bobPhase = clamp01(remap(t01, 0.55, 0.9));
  const fadeOut = 1 - clamp01(remap(t01, 0.9, 1));
  if (fadeOut <= 0.001) return;

  const path = computePath(width, height, anchor);

  // Bob: small oscillation along the arrow's pointing direction
  const bobAmp = Math.min(width, height) * 0.012;
  const bobOffset = bobPhase > 0 ? Math.sin(bobPhase * Math.PI * 4) * bobAmp : 0;
  const bx = Math.cos(path.headAngle) * bobOffset;
  const by = Math.sin(path.headAngle) * bobOffset;

  ctx.save();
  ctx.globalAlpha = fadeOut;

  const lineW = Math.max(4, Math.min(width, height) * (intensity === 3 ? 0.014 : intensity === 1 ? 0.008 : 0.011));

  // Outer glow stroke
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = hexA(palette.accent, 0.55);
  ctx.lineWidth = lineW * 2.5;
  ctx.shadowColor = palette.accent;
  ctx.shadowBlur = lineW * 4;
  drawPartialCurve(ctx, path, strokeT, bx, by);
  ctx.stroke();
  ctx.restore();

  // Main stroke
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = lineW;
  drawPartialCurve(ctx, path, strokeT, bx, by);
  ctx.stroke();

  // Arrowhead — only after stroke completes its main mass
  if (strokeT > 0.7 && headT > 0.01) {
    const tip = sampleCurve(path, 1);
    const headSize = lineW * 6 * headT;
    ctx.save();
    ctx.translate(tip.x + bx, tip.y + by);
    ctx.rotate(path.headAngle);
    ctx.fillStyle = palette.primary;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-headSize * 1.4, -headSize * 0.55);
    ctx.lineTo(-headSize * 0.95, 0);
    ctx.lineTo(-headSize * 1.4, headSize * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Label near the arrow tail
  if (p.text && t01 > 0.4) {
    const labelAlpha = clamp01(remap(t01, 0.4, 0.6)) * fadeOut;
    ctx.globalAlpha = labelAlpha * fadeOut;
    const labelSize = Math.min(width, height) * 0.035;
    ctx.font = `900 ${labelSize}px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Background plate for the label
    const plateW = ctx.measureText(p.text.toUpperCase()).width + labelSize * 0.8;
    const plateH = labelSize * 1.6;
    ctx.fillStyle = palette.primary;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = labelSize * 0.4;
    roundRect(ctx, path.labelX - plateW / 2, path.labelY - plateH / 2, plateW, plateH, labelSize * 0.3);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = palette.text;
    ctx.fillText(p.text.toUpperCase(), path.labelX, path.labelY);
  }

  ctx.restore();
};

function drawPartialCurve(
  ctx: CanvasRenderingContext2D,
  path: Path,
  t: number,
  ox: number,
  oy: number,
) {
  if (t <= 0.001) {
    ctx.beginPath();
    return;
  }
  // Sample the curve at high resolution and draw points up to t.
  const segs = 60;
  const cut = Math.max(2, Math.floor(segs * t));
  ctx.beginPath();
  const first = sampleCurve(path, 0);
  ctx.moveTo(first.x + ox, first.y + oy);
  for (let i = 1; i <= cut; i++) {
    const u = (i / segs) * t * segs / cut;
    // u progresses from 0 to t exactly
    const real = (i / cut) * t;
    const pt = sampleCurve(path, real);
    void u;
    ctx.lineTo(pt.x + ox, pt.y + oy);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(255,255,255,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
