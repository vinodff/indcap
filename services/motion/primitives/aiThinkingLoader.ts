import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutCubic, easeInOutCubic, easeOutQuart, easeOutBack, lerp } from '../easing';
import { drawLucideIcon } from '../iconRenderer';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'JetBrains Mono', monospace`;

interface FlowDot {
  index: number;
  x: number;
  y: number;
  size: number;
  phase: number;
  alpha: number;
}

interface PulseRing {
  phase: number;
  maxRadius: number;
  alpha: number;
}

export const aiThinkingLoader = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;
  const label = p.text || 'AI is thinking...';

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.1)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.85, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const cx = width / 2;
  const cy = height * 0.42;
  const dotCount = intensity >= 3 ? 7 : intensity >= 2 ? 5 : 3;
  const dotSpacing = Math.min(width, height) * 0.04;
  const totalWidth = (dotCount - 1) * dotSpacing;
  const startX = cx - totalWidth / 2;
  const dotR = Math.min(width, height) * 0.012;

  const dots: FlowDot[] = [];
  for (let i = 0; i < dotCount; i++) {
    const phase = i / dotCount;
    const baseY = cy;
    const waveOffset = Math.sin(t01 * Math.PI * 2 + phase * Math.PI * 2) * dotSpacing * 0.6;
    const bounceY = Math.abs(Math.sin(t01 * Math.PI * 1.5 + phase * Math.PI)) * dotSpacing * 0.3;
    const yPos = baseY - bounceY + waveOffset * 0.2;

    dots.push({
      index: i,
      x: startX + i * dotSpacing,
      y: yPos,
      size: dotR * (1 + 0.4 * Math.sin(t01 * Math.PI * 2 + phase * Math.PI * 2)),
      phase,
      alpha: 0.5 + 0.5 * Math.sin(t01 * Math.PI * 2 + phase * Math.PI * 2),
    });
  }

  const pulseRings: PulseRing[] = [
    { phase: 0, maxRadius: Math.min(width, height) * 0.25, alpha: 0.15 },
    { phase: 0.33, maxRadius: Math.min(width, height) * 0.2, alpha: 0.1 },
    { phase: 0.66, maxRadius: Math.min(width, height) * 0.3, alpha: 0.12 },
  ];

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  const bgR = Math.max(width, height) * 0.4;
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bgR);
  bgGrad.addColorStop(0, hexA(mixHex(palette.bg || '#0a0a14', palette.primary, 0.06), 0.8));
  bgGrad.addColorStop(1, hexA(palette.bg || '#0a0a14', 0));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  for (const ring of pulseRings) {
    const ringProgress = (t01 + ring.phase) % 1;
    const expand = easeOutCubic(ringProgress);
    const currentR = ring.maxRadius * expand;
    const ringAlpha = ring.alpha * (1 - expand) * globalAlpha;

    ctx.save();
    ctx.globalAlpha = ringAlpha;
    ctx.strokeStyle = hexA(palette.accent, 0.3);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, currentR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.shadowColor = hexA(palette.accent, 0.3);
  ctx.shadowBlur = 20;

  const orbGrad = ctx.createRadialGradient(cx - 8, cy - 8, 0, cx, cy, dotSpacing * 2);
  orbGrad.addColorStop(0, hexA(palette.primary, 0.05));
  orbGrad.addColorStop(1, hexA(palette.accent, 0));
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, dotSpacing * 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  for (const dot of dots) {
    const dAlpha = dot.alpha * globalAlpha;
    if (dAlpha < 0.01) continue;

    ctx.save();
    ctx.shadowColor = hexA(palette.accent, 0.5);
    ctx.shadowBlur = 10 + 5 * Math.sin(t01 * Math.PI * 2 + dot.phase * Math.PI * 2);

    const color = mixHex(palette.primary, palette.accent, dot.phase);
    ctx.fillStyle = hexA(color, dAlpha);
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.save();
    ctx.globalAlpha = dAlpha * 0.3;
    ctx.strokeStyle = hexA(color, 0.3);
    ctx.lineWidth = 0.8;
    const glowR = dot.size * (2 + Math.sin(t01 * Math.PI * 3 + dot.phase * 2) * 0.5);
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, glowR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const connectingLineAlpha = 0.15 * globalAlpha;
  if (connectingLineAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = connectingLineAlpha;
    ctx.strokeStyle = hexA(palette.accent, 0.15);
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    for (let i = 0; i < dots.length; i++) {
      if (i === 0) ctx.moveTo(dots[i].x, dots[i].y);
      else ctx.lineTo(dots[i].x, dots[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  const labelT = easeOutCubic(clamp01(remap(t01, 0.25, 0.40)));
  if (labelT > 0.01) {
    ctx.save();
    ctx.globalAlpha = labelT * globalAlpha;

    const labelSize = Math.min(width, height) * 0.022;
    ctx.font = `600 ${labelSize}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const labelY = cy + dotSpacing * 1.2;
    ctx.fillStyle = hexA('#ffffff', 0.4);
    ctx.fillText(label, cx, labelY);

    ctx.restore();
  }

  if (intensity >= 2) {
    const sparkleCount = intensity >= 3 ? 8 : 4;
    for (let i = 0; i < sparkleCount; i++) {
      const angle = (i / sparkleCount) * Math.PI * 2 + t01 * 0.5;
      const radius = dotSpacing * 1.8 + Math.sin(t01 * Math.PI + i) * dotSpacing * 0.3;
      const sx = cx + Math.cos(angle) * radius;
      const sy = cy + Math.sin(angle) * radius;
      const sAlpha = 0.3 + 0.3 * Math.sin(t01 * Math.PI * 2 + i * 1.3);

      ctx.save();
      ctx.globalAlpha = sAlpha * globalAlpha;
      ctx.fillStyle = hexA(palette.accent, 0.6);
      ctx.shadowColor = hexA(palette.accent, 0.3);
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
};
