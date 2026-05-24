/**
 * bar-reveal — animated horizontal bar that fills from 0 to a target
 * percentage, with a counter ticking up alongside.
 *
 * Extracts target percentage from params.text. Examples:
 *   "78% growth"  → bar fills to 78%, label shows "GROWTH"
 *   "$3M revenue" → bar fills to 100% (numeric but not %), label "REVENUE"
 *   "1.5x faster" → bar fills to 100% relative target
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, easeOutElastic, lerp, remap } from '../easing';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;

interface Parsed {
  value: number;
  /** percent fill 0..1 for the bar */
  fillRatio: number;
  unit: string;
  label: string;
  /** What to display as the number portion */
  display: (current: number) => string;
}

const parse = (raw: string): Parsed => {
  const m = raw.match(/(-?\d[\d,]*\.?\d*)\s*(%|x|×|k|m|b)?/i);
  const fallback: Parsed = { value: 50, fillRatio: 0.5, unit: '%', label: '', display: (c) => Math.round(c).toString() };
  if (!m) return fallback;
  const num = parseFloat(m[1].replace(/,/g, ''));
  if (!Number.isFinite(num)) return fallback;
  const unit = (m[2] || '').toLowerCase();
  const idx = raw.indexOf(m[0]);
  const label = (raw.slice(0, idx) + ' ' + raw.slice(idx + m[0].length))
    .replace(/\s+/g, ' ')
    .trim();
  let fillRatio = 0.5;
  if (unit === '%') fillRatio = clamp01(num / 100);
  else if (unit === 'x' || unit === '×') fillRatio = clamp01(num / 10); // 10x = full bar
  else if (num > 0) fillRatio = clamp01(num / 100);
  return {
    value: num,
    fillRatio: Math.max(0.05, fillRatio),
    unit,
    label,
    display: (c) => {
      const v = c;
      if (Math.abs(num) >= 1000) return Math.round(v).toLocaleString('en-US');
      const dec = (m[1].split('.')[1] || '').length;
      return dec > 0 ? v.toFixed(dec) : Math.round(v).toString();
    },
  };
};

export const barReveal = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  const parsed = parse(p.text || '78% growth');

  const fadeIn = easeOutCubic(clamp01(remap(t01, 0, 0.18)));
  const fillT = easeOutCubic(clamp01(remap(t01, 0.1, 0.75)));
  const fadeOut = 1 - clamp01(remap(t01, 0.9, 1));
  if (fadeIn * fadeOut <= 0.001) return;

  ctx.save();
  ctx.globalAlpha = fadeIn * fadeOut;

  // Geometry: a wide bar with a number above and label below
  const barW = width * (intensity === 3 ? 0.66 : intensity === 1 ? 0.52 : 0.6);
  const barH = Math.max(28, Math.min(width, height) * 0.05);
  const cx = width / 2;
  const cy = height / 2;
  const barX = cx - barW / 2;
  const barY = cy + Math.min(width, height) * 0.02;
  const r = barH * 0.45;

  const numberSize = Math.min(width, height) * (intensity === 3 ? 0.16 : intensity === 1 ? 0.11 : 0.13);
  const labelSize = numberSize * 0.24;

  // Big animated number above bar
  const popT = clamp01(remap(t01, 0, 0.2));
  const popScale = lerp(0.65, 1, easeOutElastic(popT));
  ctx.save();
  ctx.translate(cx, cy - numberSize * 0.45);
  ctx.scale(popScale, popScale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${numberSize}px ${FONT_STACK}`;
  ctx.fillStyle = palette.primary;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = numberSize * 0.22;
  ctx.shadowOffsetY = numberSize * 0.06;
  const current = lerp(0, parsed.value, fillT);
  const unitSuffix = parsed.unit === '%' ? '%' : parsed.unit === 'x' || parsed.unit === '×' ? 'x' : parsed.unit ? parsed.unit.toUpperCase() : '';
  ctx.fillText(parsed.display(current) + unitSuffix, 0, 0);
  ctx.restore();

  // Bar background track
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRect(ctx, barX, barY, barW, barH, r);
  ctx.fill();

  // Bar fill — gradient + glow
  const fillW = barW * parsed.fillRatio * fillT;
  if (fillW > 1) {
    ctx.save();
    roundRect(ctx, barX, barY, barW, barH, r);
    ctx.clip();
    const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    grad.addColorStop(0, palette.accent);
    grad.addColorStop(1, palette.primary);
    ctx.fillStyle = grad;
    ctx.shadowColor = palette.primary;
    ctx.shadowBlur = barH * 0.6;
    ctx.fillRect(barX, barY, fillW, barH);

    // Bright leading edge highlight
    const edgeX = barX + fillW;
    const edgeGrad = ctx.createLinearGradient(edgeX - barH * 0.6, 0, edgeX, 0);
    edgeGrad.addColorStop(0, 'rgba(255,255,255,0)');
    edgeGrad.addColorStop(1, 'rgba(255,255,255,0.65)');
    ctx.fillStyle = edgeGrad;
    ctx.shadowColor = 'transparent';
    ctx.fillRect(edgeX - barH * 0.6, barY, barH * 0.6, barH);
    ctx.restore();
  }

  // Tick marks underneath every 25%
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const tx = barX + (barW * i) / 4;
    ctx.beginPath();
    ctx.moveTo(tx, barY + barH + 2);
    ctx.lineTo(tx, barY + barH + 8);
    ctx.stroke();
  }

  // Label under the bar
  if (parsed.label) {
    const labelT = clamp01(remap(t01, 0.2, 0.4));
    if (labelT > 0.01) {
      ctx.globalAlpha = fadeIn * fadeOut * easeOutCubic(labelT);
      ctx.font = `900 ${labelSize}px ${FONT_STACK}`;
      ctx.fillStyle = palette.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(parsed.label.toUpperCase(), cx, barY + barH + 16);
    }
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
