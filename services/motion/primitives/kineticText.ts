/**
 * kinetic-text — each letter flies in from a random direction with a
 * spring-overshoot landing, then exits by exploding outward.
 *
 * Zap icon flashes at t=0 entry. SparkDust bursts at each letter landing
 * point. Sparkle glints appear on landed letters. Motion ghost trail fades
 * behind letters in flight.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutBack, easeInCubic, lerp, remap } from '../easing';
import { getSafeArea, fitMultiline } from '../safeArea';
import { hexA, setLetterSpacing, drawSparkle } from '../decorations';
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

export const kineticText = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = (p.text || 'KINETIC').toUpperCase();
  const intensity = p.intensity || 2;
  const diag = Math.hypot(width, height);

  const safe = getSafeArea(width, height, 0.1);
  const desiredPx = Math.min(width, height) * (intensity === 3 ? 0.14 : intensity === 1 ? 0.09 : 0.12);
  const maxLines = height > width ? 4 : 2;
  const { px: fontPx, lines } = fitMultiline(
    ctx,
    text,
    fontTemplate,
    safe.width,
    safe.height * 0.65,
    desiredPx,
    maxLines,
    1.1,
    Math.max(20, Math.min(width, height) * 0.04),
  );
  if (lines.length === 0) return;

  const lineHeight = fontPx * 1.1;
  const totalH = lines.length * lineHeight;
  const blockTop = (height - totalH) / 2 + lineHeight * 0.5;

  const inEnd = 0.55;
  const holdEnd = 0.8;

  const globalFade = 1 - clamp01(remap(t01, holdEnd, 1));
  if (globalFade < 0.001) return;

  ctx.save();
  ctx.font = fontTemplate(fontPx);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  setLetterSpacing(ctx, -fontPx * 0.015);

  interface LetterInfo {
    char: string;
    finalX: number;
    finalY: number;
    seed: number;
  }
  const letters: LetterInfo[] = [];
  lines.forEach((line, li) => {
    const lineY = blockTop + li * lineHeight;
    const lineW = ctx.measureText(line).width;
    let cx = width / 2 - lineW / 2;
    for (const char of line) {
      const cw = ctx.measureText(char).width;
      letters.push({ char, finalX: cx + cw / 2, finalY: lineY, seed: letters.length * 37 + 11 });
      cx += cw;
    }
  });

  const totalLetters = letters.length || 1;
  const rand = rng(totalLetters * 17 + Math.round(intensity * 100));

  const letterSeeds = letters.map(() => ({ angle: rand() * Math.PI * 2, dist: diag * (0.4 + rand() * 0.6) }));

  // ── Zap icon flash at entry ────────────────────────────────────────
  const zapT = clamp01(remap(t01, 0, 0.18));
  const zapAlpha = (1 - easeOutBack(zapT, 1.5)) * globalFade;
  if (zapAlpha > 0.02 && intensity >= 2) {
    const zapSize = Math.min(width, height) * lerp(0.4, 0.05, zapT);
    drawLucideIcon(ctx, 'zap', width / 2, height / 2, zapSize, palette.accent, {
      fill: true, stroke: false,
      alpha: zapAlpha,
      glowColor: palette.accent,
      glowBlur: zapSize * 0.5,
    });
  }

  letters.forEach((lt, i) => {
    const stagger = (i / totalLetters) * inEnd * 0.7;
    const localIn = clamp01(remap(t01, stagger, stagger + inEnd * 0.5));
    const inEased = easeOutBack(localIn, 2.4);

    const exitStagger = ((totalLetters - 1 - i) / totalLetters) * 0.15;
    const localOut = clamp01(remap(t01, holdEnd + exitStagger, 1.0));
    const outEased = easeInCubic(localOut);

    const { angle, dist } = letterSeeds[i];
    const offX = Math.cos(angle) * dist;
    const offY = Math.sin(angle) * dist;

    const x = lt.finalX + offX * (1 - inEased) + offX * outEased;
    const y = lt.finalY + offY * (1 - inEased) + offY * outEased;
    const scale = lerp(0.2, 1, inEased) * lerp(1, 0, outEased);
    const alpha = inEased * (1 - outEased) * globalFade;

    if (alpha < 0.01 || scale < 0.01) return;

    const color = i % 3 === 0 ? palette.primary : i % 3 === 1 ? palette.text : palette.secondary;

    // Motion ghost trail (2 ghost copies fading behind)
    if (intensity >= 2 && localIn > 0.1 && localIn < 0.95 && outEased < 0.1) {
      for (let g = 1; g <= 2; g++) {
        const ghostIn = clamp01(remap(t01, stagger + g * 0.02, stagger + inEnd * 0.5 + g * 0.02));
        const ghostInE = easeOutBack(ghostIn, 2.4);
        const gx = lt.finalX + offX * (1 - ghostInE);
        const gy = lt.finalY + offY * (1 - ghostInE);
        ctx.save();
        ctx.translate(gx, gy);
        ctx.scale(scale * lerp(0.9, 0.7, g - 1), scale * lerp(0.9, 0.7, g - 1));
        ctx.globalAlpha = alpha * (g === 1 ? 0.2 : 0.08);
        ctx.fillStyle = hexA(palette.accent, 1);
        ctx.textAlign = 'center';
        ctx.fillText(lt.char, 0, 0);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = fontPx * (intensity === 3 ? 0.6 : 0.3) * scale;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(lt.char, 0, 0);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * 0.4;
    ctx.fillStyle = hexA('#ffffff', 1);
    ctx.fillText(lt.char, 0, 0);

    ctx.restore();

    // ── SparkDust + sparkle glint at landing ─────────────────────
    const landingT = clamp01((localIn - 0.85) / 0.15);
    if (landingT > 0 && landingT < 0.6 && outEased < 0.05) {
      const sparkAlpha = landingT * (1 - landingT * 2) * alpha;
      if (sparkAlpha > 0.01) {
        drawSparkDust(ctx, lt.finalX, lt.finalY, fontPx * 1.5, sparkAlpha * 0.7);

        // sparkle glyph glint
        ctx.save();
        ctx.globalAlpha = sparkAlpha * 0.8;
        ctx.fillStyle = hexA(palette.accent, 1);
        ctx.shadowColor = palette.accent;
        ctx.shadowBlur = fontPx * 0.2;
        ctx.beginPath();
        drawSparkle(ctx, lt.finalX + fontPx * 0.3, lt.finalY - fontPx * 0.4, fontPx * 0.15);
        ctx.fill();
        ctx.restore();
      }
    }
  });

  setLetterSpacing(ctx, 0);
  ctx.restore();
};
