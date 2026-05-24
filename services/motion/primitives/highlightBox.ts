/**
 * highlight-box — animated corner brackets drawing onto a region,
 * with pulsing fill tint and a soft outer glow. Looks like a HUD
 * tracking reticle on a piece of footage.
 *
 * Phase A (0 → 0.3): each L-bracket strokes on at its corner.
 * Phase B (0.3 → 0.85): pulse fill alpha + occasional flash.
 * Phase C (0.85 → 1): fade out.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, remap } from '../easing';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;

export const highlightBox = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;

  const anchor = p.anchor || 'center';
  const w = width * (intensity === 3 ? 0.58 : 0.44);
  const h = height * (intensity === 3 ? 0.38 : 0.3);
  let cx = width / 2;
  let cy = height / 2;
  if (anchor === 'top') cy = height * 0.32;
  if (anchor === 'bottom') cy = height * 0.7;
  if (anchor === 'left') cx = width * 0.32;
  if (anchor === 'right') cx = width * 0.68;
  const x = cx - w / 2;
  const y = cy - h / 2;

  const drawT = easeOutCubic(clamp01(remap(t01, 0, 0.3)));
  const fadeOut = 1 - clamp01(remap(t01, 0.92, 1));
  if (fadeOut <= 0.001) return;

  const pulseT = clamp01(remap(t01, 0.3, 0.85));
  const pulse = 0.55 + 0.45 * Math.sin(pulseT * Math.PI * 4 - Math.PI / 2);

  const lineW = Math.max(3, Math.min(width, height) * 0.0055);
  const bracketLen = Math.min(w, h) * 0.22;

  ctx.save();
  ctx.globalAlpha = fadeOut;

  // Soft tint fill
  const fillT = clamp01(remap(t01, 0.1, 0.45));
  ctx.fillStyle = hexA(palette.primary, 0.1 * fillT * pulse);
  ctx.fillRect(x, y, w, h);

  // Outer glow
  ctx.save();
  ctx.shadowColor = palette.primary;
  ctx.shadowBlur = 18 * pulse;
  ctx.strokeStyle = hexA(palette.primary, 0.0); // invisible stroke just to cast shadow
  ctx.strokeRect(x, y, w, h);
  ctx.restore();

  // Four L-shaped corner brackets drawn proportional to drawT
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = lineW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const len = bracketLen * drawT;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(x, y + len);
  ctx.lineTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + w - len, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + len);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x, y + h - len);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + len, y + h);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + w - len, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - len);
  ctx.stroke();

  // Optional label
  if (p.text && drawT > 0.7) {
    const labelAlpha = clamp01(remap(t01, 0.25, 0.45)) * fadeOut;
    const labelSize = Math.min(width, height) * 0.035;
    ctx.font = `900 ${labelSize}px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Background plate
    const text = p.text.toUpperCase();
    const tw = ctx.measureText(text).width;
    const plateX = x + labelSize * 0.4;
    const plateY = y - labelSize * 1.6;
    const plateW = tw + labelSize * 0.8;
    const plateH = labelSize * 1.4;
    ctx.fillStyle = palette.primary;
    ctx.globalAlpha = labelAlpha * fadeOut;
    roundRect(ctx, plateX - labelSize * 0.2, plateY - labelSize * 0.2, plateW, plateH, 6);
    ctx.fill();
    ctx.fillStyle = palette.text;
    ctx.fillText(text, plateX + labelSize * 0.2, plateY + labelSize * 0.9);
  }

  ctx.restore();
};

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
