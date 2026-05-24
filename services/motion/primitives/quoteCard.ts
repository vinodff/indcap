/**
 * quote-card — pull-out quote with a big leading quote-mark glyph,
 * the quote text revealing word-by-word, and an optional author line
 * sliding in from below.
 *
 * Author convention: pass author after a pipe.  Example text:
 *   "Less is more. | Mies van der Rohe"
 *
 * If no pipe, the whole text is the quote.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutBack, easeOutCubic, lerp, remap } from '../easing';
import { getSafeArea } from '../safeArea';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;

export const quoteCard = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  const raw = (p.text || 'Less is more. | Mies van der Rohe').trim();
  const [quoteRaw, authorRaw] = raw.split('|').map((s) => s.trim());
  const quote = quoteRaw || raw;
  const author = authorRaw || '';

  const inT = easeOutCubic(clamp01(remap(t01, 0, 0.18)));
  const fadeOut = 1 - clamp01(remap(t01, 0.88, 1));
  const visible = inT * fadeOut;
  if (visible < 0.001) return;

  // Frame-safe: clamp card width to safe area, scale font accordingly.
  const safe = getSafeArea(width, height);
  const cardW = Math.min(safe.width * 0.92, height * 1.4);
  const baseFont = Math.max(
    18,
    Math.min(width, height) * (intensity === 3 ? 0.055 : intensity === 1 ? 0.038 : 0.046),
  );

  // Wrap quote into lines that fit cardW
  ctx.save();
  ctx.font = `700 ${baseFont}px ${FONT_STACK}`;
  const maxLineW = cardW - baseFont * 1.6;
  const lines = wrapText(ctx, quote, maxLineW);

  // Card geometry: pad + lines + author + quote mark
  const lineH = baseFont * 1.25;
  const padY = baseFont * 0.8;
  const authorH = author ? baseFont * 0.9 : 0;
  const quoteMarkSize = baseFont * 2.2;
  const cardH = padY * 2 + lines.length * lineH + (author ? authorH + baseFont * 0.5 : 0) + quoteMarkSize * 0.3;
  const cx = width / 2;
  const cy = height / 2;
  const x = cx - cardW / 2;
  const y = cy - cardH / 2;

  ctx.globalAlpha = visible;

  // Card background with soft glow
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = baseFont * 0.8;
  ctx.shadowOffsetY = baseFont * 0.25;
  const grad = ctx.createLinearGradient(x, y, x, y + cardH);
  grad.addColorStop(0, hexA(palette.primary, 0.18));
  grad.addColorStop(1, hexA(palette.bg, 0.92));
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, cardW, cardH, baseFont * 0.4);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Left accent stripe
  ctx.fillStyle = palette.accent;
  ctx.fillRect(x, y + baseFont * 0.5, baseFont * 0.18, cardH - baseFont);

  // Big quote-mark glyph in top-left corner, scales in with overshoot
  const markT = clamp01(remap(t01, 0.05, 0.3));
  const markScale = lerp(0.4, 1, easeOutBack(markT, 2));
  ctx.save();
  ctx.translate(x + baseFont * 1.1, y + baseFont * 1.0);
  ctx.scale(markScale, markScale);
  ctx.fillStyle = palette.accent;
  ctx.font = `900 ${quoteMarkSize}px Georgia, 'Times New Roman', serif`;
  ctx.textBaseline = 'top';
  ctx.fillText('“', 0, 0);
  ctx.restore();

  // Quote text — line-by-line stagger
  ctx.fillStyle = palette.text;
  ctx.font = `700 ${baseFont}px ${FONT_STACK}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const textStartY = y + padY + quoteMarkSize * 0.35;
  const textX = x + baseFont * 1.4;
  lines.forEach((line, i) => {
    const lineWindow = 0.25 / Math.max(1, lines.length);
    const lineT = clamp01(remap(t01, 0.2 + i * lineWindow * 0.85, 0.2 + (i + 1) * lineWindow));
    if (lineT <= 0.005) return;
    const lt = easeOutCubic(lineT);
    ctx.globalAlpha = visible * lt;
    ctx.fillText(line, textX + (1 - lt) * baseFont * 0.4, textStartY + i * lineH);
  });

  // Author
  if (author) {
    const authT = clamp01(remap(t01, 0.55, 0.75));
    if (authT > 0.01) {
      ctx.globalAlpha = visible * easeOutCubic(authT);
      ctx.font = `900 ${baseFont * 0.72}px ${FONT_STACK}`;
      ctx.fillStyle = palette.primary;
      const authorY = textStartY + lines.length * lineH + baseFont * 0.6;
      // Author with a leading em-dash
      const authorText = '— ' + author.toUpperCase();
      ctx.fillText(authorText, textX + (1 - easeOutCubic(authT)) * baseFont * 0.6, authorY);
    }
  }

  ctx.restore();
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [text];
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(255,255,255,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
