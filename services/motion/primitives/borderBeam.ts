/**
 * border-beam — Magic UI "Border Beam" port.
 *
 * Draws a content card with a chasing-glow dot traveling around its
 * rectangular border, leaving a fading trail. The card content area shows
 * the params.text in bold uppercase.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, remap } from '../easing';
import { getSafeArea, fitMultiline } from '../safeArea';
import { roundRect, hexA, setLetterSpacing } from '../decorations';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;

export const borderBeam = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  const text = (p.text || 'PREMIUM').toUpperCase();

  const safe = getSafeArea(width, height, 0.08);
  const cardW = Math.min(safe.width * 0.88, width * 0.78);
  const cardH = Math.min(safe.height * 0.62, height * 0.5);
  const cardX = (width - cardW) / 2;
  const cardY = (height - cardH) / 2;
  const r = Math.min(cardW, cardH) * 0.06;

  const fadeIn = easeOutCubic(clamp01(remap(t01, 0, 0.15)));
  const fadeOut = 1 - clamp01(remap(t01, 0.9, 1));
  const visible = fadeIn * fadeOut;
  if (visible < 0.001) return;

  ctx.save();
  ctx.globalAlpha = visible;

  // ── Card background ──────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  bgGrad.addColorStop(0, hexA(palette.primary, 0.15));
  bgGrad.addColorStop(1, hexA(palette.bg, 0.95));
  ctx.fillStyle = bgGrad;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, cardX, cardY, cardW, cardH, r);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // ── Soft static border (low alpha) so it's visible without the beam ─
  ctx.strokeStyle = hexA(palette.primary, 0.25);
  ctx.lineWidth = 2;
  roundRect(ctx, cardX, cardY, cardW, cardH, r);
  ctx.stroke();

  // ── The chasing beam: a bright dot + trail traveling around the perimeter ─
  const perim = 2 * (cardW + cardH);
  const cyclesPerBeat = intensity === 3 ? 3 : intensity === 1 ? 1.2 : 2;
  const phase = (t01 * cyclesPerBeat) % 1;
  const headDist = phase * perim;
  const trailCount = 30;
  const trailLen = perim * 0.35;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < trailCount; i++) {
    const t = i / (trailCount - 1);
    const d = (headDist - t * trailLen + perim) % perim;
    const { x, y } = pointOnPerimeter(cardX, cardY, cardW, cardH, d);
    const a = (1 - t) * 0.95;
    const size = 6 * (1 - t) + 1.5;
    // Color shifts along the trail: head white-hot, tail palette.accent
    const color = i === 0 ? '#ffffff' : palette.accent;
    ctx.fillStyle = color;
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 14 * (1 - t);
    ctx.globalAlpha = visible * a;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = visible;
  // Second, opposite-side beam for symmetry at intensity 3
  if (intensity >= 3) {
    const phase2 = ((t01 * cyclesPerBeat) + 0.5) % 1;
    const head2 = phase2 * perim;
    for (let i = 0; i < trailCount; i++) {
      const t = i / (trailCount - 1);
      const d = (head2 - t * trailLen + perim) % perim;
      const { x, y } = pointOnPerimeter(cardX, cardY, cardW, cardH, d);
      const a = (1 - t) * 0.85;
      const size = 5 * (1 - t) + 1.2;
      ctx.fillStyle = palette.primary;
      ctx.shadowColor = palette.primary;
      ctx.shadowBlur = 12 * (1 - t);
      ctx.globalAlpha = visible * a;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // ── Text inside the card ─────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = visible;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const desired = Math.min(cardW * 0.18, cardH * 0.32);
  const { px: fontPx, lines } = fitMultiline(
    ctx,
    text,
    (px) => `900 ${px}px ${FONT_STACK}`,
    cardW * 0.84,
    cardH * 0.7,
    desired,
    3,
    1.12,
    18,
  );
  ctx.font = `900 ${fontPx}px ${FONT_STACK}`;
  setLetterSpacing(ctx, -fontPx * 0.02);
  const blockTop = cardY + cardH / 2 - ((lines.length - 1) * fontPx * 1.12) / 2;
  lines.forEach((line, i) => {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = fontPx * 0.2;
    ctx.shadowOffsetY = fontPx * 0.06;
    ctx.fillStyle = palette.text;
    ctx.fillText(line, cardX + cardW / 2, blockTop + i * fontPx * 1.12);
  });
  setLetterSpacing(ctx, 0);
  ctx.restore();

  ctx.restore();
};

const pointOnPerimeter = (x: number, y: number, w: number, h: number, d: number): { x: number; y: number } => {
  // Clockwise from top-left.
  if (d < w) return { x: x + d, y };
  if (d < w + h) return { x: x + w, y: y + (d - w) };
  if (d < 2 * w + h) return { x: x + w - (d - w - h), y: y + h };
  return { x, y: y + h - (d - 2 * w - h) };
};
