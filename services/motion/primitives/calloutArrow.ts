/**
 * callout-arrow — a label pill with a curved arrow stem pointing to a target.
 *
 * Layout depends on anchor: the label sits in one corner, the arrow stem
 * curves toward the opposite area. Stem draws on first, head pops on, label
 * fades in after the stem finishes.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, easeOutElastic, lerp, remap } from '../easing';
import { resolveIcon } from '../icons';
import { hexA, roundRect } from '../decorations';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;

interface Layout {
  labelX: number;
  labelY: number;
  ctrlX: number;
  ctrlY: number;
  tipX: number;
  tipY: number;
  headAngle: number;
}

const layoutFor = (w: number, h: number, anchor: PrimitiveParams['anchor']): Layout => {
  switch (anchor) {
    case 'top':
      return { labelX: w * 0.18, labelY: h * 0.18, ctrlX: w * 0.35, ctrlY: h * 0.4, tipX: w * 0.5, tipY: h * 0.6, headAngle: Math.PI / 2 + 0.25 };
    case 'bottom':
      return { labelX: w * 0.18, labelY: h * 0.82, ctrlX: w * 0.35, ctrlY: h * 0.6, tipX: w * 0.5, tipY: h * 0.4, headAngle: -Math.PI / 2 + 0.25 };
    case 'left':
      return { labelX: w * 0.18, labelY: h * 0.5, ctrlX: w * 0.32, ctrlY: h * 0.42, tipX: w * 0.46, tipY: h * 0.5, headAngle: 0 + 0.1 };
    case 'right':
      return { labelX: w * 0.82, labelY: h * 0.5, ctrlX: w * 0.68, ctrlY: h * 0.42, tipX: w * 0.54, tipY: h * 0.5, headAngle: Math.PI - 0.1 };
    default:
      return { labelX: w * 0.78, labelY: h * 0.22, ctrlX: w * 0.62, ctrlY: h * 0.36, tipX: w * 0.48, tipY: h * 0.5, headAngle: Math.PI / 4 + 0.4 };
  }
};

const sampleCurve = (l: Layout, t: number) => {
  const omt = 1 - t;
  return {
    x: omt * omt * l.labelX + 2 * omt * t * l.ctrlX + t * t * l.tipX,
    y: omt * omt * l.labelY + 2 * omt * t * l.ctrlY + t * t * l.tipY,
  };
};

export const calloutArrow = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  const text = p.text || 'Look at this';
  const anchor = p.anchor || 'center';
  const layout = layoutFor(width, height, anchor);

  const stemT = easeOutCubic(clamp01(remap(t01, 0, 0.35)));
  const headT = easeOutElastic(clamp01(remap(t01, 0.32, 0.55)));
  const labelT = clamp01(remap(t01, 0.4, 0.65));
  const fadeOut = 1 - clamp01(remap(t01, 0.9, 1));
  if (fadeOut <= 0.001) return;

  const baseFont = Math.max(18, Math.min(width, height) * (intensity === 3 ? 0.05 : intensity === 1 ? 0.035 : 0.042));
  const lineW = Math.max(3, baseFont * 0.18);

  ctx.save();
  ctx.globalAlpha = fadeOut;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outer glow stroke under the main stem
  ctx.save();
  ctx.strokeStyle = hexA(palette.primary, 0.4);
  ctx.lineWidth = lineW * 2.4;
  ctx.shadowColor = palette.primary;
  ctx.shadowBlur = lineW * 3;
  drawPartialCurve(ctx, layout, stemT);
  ctx.stroke();
  ctx.restore();

  // Main stem
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = lineW;
  drawPartialCurve(ctx, layout, stemT);
  ctx.stroke();

  // Arrowhead at tip
  if (stemT > 0.85 && headT > 0.02) {
    const headSize = baseFont * 0.9 * headT;
    ctx.save();
    ctx.translate(layout.tipX, layout.tipY);
    ctx.rotate(layout.headAngle);
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

  // Label pill at start of the curve
  if (labelT > 0.01) {
    ctx.globalAlpha = fadeOut * easeOutCubic(labelT);
    ctx.font = `900 ${baseFont}px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = text.toUpperCase();
    const measured = ctx.measureText(label).width;
    const iconStr = p.icon ? resolveIcon(p.icon) : '';
    const iconW = iconStr ? baseFont * 1.2 : 0;
    const padX = baseFont * 0.7;
    const plateW = measured + padX * 2 + iconW;
    const plateH = baseFont * 1.7;
    const plateX = layout.labelX - plateW / 2;
    const plateY = layout.labelY - plateH / 2;

    // Plate background
    ctx.fillStyle = palette.primary;
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = baseFont * 0.6;
    ctx.shadowOffsetY = baseFont * 0.15;
    roundRect(ctx, plateX, plateY, plateW, plateH, plateH * 0.5);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Icon (if any) inside the pill
    if (iconStr) {
      ctx.font = `${baseFont * 1.05}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
      ctx.fillStyle = palette.text;
      ctx.fillText(iconStr, plateX + padX + iconW * 0.5, layout.labelY);
    }

    // Label text
    ctx.font = `900 ${baseFont}px ${FONT_STACK}`;
    ctx.fillStyle = palette.text;
    ctx.fillText(label, plateX + padX + iconW + measured / 2, layout.labelY + 1);
  }

  ctx.restore();
};

function drawPartialCurve(ctx: CanvasRenderingContext2D, l: Layout, t: number) {
  if (t <= 0.001) {
    ctx.beginPath();
    return;
  }
  const segs = 50;
  ctx.beginPath();
  const first = sampleCurve(l, 0);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i <= segs; i++) {
    const u = (i / segs) * t;
    const pt = sampleCurve(l, u);
    ctx.lineTo(pt.x, pt.y);
  }
}



// Keep tree-shaker honest with lerp (used by other primitives but imported here for parity).
void lerp;
