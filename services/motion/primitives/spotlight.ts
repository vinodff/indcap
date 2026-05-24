/**
 * spotlight — Aceternity UI "Spotlight" / "Lamp Effect" port.
 *
 * A directional volumetric light beam emanating from one corner (anchor),
 * with falloff into a soft halo. Drawn additively. Subtle drift over time
 * gives a "live stage light" feel.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, lerp } from '../easing';

export const spotlight = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  const anchor = p.anchor || 'top';

  // Origin point of the beam — outside the frame for a "lamp pointing in" look
  let originX = width * 0.5;
  let originY = -height * 0.2;
  let aimX = width * 0.5;
  let aimY = height * 0.6;
  switch (anchor) {
    case 'top':
      originX = width * 0.5; originY = -height * 0.2;
      aimX = width * 0.5; aimY = height * 0.6;
      break;
    case 'bottom':
      originX = width * 0.5; originY = height * 1.2;
      aimX = width * 0.5; aimY = height * 0.4;
      break;
    case 'left':
      originX = -width * 0.2; originY = height * 0.4;
      aimX = width * 0.6; aimY = height * 0.55;
      break;
    case 'right':
      originX = width * 1.2; originY = height * 0.4;
      aimX = width * 0.4; aimY = height * 0.55;
      break;
    case 'center':
      // For center, use a soft overhead lamp
      originX = width * 0.5; originY = -height * 0.4;
      aimX = width * 0.5; aimY = height * 0.5;
      break;
  }

  const fadeIn = easeOutCubic(clamp01((t01 - 0.05) / 0.15));
  const fadeOut = 1 - clamp01((t01 - 0.85) / 0.15);
  const visible = fadeIn * fadeOut;
  if (visible < 0.001) return;

  // Subtle drift of the aim point
  const drift = 28;
  const ax = aimX + Math.sin(t01 * Math.PI * 2) * drift;
  const ay = aimY + Math.cos(t01 * Math.PI * 2.2) * drift * 0.6;

  // Beam direction + length
  const dx = ax - originX;
  const dy = ay - originY;
  const len = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);
  const halfFan = (intensity === 3 ? 0.42 : intensity === 1 ? 0.22 : 0.32);
  const reach = len + Math.min(width, height) * 0.4;

  ctx.save();
  ctx.translate(originX, originY);
  ctx.rotate(ang);
  ctx.globalCompositeOperation = 'lighter';

  // Build a fan-shaped beam — solid triangle filled with a gradient
  const halfWidth = Math.tan(halfFan) * reach;
  const beamGrad = ctx.createLinearGradient(0, 0, reach, 0);
  beamGrad.addColorStop(0, hexA(palette.accent, 0.65 * visible));
  beamGrad.addColorStop(0.45, hexA(palette.primary, 0.45 * visible));
  beamGrad.addColorStop(1, hexA(palette.primary, 0));
  ctx.fillStyle = beamGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(reach, -halfWidth);
  ctx.lineTo(reach, halfWidth);
  ctx.closePath();
  ctx.fill();

  // Hot core stripe along the beam center
  const coreGrad = ctx.createLinearGradient(0, 0, reach, 0);
  coreGrad.addColorStop(0, `rgba(255,255,255,${0.85 * visible})`);
  coreGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = coreGrad;
  const coreThick = Math.max(2, reach * 0.012);
  ctx.fillRect(0, -coreThick / 2, reach, coreThick);

  ctx.restore();

  // Hot halo at origin (additive)
  const halo = ctx.createRadialGradient(originX, originY, 0, originX, originY, Math.min(width, height) * 0.35);
  halo.addColorStop(0, hexA(palette.accent, 0.55 * visible));
  halo.addColorStop(1, hexA(palette.accent, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // Subtle vignette to focus attention — MUST run in source-over so the dark
  // pixels actually darken the frame (under 'lighter' rgba(0,0,0,*) is a no-op).
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const vMax = Math.hypot(width, height) * 0.65;
  const v = ctx.createRadialGradient(ax, ay, vMax * 0.3, ax, ay, vMax);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(0,0,0,${0.35 * visible})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // tree-shake guard
  void lerp;
};

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(255,255,255,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
