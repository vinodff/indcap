/**
 * bullet-list-reveal — designed list card with proper composition.
 *
 * No more empty wireframe. The output now reads as a real motion-graphics
 * "checklist scene" with:
 *   - An outer card framing the list (gradient bg + neon outline + corner brackets)
 *   - A header chip showing the section label + total count (e.g. "STEPS · 1 OF 3")
 *   - Numbered chips with gradient fill, 3D drop shadow, neon glow
 *   - A vertical connector line drawing down behind the chips
 *   - Floating geometric accents in negative space (circles, triangles, plus signs)
 *   - 3D-extruded item labels for depth
 *   - Per-item stagger sliding in from left with spring overshoot
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutBack, easeOutCubic, remap } from '../easing';
import { getSafeArea, fitSingleLine } from '../safeArea';
import {
  drawConnector,
  drawCornerBrackets,
  drawFloatingAccents,
  drawDotGrid,
  hexA,
  roundRect,
  draw3dExtrudedText,
  mixHex,
} from '../decorations';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;

const splitItems = (raw: string): string[] => {
  const t = raw.trim();
  if (!t) return ['First key step', 'Second key step', 'Third key step'];
  if (t.includes('|')) return t.split('|').map((s) => s.trim()).filter(Boolean);
  if (t.includes('·')) return t.split('·').map((s) => s.trim()).filter(Boolean);
  if (t.includes('\n')) return t.split('\n').map((s) => s.trim()).filter(Boolean);
  const commas = t.split(',');
  if (commas.length >= 3) return commas.map((s) => s.trim()).filter(Boolean);
  if (/\sand\s/i.test(t)) return t.split(/\sand\s/i).map((s) => s.trim()).filter(Boolean);
  return [t];
};

export const bulletListReveal = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  const items = splitItems(p.text || '').slice(0, 6);
  if (items.length === 0) return;

  const fadeIn = easeOutCubic(clamp01(remap(t01, 0, 0.15)));
  const fadeOut = 1 - clamp01(remap(t01, 0.88, 1));
  const visible = fadeIn * fadeOut;
  if (visible < 0.001) return;

  const safe = getSafeArea(width, height, 0.08);

  // Sizing — the longest item drives the card width
  const desiredFont = Math.max(20, Math.min(width, height) * (intensity === 3 ? 0.05 : intensity === 1 ? 0.036 : 0.044));
  const widestItem = items.reduce((a, b) => (b.length > a.length ? b : a), items[0]);

  // Card geometry first; font fits inside it
  const cardMaxW = Math.min(safe.width * 0.94, width * 0.84);
  const cardPad = Math.max(28, desiredFont * 0.9);
  const baseFont = fitSingleLine(
    ctx,
    widestItem,
    (px) => `800 ${px}px ${FONT_STACK}`,
    cardMaxW - cardPad * 2 - desiredFont * 2.2,
    desiredFont,
    Math.max(14, desiredFont * 0.5),
  );
  const chipR = baseFont * 0.7;
  const rowH = baseFont * 1.95;
  const headerH = baseFont * 1.4;

  // Set the font BEFORE measuring — fitSingleLine restored the previous font,
  // so without this line measureText uses whatever font was last set on the
  // canvas, producing wrong card widths.
  ctx.font = `800 ${baseFont}px ${FONT_STACK}`;
  const cardW = Math.min(cardMaxW, Math.max(width * 0.5, ctx.measureText(widestItem).width + cardPad * 2 + chipR * 2 + baseFont * 1.4));
  const cardH = headerH + items.length * rowH + cardPad * 1.2;
  const cardX = (width - cardW) / 2;
  const cardY = (height - cardH) / 2;

  ctx.save();
  ctx.globalAlpha = visible;

  // ── Card background — radial-tinted gradient ────────────────────
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardGrad.addColorStop(0, mixHex(palette.bg, palette.primary, 0.12));
  cardGrad.addColorStop(1, mixHex(palette.bg, palette.secondary, 0.08));
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = cardGrad;
  roundRect(ctx, cardX, cardY, cardW, cardH, baseFont * 0.5);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Subtle inner dot grid inside the card
  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, baseFont * 0.5);
  ctx.clip();
  drawDotGrid(ctx, cardX, cardY, cardW, cardH, palette.text, 0.05, baseFont * 0.8);
  ctx.restore();

  // Floating decorative accents in surrounding negative space
  const negativeSpace = { x: 0, y: 0, width, height };
  drawFloatingAccents(ctx, negativeSpace, [palette.accent, palette.secondary, palette.primary], t01, 8, 47);

  // Neon outline on the card with subtle pulse
  const pulse = 0.7 + 0.3 * Math.sin(t01 * Math.PI * 4);
  ctx.save();
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 2;
  ctx.shadowColor = palette.accent;
  ctx.shadowBlur = 14 * pulse;
  ctx.globalAlpha = visible * 0.9;
  roundRect(ctx, cardX, cardY, cardW, cardH, baseFont * 0.5);
  ctx.stroke();
  ctx.restore();

  // Corner brackets
  drawCornerBrackets(
    ctx,
    cardX - 6,
    cardY - 6,
    cardW + 12,
    cardH + 12,
    palette.primary,
    2.5,
    0.06,
    easeOutCubic(clamp01(remap(t01, 0, 0.25))),
  );

  // ── Header chip — "STEPS · 1 OF N" ────────────────────────────
  const headerT = clamp01(remap(t01, 0.05, 0.2));
  if (headerT > 0.01) {
    ctx.save();
    ctx.globalAlpha = visible * easeOutCubic(headerT);
    const headerLabel = 'STEPS';
    const headerCount = `${items.length} POINT${items.length === 1 ? '' : 'S'}`;
    const headerSize = baseFont * 0.6;
    const dotSize = headerSize * 0.35;

    ctx.font = `900 ${headerSize}px ${FONT_STACK}`;
    const labelW = ctx.measureText(headerLabel).width;
    const countW = ctx.measureText(headerCount).width;
    const padX = headerSize * 0.7;
    const chipH = headerSize * 1.7;
    const chipW = labelW + countW + padX * 3 + dotSize * 2;
    const chipX = cardX + (cardW - chipW) / 2;
    const chipY = cardY - chipH / 2 + headerSize * 0.2;

    // Chip plate
    ctx.shadowColor = palette.primary;
    ctx.shadowBlur = 12;
    ctx.fillStyle = palette.primary;
    roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Label
    ctx.font = `900 ${headerSize}px ${FONT_STACK}`;
    ctx.fillStyle = palette.bg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(headerLabel, chipX + padX, chipY + chipH / 2);
    // Divider dot
    ctx.beginPath();
    ctx.fillStyle = palette.bg;
    ctx.globalAlpha = visible * easeOutCubic(headerT) * 0.5;
    ctx.arc(chipX + padX + labelW + padX, chipY + chipH / 2, dotSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = visible * easeOutCubic(headerT);
    // Count
    ctx.fillText(headerCount, chipX + padX + labelW + padX + dotSize, chipY + chipH / 2);
    ctx.restore();
  }

  // ── Items ─────────────────────────────────────────────────────
  const itemsStartY = cardY + headerH + cardPad * 0.4;
  const chipCx = cardX + cardPad + chipR;
  const labelX = chipCx + chipR + baseFont * 0.7;

  // Connector line drawing down through chips (only if 2+ items)
  if (items.length > 1) {
    const lineT = easeOutCubic(clamp01(remap(t01, 0.18, 0.7)));
    const yStart = itemsStartY + chipR + baseFont * 0.05;
    const yEnd = itemsStartY + (items.length - 1) * rowH + chipR + baseFont * 0.05;
    drawConnector(ctx, chipCx, yStart, yEnd, hexA(palette.primary, 0.45), Math.max(2, chipR * 0.18), lineT);
  }

  items.forEach((item, i) => {
    const perWin = 0.55 / items.length;
    const itemT = clamp01(remap(t01, 0.15 + i * perWin * 0.75, 0.15 + (i + 1) * perWin));
    if (itemT <= 0.005) return;
    const slide = easeOutBack(itemT, 1.6);
    const opacity = clamp01(itemT * 1.6);
    const ox = (1 - slide) * baseFont * 1.4;
    const y = itemsStartY + i * rowH;
    const cy = y + chipR;

    ctx.save();
    ctx.globalAlpha = visible * opacity;

    // Numbered chip with gradient + glow
    const chipGrad = ctx.createRadialGradient(chipCx + ox - chipR * 0.4, cy - chipR * 0.4, 0, chipCx + ox, cy, chipR);
    chipGrad.addColorStop(0, mixHex(palette.primary, '#ffffff', 0.4));
    chipGrad.addColorStop(1, palette.primary);
    ctx.fillStyle = chipGrad;
    ctx.shadowColor = palette.primary;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(chipCx + ox, cy, chipR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Inner highlight ring
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(chipCx + ox, cy, chipR * 0.78, -Math.PI * 0.85, -Math.PI * 0.2);
    ctx.stroke();

    // Chip number
    ctx.fillStyle = palette.bg;
    ctx.font = `900 ${baseFont * 0.85}px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), chipCx + ox, cy + 1);

    // Item label with 3D extrusion
    ctx.font = `800 ${baseFont}px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const labelColor = palette.text;
    const depthColor = mixHex(labelColor, palette.bg, 0.7);
    draw3dExtrudedText(ctx, item, labelX + ox, cy + 1, labelColor, depthColor, baseFont, 0.04, 4);

    // Tiny accent square at the end of the item
    if (intensity >= 2) {
      const accentS = baseFont * 0.18;
      const accentX = labelX + ox + ctx.measureText(item).width + baseFont * 0.4;
      ctx.fillStyle = palette.accent;
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = 6;
      ctx.fillRect(accentX, cy - accentS / 2, accentS, accentS);
    }

    ctx.restore();
  });

  ctx.restore();
};
