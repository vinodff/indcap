/**
 * fire-text — glowing text with upward-streaming fire particles.
 *
 * The text itself is rendered with a hot orange→yellow gradient fill and
 * ember glow. Dozens of fire particles rise from the top of each character
 * cooling from white-hot to deep red. Flame icon flashes at entry. Smoke
 * wisps draw via texture. Star-shaped ember glints scatter upward. SparkDust
 * powers at the base.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, lerp, remap } from '../easing';
import { getSafeArea, fitMultiline } from '../safeArea';
import { hexA, drawStar } from '../decorations';
import { drawLucideIcon } from '../iconRenderer';
import { drawSmoke, drawSparkDust } from '../textures';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;
const fontTemplate = (px: number) => `900 ${px}px ${FONT_STACK}`;

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

interface FireParticle {
  relX: number;
  vy: number;
  vx: number;
  size: number;
  lifeSpan: number;
  startSec: number;
  turbFreq: number;
  turbAmp: number;
}

export const fireText = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, durationSec, palette } = pc;
  const text = (p.text || 'FIRE').toUpperCase();
  const intensity = p.intensity || 2;

  const safe = getSafeArea(width, height, 0.12);
  const desiredPx = Math.min(width, height) * (intensity === 3 ? 0.14 : intensity === 1 ? 0.09 : 0.12);
  const maxLines = height > width ? 4 : 2;
  const { px: fontPx, lines } = fitMultiline(
    ctx,
    text,
    fontTemplate,
    safe.width,
    safe.height * 0.55,
    desiredPx,
    maxLines,
    1.08,
    Math.max(20, Math.min(width, height) * 0.04),
  );
  if (lines.length === 0) return;

  const inT = easeOutCubic(clamp01(remap(t01, 0, 0.15)));
  const fadeOut = 1 - clamp01(remap(t01, 0.88, 1));
  const globalAlpha = inT * fadeOut;
  if (globalAlpha < 0.01) return;

  const lineHeight = fontPx * 1.08;
  const totalH = lines.length * lineHeight;
  const blockCy = height / 2;
  const blockTop = blockCy - totalH / 2 + lineHeight * 0.5;

  ctx.save();
  ctx.font = fontTemplate(fontPx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let maxLineW = 0;
  for (const line of lines) maxLineW = Math.max(maxLineW, ctx.measureText(line).width);

  // ── Flame icon flash at entry ──────────────────────────────────────
  const flameT = clamp01(remap(t01, 0, 0.22));
  const flameAlpha = (1 - easeOutCubic(flameT)) * globalAlpha;
  if (flameAlpha > 0.02 && intensity >= 2) {
    const flameSize = fontPx * lerp(2.5, 0.6, easeOutCubic(flameT));
    drawLucideIcon(ctx, 'flame', width / 2, blockTop - fontPx * 0.5, flameSize, '#FF4400', {
      fill: true,
      stroke: false,
      alpha: flameAlpha,
      glowColor: '#FF6600',
      glowBlur: flameSize * 0.4,
    });
  }

  const particleCount = intensity === 3 ? 80 : intensity === 1 ? 35 : 55;
  const rand = rng(particleCount * 11 + Math.round(durationSec * 100));
  const particles: FireParticle[] = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      relX: rand(),
      vy: fontPx * lerp(1.2, 3.5, rand()),
      vx: (rand() - 0.5) * fontPx * 0.5,
      size: lerp(2, 6, rand()) * (fontPx / 80),
      lifeSpan: lerp(0.3, 0.9, rand()),
      startSec: rand() * durationSec * 0.8,
      turbFreq: lerp(3, 8, rand()),
      turbAmp: fontPx * lerp(0.03, 0.1, rand()),
    });
  }

  const sec = t01 * durationSec;
  const textBlockLeft = width / 2 - maxLineW / 2;
  const emitY = blockTop - lineHeight * 0.2;

  // ── SparkDust at base ─────────────────────────────────────────────
  if (intensity >= 2) {
    const baseAlpha = globalAlpha * 0.7 * (0.5 + 0.5 * Math.sin(t01 * Math.PI * 6));
    for (let j = 0; j < 5; j++) {
      const bx = textBlockLeft + (j / 4) * maxLineW;
      drawSparkDust(ctx, bx, blockTop + lineHeight * 0.3, fontPx * 0.8, baseAlpha * 0.4);
    }
  }

  // ── Particles: fire + star ember glints ──────────────────────────
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const pt of particles) {
    const age = sec - pt.startSec;
    if (age < 0 || age > pt.lifeSpan) continue;
    const lt = age / pt.lifeSpan;

    const emitX = textBlockLeft + pt.relX * maxLineW;
    const turbX = Math.sin(age * pt.turbFreq) * pt.turbAmp;
    const px = emitX + pt.vx * age + turbX;
    const py = emitY - pt.vy * age;

    const alpha = globalAlpha * (1 - lt) * (1 - lt) * 0.9;
    if (alpha < 0.01) continue;

    const hot = 1 - lt;
    const r = 255;
    const g = Math.round(lerp(0, 220, Math.min(1, hot * 2)));
    const b = Math.round(lerp(0, 80, Math.max(0, hot * 2 - 1)));

    ctx.globalAlpha = alpha;
    ctx.fillStyle = `rgba(${r},${g},${b},1)`;
    ctx.shadowColor = `rgb(${r},${g},${b})`;
    ctx.shadowBlur = pt.size * 4 * (1 - lt);

    // mix regular dots with star glints
    if (lt < 0.3 && Math.floor(age * 20) % 5 === 0) {
      ctx.beginPath();
      drawStar(ctx, px, py, pt.size * 1.2, pt.size * 0.4, 4);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(px, py, pt.size * (1 - lt * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.shadowBlur = 0;
  ctx.restore();

  // ── Smoke wisps above text ────────────────────────────────────────
  if (intensity >= 2) {
    const smokeY = blockTop - lineHeight * 0.5;
    for (let s = 0; s < 3; s++) {
      const sx = width / 2 + (s - 1) * maxLineW * 0.3;
      const smokeAlpha = globalAlpha * 0.15 * (0.5 + 0.5 * Math.sin(t01 * Math.PI * 3 + s));
      drawSmoke(ctx, sx, smokeY - fontPx * s * 0.3, fontPx * 2.5, smokeAlpha);
    }
  }

  // ── Draw text with fire gradient fill ──────────────────────────────
  ctx.save();
  ctx.globalAlpha = globalAlpha;
  lines.forEach((line, li) => {
    const lineY = blockTop + li * lineHeight;
    const lineW = ctx.measureText(line).width;
    const gradX = width / 2 - lineW / 2;

    const grad = ctx.createLinearGradient(gradX, lineY + fontPx * 0.4, gradX, lineY - fontPx * 0.5);
    grad.addColorStop(0, '#FF1500');
    grad.addColorStop(0.35, '#FF6600');
    grad.addColorStop(0.65, '#FFAA00');
    grad.addColorStop(1, '#FFEE00');

    ctx.shadowColor = '#FF4400';
    ctx.shadowBlur = fontPx * 0.6;
    ctx.fillStyle = grad;
    ctx.fillText(line, width / 2, lineY);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = globalAlpha * 0.25;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, width / 2, lineY);
    ctx.globalAlpha = globalAlpha;
  });
  ctx.restore();

  ctx.restore();
};
