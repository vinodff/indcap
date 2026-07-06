/**
 * icon-burst — center icon with elastic pop + 60-150 physics particles
 * (gravity, drag, motion-blur trails, screen-blend glow), radial glow,
 * shockwave ring.
 *
 * Upgraded for cinematic feel. Reuses the particle physics from
 * particle-burst but composes the icon as the hero element.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, easeOutElastic, lerp, remap } from '../easing';
import { resolveIcon } from '../icons';
import { hexA } from '../decorations';

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

export const iconBurst = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, durationSec, palette } = pc;
  const intensity = p.intensity || 2;
  const icon = resolveIcon(p.icon);

  const anchor = p.anchor || 'center';
  const cx = anchor === 'left' ? width * 0.3 : anchor === 'right' ? width * 0.7 : width / 2;
  const cy = anchor === 'top' ? height * 0.3 : anchor === 'bottom' ? height * 0.7 : height / 2;

  const baseSize = Math.min(width, height) * (intensity === 3 ? 0.34 : intensity === 1 ? 0.18 : 0.26);
  const tSec = t01 * durationSec;

  // ── Shockwave ring expanding outward ─────────────────────────────
  const ringT = clamp01(remap(t01, 0, 0.45));
  if (ringT < 1) {
    const ringR = lerp(baseSize * 0.2, baseSize * 1.6, easeOutCubic(ringT));
    const ringA = (1 - ringT) * 0.85;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = hexA(palette.accent, ringA);
    ctx.lineWidth = Math.max(2, baseSize * 0.03 * (1 - ringT * 0.6));
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Background glow that breathes ────────────────────────────────
  const glowT = easeOutCubic(clamp01(remap(t01, 0, 0.35)));
  const glowR = baseSize * 1.4 * glowT;
  if (glowR > 1) {
    const fadeOut = 1 - clamp01(remap(t01, 0.85, 1));
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    grad.addColorStop(0, hexA(palette.primary, 0.55 * fadeOut));
    grad.addColorStop(0.5, hexA(palette.secondary, 0.25 * fadeOut));
    grad.addColorStop(1, hexA(palette.primary, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // ── Particle physics swarm ───────────────────────────────────────
  const particleCount = intensity === 3 ? 150 : intensity === 1 ? 60 : 100;
  const rand = rngFactory(Math.floor(durationSec * 1000) + particleCount + 7);
  const gravity = 500;
  const dragPerSec = 0.55;
  const k = -Math.log(dragPerSec);
  const colors = [palette.primary, palette.secondary, palette.accent];
  const baseParticleSize = Math.min(width, height) * 0.011;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < particleCount; i++) {
    const angle = rand() * Math.PI * 2;
    const speed = lerp(180, 760, rand());
    const lifeSec = lerp(0.6, 1.3, rand()) * durationSec;
    if (tSec > lifeSec) continue;
    const ek = Math.exp(-k * tSec);
    const vx0 = Math.cos(angle) * speed;
    const vy0 = Math.sin(angle) * speed;
    const px = cx + (vx0 / k) * (1 - ek);
    const py = cy + (vy0 / k) * (1 - ek) + 0.5 * gravity * tSec * tSec;
    const age = clamp01(tSec / lifeSec);
    const a = (1 - age) * 0.85;
    const sz = baseParticleSize * lerp(1.0, 0.3, easeOutCubic(age)) * (1.3 + rand() * 0.8);
    const color = colors[i % colors.length];

    // Motion-blur trail: 2 segments behind
    for (let j = 0; j < 2; j++) {
      const back = j * 0.04;
      const tBack = Math.max(0, tSec - back);
      const ekBack = Math.exp(-k * tBack);
      const pxBack = cx + (vx0 / k) * (1 - ekBack);
      const pyBack = cy + (vy0 / k) * (1 - ekBack) + 0.5 * gravity * tBack * tBack;
      ctx.fillStyle = color;
      ctx.globalAlpha = a * (1 - j / 3) * 0.45;
      ctx.beginPath();
      ctx.arc(pxBack, pyBack, sz * (1 - j * 0.2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = color;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(px, py, sz, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── Icon glyph with elastic pop ──────────────────────────────────
  const scaleT = clamp01(remap(t01, 0, 0.35));
  const scale = easeOutElastic(scaleT);
  const fade = 1 - clamp01(remap(t01, 0.85, 1));
  if (scale > 0.02 && fade > 0.001) {
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.font = `${baseSize * scale}px 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = palette.primary;
    ctx.shadowBlur = baseSize * 0.4;
    ctx.fillStyle = palette.text;
    ctx.fillText(icon, cx, cy);
    ctx.restore();
  }
};
