/**
 * notification-stack — iOS/macOS styled premium notification banners.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 *
 * Renders multiple glassmorphic notifications that:
 *   1. Slide in from the right edge with elastic overshoot.
 *   2. Push existing banners downward smoothly using animated springs.
 *   3. Showcase Plattform logos/icons using pre-rendered Lucide paths.
 *   4. Animate a sweeping glowing laser outline on card arrival.
 *   5. Include a pulsing notification dot and smooth exit transitions.
 *
 * params.text accepts:
 *   "Title | Body | Time | Title | Body | Time ..." (Triplets)
 *   or "Title | Body | Title | Body ..." (Pairs, defaults time to 'now')
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';
import { drawLucideIcon } from '../iconRenderer';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

interface NotificationItem {
  icon: string;
  iconBg: string;
  title: string;
  body: string;
  timestamp: string;
}

export const notificationStack = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;

  // ── Global Fades ───────────────────────────────────────────────────────────
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // ── Parse Notification Banners ─────────────────────────────────────────────
  const rawText = p.text || 'Stripe | +$199.00 Payment received | now | YouTube | New subscriber! @createrin | 2m ago | Discord | @vinod: Motion graphic is ready | 5m ago';
  const parts = rawText.split('|').map(s => s.trim());
  const items: NotificationItem[] = [];

  // Determine step size: triplets (3) or pairs (2)
  const step = (parts.length % 3 !== 0 && parts.length % 2 === 0) ? 2 : 3;

  for (let i = 0; i < parts.length; i += step) {
    if (!parts[i]) continue;
    const title = parts[i];
    const body = parts[i + 1] || 'New notification';
    const timestamp = (step === 3) ? (parts[i + 2] || 'now') : 'now';

    // Map brand titles to recognizable Lucide icons & color palettes
    let icon = 'star';
    let iconBg = palette.primary;

    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('youtube') || lowerTitle.includes('video') || lowerTitle.includes('tv')) {
      icon = 'tv';
      iconBg = '#ef4444'; // Red
    } else if (lowerTitle.includes('stripe') || lowerTitle.includes('payment') || lowerTitle.includes('money') || lowerTitle.includes('dollar') || lowerTitle.includes('cash')) {
      icon = 'diamond';
      iconBg = '#22c55e'; // Green
    } else if (lowerTitle.includes('discord') || lowerTitle.includes('chat') || lowerTitle.includes('slack') || lowerTitle.includes('message')) {
      icon = 'activity';
      iconBg = '#3b82f6'; // Blue
    } else if (lowerTitle.includes('code') || lowerTitle.includes('github') || lowerTitle.includes('terminal') || lowerTitle.includes('dev')) {
      icon = 'terminal';
      iconBg = '#a855f7'; // Purple
    } else if (lowerTitle.includes('alert') || lowerTitle.includes('warning') || lowerTitle.includes('error')) {
      icon = 'alert';
      iconBg = '#eab308'; // Yellow
    } else if (lowerTitle.includes('music') || lowerTitle.includes('sound') || lowerTitle.includes('spotify') || lowerTitle.includes('podcast')) {
      icon = 'music';
      iconBg = '#ec4899'; // Pink
    } else if (lowerTitle.includes('spark') || lowerTitle.includes('ai') || lowerTitle.includes('star')) {
      icon = 'sparkles';
      iconBg = '#fbbf24'; // Amber
    } else {
      const fallbackIcons = ['star', 'zap', 'flame', 'sparkles'];
      icon = fallbackIcons[Math.floor(i / step) % fallbackIcons.length];
      iconBg = palette.accent;
    }

    items.push({ icon, iconBg, title, body, timestamp });
  }

  // Cap visible items to maximum 3 in standard stack size
  const maxBanners = Math.min(items.length, 3);
  const activeItems = items.slice(0, maxBanners);

  // ── Layout Metrics ─────────────────────────────────────────────────────────
  const bannerW = Math.min(width * 0.85, 360);
  const bannerH = 68;
  const gap = 12;
  const startY = height * 0.20; // top offset
  const centerX = width / 2 - bannerW / 2;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // Stagger entry timing offsets
  // Total timeline active range: 0.08 -> 0.84
  const enterRange = 0.72; // duration of active sequence
  const staggerDelay = activeItems.length > 1 ? enterRange / activeItems.length : 0.2;

  activeItems.forEach((item, i) => {
    // Determine entrance timings for item i
    const entryStart = 0.08 + i * staggerDelay;
    const entryDuration = 0.20;
    const itemT = clamp01(remap(t01, entryStart, entryStart + entryDuration));
    if (itemT <= 0.001) return; // not entered yet

    // Determine how many newer items have entered after this one (forces vertical pushdown)
    let pushdownSlot = 0;
    for (let j = i + 1; j < activeItems.length; j++) {
      const newerStart = 0.08 + j * staggerDelay;
      const newerT = easeOutCubic(clamp01(remap(t01, newerStart, newerStart + entryDuration)));
      pushdownSlot += newerT; // smoothly accumulates fractional slide down
    }

    // Positions
    const springEntry = easeOutBack(itemT, 1.15);
    const x = lerp(width + bannerW, centerX, springEntry);
    const y = startY + pushdownSlot * (bannerH + gap) + (fadeOut * 40); // slides down slightly on global exit

    // Specular border laser sweep progress (just as card completes its entry slide)
    const sweepT = clamp01(remap(t01, entryStart + entryDuration * 0.4, entryStart + entryDuration * 1.5));

    // ── Draw Card Backing & Shadow ───────────────────────────────────────────
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;

    const glassGrad = ctx.createLinearGradient(x, y, x, y + bannerH);
    glassGrad.addColorStop(0, hexA('#ffffff', 0.08));
    glassGrad.addColorStop(1, hexA('#ffffff', 0.02));
    ctx.fillStyle = glassGrad;
    roundRect(ctx, x, y, bannerW, bannerH, 14);
    ctx.fill();
    ctx.restore(); // restore shadow context

    // ── Draw Frosted Outlines ────────────────────────────────────────────────
    const borderGrad = ctx.createLinearGradient(x, y, x, y + bannerH);
    borderGrad.addColorStop(0, hexA('#ffffff', 0.16));
    borderGrad.addColorStop(1, hexA('#ffffff', 0.04));
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 1.0;
    roundRect(ctx, x, y, bannerW, bannerH, 14);
    ctx.stroke();

    // ── Draw App/Brand Icon Bubble ───────────────────────────────────────────
    const iconSize = 38;
    const iconX = x + 16 + iconSize / 2;
    const iconY = y + 15 + iconSize / 2;

    ctx.save();
    ctx.fillStyle = hexA(item.iconBg, 0.20);
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hexA(item.iconBg, 0.6);
    ctx.lineWidth = 1.2;
    ctx.stroke();

    drawLucideIcon(ctx, item.icon, iconX, iconY, iconSize * 0.54, item.iconBg, { fill: true });
    ctx.restore();

    // ── Draw Text Info ───────────────────────────────────────────────────────
    // Title
    ctx.font = `800 13px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(item.title, x + 68, y + 16);

    // Timestamp
    ctx.font = `500 10.5px ${FONT}`;
    ctx.fillStyle = hexA('#ffffff', 0.4);
    ctx.textAlign = 'right';
    ctx.fillText(item.timestamp, x + bannerW - 28, y + 18);

    // Body text
    ctx.font = `600 11.5px ${FONT}`;
    ctx.fillStyle = hexA('#ffffff', 0.85);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(item.body, x + 68, y + 36);

    // ── Pulse Indicator Dot ──────────────────────────────────────────────────
    if (i === activeItems.length - 1 && t01 < 0.85) {
      const pulseRate = 6.5;
      const pulseScale = 1.0 + 0.25 * Math.sin(t01 * Math.PI * pulseRate);
      const pulseAlpha = 0.7 + 0.3 * Math.cos(t01 * Math.PI * pulseRate);
      
      ctx.save();
      ctx.fillStyle = hexA(palette.accent, pulseAlpha);
      ctx.beginPath();
      ctx.arc(x + bannerW - 14, y + 14, 4.5 * pulseScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Laser Border Sweep (Laser Effect) ───────────────────────────────────
    if (sweepT > 0 && sweepT < 1) {
      ctx.save();
      
      // Sweep diagonal position based on time
      const sweepX = x - bannerW + sweepT * bannerW * 2.3;
      const laserGrad = ctx.createLinearGradient(sweepX, y, sweepX + bannerW * 0.35, y + bannerH);
      laserGrad.addColorStop(0, 'rgba(255,255,255,0)');
      laserGrad.addColorStop(0.5, palette.accent); // Neon sweep color
      laserGrad.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.strokeStyle = laserGrad;
      ctx.lineWidth = 1.8;
      roundRect(ctx, x, y, bannerW, bannerH, 14);
      ctx.stroke();
      ctx.restore();
    }
  });

  ctx.restore();
};
