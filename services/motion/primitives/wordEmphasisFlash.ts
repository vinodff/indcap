/**
 * word-emphasis-flash — one word flashes with an accent-color background plate
 * for ~200ms in the middle of the beat. Used to punch a single charged word.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, lerp, remap } from '../easing';
import { roundRect } from '../decorations';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;

export const wordEmphasisFlash = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  const word = (p.text || 'NOW').split(/\s+/).filter(Boolean)[0]?.toUpperCase() || 'NOW';

  // Punch curve: jump in at 0.1 → 0.25, hold to 0.7, fade to 1.0
  const inT = clamp01(remap(t01, 0.05, 0.22));
  const outT = clamp01(remap(t01, 0.7, 0.95));
  const alpha = easeOutCubic(inT) * (1 - outT);

  if (alpha <= 0.001) return;

  // Optional shake to feel "punched" at strongest intensities
  const shakeAmp = intensity === 3 ? Math.min(width, height) * 0.006 : 0;
  const shakeX = shakeAmp ? Math.sin(t01 * Math.PI * 30) * shakeAmp : 0;
  const shakeY = shakeAmp ? Math.cos(t01 * Math.PI * 28) * shakeAmp : 0;

  const fontSize = Math.min(width, height) * (intensity === 3 ? 0.16 : intensity === 1 ? 0.1 : 0.13);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(width / 2 + shakeX, height / 2 + shakeY);

  ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const metrics = ctx.measureText(word);
  const padX = fontSize * 0.35;
  const padY = fontSize * 0.18;
  const w = metrics.width + padX * 2;
  const h = fontSize * 1.15 + padY * 2;

  // Background plate scales up with a little overshoot
  const plateScale = lerp(0.7, 1, easeOutCubic(inT));
  ctx.save();
  ctx.scale(plateScale, plateScale);
  ctx.fillStyle = palette.accent;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = fontSize * 0.25;
  ctx.shadowOffsetY = fontSize * 0.08;
  roundRect(ctx, -w / 2, -h / 2, w, h, fontSize * 0.18);
  ctx.fill();
  ctx.restore();

  // Word
  ctx.fillStyle = palette.bg;
  ctx.shadowColor = 'transparent';
  ctx.fillText(word, 0, 2);

  ctx.restore();
};
