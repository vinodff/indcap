/**
 * glitch-screen — full-frame digital artifact / TV static transition.
 *
 * Horizontal displacement bands, RGB channel splits, static noise blocks,
 * scan lines, and vertical tears. At peak glitch intensity random Lucide
 * icon fragments (activity, zap-off, wifi-off, tv, alert) flash as broken
 * signal glyphs. Feels like a corrupted broadcast.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, pulse, remap } from '../easing';
import { hexA, drawStar } from '../decorations';
import { drawLucideIcon } from '../iconRenderer';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GLITCH_ICONS = ['activity', 'zap-off', 'wifi-off', 'tv', 'alert'];

export const glitchScreen = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, durationSec, palette } = pc;
  const intensity = p.intensity || 2;

  const activity = Math.max(
    clamp01(remap(t01, 0, 0.12)) * (1 - clamp01(remap(t01, 0.12, 0.35))),
    clamp01(remap(t01, 0.7, 0.82)) * (1 - clamp01(remap(t01, 0.82, 1))),
  ) * (intensity === 3 ? 1.0 : intensity === 1 ? 0.55 : 0.75);

  if (activity < 0.01) return;

  const sec = t01 * durationSec;
  const frameSeed = Math.floor(sec * 30) * 997;
  const rand = rng(frameSeed + Math.round(intensity * 100));

  ctx.save();

  // ── 1. White/color flash ─────────────────────────────────────────
  const flashProbability = intensity === 3 ? 0.35 : 0.2;
  if (rand() < flashProbability * activity) {
    ctx.globalAlpha = activity * (0.3 + rand() * 0.4);
    ctx.fillStyle = rand() > 0.5 ? '#ffffff' : palette.primary;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  // ── 2. Horizontal displacement bands ─────────────────────────────
  const bandCount = intensity === 3 ? 12 : intensity === 1 ? 5 : 8;
  ctx.globalCompositeOperation = 'source-over';

  for (let b = 0; b < bandCount; b++) {
    if (rand() > 0.45 * activity) continue;
    const bandY = rand() * height;
    const bandH = lerp(2, height * 0.08, rand());
    const shift = (rand() - 0.5) * width * 0.12 * activity;
    const splitX = shift * lerp(0.5, 2, rand());

    ctx.save();
    ctx.globalAlpha = activity * lerp(0.15, 0.55, rand());
    // Use palette-aware aberration colors for RGB channel split
    ctx.fillStyle = hexA(palette.primary, 0.6);
    ctx.fillRect(-splitX * 1.5, bandY, width + Math.abs(splitX * 1.5), bandH);
    ctx.fillStyle = hexA(palette.accent, 0.5);
    ctx.fillRect(splitX, bandY, width, bandH);
    ctx.restore();
  }

  // ── 3. Static noise blocks ────────────────────────────────────────
  const noiseCount = intensity === 3 ? 20 : intensity === 1 ? 8 : 13;
  for (let n = 0; n < noiseCount; n++) {
    if (rand() > 0.6 * activity) continue;
    const nx = rand() * width;
    const ny = rand() * height;
    const nw = lerp(10, width * 0.2, rand());
    const nh = lerp(1, 8, rand());
    ctx.save();
    ctx.globalAlpha = activity * lerp(0.1, 0.6, rand());
    if (rand() > 0.6) {
      ctx.fillStyle = rand() > 0.5 ? palette.primary : palette.accent;
    } else {
      const v = Math.round(rand()) * 255;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
    }
    ctx.fillRect(nx, ny, nw, nh);
    ctx.restore();
  }

  // ── 4. Scan lines ─────────────────────────────────────────────────
  if (intensity >= 2) {
    ctx.save();
    ctx.globalAlpha = activity * 0.12;
    ctx.fillStyle = '#000000';
    for (let sy = 0; sy < height; sy += 4) {
      ctx.fillRect(0, sy, width, 1.5);
    }
    ctx.restore();
  }

  // ── 5. Vertical tear ────────────────────────────────────────────
  if (intensity === 3 && rand() < 0.3 * activity) {
    const tx = rand() * width;
    const tearGrad = ctx.createLinearGradient(tx - 20, 0, tx + 20, 0);
    tearGrad.addColorStop(0, hexA(palette.primary, 0));
    tearGrad.addColorStop(0.5, hexA(palette.accent, activity * 0.8));
    tearGrad.addColorStop(1, hexA(palette.primary, 0));
    ctx.fillStyle = tearGrad;
    ctx.fillRect(tx - 20, 0, 40, height);
  }

  // ── 6. Broken icon glyphs (peak glitch) ─────────────────────────
  if (activity > 0.4 && intensity >= 2) {
    const iconRand = rng(frameSeed * 3 + 131);
    const iconCount = intensity === 3 ? 4 : 2;
    for (let ic = 0; ic < iconCount; ic++) {
      if (iconRand() > 0.55 * activity) continue;
      const ix = iconRand() * width;
      const iy = iconRand() * height;
      const iSize = lerp(20, 60, iconRand()) * (width / 1280);
      const iconName = GLITCH_ICONS[Math.floor(iconRand() * GLITCH_ICONS.length)];
      const iconAlpha = activity * lerp(0.25, 0.75, iconRand());

      // Draw icon twice with RGB split offset for glitch look (palette-aware colors)
      drawLucideIcon(ctx, iconName, ix - 3, iy, iSize, hexA(palette.primary, iconAlpha * 0.7), {
        stroke: true, strokeWidth: 1.5, alpha: iconAlpha * 0.8,
      });
      drawLucideIcon(ctx, iconName, ix + 3, iy, iSize, hexA(palette.accent, iconAlpha * 0.7), {
        stroke: true, strokeWidth: 1.5, alpha: iconAlpha * 0.8,
      });
      drawLucideIcon(ctx, iconName, ix, iy, iSize, palette.text, {
        stroke: true, strokeWidth: 1.5, alpha: iconAlpha,
      });
    }

    // Star shapes in static noise
    const starRand = rng(frameSeed * 7 + 43);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let s = 0; s < 3; s++) {
      if (starRand() > 0.6 * activity) continue;
      const sx = starRand() * width;
      const sy = starRand() * height;
      const sr = lerp(3, 12, starRand()) * (width / 1280);
      ctx.fillStyle = hexA('#ffffff', activity * 0.5);
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = sr * 3;
      ctx.beginPath();
      drawStar(ctx, sx, sy, sr, sr * 0.4, 4);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── 7. Optional text (shown through the glitch) ──────────────────
  if (p.text) {
    const txtAlpha = pulse(t01) * 0.7 * (1 - activity * 0.5);
    if (txtAlpha > 0.05) {
      const fs = Math.min(width, height) * 0.09;
      ctx.save();
      ctx.font = `900 ${fs}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = txtAlpha;
      ctx.fillStyle = palette.text;
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = fs * 0.4;
      ctx.fillText(p.text.toUpperCase(), width / 2, height / 2);
      ctx.restore();
    }
  }

  ctx.restore();
};

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
