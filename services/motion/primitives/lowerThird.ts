/**
 * lower-third — broadcast-style name card with After Effects polish.
 *
 * Composition:
 *   - Small "tag chip" above the bar (e.g. "FEATURED")
 *   - Main bar with 3D extruded depth shadow + neon outline + corner accent
 *   - Animated diagonal accent stripe to the left of the bar
 *   - 3D-extruded label text inside the bar
 *   - Sub-line below the bar (split text on "·" or "|") + animated underline
 *   - Slide in from left + 3D card flip on entry + slide out left at end
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeInCubic, easeOutCubic, lerp, remap } from '../easing';
import { getSafeArea, fitSingleLine } from '../safeArea';
import { roundRect, draw3dExtrudedText, mixHex, hexA, setLetterSpacing } from '../decorations';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;

export const lowerThird = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const raw = p.text || 'Lower Third';
  const intensity = p.intensity || 2;

  // Split into title + subtitle by · or |
  const sep = raw.includes('|') ? '|' : raw.includes('·') ? '·' : null;
  const title = sep ? raw.split(sep)[0].trim() : raw;
  const subtitle = sep ? raw.split(sep).slice(1).join(' · ').trim() : '';

  const slideInEnd = 0.18;
  const flipEnd = 0.32;
  const slideOutStart = 0.82;

  let slideProgress = 1;
  if (t01 < slideInEnd) slideProgress = easeOutCubic(remap(t01, 0, slideInEnd));
  else if (t01 > slideOutStart) slideProgress = 1 - easeInCubic(remap(t01, slideOutStart, 1));
  if (slideProgress <= 0.005) return;

  const flipT = clamp01(remap(t01, slideInEnd * 0.4, flipEnd));
  const flipAngle = (1 - flipT) * Math.PI;
  const yScale = Math.abs(Math.cos(flipAngle / 2));

  // Sizing
  const safe = getSafeArea(width, height);
  const padX = width * 0.045;
  const barH = Math.max(72, height * 0.13);
  const barY = height - barH - height * 0.1;
  const desiredLabel = barH * 0.45;

  ctx.save();
  const labelSize = fitSingleLine(
    ctx,
    title,
    (px) => `900 ${px}px ${FONT_STACK}`,
    safe.width * 0.76,
    desiredLabel,
    Math.max(16, desiredLabel * 0.45),
  );
  ctx.font = `900 ${labelSize}px ${FONT_STACK}`;
  setLetterSpacing(ctx, -labelSize * 0.02);
  const textW = ctx.measureText(title).width;
  const barW = Math.min(textW + padX * 2.8, safe.width * 0.86);

  const fullX = width * 0.06;
  const offX = -barW - 60;
  const x = lerp(offX, fullX, slideProgress);

  // ── Tag chip above the bar (e.g. FEATURED / TIP / KEY) ─────────
  if (intensity >= 2 && slideProgress > 0.6) {
    const tagSize = labelSize * 0.32;
    const tagPadX = tagSize * 0.7;
    const tagH = tagSize * 1.9;
    ctx.save();
    ctx.font = `900 ${tagSize}px ${FONT_STACK}`;
    setLetterSpacing(ctx, tagSize * 0.12);
    const tagLabel = subtitle ? 'NAME' : 'FEATURED';
    const tagW = ctx.measureText(tagLabel).width + tagPadX * 2 + tagSize * 0.8;
    const tagX = x;
    const tagY = barY - tagH - 8;
    // Plate
    ctx.fillStyle = palette.accent;
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 10;
    roundRect(ctx, tagX, tagY, tagW, tagH, 4);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    // Bullet
    ctx.fillStyle = palette.bg;
    ctx.beginPath();
    ctx.arc(tagX + tagPadX + tagSize * 0.2, tagY + tagH / 2, tagSize * 0.25, 0, Math.PI * 2);
    ctx.fill();
    // Text
    ctx.fillStyle = palette.bg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagLabel, tagX + tagPadX + tagSize * 0.8, tagY + tagH / 2);
    setLetterSpacing(ctx, 0);
    ctx.restore();
  }

  // ── Accent diagonal stripe to the left of the bar ──────────────
  ctx.save();
  ctx.translate(x - 18, barY);
  ctx.fillStyle = palette.accent;
  ctx.shadowColor = palette.accent;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(22, 0);
  ctx.lineTo(12, barH);
  ctx.lineTo(-14, barH);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ── Main bar with 3D extrusion depth + flip ──────────────────
  ctx.save();
  const cardCY = barY + barH / 2;
  ctx.translate(x + barW / 2, cardCY);
  ctx.scale(1, Math.max(0.04, yScale));
  ctx.translate(-(x + barW / 2), -cardCY);

  const back = Math.cos(flipAngle) < 0;
  const barFaceColor = back ? palette.secondary : palette.primary;

  // 3D depth: draw 5 stacked offset shadow copies of the bar behind
  const depth = barH * 0.06;
  const depthColor = mixHex(barFaceColor, palette.bg, 0.78);
  for (let i = 5; i >= 1; i--) {
    ctx.fillStyle = mixHex(barFaceColor, depthColor, (i / 5) * 0.7);
    roundRect(ctx, x + i * depth, barY + i * depth, barW, barH, barH * 0.12);
    ctx.fill();
  }
  // Face
  ctx.fillStyle = barFaceColor;
  ctx.shadowColor = barFaceColor;
  ctx.shadowBlur = 18;
  roundRect(ctx, x, barY, barW, barH, barH * 0.12);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Inner highlight stripe along the top edge (gloss)
  const gloss = ctx.createLinearGradient(x, barY, x, barY + barH * 0.45);
  gloss.addColorStop(0, 'rgba(255,255,255,0.28)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  roundRect(ctx, x, barY, barW, barH * 0.5, barH * 0.12);
  ctx.fill();

  // Neon outline
  ctx.strokeStyle = hexA(palette.text, 0.25);
  ctx.lineWidth = 1.2;
  roundRect(ctx, x, barY, barW, barH, barH * 0.12);
  ctx.stroke();

  // Corner accent tick on the top-right of the bar
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(x + barW - barH * 0.32, barY);
  ctx.lineTo(x + barW, barY);
  ctx.lineTo(x + barW, barY + barH * 0.32);
  ctx.closePath();
  ctx.fill();

  // ── Title text with 3D extrusion (after flip completes) ────
  if (!back) {
    ctx.font = `900 ${labelSize}px ${FONT_STACK}`;
    setLetterSpacing(ctx, -labelSize * 0.02);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const words = title.split(/\s+/).filter(Boolean);
    let cx = x + padX * 1.3;
    const cy = barY + barH / 2;
    const wordReveal = clamp01(remap(t01, flipEnd, flipEnd + 0.25));
    const labelFace = palette.text;
    const labelDepth = mixHex(labelFace, palette.bg, 0.65);
    words.forEach((w, i) => {
      const w01 = clamp01(remap(wordReveal, (i / words.length) * 0.9, (i + 1) / words.length));
      ctx.globalAlpha = w01;
      const drawX = cx + (1 - w01) * 14;
      draw3dExtrudedText(ctx, w, drawX, cy, labelFace, labelDepth, labelSize, 0.04, 3);
      cx += ctx.measureText(w + ' ').width;
    });
    ctx.globalAlpha = 1;
    setLetterSpacing(ctx, 0);
  }
  ctx.restore(); // restore the flip transform

  // ── Subtitle under the bar (if provided), with animated underline ──
  if (!back && subtitle) {
    const subT = clamp01(remap(t01, flipEnd + 0.05, flipEnd + 0.35));
    if (subT > 0.01) {
      ctx.save();
      ctx.globalAlpha = subT;
      const subSize = labelSize * 0.42;
      ctx.font = `700 ${subSize}px ${FONT_STACK}`;
      setLetterSpacing(ctx, subSize * 0.06);
      ctx.fillStyle = palette.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      const subY = barY + barH + subSize * 1.4;
      ctx.fillText(subtitle.toUpperCase(), x + padX * 1.3, subY);
      // Animated underline beneath subtitle
      ctx.fillStyle = palette.accent;
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = 8;
      const subW = ctx.measureText(subtitle.toUpperCase()).width;
      ctx.fillRect(x + padX * 1.3, subY + subSize * 0.25, Math.max(60, subW * subT * 0.7), 3);
      setLetterSpacing(ctx, 0);
      ctx.restore();
    }
  } else if (!back && intensity >= 2) {
    // No subtitle but show secondary accent ribbon
    const uT = clamp01(remap(t01, flipEnd + 0.05, flipEnd + 0.35));
    if (uT > 0.01) {
      ctx.save();
      ctx.fillStyle = palette.accent;
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = 8;
      const uW = Math.max(60, barW * 0.5) * uT;
      ctx.fillRect(x + 12, barY + barH + 6, uW, 4);
      ctx.restore();
    }
  }
  ctx.restore();
};
