/**
 * scroll-reveal-stack — Layered cards revealing progressively on scroll.
 *
 * Renders 3-5 stacked glassmorphic cards that:
 *   1. Stack vertically with staggered y-offset and z-depth shadow
 *   2. Each card slides upward + fades in at a staggered time
 *   3. Cards have subtle edge lighting and frosted glass texture
 *   4. Top card has a glowing accent indicator
 *   5. Each card can display title + body text content
 *   6. Exit animation: cards collapse downward with fade
 *
 * params.text format: "Title | Body | Title | Body | ..." (pairs)
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeInOutCubic, easeOutCubic, easeOutBack, lerp } from '../easing';

const FONT = `'Inter', 'SF Pro Display', 'Segoe UI', sans-serif`;

interface StackCard {
  title: string;
  body: string;
  color: string;
}

export const scrollRevealStack = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = p.text || 'Feature One | The first powerful capability | Feature Two | Seamless integration with your workflow | Feature Three | Real-time collaboration tools';
  const intensity = p.intensity || 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // Parse cards
  const parts = text.split('|').map(s => s.trim()).filter(Boolean);
  const cards: StackCard[] = [];
  const cardColors = [
    palette.primary,
    palette.accent,
    palette.secondary,
    mixHex(palette.primary, palette.accent, 0.5),
    mixHex(palette.secondary, palette.accent, 0.4),
  ];

  for (let i = 0; i < parts.length; i += 2) {
    const title = parts[i] || `Card ${cards.length + 1}`;
    const body = parts[i + 1] || 'Content description';
    cards.push({ title, body, color: cardColors[(cards.length) % cardColors.length] });
  }

  const maxCards = Math.min(cards.length, intensity === 3 ? 5 : intensity === 1 ? 3 : 4);
  const activeCards = cards.slice(0, maxCards);

  // Layout with responsive sizing for extreme aspect ratios
  const aspectRatio = width / height;
  const cardW = Math.min(width * 0.78, 380);
  // Responsive card height: reduce on portrait (9:16), maintain on landscape
  const baseCardH = aspectRatio < 0.7 ? Math.min(height * 0.12, 60) : Math.min(height * 0.2, 88);
  const cardH = baseCardH;
  const stackGap = cardH * 0.15;
  const totalH = maxCards * (cardH + stackGap) - stackGap;
  const startY = (height - totalH) / 2;
  const cx = width / 2;

  // Timeline
  const revealDuration = 0.6;
  const staggerDelay = maxCards > 1 ? revealDuration / maxCards : 0.15;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // Draw from back (top of stack) to front (bottom of stack)
  // Back cards are drawn first (they appear behind)
  for (let i = maxCards - 1; i >= 0; i--) {
    const card = activeCards[i];
    const revealStart = 0.08 + i * staggerDelay;
    const revealT = clamp01(remap(t01, revealStart, revealStart + 0.25));
    const cardFadeIn = easeOutCubic(revealT);
    if (cardFadeIn < 0.01) continue;

    // Card vertical position with stack offset
    const stackOffset = (maxCards - 1 - i) * (cardH + stackGap) * 0.5;
    const slideUp = (1 - cardFadeIn) * 40;
    const cardY = startY + i * (cardH + stackGap) + slideUp - stackOffset;

    // Card scale (back cards slightly smaller)
    const depthScale = lerp(0.92, 1, i / Math.max(1, maxCards - 1));
    const scale = depthScale * (0.95 + 0.05 * cardFadeIn);

    // Horizontal offset for slight 3D perspective
    const xOffset = (maxCards - 1 - i) * 6;

    ctx.save();
    ctx.translate(cx + xOffset, cardY + cardH / 2);
    ctx.scale(scale, scale);

    // Shadow depth
    const shadowDepth = (maxCards - 1 - i) * 4;
    ctx.shadowColor = hexA('#000000', 0.2 + (maxCards - 1 - i) * 0.04);
    ctx.shadowBlur = 16 + shadowDepth;
    ctx.shadowOffsetY = 4 + shadowDepth;

    // Card background (glass)
    const glassGrad = ctx.createLinearGradient(-cardW / 2, -cardH / 2, cardW / 2, cardH / 2);
    glassGrad.addColorStop(0, hexA('#ffffff', 0.1));
    glassGrad.addColorStop(0.5, hexA('#ffffff', 0.05));
    glassGrad.addColorStop(1, hexA('#ffffff', 0.02));
    ctx.fillStyle = glassGrad;
    roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 14);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Card border
    const edgeGrad = ctx.createLinearGradient(-cardW / 2, -cardH / 2, cardW / 2, cardH / 2);
    edgeGrad.addColorStop(0, hexA('#ffffff', 0.2));
    edgeGrad.addColorStop(0.3, hexA('#ffffff', 0.04));
    edgeGrad.addColorStop(0.7, hexA(card.color, 0.1));
    edgeGrad.addColorStop(1, hexA(card.color, 0.25));
    ctx.strokeStyle = edgeGrad;
    ctx.lineWidth = 1;
    roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 14);
    ctx.stroke();

    // Accent left bar
    const barH = cardH * 0.5;
    const barGrad = ctx.createLinearGradient(-cardW / 2, -barH / 2, -cardW / 2 + 3, -barH / 2);
    barGrad.addColorStop(0, hexA(card.color, 0.8));
    barGrad.addColorStop(1, hexA(card.color, 0.05));
    ctx.fillStyle = barGrad;
    roundRect(ctx, -cardW / 2, -barH / 2, 3, barH, 1.5);
    ctx.fill();

    // Title with responsive sizing and word wrapping
    const titleFontSize = Math.max(10, cardH * 0.22);
    ctx.font = `700 ${titleFontSize}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    const maxTextWidth = cardW - 40;
    const wrappedTitle = wrapStackText(card.title, ctx, maxTextWidth);
    const titleLineHeight = titleFontSize * 1.1;
    wrappedTitle.forEach((line, idx) => {
      ctx.fillText(line, -cardW / 2 + 20, -cardH * 0.12 + idx * titleLineHeight);
    });

    // Body with responsive sizing
    const bodyFontSize = Math.max(8, cardH * 0.15);
    ctx.font = `500 ${bodyFontSize}px ${FONT}`;
    ctx.fillStyle = hexA('#ffffff', 0.6);

    const wrappedBody = wrapStackText(card.body, ctx, maxTextWidth);
    const bodyLineHeight = bodyFontSize * 1.1;
    wrappedBody.forEach((line, idx) => {
      ctx.fillText(line, -cardW / 2 + 20, cardH * 0.22 + idx * bodyLineHeight);
    });

    // Glowing indicator dot on the latest card (most front)
    if (i === 0 && intensity >= 2) {
      const dotPulse = 0.6 + 0.4 * Math.sin(t01 * Math.PI * 5);
      ctx.fillStyle = hexA(card.color, dotPulse);
      ctx.shadowColor = card.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cardW / 2 - 16, -cardH * 0.12, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
    }

    ctx.restore();
  }

  ctx.restore();
};

function wrapStackText(
  text: string,
  ctx: CanvasRenderingContext2D,
  maxWidth: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const measured = ctx.measureText(testLine).width;
    if (measured > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [text];
}
