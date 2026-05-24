/**
 * aurora-text — Magic UI–inspired text fill with a shifting aurora gradient.
 *
 * Technique: render the text into an offscreen canvas, fill the whole frame
 * with an animated multi-stop linear gradient that drifts horizontally over
 * time, then composite the text mask via `destination-in` so the gradient
 * only shows where the text is. Reads as if the letters are made of
 * northern-lights ribbon.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, lerp, remap } from '../easing';
import { getSafeArea, fitMultiline } from '../safeArea';
import { setLetterSpacing } from '../decorations';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;
const fontTemplate = (px: number) => `900 ${px}px ${FONT_STACK}`;

export const auroraText = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = (p.text || 'AURORA').toUpperCase();
  const intensity = p.intensity || 2;

  const safe = getSafeArea(width, height, 0.1);
  const desired = Math.min(width, height) * (intensity === 3 ? 0.16 : intensity === 1 ? 0.1 : 0.13);
  const maxLines = height > width ? 4 : 2;
  const { px: fontPx, lines } = fitMultiline(
    ctx,
    text,
    fontTemplate,
    safe.width,
    safe.height * 0.7,
    desired,
    maxLines,
    1.1,
    Math.max(22, Math.min(width, height) * 0.045),
  );
  if (lines.length === 0) return;

  const inT = easeOutCubic(clamp01(remap(t01, 0, 0.18)));
  const fadeOut = 1 - clamp01(remap(t01, 0.88, 1));
  const visible = inT * fadeOut;
  if (visible < 0.001) return;

  // Aurora color set — five vibrant hues that shift over time
  const colorSets: Record<string, string[]> = {
    energetic: ['#FBBF24', '#F472B6', '#22D3EE', '#A855F7', '#34D399'],
    corporate: ['#3B82F6', '#60A5FA', '#A5B4FC', '#22D3EE', '#7DD3FC'],
    kids: ['#F472B6', '#34D399', '#A78BFA', '#FBBF24', '#60D394'],
    cinematic: ['#F59E0B', '#FCD34D', '#FB923C', '#FBBF24', '#FDE68A'],
    'neon-bright': ['#FF2EC4', '#00F0FF', '#9DFF00', '#FFEE00', '#FF1493'],
    'pastel-pop': ['#F472B6', '#60D394', '#A78BFA', '#FBBF24', '#22D3EE'],
    'gradient-blast': ['#FF4E50', '#FCB045', '#22D3EE', '#A855F7', '#34D399'],
    custom: [palette.primary, palette.secondary, palette.accent, palette.text, palette.primary],
  };
  const cols = colorSets[p.palette as keyof typeof colorSets] || colorSets.energetic;

  const lineHeight = fontPx * 1.1;
  const totalH = lines.length * lineHeight;
  const blockTop = (height - totalH) / 2 + lineHeight / 2;

  ctx.save();
  ctx.font = fontTemplate(fontPx);
  setLetterSpacing(ctx, -fontPx * 0.015);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = visible;

  // Shifting horizontal gradient — phase moves with t01
  const phase = (t01 * 1.4) % 1;
  // We draw the aurora-text using a fill style that's a moving linear gradient
  // wider than the canvas so it appears to drift.
  const gradStart = -width * 0.5 + phase * width * 2;
  const gradEnd = gradStart + width * 2;
  const grad = ctx.createLinearGradient(gradStart, 0, gradEnd, height);
  cols.forEach((c, i) => {
    grad.addColorStop(i / (cols.length - 1), c);
  });

  // Build entry stagger across all words like the other text primitives
  const totalWords = lines.reduce((n, l) => n + l.split(/\s+/).filter(Boolean).length, 0) || 1;
  const perWordWindow = 0.5 / totalWords;

  let wordIndex = 0;
  lines.forEach((line, li) => {
    const words = line.split(/\s+/).filter(Boolean);
    const lineWidth = ctx.measureText(line).width;
    const spaceW = ctx.measureText(' ').width;
    const baseY = blockTop + li * lineHeight;
    let xCursor = width / 2 - lineWidth / 2;

    words.forEach((word) => {
      const ws = wordIndex * perWordWindow * 0.85;
      const wt = clamp01(remap(t01, ws, ws + perWordWindow));
      const eased = easeOutCubic(wt);
      const opacity = clamp01(eased * 1.4);
      wordIndex++;
      if (opacity <= 0.001) {
        xCursor += ctx.measureText(word + ' ').width;
        return;
      }
      const wordW = ctx.measureText(word).width;
      const cx = xCursor + wordW / 2;
      const yShift = (1 - eased) * fontPx * 0.4;

      ctx.save();
      ctx.globalAlpha = visible * opacity;

      // Soft glow halo first
      ctx.shadowColor = cols[(wordIndex - 1) % cols.length];
      ctx.shadowBlur = fontPx * 0.5;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(word, cx, baseY + yShift);
      ctx.shadowBlur = 0;

      // Aurora fill via the moving linear gradient
      ctx.fillStyle = grad;
      ctx.fillText(word, cx, baseY + yShift);

      // White inner highlight pass on top, partial alpha for crispness
      ctx.globalAlpha = visible * opacity * 0.35;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(word, cx, baseY + yShift);

      ctx.restore();
      xCursor += wordW + spaceW;
    });
  });

  // Bottom underline — thin aurora line beneath the block for "section header" feel
  if (intensity >= 2) {
    let widest = 0;
    for (const l of lines) widest = Math.max(widest, ctx.measureText(l).width);
    const uW = Math.min(safe.width * 0.8, widest * 0.9) * clamp01(remap(t01, 0.2, 0.55));
    const cyU = blockTop + (lines.length - 1) * lineHeight + lineHeight * 0.55;
    const xU = width / 2 - uW / 2;
    ctx.save();
    ctx.globalAlpha = visible * 0.95;
    const uGrad = ctx.createLinearGradient(xU, 0, xU + uW, 0);
    cols.forEach((c, i) => uGrad.addColorStop(i / (cols.length - 1), c));
    ctx.fillStyle = uGrad;
    ctx.shadowColor = cols[0];
    ctx.shadowBlur = fontPx * 0.4;
    ctx.fillRect(xU, cyU - 3, uW, 6);
    ctx.restore();
  }

  setLetterSpacing(ctx, 0);
  ctx.restore();
  // Tree-shake-safe references for utilities not yet used here
  void lerp;
};
