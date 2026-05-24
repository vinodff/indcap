import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

interface MetricCard {
  label: string;
  value: number;
  suffix: string;
  icon: string;
  delta: number;
  color: string;
}

const DEFAULT_METRICS: MetricCard[] = [
  { label: 'Revenue', value: 128400, suffix: '', icon: '📈', delta: 12.5, color: '#22c55e' },
  { label: 'Users', value: 52480, suffix: '', icon: '👥', delta: 8.3, color: '#3b82f6' },
  { label: 'Growth', value: 94, suffix: '%', icon: '⚡', delta: 4.1, color: '#f59e0b' },
  { label: 'Engagement', value: 87, suffix: '%', icon: '🎯', delta: -2.4, color: '#ec4899' },
];

export const metricsDashboard = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const label = p.text || '';
  const intensity = p.intensity ?? 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const cx = width / 2;
  const entryT = easeOutBack(clamp01(remap(t01, 0.05, 0.30)), 1.4);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  const bgGrad = ctx.createRadialGradient(cx, height * 0.3, 0, cx, height * 0.3, Math.max(width, height) * 0.55);
  bgGrad.addColorStop(0, hexA(mixHex(palette.bg || '#0a0a14', palette.primary, 0.08), 0.95));
  bgGrad.addColorStop(0.5, hexA(palette.bg || '#0a0a14', 0.98));
  bgGrad.addColorStop(1, hexA(palette.bg || '#0a0a14', 1));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.translate(cx, height * 0.05);
  ctx.scale(lerp(0.6, 1, entryT), lerp(0.6, 1, entryT));
  ctx.translate(0, lerp(30, 0, entryT));

  const headerFs = Math.min(width, height) * 0.032;
  ctx.save();
  ctx.globalAlpha *= easeOutCubic(clamp01(remap(t01, 0.05, 0.18)));
  ctx.font = `700 ${headerFs}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const hdrGrad = ctx.createLinearGradient(-width * 0.2, 0, width * 0.2, 0);
  hdrGrad.addColorStop(0, hexA('#ffffff', 0.5));
  hdrGrad.addColorStop(0.5, '#ffffff');
  hdrGrad.addColorStop(1, hexA('#ffffff', 0.5));
  ctx.fillStyle = hdrGrad;
  ctx.fillText(label || 'Analytics Overview', 0, 0);
  ctx.restore();

  const boardW = Math.min(width, height) * 0.44;
  const boardX = -boardW / 2;
  const boardTop = headerFs * 1.8;
  const gap = boardW * 0.04;

  const metrics = intensity >= 3 ? DEFAULT_METRICS : DEFAULT_METRICS.slice(0, 2);
  const cols = Math.min(metrics.length, 2);
  const rows = Math.ceil(metrics.length / cols);
  const cardW = (boardW - gap * (cols - 1)) / cols;
  const cardH = boardW * 0.18;

  for (let mi = 0; mi < metrics.length; mi++) {
    const m = metrics[mi];
    const col = mi % cols;
    const row = Math.floor(mi / cols);
    const itemT = easeOutCubic(clamp01(remap(t01, 0.15 + mi * 0.06, 0.25 + mi * 0.06)));
    if (itemT < 0.005) continue;

    const cardX = boardX + col * (cardW + gap);
    const cardY = boardTop + row * (cardH + gap) + 6 * Math.sin(mi * 2.5) * (1 - itemT);

    ctx.save();
    ctx.globalAlpha = itemT * globalAlpha;

    ctx.save();
    ctx.shadowColor = hexA(m.color, 0.1);
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;

    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 8);
    ctx.fillStyle = hexA('#16161a', 0.7);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = hexA(m.color, 0.12);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.roundRect(cardX + 0.25, cardY + 0.25, cardW - 0.5, cardH - 0.5, 8);
    ctx.stroke();

    const leftAccentX = cardX + 2;
    ctx.fillStyle = hexA(m.color, 0.3);
    ctx.beginPath();
    ctx.roundRect(leftAccentX, cardY + cardH * 0.15, 2.5, cardH * 0.7, 1.5);
    ctx.fill();

    const iconFs = cardH * 0.35;
    ctx.font = `${iconFs}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(m.icon, cardX + 10, cardY + cardH * 0.08);

    const labelFs = cardH * 0.16;
    ctx.font = `500 ${labelFs}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = hexA('#ffffff', 0.4);
    ctx.fillText(m.label, cardX + 10 + iconFs * 0.85, cardY + cardH * 0.1);

    const valT = easeOutCubic(clamp01(remap(t01, 0.20 + mi * 0.06, 0.35 + mi * 0.06)));
    const displayVal = m.value >= 1000
      ? `${(m.value * valT / 1000).toFixed(1)}k`
      : `${Math.round(m.value * valT)}${m.suffix}`;

    const valFs = cardH * 0.35;
    ctx.font = `700 ${valFs}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = hexA('#ffffff', 0.85);
    ctx.fillText(displayVal, cardX + 10, cardY + cardH - 4);

    const deltaStr = `${m.delta >= 0 ? '+' : ''}${m.delta.toFixed(1)}%`;
    const deltaFs = cardH * 0.14;
    ctx.font = `600 ${deltaFs}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = hexA(m.delta >= 0 ? '#22c55e' : '#ef4444', 0.7);
    ctx.fillText(deltaStr, cardX + cardW - 8, cardY + cardH - 4);

    const sparkH = cardH * 0.12;
    const sparkY = cardY + cardH * 0.52;
    const sparkW = cardW * 0.6;
    const sparkX = cardX + cardW - sparkW - 8;
    const sparkPoints = 12;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    for (let si = 0; si < sparkPoints; si++) {
      const sx = sparkX + (si / (sparkPoints - 1)) * sparkW;
      const sy = sparkY + sparkH / 2 + Math.sin(si * 0.8 + m.delta * 0.1) * sparkH * 0.35;
      if (si === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = hexA(m.color, 0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    const progressT = easeOutCubic(clamp01(remap(t01, 0.25 + mi * 0.06, 0.40 + mi * 0.06)));
    const barW = cardW * 0.65;
    const barH = 2.5;
    const barX = cardX + 10;
    const barY = cardY + cardH * 0.52;
    ctx.fillStyle = hexA('#ffffff', 0.05);
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, barH / 2);
    ctx.fill();
    ctx.fillStyle = hexA(m.color, 0.4);
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * progressT, barH, barH / 2);
    ctx.fill();

    ctx.restore();
  }

  const chartAreaTop = boardTop + rows * (cardH + gap) + gap;
  const chartT = easeOutCubic(clamp01(remap(t01, 0.40, 0.60)));
  if (chartT > 0.01 && metrics.length > 1) {
    const chartH = boardW * 0.20;
    const chartW = boardW;

    ctx.save();
    ctx.globalAlpha = chartT * globalAlpha;

    ctx.save();
    ctx.shadowColor = hexA(palette.accent, 0.06);
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;

    ctx.beginPath();
    ctx.roundRect(boardX, chartAreaTop, chartW, chartH, 8);
    ctx.fillStyle = hexA('#16161a', 0.5);
    ctx.fill();
    ctx.restore();

    const barCount = 8;
    const barMargin = chartW * 0.06;
    const barW2 = (chartW - barMargin * 2) / barCount;
    const chartTop2 = chartAreaTop + chartH * 0.15;
    const chartBot2 = chartAreaTop + chartH - chartH * 0.12;

    const barHeights = [0.4, 0.65, 0.5, 0.85, 0.6, 0.9, 0.7, 0.35];
    const barColors = [palette.primary, palette.accent, palette.secondary, palette.primary,
                       palette.accent, palette.secondary, palette.primary, palette.accent];

    for (let bi = 0; bi < barCount; bi++) {
      const barT = easeOutCubic(clamp01(remap(t01, 0.42 + bi * 0.015, 0.50 + bi * 0.015)));
      const bh = (chartBot2 - chartTop2) * barHeights[bi] * barT;
      const bx = boardX + barMargin + bi * barW2 + barW2 * 0.1;
      const bw = barW2 * 0.8;
      const by = chartBot2 - bh;

      ctx.fillStyle = hexA(barColors[bi], 0.5 + barHeights[bi] * 0.3);
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 2);
      ctx.fill();
    }

    const labelY2 = chartBot2 + 4;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'];
    ctx.font = `400 ${chartH * 0.1}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let bi = 0; bi < barCount; bi++) {
      ctx.fillStyle = hexA('#ffffff', 0.2);
      ctx.fillText(days[bi], boardX + barMargin + bi * barW2 + barW2 / 2, labelY2);
    }

    ctx.restore();
  }

  const subT = easeOutCubic(clamp01(remap(t01, 0.65, 0.78)));
  if (subT > 0.01 && p.text) {
    ctx.save();
    ctx.globalAlpha = subT * globalAlpha * 0.4;
    const fs = Math.min(width, height) * 0.018;
    ctx.font = `400 ${fs}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = hexA('#ffffff', 0.35);
    const sy = boardTop + rows * (cardH + gap) + gap + (metrics.length > 1 ? boardW * 0.20 : 0) + gap;
    ctx.fillText(p.text, 0, sy);
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
};
