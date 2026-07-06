/**
 * bg-gradient-pulse — full-screen radial gradient that breathes.
 * Drawn underneath everything else (call early in layer order).
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { lerp, pulse } from '../easing';
import { hexA } from '../decorations';

export const bgGradientPulse = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;

  // Two slow cycles across the beat
  const phase = t01 * Math.PI * 2;
  const breath = 0.5 + 0.5 * Math.sin(phase);
  // Envelope: fade in start 8%, fade out last 8%
  let envelope = 1;
  if (t01 < 0.08) envelope = t01 / 0.08;
  if (t01 > 0.92) envelope = (1 - t01) / 0.08;

  // Drifting center for organic feel
  const cx = width * (0.5 + 0.15 * Math.sin(phase * 0.7));
  const cy = height * (0.5 + 0.15 * Math.cos(phase * 0.9));

  const maxR = Math.hypot(width, height) * 0.85;
  const r = lerp(maxR * 0.6, maxR, breath);

  const baseAlpha = intensity === 3 ? 0.55 : intensity === 1 ? 0.25 : 0.4;
  const a = baseAlpha * envelope * (0.7 + 0.3 * breath);

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, hexA(palette.primary, a));
  grad.addColorStop(0.55, hexA(palette.secondary, a * 0.55));
  grad.addColorStop(1, hexA(palette.bg, 0));

  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Subtle secondary blob for depth
  if (intensity >= 2) {
    const cx2 = width * (0.5 - 0.2 * Math.sin(phase * 0.7));
    const cy2 = height * (0.5 - 0.2 * Math.cos(phase * 0.9));
    const grad2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, r * 0.6);
    grad2.addColorStop(0, hexA(palette.accent, a * 0.6));
    grad2.addColorStop(1, hexA(palette.bg, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
  // pulse() ref keeps tree-shaker honest; not yet used.
  void pulse;
};
