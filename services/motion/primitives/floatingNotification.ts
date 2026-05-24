import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, easeOutQuart, lerp } from '../easing';
import { drawLucideIcon } from '../iconRenderer';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

interface SwipeState {
  progress: number;
  velocity: number;
  opacity: number;
}

export const floatingNotification = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.85, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const rawText = p.text || 'Stripe  |  +$49.00 payment received';
  const parts = rawText.split('|').map(s => s.trim());
  const title = parts[0] || 'Notification';
  const body = parts[1] || 'You have a new update';
  const timestamp = parts[2] || 'now';

  let icon = 'star';
  let iconBg = palette.primary;
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('youtube') || lowerTitle.includes('video')) {
    icon = 'tv';
    iconBg = '#ef4444';
  } else if (lowerTitle.includes('stripe') || lowerTitle.includes('payment') || lowerTitle.includes('money')) {
    icon = 'diamond';
    iconBg = '#22c55e';
  } else if (lowerTitle.includes('discord') || lowerTitle.includes('chat') || lowerTitle.includes('message')) {
    icon = 'activity';
    iconBg = '#3b82f6';
  } else if (lowerTitle.includes('ai') || lowerTitle.includes('spark')) {
    icon = 'sparkles';
    iconBg = '#fbbf24';
  } else if (lowerTitle.includes('alert') || lowerTitle.includes('warning')) {
    icon = 'alert';
    iconBg = '#eab308';
  }

  const bannerW = Math.min(width * 0.88, 380);
  const bannerH = 72;
  const centerX = width / 2 - bannerW / 2;

  const entryDuration = 0.25;
  const holdDuration = 0.50;
  const swipeDuration = 0.20;

  const entryEnd = 0.08 + entryDuration;
  const holdEnd = entryEnd + holdDuration;
  const swipeStart = holdEnd;
  const swipeEnd = Math.min(swipeStart + swipeDuration, 1.0);

  const entryT = clamp01(remap(t01, 0.08, entryEnd));
  const swipeT = clamp01(remap(t01, swipeStart, swipeEnd));

  const swipe: SwipeState = {
    progress: easeInOutCubic(swipeT),
    velocity: 0,
    opacity: 1 - swipeT,
  };

  const springX = easeOutBack(entryT, 1.2);
  const x = lerp(width + bannerW, centerX, springX);
  const y = height * 0.12;

  const swipeOffset = swipe.progress * bannerW * 0.6;
  const finalX = x + swipeOffset;
  const finalOpacity = globalAlpha * (1 - swipeT * 0.8);

  ctx.save();
  ctx.globalAlpha = finalOpacity;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;

  const glassGrad = ctx.createLinearGradient(finalX, y, finalX, y + bannerH);
  glassGrad.addColorStop(0, hexA('#ffffff', 0.1));
  glassGrad.addColorStop(1, hexA('#ffffff', 0.03));
  ctx.fillStyle = glassGrad;
  roundRect(ctx, finalX, y, bannerW, bannerH, 16);
  ctx.fill();
  ctx.restore();

  const borderGrad = ctx.createLinearGradient(finalX, y, finalX, y + bannerH);
  borderGrad.addColorStop(0, hexA('#ffffff', 0.18));
  borderGrad.addColorStop(1, hexA('#ffffff', 0.05));
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 1.0;
  roundRect(ctx, finalX, y, bannerW, bannerH, 16);
  ctx.stroke();

  const iconSize = 40;
  const iconX = finalX + 18 + iconSize / 2;
  const iconY = y + 16 + iconSize / 2;

  ctx.save();
  ctx.fillStyle = hexA(iconBg, 0.18);
  ctx.beginPath();
  ctx.arc(iconX, iconY, iconSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = hexA(iconBg, 0.5);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  drawLucideIcon(ctx, icon, iconX, iconY, iconSize * 0.5, iconBg, { fill: true });
  ctx.restore();

  ctx.font = `800 14px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(title, finalX + 72, y + 16);

  ctx.font = `500 11px ${FONT}`;
  ctx.fillStyle = hexA('#ffffff', 0.4);
  ctx.textAlign = 'right';
  ctx.fillText(timestamp, finalX + bannerW - 20, y + 18);

  ctx.font = `600 12px ${FONT}`;
  ctx.fillStyle = hexA('#ffffff', 0.8);
  ctx.textAlign = 'left';
  ctx.fillText(body, finalX + 72, y + 40);

  const pulseRate = 7;
  const pulseScale = 1 + 0.2 * Math.sin(t01 * Math.PI * pulseRate);
  const pulseAlpha = 0.6 + 0.4 * Math.cos(t01 * Math.PI * pulseRate);
  ctx.save();
  ctx.fillStyle = hexA(palette.accent, pulseAlpha);
  ctx.beginPath();
  ctx.arc(finalX + bannerW - 18, y + 18, 4 * pulseScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (swipe.progress > 0 && swipe.progress < 1) {
    ctx.save();
    const gradientX = finalX + bannerW * swipe.progress;
    const fadeGrad = ctx.createLinearGradient(gradientX - 40, y, gradientX, y);
    fadeGrad.addColorStop(0, hexA('#ffffff', 0));
    fadeGrad.addColorStop(1, hexA('#ffffff', 0.15 * (1 - swipe.progress)));
    ctx.fillStyle = fadeGrad;
    roundRect(ctx, finalX, y, bannerW, bannerH, 16);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
};
