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

  // Layout
  const cardW = Math.min(width * 0.78, 380);
  const cardH = Math.min(height * 0.2, 88);
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

    // Title
    ctx.font = `700 ${cardH * 0.22}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(card.title, -cardW / 2 + 20, -cardH * 0.12);

    // Body
    ctx.font = `500 ${cardH * 0.15}px ${FONT}`;
    ctx.fillStyle = hexA('#ffffff', 0.6);
    ctx.fillText(card.body, -cardW / 2 + 20, cardH * 0.22);

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
