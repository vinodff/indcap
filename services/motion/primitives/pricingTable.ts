/**
 * pricing-table — 3-Tier Animated Pricing Cards Comparison.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 * Inspired by Jitter's "Pricing Cards" and Apple WWDC-style comparisons.
 *
 * Renders three pricing cards (Basic, Pro, Enterprise) that:
 *   1. Spring-animate in from below with staggered elastic overshoot
 *   2. Each card features a glassmorphic panel, title, animated price,
 *      staggered feature list with checkmarks, and a CTA button
 *   3. Middle card (Pro/Recommended) is highlighted with a "POPULAR"
 *      badge, elevated position, accent border glow
 *   4. Price counters tick up with digit roll effect
 *   5. CTA button pulses gently during idle phase
 *
 * params.text accepts pipe-separated plan data:
 *   "Basic | $9 | Pro | $29 | Enterprise | $99"
 * params.icon controls feature reveal style: "minimal" (default) or "detailed"
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';
import { drawLucideIcon } from '../iconRenderer';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

interface PlanConfig {
  title: string;
  price: string;
  priceNum: number;
  features: string[];
  isPopular: boolean;
  cta: string;
}

export const pricingTable = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const rawText = p.text || 'Basic | $9 | Pro | $29 | Enterprise | $99';
  const intensity = p.intensity ?? 2;

  // Parse plan data
  const parts = rawText.split('|').map(s => s.trim());
  const plans: PlanConfig[] = [
    {
      title: parts[0] || 'Basic',
      price: parts[1] || '$9',
      priceNum: parseInt(parts[1]?.replace(/[^0-9]/g, '')) || 9,
      features: ['Core feature access', 'Basic support', '1 project'],
      isPopular: false,
      cta: 'Get Started',
    },
    {
      title: parts[2] || 'Pro',
      price: parts[3] || '$29',
      priceNum: parseInt(parts[3]?.replace(/[^0-9]/g, '')) || 29,
      features: ['Everything in Basic', 'Priority support', '10 projects', 'Advanced analytics'],
      isPopular: true,
      cta: 'Start Free Trial',
    },
    {
      title: parts[4] || 'Enterprise',
      price: parts[5] || '$99',
      priceNum: parseInt(parts[5]?.replace(/[^0-9]/g, '')) || 99,
      features: ['Everything in Pro', '24/7 dedicated support', 'Unlimited projects', 'Custom integrations', 'SLA guarantee'],
      isPopular: false,
      cta: 'Contact Sales',
    },
  ];

  // Price counter animation
  const priceAnimT = clamp01(remap(t01, 0.25, 0.50));

  const animatePrice = (base: number, t: number): string => {
    const val = Math.round(lerp(0, base, t));
    return `$${val}`;
  };

  // ── Global fades ──────────────────────────────────────────────────────────
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.90, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // ── Layout ────────────────────────────────────────────────────────────────
  const isVertical = width < height * 1.2;
  const cardCount = 3;
  const cardGap = isVertical ? height * 0.02 : width * 0.025;
  const cardW = isVertical
    ? Math.min(width * 0.78, 280)
    : Math.min((width - cardGap * (cardCount + 1)) / cardCount, 260);
  const cardH = isVertical
    ? Math.min(height * 0.22, 200)
    : Math.min(height * 0.55, 260);

  const totalW = cardCount * cardW + (cardCount - 1) * cardGap;
  const startX = (width - totalW) / 2;
  const startY = (height - cardH) / 2;

  // Middle card offset (slightly higher for "popular")
  const popularOffset = cardH * 0.04;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── Background ambient ────────────────────────────────────────────────────
  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.6);
  bgGrad.addColorStop(0, hexA(palette.primary, 0.06));
  bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // ── Render each card ──────────────────────────────────────────────────────
  plans.forEach((plan, i) => {
    const cardX = startX + i * (cardW + cardGap);
    const cardY = plan.isPopular ? startY - popularOffset : startY;

    // Staggered entrance
    const entryDelay = 0.10 + i * 0.10;
    const entryT = easeOutBack(clamp01(remap(t01, entryDelay, entryDelay + 0.25)), 1.2);

    if (entryT <= 0.001) return;

    // Vertical slide from below
    const slideY = lerp(40, 0, entryT);
    const cardAlpha = entryT;

    // Feature stagger reveal
    const featureRevealBase = easeOutCubic(clamp01(remap(t01, 0.40 + i * 0.06, 0.65 + i * 0.06)));

    // CTA button reveal
    const ctaReveal = easeOutCubic(clamp01(remap(t01, 0.55 + i * 0.06, 0.72 + i * 0.06)));

    // Price animation
    const priceDisplay = animatePrice(plan.priceNum, priceAnimT);

    // Popular badge
    const badgeReveal = easeOutBack(clamp01(remap(t01, 0.15 + i * 0.10, 0.30 + i * 0.10)), 1.3);

    ctx.save();
    ctx.globalAlpha = cardAlpha;
    ctx.translate(0, slideY);

    const cx = cardX + cardW / 2;

    // ── Card shadow ───────────────────────────────────────────────────────
    ctx.shadowColor = plan.isPopular
      ? hexA(palette.accent, 0.25 * entryT)
      : 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = plan.isPopular ? 25 : 12;
    ctx.shadowOffsetY = plan.isPopular ? 8 : 4;

    // ── Card background ──────────────────────────────────────────────────
    roundRect(ctx, cardX, cardY, cardW, cardH, 14);
    const bgAlpha = plan.isPopular ? 0.10 : 0.06;
    ctx.fillStyle = hexA('#ffffff', bgAlpha);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Card border
    roundRect(ctx, cardX, cardY, cardW, cardH, 14);
    const borderC = plan.isPopular
      ? hexA(palette.accent, 0.5)
      : hexA('#ffffff', 0.1);
    ctx.strokeStyle = borderC;
    ctx.lineWidth = plan.isPopular ? 1.5 : 1;
    ctx.stroke();

    // ── Popular badge ─────────────────────────────────────────────────────
    if (plan.isPopular && badgeReveal > 0.01) {
      ctx.save();
      ctx.globalAlpha = badgeReveal;
      const badgeText = 'POPULAR';
      const badgeSize = cardW * 0.08;
      ctx.font = `700 ${badgeSize}px ${FONT}`;
      const badgeW = ctx.measureText(badgeText).width + badgeSize * 1.2;
      const badgeH = badgeSize * 1.4;
      const badgeX = cardX + cardW / 2 - badgeW / 2;
      const badgeY = cardY - badgeH * 0.5 + (1 - badgeReveal) * 15;

      roundRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
      ctx.fillStyle = palette.accent;
      ctx.shadowColor = hexA(palette.accent, 0.5);
      ctx.shadowBlur = 10;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.font = `700 ${badgeSize * 0.65}px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
      ctx.restore();
    }

    // ── Card inner content area (clip) ─────────────────────────────────────
    ctx.save();
    roundRect(ctx, cardX, cardY, cardW, cardH, 14);
    ctx.clip();

    // Top accent stripe (popular only)
    if (plan.isPopular) {
      const stripeGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
      stripeGrad.addColorStop(0, hexA(palette.accent, 0));
      stripeGrad.addColorStop(0.3, hexA(palette.accent, 0.3));
      stripeGrad.addColorStop(0.5, hexA(palette.accent, 0.5));
      stripeGrad.addColorStop(0.7, hexA(palette.accent, 0.3));
      stripeGrad.addColorStop(1, hexA(palette.accent, 0));
      ctx.fillStyle = stripeGrad;
      ctx.fillRect(cardX, cardY, cardW, 3);
    }

    // ── Title ──────────────────────────────────────────────────────────────
    ctx.shadowBlur = 0;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const titleSize = cardW * 0.08;
    ctx.font = `700 ${titleSize}px ${FONT}`;
    ctx.fillStyle = plan.isPopular ? '#ffffff' : hexA('#ffffff', 0.8);
    const titleY = cardY + cardH * 0.08 + (plan.isPopular ? popularOffset : 0);
    ctx.fillText(plan.title, cx, titleY);

    // ── Price ─────────────────────────────────────────────────────────────
    const priceSize = cardW * 0.16;
    ctx.font = `800 ${priceSize}px ${FONT}`;
    const priceGrad = ctx.createLinearGradient(cx - cardW * 0.3, 0, cx + cardW * 0.3, 0);
    priceGrad.addColorStop(0, hexA('#ffffff', 0.8));
    priceGrad.addColorStop(0.5, '#ffffff');
    priceGrad.addColorStop(1, hexA('#ffffff', 0.8));
    ctx.fillStyle = priceGrad;
    const priceY = titleY + titleSize * 1.3;
    ctx.fillText(priceDisplay, cx, priceY);

    // ── Price label ───────────────────────────────────────────────────────
    const perLabel = plan.title === 'Enterprise' ? '/mo' : '/mo';
    const perSize = cardW * 0.045;
    ctx.font = `500 ${perSize}px ${FONT}`;
    ctx.fillStyle = hexA('#ffffff', 0.4);
    ctx.fillText(perLabel, cx, priceY + priceSize * 0.8);

    // ── Features ──────────────────────────────────────────────────────────
    const featureStartY = priceY + priceSize * 1.2 + cardH * 0.02;
    const featureSize = cardW * 0.055;
    ctx.font = `500 ${featureSize}px ${FONT}`;
    ctx.textAlign = 'left';

    const maxFeatures = Math.min(plan.features.length, 5);
    for (let fi = 0; fi < maxFeatures; fi++) {
      const featDelay = fi * 0.06;
      const featT = clamp01((featureRevealBase - featDelay) / (1 - featDelay));
      if (featT <= 0.001) continue;

      const fy = featureStartY + fi * (featureSize * 1.6);
      const fx = cardX + cardW * 0.12;

      ctx.save();
      ctx.globalAlpha = featT;
      ctx.translate(lerp(-8, 0, featT), 0);

      // Lucide check icon (16-20px)
      const checkSize = featureSize * 0.9;
      const checkIconColor = plan.isPopular ? palette.accent : hexA('#ffffff', 0.6);

      drawLucideIcon(ctx, 'check', fx + checkSize * 0.3, fy + featureSize * 0.25, checkSize, checkIconColor, {
        stroke: true,
        strokeWidth: 2,
        fill: false,
      });

      // Feature text
      ctx.fillStyle = hexA('#ffffff', 0.7);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(plan.features[fi], fx + checkSize * 2.5, fy);
      ctx.restore();
    }

    // ── CTA Button ────────────────────────────────────────────────────────
    if (ctaReveal > 0.01) {
      const btnW = cardW * 0.76;
      const btnH = cardH * 0.10;
      const btnX = cx - btnW / 2;
      const btnY = cardY + cardH - btnH - cardH * 0.06;

      // Button pulse
      const pulseAlpha = 0.85 + 0.15 * Math.sin(t01 * 3 + i * 1.5);
      const pulseScale = plan.isPopular ? 0.97 + 0.03 * Math.sin(t01 * 3 + i * 1.5) : 1;

      ctx.save();
      ctx.globalAlpha = ctaReveal * pulseAlpha;
      ctx.translate(cx, btnY + btnH / 2);
      ctx.scale(pulseScale, pulseScale);
      ctx.translate(-(cx), -(btnY + btnH / 2));

      // Button background
      const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
      if (plan.isPopular) {
        btnGrad.addColorStop(0, palette.accent);
        btnGrad.addColorStop(1, mixHex(palette.accent, '#000000', 0.2));
      } else {
        btnGrad.addColorStop(0, hexA('#ffffff', 0.12));
        btnGrad.addColorStop(1, hexA('#ffffff', 0.06));
      }

      ctx.shadowColor = plan.isPopular ? hexA(palette.accent, 0.4) : 'transparent';
      ctx.shadowBlur = plan.isPopular ? 12 : 0;

      roundRect(ctx, btnX, btnY, btnW, btnH, btnH / 2);
      ctx.fillStyle = btnGrad;
      ctx.fill();

      // Button border
      ctx.shadowBlur = 0;
      roundRect(ctx, btnX, btnY, btnW, btnH, btnH / 2);
      ctx.strokeStyle = plan.isPopular
        ? hexA(palette.accent, 0.6)
        : hexA('#ffffff', 0.15);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Button text
      ctx.font = `700 ${btnH * 0.42}px ${FONT}`;
      ctx.fillStyle = plan.isPopular ? '#ffffff' : hexA('#ffffff', 0.7);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(plan.cta, cx, btnY + btnH / 2);

      ctx.restore();
    }

    ctx.restore(); // clip
    ctx.restore(); // card transform
  });

  ctx.restore(); // global
};
