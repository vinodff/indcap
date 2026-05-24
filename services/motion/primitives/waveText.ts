/**
 * wave-text — each character rides a continuous sine wave.
 *
 * A phase-shifted sine wave travels left-to-right through the characters.
 * Music icon floats in the corner. Sparkle glints appear on wave crests.
 * SparkDust particles trail behind high-amplitude letters. Star shapes
 * drift upward in the background.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, lerp, remap } from '../easing';
import { getSafeArea, fitMultiline } from '../safeArea';
import { hexA, setLetterSpacing, drawSparkle, drawStar } from '../decorations';
import { drawLucideIcon } from '../iconRenderer';
import { drawSparkDust } from '../textures';

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

export const waveText = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, durationSec, palette } = pc;
  const text = (p.text || 'WAVE').toUpperCase();
  const intensity = p.intensity || 2;

  const safe = getSafeArea(width, height, 0.1);
  const desiredPx = Math.min(width, height) * (intensity === 3 ? 0.13 : intensity === 1 ? 0.085 : 0.11);
  const maxLines = height > width ? 4 : 2;
  const { px: fontPx, lines } = fitMultiline(
    ctx,
    text,
    fontTemplate,
    safe.width,
    safe.height * 0.6,
    desiredPx,
    maxLines,
    1.1,
    Math.max(18, Math.min(width, height) * 0.038),
  );
  if (lines.length === 0) return;

  const inT = easeOutCubic(clamp01(remap(t01, 0, 0.2)));
  const fadeOut = 1 - clamp01(remap(t01, 0.85, 1));
  const globalAlpha = inT * fadeOut;
  if (globalAlpha < 0.01) return;

  const lineHeight = fontPx * 1.15;
  const totalH = lines.length * lineHeight;
  const blockTop = (height - totalH) / 2 + lineHeight * 0.5;

  const sec = t01 * durationSec;
  const waveFreq = intensity === 3 ? 2.5 : intensity === 1 ? 1.2 : 1.8;
  const waveAmp = fontPx * (intensity === 3 ? 0.28 : intensity === 1 ? 0.14 : 0.22);
  const scaleAmp = intensity === 3 ? 0.18 : intensity === 1 ? 0.07 : 0.12;

  const gradColors = [palette.primary, palette.accent, palette.secondary, palette.primary];

  ctx.save();
  ctx.font = fontTemplate(fontPx);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  setLetterSpacing(ctx, -fontPx * 0.01);

  const allLetters: { char: string; baseX: number; baseY: number; idx: number; total: number }[] = [];
  let totalLetters = 0;
  lines.forEach((line) => { totalLetters += line.length; });

  let globalIdx = 0;
  lines.forEach((line, li) => {
    const lineW = ctx.measureText(line).width;
    const lineY = blockTop + li * lineHeight;
    let cx = width / 2 - lineW / 2;
    for (const char of line) {
      const cw = ctx.measureText(char).width;
      allLetters.push({ char, baseX: cx + cw / 2, baseY: lineY, idx: globalIdx, total: totalLetters });
      cx += cw;
      globalIdx++;
    }
  });

  // ── Drifting background stars ─────────────────────────────────────
  if (intensity >= 2) {
    const starRand = rng(77 + Math.round(durationSec * 100));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let s = 0; s < 8; s++) {
      const sx = safe.x + starRand() * safe.width;
      const sy0 = safe.y + starRand() * safe.height;
      const drift = (sec * 0.08 * (0.5 + starRand() * 0.5)) % 1;
      const sy = sy0 - drift * height * 0.3;
      const sr = fontPx * lerp(0.04, 0.1, starRand());
      const sa = globalAlpha * lerp(0.08, 0.2, starRand());
      ctx.fillStyle = hexA(starRand() > 0.5 ? palette.accent : palette.primary, sa);
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = sr * 3;
      ctx.beginPath();
      drawStar(ctx, sx, sy, sr, sr * 0.4, 4);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Music icon corner ─────────────────────────────────────────────
  if (intensity >= 2) {
    const iconSize = fontPx * 1.2;
    const iconBob = Math.sin(sec * waveFreq * Math.PI * 2) * waveAmp * 0.4;
    drawLucideIcon(ctx, 'music', safe.x + safe.width - iconSize * 0.7, blockTop - lineHeight * 0.5 + iconBob, iconSize, palette.accent, {
      stroke: true, strokeWidth: 2, alpha: globalAlpha * 0.6,
      glowColor: palette.accent, glowBlur: iconSize * 0.4,
    });
  }

  allLetters.forEach(({ char, baseX, baseY, idx, total }) => {
    const phase = (idx / Math.max(total - 1, 1)) * Math.PI * 2;
    const wave = Math.sin(sec * waveFreq * Math.PI * 2 - phase);
    const dy = wave * waveAmp;
    const sc = 1 + wave * scaleAmp;
    const rot = wave * 0.08;

    const colorT = idx / Math.max(total - 1, 1);
    const segLen = 1 / (gradColors.length - 1);
    const seg = Math.min(Math.floor(colorT / segLen), gradColors.length - 2);
    const segT = (colorT - seg * segLen) / segLen;
    const c1 = gradColors[seg];
    const c2 = gradColors[seg + 1];
    const r = lerp(parseInt(c1.slice(1, 3), 16), parseInt(c2.slice(1, 3), 16), segT);
    const g = lerp(parseInt(c1.slice(3, 5), 16), parseInt(c2.slice(3, 5), 16), segT);
    const b = lerp(parseInt(c1.slice(5, 7), 16), parseInt(c2.slice(5, 7), 16), segT);
    const charColor = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

    const revealDelay = (idx / total) * 0.35;
    const revealAlpha = clamp01(remap(t01, revealDelay, revealDelay + 0.25));

    // ── SparkDust at crest (high amplitude) ──────────────────────
    if (wave > 0.7 && intensity >= 2) {
      drawSparkDust(ctx, baseX, baseY + dy - fontPx * 0.6, fontPx * 1.2, globalAlpha * revealAlpha * (wave - 0.7) * 0.8);
    }

    ctx.save();
    ctx.translate(baseX, baseY + dy);
    ctx.rotate(rot);
    ctx.scale(sc, sc);
    ctx.globalAlpha = globalAlpha * revealAlpha;

    ctx.shadowColor = charColor;
    ctx.shadowBlur = fontPx * 0.45 * Math.abs(wave + 0.3);
    ctx.fillStyle = charColor;
    ctx.textAlign = 'center';
    ctx.fillText(char, 0, 0);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = globalAlpha * revealAlpha * 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(char, 0, 0);

    ctx.restore();

    // ── Sparkle glint at crest peak ───────────────────────────────
    if (wave > 0.85 && intensity >= 2) {
      const glintAlpha = globalAlpha * revealAlpha * (wave - 0.85) * 5;
      if (glintAlpha > 0.05) {
        ctx.save();
        ctx.globalAlpha = glintAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = charColor;
        ctx.shadowBlur = fontPx * 0.15;
        ctx.beginPath();
        drawSparkle(ctx, baseX + fontPx * 0.35, baseY + dy - fontPx * 0.55, fontPx * 0.12);
        ctx.fill();
        ctx.restore();
      }
    }
  });

  // wave trail beneath text
  if (intensity >= 2) {
    ctx.save();
    ctx.globalAlpha = globalAlpha * 0.3;
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = Math.max(1.5, fontPx * 0.03);
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = fontPx * 0.25;
    ctx.beginPath();
    const trailY = blockTop + (lines.length - 1) * lineHeight + lineHeight * 0.62;
    let first = true;
    for (let x = safe.x; x <= safe.x + safe.width; x += 4) {
      const phase = ((x - safe.x) / safe.width) * Math.PI * 4;
      const wy = trailY + Math.sin(sec * waveFreq * Math.PI * 2 - phase) * waveAmp * 0.5;
      if (first) { ctx.moveTo(x, wy); first = false; }
      else ctx.lineTo(x, wy);
    }
    ctx.stroke();
    ctx.restore();
  }

  setLetterSpacing(ctx, 0);
  ctx.restore();
};
