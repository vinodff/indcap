/**
 * testimonial-rotator — Premium Glassmorphic Testimonial Card Rotator.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 * Inspired by Jitter's "Testimonial Cards" and social proof animations.
 *
 * Renders a rotating testimonial card with:
 *   1. Frosted glass panel floats in from below with elastic spring
 *   2. Large decorative opening quote mark in accent color
 *   3. Quote text reveals with staggered word entrance
 *   4. Avatar circle (initials/icon) + name/title slide in from left
 *   5. Star rating pops in one by one with bounce
 *   6. Navigation dots at bottom cycle through testimonials
 *   7. Gentle idle pulse before fade out
 *
 * params.text accepts pipe-separated triplets:
 *   "Quote | Name | Title | Quote | Name | Title ..."
 *   e.g. "Game changer for our workflow | Sarah Chen | CEO, TechCo | The AI beats are incredible | Marcus Lee | Content Creator"
 *
 * params.icon sets avatar style: "initials" (default, shows first letter) or "icon" (shows lucide icon)
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';
import { drawLucideIcon } from '../iconRenderer';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;
const QUOTE_FONT = `'Georgia', 'Times New Roman', serif`;

interface Testimonial {
  quote: string;
  name: string;
  title: string;
}

export const testimonialRotator = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const rawText = p.text || 'Game changer for our workflow | Sarah Chen | CEO, TechCo | The AI beats are incredible | Marcus Lee | Content Creator | Never going back to manual editing | Priya Patel | Video Editor';
  const avatarStyle = (p.icon ?? 'initials') as 'initials' | 'icon';
  const intensity = p.intensity ?? 2;

  // ── Parse testimonials ────────────────────────────────────────────────────
  const parts = rawText.split('|').map(s => s.trim());
  const testimonials: Testimonial[] = [];
  for (let i = 0; i < parts.length; i += 3) {
    if (!parts[i]) continue;
    testimonials.push({
      quote: parts[i],
      name: parts[i + 1] || 'Anonymous',
      title: parts[i + 2] || '',
    });
  }

  const count = Math.min(testimonials.length, 4);
  const activeItems = testimonials.slice(0, count);
  if (activeItems.length === 0) return;

  // ── Global fades ──────────────────────────────────────────────────────────
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // ── Testimonial cycle ─────────────────────────────────────────────────────
  // Each testimonial gets equal time, plus a transition window
  const cycleDuration = 0.70;
  const transitionOverlap = 0.12;
  const segmentLen = cycleDuration / activeItems.length;

  // Determine which testimonial is active and the local progress within it
  const rawProgress = clamp01(remap(t01, 0.08, 0.82));
  const globalSeg = rawProgress / segmentLen;
  const currentIdx = Math.min(Math.floor(globalSeg), activeItems.length - 1);
  const segT = clamp01((globalSeg - currentIdx) / 1);

  const current = activeItems[currentIdx];
  const nextIdx = (currentIdx + 1) % activeItems.length;
  const next = activeItems[nextIdx];

  // ── Element entrance timings within a segment ────────────────────────────
  // Card entry: 0.00 → 0.20
  const cardT = easeOutBack(clamp01(remap(segT, 0, 0.20)), 1.25);

  // Quote reveal (word fade): 0.10 → 0.45
  const quoteT = easeOutCubic(clamp01(remap(segT, 0.10, 0.45)));

  // Avatar + name: 0.30 → 0.50
  const avatarT = easeOutCubic(clamp01(remap(segT, 0.30, 0.50)));

  // Stars: 0.40 → 0.58
  const starsT = clamp01(remap(segT, 0.40, 0.58));

  // Exit transition (slide out + new slide in): 0.80 → 1.00
  const exitT = clamp01(remap(segT, 0.80, 1.00));
  const nextEntryT = easeOutBack(clamp01(remap(segT, 0.82, 1.00)), 1.2);

  // ── Layout ────────────────────────────────────────────────────────────────
  const cardW = Math.min(width * 0.78, 420);
  const cardH = Math.min(height * 0.50, 240);
  const cx = width / 2;
  let cy = height * 0.48;
  if (p.anchor === 'top') cy = height * 0.25;
  else if (p.anchor === 'bottom') cy = height * 0.70;

  const cardX = cx - cardW / 2;
  const cardY = cy - cardH / 2;

  // Exit slide offset
  const exitOffsetX = exitT * cardW * 1.2;
  const exitFade = 1 - exitT;

  // Next card entry
  const nextOffsetX = (1 - nextEntryT) * cardW * 1.2;
  const nextAlpha = nextEntryT;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── Background ambient glow ───────────────────────────────────────────────
  const ambientR = cardW * 0.9;
  const bgGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, ambientR);
  bgGlow.addColorStop(0, hexA(palette.primary, 0.06 * intensity));
  bgGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bgGlow;
  ctx.fillRect(cx - ambientR, cy - ambientR, ambientR * 2, ambientR * 2);

  // ── Draw current testimonial card ─────────────────────────────────────────
  drawTestimonialCard(ctx, cardX, cardY, cardW, cardH, cardT, current, palette, intensity, avatarStyle, quoteT, avatarT, starsT, segT, exitOffsetX, exitFade, false);

  // ── Draw next testimonial (transition overlap) ────────────────────────────
  if (segT > 0.80 && nextEntryT > 0.01) {
    drawTestimonialCard(ctx, cardX - nextOffsetX, cardY, cardW, cardH, nextEntryT, next, palette, intensity, avatarStyle, nextEntryT, nextEntryT, nextEntryT, segT, 0, nextAlpha, true);
  }

  // ── Navigation dots ──────────────────────────────────────────────────────
  if (activeItems.length > 1) {
    const dotSpacing = 10;
    const totalDotsW = (activeItems.length - 1) * dotSpacing;
    const dotsStartX = cx - totalDotsW / 2;
    const dotsY = cardY + cardH + 24;

    ctx.save();
    ctx.globalAlpha = globalAlpha * cardT;
    for (let i = 0; i < activeItems.length; i++) {
      const isActive = i === currentIdx;
      const dotX = dotsStartX + i * dotSpacing;
      const dotR = isActive ? 4 : 3;

      ctx.beginPath();
      ctx.arc(dotX, dotsY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? palette.accent : hexA('#ffffff', 0.25);
      ctx.shadowColor = isActive ? hexA(palette.accent, 0.5) : 'transparent';
      ctx.shadowBlur = isActive ? 6 : 0;
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore(); // global
};

// ── Draw a single testimonial card ───────────────────────────────────────────
function drawTestimonialCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  entryT: number,
  testimonial: Testimonial,
  palette: { primary: string; accent: string; secondary: string; bg?: string },
  intensity: number,
  avatarStyle: 'initials' | 'icon',
  quoteT: number,
  avatarT: number,
  starsT: number,
  _segT: number,
  offsetX: number,
  alpha: number,
  _isNext: boolean,
): void {
  if (entryT <= 0.001 || alpha <= 0.001) return;

  const cx = x + w / 2;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(offsetX, 0);

  // ── Card shadow ─────────────────────────────────────────────────────────
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;

  // ── Glass panel background ──────────────────────────────────────────────
  roundRect(ctx, x, y, w, h, 18);
  const cardGrad = ctx.createLinearGradient(x, y, x, y + h);
  cardGrad.addColorStop(0, hexA('#ffffff', 0.09));
  cardGrad.addColorStop(0.5, hexA('#ffffff', 0.05));
  cardGrad.addColorStop(1, hexA('#ffffff', 0.02));
  ctx.fillStyle = cardGrad;
  ctx.fill();

  // ── Border ──────────────────────────────────────────────────────────────
  ctx.shadowColor = 'transparent';
  roundRect(ctx, x, y, w, h, 18);
  ctx.strokeStyle = hexA('#ffffff', 0.12);
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Clip to card for inner content ──────────────────────────────────────
  ctx.save();
  roundRect(ctx, x, y, w, h, 18);
  ctx.clip();

  // ── Top accent shimmer stripe ──────────────────────────────────────────
  const stripeGrad = ctx.createLinearGradient(x, y, x + w, y);
  stripeGrad.addColorStop(0, hexA(palette.accent, 0));
  stripeGrad.addColorStop(0.3, hexA(palette.accent, 0.15));
  stripeGrad.addColorStop(0.5, hexA(palette.accent, 0.2));
  stripeGrad.addColorStop(0.7, hexA(palette.accent, 0.15));
  stripeGrad.addColorStop(1, hexA(palette.accent, 0));
  ctx.fillStyle = stripeGrad;
  ctx.fillRect(x, y, w, 3);

  // ── Decorative large quote mark ────────────────────────────────────────
  const quoteSize = h * 0.28;
  ctx.font = `${quoteSize}px ${QUOTE_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = hexA(palette.accent, 0.12);

  // Animate quote mark position on entry
  const quoteMarkY = y + h * 0.06 + (1 - entryT) * -10;
  ctx.fillText('"', x + w * 0.06, quoteMarkY);

  // ── Quote text ─────────────────────────────────────────────────────────
  const maxQuoteW = w * 0.80;
  const quoteFontSize = h * 0.10;
  ctx.font = `500 ${quoteFontSize}px ${FONT}`;

  // Simple word wrap
  const words = testimonial.quote.split(' ');
  const maxLines = 4;
  const lineHeight = quoteFontSize * 1.35;
  const quoteStartX = x + w * 0.10;
  const quoteStartY = y + h * 0.22;

  let line = '';
  let lineIdx = 0;
  let charCount = 0;

  for (let wi = 0; wi < words.length && lineIdx < maxLines; wi++) {
    const testLine = line ? `${line} ${words[wi]}` : words[wi];
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxQuoteW && line) {
      // Draw current line
      const wordProgress = quoteT;
      ctx.save();
      ctx.globalAlpha = wordProgress;
      ctx.translate(lerp(-8, 0, wordProgress), 0);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(line, quoteStartX, quoteStartY + lineIdx * lineHeight);
      ctx.restore();

      line = words[wi];
      lineIdx++;
      charCount += line.length;
    } else {
      line = testLine;
    }
  }

  // Draw last line
  if (line && lineIdx < maxLines) {
    ctx.save();
    ctx.globalAlpha = quoteT;
    ctx.translate(lerp(-8, 0, quoteT), 0);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(line, quoteStartX, quoteStartY + lineIdx * lineHeight);
    ctx.restore();
  }

  // ── Avatar circle ──────────────────────────────────────────────────────
  const avatarR = h * 0.09;
  const avatarX = x + w * 0.10;
  const avatarY = y + h * 0.70;

  ctx.save();
  ctx.globalAlpha = avatarT;
  ctx.translate(lerp(-avatarR * 2, 0, avatarT), 0);

  // Avatar ring glow
  ctx.shadowColor = hexA(palette.accent, 0.3);
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
  const avatarGrad = ctx.createRadialGradient(
    avatarX - avatarR * 0.3, avatarY - avatarR * 0.3, 0,
    avatarX, avatarY, avatarR,
  );
  avatarGrad.addColorStop(0, hexA(palette.accent, 0.6));
  avatarGrad.addColorStop(1, hexA(mixHex(palette.accent, '#000000', 0.4), 0.8));
  ctx.fillStyle = avatarGrad;
  ctx.fill();

  ctx.shadowBlur = 0;

  // Avatar inner content
  if (avatarStyle === 'initials') {
    const initial = testimonial.name.charAt(0).toUpperCase();
    ctx.font = `700 ${avatarR * 0.9}px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, avatarX, avatarY + 1);
  } else {
    drawLucideIcon(ctx, 'user', avatarX, avatarY, avatarR * 1.2, '#ffffff', { fill: false, strokeWidth: 2.5 });
  }

  ctx.restore(); // avatar translate

  // ── Name ────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = avatarT;
  ctx.translate(lerp(-12, 0, avatarT), 0);

  const nameSize = h * 0.058;
  ctx.font = `700 ${nameSize}px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(testimonial.name, avatarX + avatarR * 1.6, avatarY - nameSize * 0.55);

  // Title
  if (testimonial.title) {
    const titleSize = h * 0.045;
    ctx.font = `500 ${titleSize}px ${FONT}`;
    ctx.fillStyle = hexA('#ffffff', 0.55);
    ctx.fillText(testimonial.title, avatarX + avatarR * 1.6, avatarY + nameSize * 0.35);
  }

  ctx.restore(); // name translate

  // ── Star rating ─────────────────────────────────────────────────────────
  if (starsT > 0.01) {
    const starCount = 5;
    const starSize = h * 0.055;
    const starSpacing = starSize * 1.25;
    const starsStartX = x + w * 0.10;
    const starsY = avatarY + avatarR + 14;

    for (let si = 0; si < starCount; si++) {
      const starDelay = si * 0.06;
      const starT = clamp01((starsT - starDelay) / (1 - starDelay));
      if (starT <= 0.001) continue;

      const sScale = easeOutBack(starT, 1.3);
      const starX = starsStartX + si * starSpacing + starSize / 2;

      ctx.save();
      ctx.translate(starX, starsY);
      ctx.scale(sScale, sScale);

      // Fill 4.5 stars (show 5th as half or empty)
      const filled = si < 4;
      ctx.beginPath();
      // Draw a simple 5-point star polygon
      const outerR = starSize * 0.5;
      const innerR = outerR * 0.4;
      for (let pt = 0; pt < 10; pt++) {
        const angle = (pt * Math.PI * 2) / 10 - Math.PI / 2;
        const r = pt % 2 === 0 ? outerR : innerR;
        if (pt === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();

      ctx.fillStyle = filled ? palette.accent : hexA('#ffffff', 0.15);
      ctx.shadowColor = filled ? hexA(palette.accent, 0.4) : 'transparent';
      ctx.shadowBlur = filled ? 5 : 0;
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore(); // clip
  ctx.restore(); // card transform
}
