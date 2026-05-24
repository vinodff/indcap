/**
 * shockwave — high-impact expanding ring burst from a center point.
 *
 * On beat entry: bright full-screen flash → 3 staggered expanding rings
 * (additive blend, fade as they grow) → debris particles shooting radially.
 * Center Zap icon explodes at t=0. Lens flare blooms at peak. Debris mixes
 * dots, stars, and sparkle glyphs for a designed, premium look.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, easeOutQuart, lerp, remap } from '../easing';
import { hexA, drawStar, drawSparkle } from '../decorations';
import { drawLucideIcon } from '../iconRenderer';
import { drawLensFlare, drawSparkDust } from '../textures';

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

export const shockwave = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, durationSec, palette } = pc;
  const intensity = p.intensity || 2;
  const diag = Math.hypot(width, height);

  const anchor = p.anchor || 'center';
  const cx = anchor === 'left' ? width * 0.25 : anchor === 'right' ? width * 0.75 : width / 2;
  const cy = anchor === 'top' ? height * 0.25 : anchor === 'bottom' ? height * 0.75 : height / 2;

  ctx.save();

  // ── 1. Flash on t01 < 0.1 ──────────────────────────────────────────
  const flashAlpha = clamp01(remap(t01, 0, 0.04)) * clamp01(1 - remap(t01, 0.04, 0.18));
  if (flashAlpha > 0.01) {
    ctx.globalAlpha = flashAlpha * (intensity === 3 ? 0.85 : 0.55);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  // ── 2. Zap icon at impact center ──────────────────────────────────
  const iconT = clamp01(remap(t01, 0, 0.25));
  const iconAlpha = (1 - easeOutCubic(iconT)) * (intensity === 3 ? 1 : 0.75);
  if (iconAlpha > 0.02) {
    const iconSize = Math.min(width, height) * lerp(0.35, 0.05, easeOutCubic(iconT));
    drawLucideIcon(ctx, 'zap', cx, cy, iconSize, palette.accent, {
      fill: true,
      stroke: false,
      alpha: iconAlpha,
      glowColor: palette.accent,
      glowBlur: iconSize * 0.5,
    });
  }

  // ── 3. Lens flare at peak bloom ───────────────────────────────────
  const bloomT = clamp01(remap(t01, 0, 0.35));
  const flareAlpha = (1 - easeOutCubic(bloomT)) * (intensity === 3 ? 0.9 : 0.65);
  if (flareAlpha > 0.02) {
    const flareSize = diag * lerp(0.6, 0.1, easeOutCubic(bloomT));
    drawLensFlare(ctx, cx, cy, flareSize, flareAlpha);
  }

  // ── 4. Expanding shock rings ──────────────────────────────────────
  const ringCount = intensity === 3 ? 4 : intensity === 1 ? 2 : 3;
  ctx.globalCompositeOperation = 'lighter';

  for (let r = 0; r < ringCount; r++) {
    const ringDelay = r * 0.12;
    const ringT = clamp01(remap(t01, ringDelay, ringDelay + 0.65));
    if (ringT <= 0) continue;
    const expand = easeOutQuart(ringT);
    const radius = diag * 0.55 * expand;
    const ringAlpha = (1 - easeOutCubic(ringT)) * (intensity === 3 ? 0.9 : 0.65);
    const thickness = lerp(diag * 0.04, diag * 0.008, expand);
    if (ringAlpha < 0.01) continue;

    const grad = ctx.createRadialGradient(cx, cy, Math.max(0, radius - thickness), cx, cy, radius + thickness);
    const col = r % 2 === 0 ? palette.primary : palette.accent;
    grad.addColorStop(0, hexA(col, 0));
    grad.addColorStop(0.4, hexA(col, ringAlpha));
    grad.addColorStop(0.6, hexA(col, ringAlpha));
    grad.addColorStop(1, hexA(col, 0));

    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1, radius), 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // ── 5. Radial debris — dots + stars + sparkles ───────────────────
  const debrisCount = intensity === 3 ? 40 : intensity === 1 ? 16 : 26;
  const rand = rng(debrisCount * 7 + Math.round(durationSec * 100));

  for (let i = 0; i < debrisCount; i++) {
    const angle = rand() * Math.PI * 2;
    const speed = diag * lerp(0.25, 0.7, rand());
    const size = lerp(2, 8, rand()) * (intensity === 3 ? 1.5 : 1);
    const life = lerp(0.3, 0.8, rand());
    const delay = rand() * 0.08;
    const localT = clamp01(remap(t01, delay, delay + life));
    if (localT <= 0) continue;

    const dist = speed * easeOutCubic(localT);
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist;
    const alpha = (1 - localT) * (intensity === 3 ? 0.9 : 0.6);
    if (alpha < 0.02) continue;

    const col = rand() > 0.5 ? palette.primary : palette.accent;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    ctx.fillStyle = hexA(col, 1);
    ctx.shadowColor = col;
    ctx.shadowBlur = size * 2;

    const kind = i % 4;
    if (kind === 0) {
      // dot
      ctx.beginPath();
      ctx.arc(px, py, size * 0.6 * (1 - localT * 0.4), 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 1) {
      // 4-point star
      ctx.beginPath();
      drawStar(ctx, px, py, size * 0.8, size * 0.3, 4);
      ctx.fill();
    } else if (kind === 2) {
      // sparkle
      ctx.beginPath();
      drawSparkle(ctx, px, py, size * 0.7);
      ctx.fill();
    } else {
      // spark dust texture point
      ctx.shadowBlur = 0;
      drawSparkDust(ctx, px, py, size * 4, alpha * 0.7);
    }

    ctx.restore();
  }

  // ── 6. Icon / text label (optional) ─────────────────────────────
  const burstT = easeOutCubic(clamp01(remap(t01, 0, 0.8)));
  if (p.text) {
    const textAlpha = clamp01(remap(burstT, 0.3, 0.7)) * (1 - clamp01(remap(t01, 0.85, 1)));
    if (textAlpha > 0.02) {
      ctx.globalCompositeOperation = 'source-over';
      const fs = Math.min(width, height) * 0.08 * (intensity === 3 ? 1.2 : 1);
      ctx.font = `900 ${fs}px 'Space Grotesk', Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = textAlpha;
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = fs * 0.5;
      ctx.fillStyle = palette.text;
      ctx.fillText(p.text.toUpperCase(), cx, cy);
      ctx.shadowBlur = 0;
    }
  }

  ctx.restore();
};
