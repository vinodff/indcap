/**
 * light-sweep — diagonal light beam that sweeps across the frame.
 *
 * A rotated bright-white-tinted parallelogram with screen-blend composition,
 * plus a soft glow ahead of and behind the beam. Reads as if a real light
 * just panned across the scene.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeInOutCubic, lerp, remap } from '../easing';
import { hexA } from '../decorations';

export const lightSweep = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;

  // The beam crosses from off-left to off-right diagonally over the beat.
  // Centered at 0.5 t for the meatiest light. Fade in/out at the ends.
  const sweepT = easeInOutCubic(clamp01(t01));
  const envelope = Math.sin(clamp01(t01) * Math.PI); // 0 → 1 → 0
  const visible = envelope;
  if (visible < 0.005) return;

  const diag = Math.hypot(width, height);
  const beamW = diag * (intensity === 3 ? 0.18 : intensity === 1 ? 0.08 : 0.13);
  const angle = -Math.PI / 6; // -30deg tilt

  // Center x of the beam interpolates across [-beamW, width + beamW]
  const cx = lerp(-beamW, width + beamW, sweepT);
  const cy = height / 2;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Translate to beam center, rotate, and draw a tall gradient strip.
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  const halfH = diag; // tall enough to span the frame regardless of rotation
  const grad = ctx.createLinearGradient(-beamW, 0, beamW, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.35, hexA(palette.text, 0.45 * visible));
  grad.addColorStop(0.5, hexA(palette.text, 0.95 * visible));
  grad.addColorStop(0.65, hexA(palette.text, 0.45 * visible));
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(-beamW, -halfH, beamW * 2, halfH * 2);

  // Hot core: thin bright bar at beam center
  const coreW = beamW * 0.18;
  const coreGrad = ctx.createLinearGradient(-coreW, 0, coreW, 0);
  coreGrad.addColorStop(0, 'rgba(255,255,255,0)');
  coreGrad.addColorStop(0.5, `rgba(255,255,255,${0.85 * visible})`);
  coreGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = coreGrad;
  ctx.fillRect(-coreW, -halfH, coreW * 2, halfH * 2);

  // Subtle color tint near the leading edge
  ctx.globalCompositeOperation = 'lighter';
  const tintGrad = ctx.createLinearGradient(0, 0, beamW * 0.8, 0);
  tintGrad.addColorStop(0, hexA(palette.accent, 0.45 * visible));
  tintGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = tintGrad;
  ctx.fillRect(0, -halfH, beamW * 0.8, halfH * 2);

  ctx.restore();
};
