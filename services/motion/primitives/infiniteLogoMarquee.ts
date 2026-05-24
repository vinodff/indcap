import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { drawLucideIcon } from '../iconRenderer';
import { clamp01, remap, easeInOutCubic } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

interface LogoItem {
  label: string;
  x: number;
  baseX: number;
  width: number;
  opacity: number;
}

const LOGO_NAMES = ['Zap', 'Star', 'Flame', 'Sparkles', 'Rocket', 'Diamond', 'Hexagon', 'Radio'];

export const infiniteLogoMarquee = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.12)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.85, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const rawText = p.text || '';
  const customLabels = rawText.split('|').map(s => s.trim()).filter(Boolean);

  const rowCount = intensity >= 3 ? 3 : 2;
  const logoSize = Math.min(width, height) * 0.05;
  const gap = logoSize * 2.2;
  const rowGap = height * 0.28;
  const startY = (height - (rowCount - 1) * rowGap) / 2;

  const allLabels: string[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const labels = customLabels.length > 0 ? customLabels : LOGO_NAMES;
    const repeated = [...labels, ...labels, ...labels, ...labels];
    allLabels.push(repeated);
  }

  const speeds = rowCount <= 2 ? [1, -0.8] : [1, -0.7, 0.9];
  const baseOffset = t01 * 2000;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  for (let r = 0; r < rowCount; r++) {
    const rowY = startY + r * rowGap;
    const speed = speeds[r] ?? 1;
    const offset = baseOffset * speed;

    const fadeEdgeW = width * 0.12;

    const leftFade = ctx.createLinearGradient(0, 0, fadeEdgeW, 0);
    leftFade.addColorStop(0, hexA(palette.bg || '#0a0a14', 0));
    leftFade.addColorStop(1, hexA(palette.bg || '#0a0a14', 1));
    ctx.fillStyle = leftFade;
    ctx.fillRect(0, rowY - logoSize * 2, fadeEdgeW, logoSize * 4);

    const rightFade = ctx.createLinearGradient(width - fadeEdgeW, 0, width, 0);
    rightFade.addColorStop(0, hexA(palette.bg || '#0a0a14', 1));
    rightFade.addColorStop(1, hexA(palette.bg || '#0a0a14', 0));
    ctx.fillStyle = rightFade;
    ctx.fillRect(width - fadeEdgeW, rowY - logoSize * 2, fadeEdgeW, logoSize * 4);

    const labels = allLabels[r];
    for (let i = 0; i < labels.length; i++) {
      const logoIndex = i % LOGO_NAMES.length;
      const iconName = LOGO_NAMES[logoIndex].toLowerCase();
      const itemX = (i * gap - offset) % (labels.length * gap * 0.5);

      const wrappedX = ((itemX % (width + gap * 2)) + (width + gap * 2)) % (width + gap * 2) - gap;

      const iconCx = wrappedX + logoSize / 2;
      const iconCy = rowY;

      const distFromLeft = iconCx;
      const distFromRight = width - iconCx;
      const fadeThreshold = width * 0.15;
      let itemAlpha = 1;
      if (distFromLeft < fadeThreshold) itemAlpha = distFromLeft / fadeThreshold;
      if (distFromRight < fadeThreshold) itemAlpha = Math.min(itemAlpha, distFromRight / fadeThreshold);
      itemAlpha = Math.max(0, itemAlpha);

      ctx.save();
      ctx.globalAlpha = globalAlpha * itemAlpha;

      const bgColor = [
        palette.primary,
        palette.accent,
        palette.secondary,
        palette.primary,
      ][logoIndex % 4];

      ctx.fillStyle = hexA(bgColor, 0.08);
      ctx.beginPath();
      ctx.arc(iconCx, iconCy, logoSize * 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = hexA(bgColor, 0.12);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(iconCx, iconCy, logoSize * 1.2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = hexA(bgColor, 0.6);
      ctx.font = `700 ${logoSize * 0.45}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (customLabels.length > 0) {
        ctx.fillText(labels[i], iconCx, iconCy + logoSize * 0.1);
      } else {
        drawLucideIcon(ctx, iconName, iconCx, iconCy, logoSize * 0.7, bgColor, { fill: false, strokeWidth: 1.5 });
      }

      ctx.restore();
    }
  }

  ctx.restore();
};
