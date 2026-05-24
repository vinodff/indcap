/**
 * ripple — Magic UI / Aceternity "Ripple" port.
 *
 * Concentric expanding rings radiate from a point (anchor-controlled).
 * Each ring fades + expands at staggered phase offsets. Drawn additively
 * so it lights up content underneath.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, lerp } from '../easing';

export const ripple = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  const anchor = p.anchor || 'center';

  const cx = anchor === 'left' ? width * 0.3 : anchor === 'right' ? width * 0.7 : width / 2;
  const cy = anchor === 'top' ? height * 0.3 : anchor === 'bottom' ? height * 0.7 : height / 2;

  const ringCount = intensity === 3 ? 7 : intensity === 1 ? 4 : 6;
  const maxR = Math.min(width, height) * 0.55;
  const minR = Math.min(width, height) * 0.04;

  const visible = clamp01(1 - clamp01((t01 - 0.9) / 0.1));

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < ringCount; i++) {
    // Stagger phase per ring; loops twice across the beat.
    const phase = ((t01 * 2 + i / ringCount) % 1);
    const eased = easeOutCubic(phase);
    const r = lerp(minR, maxR, eased);
    const ringAlpha = (1 - eased) * 0.85 * visible;
    if (ringAlpha < 0.02) continue;

    // Color cycles between primary / accent based on ring index
    const c = i % 2 === 0 ? palette.primary : palette.accent;

    // Outer glow ring
    ctx.strokeStyle = hexA(c, ringAlpha * 0.45);
    ctx.lineWidth = Math.max(4, r * 0.07);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner crisp ring
    ctx.strokeStyle = hexA(c, ringAlpha);
    ctx.lineWidth = Math.max(2, r * 0.02);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Centre bright dot — anchor of the ripples
  const coreAlpha = (0.7 + 0.3 * Math.sin(t01 * Math.PI * 8)) * visible;
  const coreR = Math.min(width, height) * 0.018;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 4);
  grad.addColorStop(0, hexA(palette.accent, coreAlpha));
  grad.addColorStop(1, hexA(palette.accent, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(cx - coreR * 4, cy - coreR * 4, coreR * 8, coreR * 8);
  ctx.fillStyle = `rgba(255,255,255,${coreAlpha})`;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(255,255,255,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
