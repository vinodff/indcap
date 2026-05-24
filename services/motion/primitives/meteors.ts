/**
 * meteors — Magic UI "Meteors" / Aceternity "Meteor Effect" port.
 *
 * Diagonal streaks falling from upper-right to lower-left, each with a
 * bright head and a fading colored tail. Spawn times are deterministic per
 * beat so playback is stable.
 *
 * Drawn additively on top of the bg so existing primitives underneath
 * stay readable.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, lerp } from '../easing';

interface Meteor {
  startX: number;
  startY: number;
  speed: number;       // px per second (in screen-diagonal units)
  startDelay: number;  // fraction of beat
  duration: number;    // fraction of beat
  size: number;        // head radius
  hue: number;         // 0..1 mix between primary and accent
  tailLen: number;     // px
}

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

export const meteors = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, durationSec, palette } = pc;
  const intensity = p.intensity || 2;

  const count = intensity === 3 ? 22 : intensity === 1 ? 8 : 14;
  const rand = rngFactory(Math.floor(durationSec * 1000) + count * 31);
  const diag = Math.hypot(width, height);

  // Pre-generate meteor seeds
  const items: Meteor[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      startX: width * (0.5 + rand() * 0.7),
      startY: -height * 0.2 - rand() * height * 0.3,
      speed: diag / lerp(0.45, 0.9, rand()),
      startDelay: rand() * 0.6,
      duration: lerp(0.35, 0.6, rand()),
      size: lerp(2.5, 5.5, rand()),
      hue: rand(),
      tailLen: lerp(diag * 0.12, diag * 0.32, rand()),
    });
  }

  const sec = t01 * durationSec;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const m of items) {
    const localStart = m.startDelay * durationSec;
    const localEnd = (m.startDelay + m.duration) * durationSec;
    if (sec < localStart || sec > localEnd + 0.1) continue;
    const tt = clamp01((sec - localStart) / Math.max(0.05, m.duration * durationSec));
    // Position: travel along -45deg vector
    const angle = -Math.PI * 0.78; // ~225deg from +x → falls down-left, but we use angle to set vector
    const travel = m.speed * (sec - localStart);
    const dx = Math.cos(angle) * travel;
    const dy = -Math.sin(angle) * travel; // canvas y inverted; -sin makes positive downward
    const x = m.startX + dx;
    const y = m.startY + dy;
    const alpha = (1 - Math.pow(tt - 0.5, 2) * 2) * 1.1;
    const a = clamp01(alpha);
    if (a < 0.02) continue;
    const color = mixHex(palette.primary, palette.accent, m.hue);

    // Tail
    const tailAngle = Math.atan2(dy, dx);
    const tailEndX = x - Math.cos(tailAngle) * m.tailLen;
    const tailEndY = y - Math.sin(tailAngle) * m.tailLen;
    const tailGrad = ctx.createLinearGradient(x, y, tailEndX, tailEndY);
    tailGrad.addColorStop(0, hexA(color, a));
    tailGrad.addColorStop(0.4, hexA(color, a * 0.4));
    tailGrad.addColorStop(1, hexA(color, 0));
    ctx.strokeStyle = tailGrad;
    ctx.lineWidth = m.size * 0.9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tailEndX, tailEndY);
    ctx.stroke();

    // Bright head
    ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
    ctx.shadowColor = color;
    ctx.shadowBlur = m.size * 6;
    ctx.beginPath();
    ctx.arc(x, y, m.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
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

function mixHex(a: string, b: string, t: number): string {
  const h1 = a.replace('#', '');
  const h2 = b.replace('#', '');
  if (h1.length !== 6 || h2.length !== 6) return a;
  const r1 = parseInt(h1.slice(0, 2), 16);
  const g1 = parseInt(h1.slice(2, 4), 16);
  const b1 = parseInt(h1.slice(4, 6), 16);
  const r2 = parseInt(h2.slice(0, 2), 16);
  const g2 = parseInt(h2.slice(2, 4), 16);
  const b2 = parseInt(h2.slice(4, 6), 16);
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  return `#${toHex(r1 + (r2 - r1) * t)}${toHex(g1 + (g2 - g1) * t)}${toHex(b1 + (b2 - b1) * t)}`;
}
