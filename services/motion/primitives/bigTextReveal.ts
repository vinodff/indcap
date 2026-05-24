/**
 * big-text-reveal — premium hero phrase with After Effects–style depth.
 *
 * Upgrades vs Phase 5:
 *   - Aggressive safe-area: 12% padding so words never clip the frame
 *   - 3D extrusion stack: 6 stacked shadow layers behind each word
 *   - Tightened letter-spacing for uppercase punch
 *   - Per-word chromatic aberration on entry (0 → 0.4 per word)
 *   - Animated underline with gradient + glow + knockout ends
 *   - Word-by-word stagger with spring overshoot scale 0.55 → 1
 *   - Hold full opacity middle, fade last 15%
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutBack, lerp, remap } from '../easing';
import { getSafeArea, fitMultiline } from '../safeArea';
import { draw3dExtrudedText, mixHex, setLetterSpacing } from '../decorations';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;
const fontTemplate = (px: number) => `900 ${px}px ${FONT_STACK}`;

export const bigTextReveal = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = (p.text || 'BIG IDEA').toUpperCase();
  const intensity = p.intensity || 2;

  // Tighter safe area than before — 12% pad means even on 9:16 the longest
  // word never grazes the edge.
  const safe = getSafeArea(width, height, 0.12);
  const desiredPx = Math.min(width, height) * (intensity === 3 ? 0.13 : intensity === 1 ? 0.085 : 0.11);
  const maxLines = height > width ? 5 : 3;
  const { px: fontPx, lines } = fitMultiline(
    ctx,
    text,
    fontTemplate,
    safe.width,
    safe.height * 0.7,
    desiredPx,
    maxLines,
    1.08,
    Math.max(18, Math.min(width, height) * 0.038),
  );
  if (lines.length === 0) return;

  const revealEnd = 0.5;
  const fadeStart = 0.85;
  const totalWords = lines.reduce((n, l) => n + l.split(/\s+/).filter(Boolean).length, 0) || 1;
  const perWordWindow = revealEnd / totalWords;
  const fadeOut = remap(t01, fadeStart, 1);
  const globalOpacity = 1 - fadeOut;

  ctx.save();
  // Slight negative letter-spacing tightens 900-weight uppercase
  setLetterSpacing(ctx, -fontPx * 0.018);
  ctx.font = fontTemplate(fontPx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lineHeight = fontPx * 1.08;
  const totalH = lines.length * lineHeight;
  const blockTop = (height - totalH) / 2 + lineHeight / 2;

  // ─── Underline beneath block ──────────────────────────────────────
  const underT = clamp01(remap(t01, 0.05, 0.55));
  if (underT > 0.01) {
    let widest = 0;
    for (const l of lines) widest = Math.max(widest, ctx.measureText(l).width);
    const cyU = blockTop + (lines.length - 1) * lineHeight + lineHeight * 0.55;
    const underW = Math.min(safe.width, widest) * underT;
    const underH = Math.max(5, fontPx * 0.08);
    const xU = width / 2 - underW / 2;
    ctx.save();
    ctx.globalAlpha = globalOpacity;
    // Glow halo
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = underH * 4;
    const grad = ctx.createLinearGradient(xU, cyU, xU + underW, cyU);
    grad.addColorStop(0, palette.accent);
    grad.addColorStop(0.5, palette.primary);
    grad.addColorStop(1, palette.accent);
    ctx.fillStyle = grad;
    ctx.fillRect(xU, cyU - underH / 2, underW, underH);
    // Two end caps - small circles that look like neon bulbs
    ctx.beginPath();
    ctx.arc(xU, cyU, underH * 0.7, 0, Math.PI * 2);
    ctx.arc(xU + underW, cyU, underH * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ─── Words across lines ───────────────────────────────────────────
  let wordIndex = 0;
  // Pre-computed colors for the words
  const colors = [palette.text, palette.primary, palette.text, palette.secondary];

  lines.forEach((line, li) => {
    const words = line.split(/\s+/).filter(Boolean);
    const lineWidth = ctx.measureText(line).width;
    const spaceW = ctx.measureText(' ').width;
    const baseY = blockTop + li * lineHeight;
    let xCursor = width / 2 - lineWidth / 2;

    words.forEach((word) => {
      const wordStart = wordIndex * perWordWindow * 0.82;
      const wordT = clamp01(remap(t01, wordStart, wordStart + perWordWindow));
      const eased = easeOutBack(wordT, 2.0);
      const scale = lerp(0.6, 1, eased);
      const opacity = clamp01(eased * 1.5) * globalOpacity;
      const colorIdx = wordIndex;
      wordIndex++;

      if (opacity <= 0.001) {
        xCursor += ctx.measureText(word + ' ').width;
        return;
      }
      const wordWidth = ctx.measureText(word).width;
      const cx = xCursor + wordWidth / 2;
      const aberration = clamp01(1 - wordT / 0.65);
      const splitX = fontPx * 0.045 * aberration;
      const faceColor = colors[colorIdx % colors.length];
      const depthColor = mixHex(faceColor, palette.bg, 0.75);

      ctx.save();
      ctx.translate(cx, baseY);
      ctx.scale(scale, scale);
      ctx.globalAlpha = opacity;

      // RGB chromatic aberration on entry
      if (aberration > 0.03) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.font = fontTemplate(fontPx);
        ctx.fillStyle = '#ff0033';
        ctx.fillText(word, -splitX, 0);
        ctx.fillStyle = '#00ff99';
        ctx.fillText(word, splitX * 0.6, 0);
        ctx.fillStyle = '#0099ff';
        ctx.fillText(word, 0, splitX * 0.7);
        ctx.restore();
      }

      // 3D extruded text — back-to-front depth layers
      ctx.font = fontTemplate(fontPx);
      draw3dExtrudedText(ctx, word, 0, 0, faceColor, depthColor, fontPx, 0.055, 6);

      // Soft drop glow on top
      ctx.save();
      ctx.shadowColor = faceColor === palette.primary ? palette.primary : 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = fontPx * 0.18;
      ctx.fillStyle = 'rgba(0,0,0,0)'; // invisible fill so we only cast shadow
      ctx.fillText(word, 0, 0);
      ctx.restore();

      ctx.restore();
      xCursor += wordWidth + spaceW;
    });
  });

  // Reset letter-spacing for downstream draws
  setLetterSpacing(ctx, 0);
  ctx.restore();
};
