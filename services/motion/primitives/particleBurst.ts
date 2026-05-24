/**
 * particle-burst — 80-150 particles burst from a point with physics.
 *
 * Each particle has: random initial velocity (200-800 px/s), gravity (600 px/s²),
 * drag (0.94 per frame), random color from palette, screen-blend glow trail.
 *
 * Particles are deterministic per beat — we seed RNG from beat duration + size
 * so the same beat replays identically every time (no flicker between scrubs).
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, lerp, remap } from '../easing';
import { resolveIcon } from '../icons';

// Simple seeded RNG (Mulberry32).
function rngFactory(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const particleBurst = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, durationSec, palette } = pc;
  const intensity = p.intensity || 2;
  const anchor = p.anchor || 'center';

  const cx = anchor === 'left' ? width * 0.3 : anchor === 'right' ? width * 0.7 : width / 2;
  const cy = anchor === 'top' ? height * 0.3 : anchor === 'bottom' ? height * 0.7 : height / 2;

  const count = intensity === 3 ? 150 : intensity === 1 ? 60 : 100;
  const rand = rngFactory(Math.floor(durationSec * 1000) + count);

  // Time within the burst — particles age from t01=0
  const tSec = t01 * durationSec;
  const colors = [palette.primary, palette.secondary, palette.accent];

  // Pre-burst flash
  const flashT = clamp01(remap(t01, 0, 0.08));
  if (flashT < 1) {
    const rf = Math.min(width, height) * 0.35;
    const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rf);
    const fa = (1 - flashT) * 0.85;
    fg.addColorStop(0, hexA(palette.text, fa));
    fg.addColorStop(1, hexA(palette.text, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = fg;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Particle physics
  const gravity = 600;
  const dragPerSec = 0.55; // velocity multiplier per second
  const baseSize = Math.min(width, height) * 0.012;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const speed = lerp(220, 850, rand());
    const lifeSec = lerp(0.7, 1.4, rand()) * durationSec;
    if (tSec > lifeSec) continue;

    // Integrate position. Closed-form is acceptable here since we sample once
    // per frame: v(t) = v0 * exp(-k*t), x(t) = x0 + v0/k * (1 - exp(-k*t))
    const k = -Math.log(dragPerSec); // drag coefficient
    const ek = Math.exp(-k * tSec);
    const vx0 = Math.cos(angle) * speed;
    const vy0 = Math.sin(angle) * speed;
    const px = cx + (vx0 / k) * (1 - ek);
    const py = cy + (vy0 / k) * (1 - ek) + 0.5 * gravity * tSec * tSec;

    const age = clamp01(tSec / lifeSec);
    const a = (1 - age) * 0.85;
    const sizeMul = lerp(1.0, 0.4, easeOutCubic(age));
    const sz = baseSize * sizeMul * (1.5 + rand() * 0.8);

    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = a;

    // Motion-blur trail: 3 short segments behind the head
    for (let j = 0; j < 3; j++) {
      const back = j * 0.04; // seconds back
      const tBack = Math.max(0, tSec - back);
      const ekBack = Math.exp(-k * tBack);
      const pxBack = cx + (vx0 / k) * (1 - ekBack);
      const pyBack = cy + (vy0 / k) * (1 - ekBack) + 0.5 * gravity * tBack * tBack;
      ctx.beginPath();
      ctx.globalAlpha = a * (1 - j / 3) * 0.5;
      ctx.arc(pxBack, pyBack, sz * (1 - j * 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Center icon glyph if provided
  if (p.icon) {
    const popT = clamp01(remap(t01, 0, 0.25));
    const fadeOut = 1 - clamp01(remap(t01, 0.85, 1));
    const scale = lerp(0.4, 1.0, easeOutCubic(popT));
    const size = Math.min(width, height) * (intensity === 3 ? 0.22 : 0.16) * scale;
    if (size > 1) {
      ctx.save();
      ctx.globalAlpha = fadeOut;
      ctx.font = `${size}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = palette.primary;
      ctx.shadowBlur = size * 0.4;
      ctx.fillStyle = palette.text;
      ctx.fillText(resolveIcon(p.icon), cx, cy);
      ctx.restore();
    }
  }
};

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(255,255,255,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
