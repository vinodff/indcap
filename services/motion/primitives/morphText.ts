/**
 * morph-text — Magic UI "Morphing Text" port (canvas-2D approximation).
 *
 * Cycles between several text strings, crossfading + scaling between them.
 * Input format: pass multiple strings separated by `|`. For 1 string, the
 * primitive just renders it with a subtle breath/zoom (still looks alive).
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeInOutCubic, lerp, remap } from '../easing';
import { getSafeArea, fitSingleLine } from '../safeArea';
import { setLetterSpacing } from '../decorations';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;
const fontTemplate = (px: number) => `900 ${px}px ${FONT_STACK}`;

export const morphText = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;

  const rawList = (p.text || 'MORE | LESS | PERFECT').split('|').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const list = rawList.length > 0 ? rawList : ['MORPH'];

  const safe = getSafeArea(width, height, 0.1);
  const desired = Math.min(width, height) * (intensity === 3 ? 0.16 : intensity === 1 ? 0.1 : 0.13);

  // Find size that fits the longest string
  const longest = list.reduce((a, b) => (b.length > a.length ? b : a), list[0]);
  const fontPx = fitSingleLine(
    ctx,
    longest,
    fontTemplate,
    safe.width,
    desired,
    Math.max(24, Math.min(width, height) * 0.05),
  );

  const inT = clamp01(remap(t01, 0, 0.08));
  const fadeOut = 1 - clamp01(remap(t01, 0.9, 1));
  const visible = inT * fadeOut;
  if (visible < 0.001) return;

  // Slot each string into an equal-length window across the beat.
  const slotW = 1 / list.length;
  const overlap = 0.15; // each slot blends with the next
  const slotPos = t01 / slotW;
  const currentIdx = Math.min(list.length - 1, Math.floor(slotPos));
  const nextIdx = Math.min(list.length - 1, currentIdx + 1);
  const intra = slotPos - currentIdx; // 0..1 inside the current slot
  // Blend window: starts after (1 - overlap) of the slot.
  const blendStart = 1 - overlap;
  const blendT = intra > blendStart ? clamp01((intra - blendStart) / overlap) : 0;
  const morphT = easeInOutCubic(blendT);

  ctx.save();
  ctx.globalAlpha = visible;
  ctx.font = fontTemplate(fontPx);
  setLetterSpacing(ctx, -fontPx * 0.02);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = width / 2;
  const cy = height / 2;

  // Current word — fades out + scales up + shifts up as it morphs
  if (currentIdx === nextIdx) {
    // Last word, just hold with a subtle breath
    const breath = 1 + 0.02 * Math.sin(t01 * Math.PI * 6);
    drawTextWithShadow(ctx, list[currentIdx], cx, cy, breath, palette.text, palette.primary, fontPx, 1);
  } else {
    // Cross-fade between current and next
    if (morphT < 1) {
      const scale = lerp(1, 0.7, morphT);
      const opacity = 1 - morphT;
      const yOffset = -morphT * fontPx * 0.4;
      drawTextWithShadow(ctx, list[currentIdx], cx, cy + yOffset, scale, palette.text, palette.primary, fontPx, opacity);
    }
    if (morphT > 0) {
      const scale = lerp(1.3, 1, morphT);
      const opacity = morphT;
      const yOffset = (1 - morphT) * fontPx * 0.4;
      drawTextWithShadow(ctx, list[nextIdx], cx, cy + yOffset, scale, palette.text, palette.primary, fontPx, opacity);
    }
  }

  // Indicator dots showing position in the sequence
  if (list.length > 1 && intensity >= 2) {
    const dotR = Math.max(4, fontPx * 0.05);
    const gap = dotR * 3.4;
    const totalW = list.length * gap - gap * 0.3;
    const dotY = cy + fontPx * 0.95;
    const dotXStart = cx - totalW / 2 + dotR;
    list.forEach((_, i) => {
      const isActive = i === currentIdx;
      ctx.fillStyle = isActive ? palette.accent : 'rgba(255,255,255,0.25)';
      if (isActive) {
        ctx.shadowColor = palette.accent;
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      ctx.arc(dotXStart + i * gap, dotY, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
    });
  }

  setLetterSpacing(ctx, 0);
  ctx.restore();
};

function drawTextWithShadow(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  scale: number,
  textColor: string,
  glowColor: string,
  fontPx: number,
  opacity: number,
) {
  ctx.save();
  ctx.globalAlpha *= opacity;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = fontPx * 0.35;
  ctx.fillStyle = textColor;
  ctx.fillText(text, 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.restore();
}
