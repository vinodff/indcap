import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

const DOCK_APPS = [
  { icon: '⬡', label: 'Finder', color: '#3b82f6' },
  { icon: '✎', label: 'Edit', color: '#10b981' },
  { icon: '▶', label: 'Player', color: '#f43f5e' },
  { icon: '✦', label: 'Studio', color: '#8b5cf6' },
  { icon: '⬔', label: 'Canvas', color: '#f59e0b' },
  { icon: '☰', label: 'Menu', color: '#06b6d4' },
  { icon: '⬡', label: 'Hub', color: '#ec4899' },
];

export const floatingDock = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const label = p.text || '';
  const intensity = p.intensity ?? 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const entryT = easeOutBack(clamp01(remap(t01, 0.05, 0.40)), 1.5);

  const dockCY = height * 0.88;
  const apps = intensity >= 3 ? DOCK_APPS : DOCK_APPS.slice(0, 5);

  const baseSize = Math.min(width, height) * 0.035;
  const gap = baseSize * 0.35;
  const dockPad = baseSize * 0.3;
  const dockW = apps.length * (baseSize + gap) + dockPad * 2 - gap;
  const dockH = baseSize * 1.8;

  const dockX = (width - dockW * lerp(0.3, 1, entryT)) / 2;
  const dockY = dockCY - dockH * lerp(0.2, 1, entryT);

  const hoverIdx = Math.floor((t01 * apps.length * 0.6) % apps.length);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  const bgGrad = ctx.createRadialGradient(width / 2, height, 0, width / 2, height, height * 0.6);
  bgGrad.addColorStop(0, hexA(mixHex(palette.bg || '#0a0a14', palette.primary, 0.06), 0.9));
  bgGrad.addColorStop(1, hexA(palette.bg || '#0a0a14', 1));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.shadowColor = hexA(palette.accent, 0.1);
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;

  ctx.beginPath();
  ctx.roundRect(dockX, dockY, dockW, dockH, dockH * 0.5);
  ctx.fillStyle = hexA('#1c1c1e', 0.85);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = hexA('#ffffff', 0.04);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.roundRect(dockX + 0.5, dockY + 0.5, dockW - 1, dockH - 1, dockH * 0.5 - 0.5);
  ctx.stroke();

  const startX = dockX + dockPad;

  for (let ai = 0; ai < apps.length; ai++) {
    const app = apps[ai];
    const isHover = ai === hoverIdx;
    const appT = easeOutCubic(clamp01(remap(t01, 0.10 + ai * 0.03, 0.20 + ai * 0.03)));
    if (appT < 0.005) continue;

    const itemSize = isHover ? baseSize * 1.35 : baseSize;
    const itemY = dockY + dockH / 2 - itemSize / 2;
    const xi = startX + ai * (baseSize + gap) + (isHover ? -(itemSize - baseSize) / 2 : 0);
    const bounceOffset = isHover ? -4 * Math.sin(t01 * Math.PI * 4) : 0;

    ctx.save();
    ctx.globalAlpha = appT * globalAlpha;
    ctx.translate(lerp(4, 0, appT), bounceOffset * appT);

    if (isHover) {
      ctx.save();
      ctx.fillStyle = hexA(app.color, 0.15);
      ctx.shadowColor = hexA(app.color, 0.15);
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(xi + itemSize / 2, itemY + itemSize / 2, itemSize * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = isHover ? hexA(app.color, 0.9) : hexA('#ffffff', 0.45);
    const iconFs = itemSize * 0.45;
    ctx.font = `400 ${iconFs}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(app.icon, xi + itemSize / 2, itemY + itemSize / 2);

    if (isHover) {
      const labelFs = baseSize * 0.3;
      ctx.font = `500 ${labelFs}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      const labelW = ctx.measureText(app.label).width;
      const labelPad = 6;
      const labelCX = xi + itemSize / 2;
      const labelBY = dockY - labelFs * 0.5;

      ctx.save();
      ctx.fillStyle = hexA('#1c1c1e', 0.9);
      ctx.beginPath();
      ctx.roundRect(
        labelCX - labelW / 2 - labelPad,
        labelBY - labelFs * 1.1,
        labelW + labelPad * 2,
        labelFs * 1.6,
        4,
      );
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = hexA('#ffffff', 0.8);
      ctx.fillText(app.label, labelCX, labelBY - 2);
    }

    ctx.restore();
  }

  ctx.restore();

  if (label) {
    const labelT = easeOutCubic(clamp01(remap(t01, 0.45, 0.60)));
    if (labelT > 0.01) {
      ctx.save();
      ctx.globalAlpha = globalAlpha * labelT;
      ctx.translate(width / 2, 0);

      const labelSize = Math.min(width, height) * 0.022;
      ctx.font = `600 ${labelSize}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';

      ctx.fillStyle = hexA('#ffffff', 0.4);
      ctx.fillText(label, 0, dockY - 12);

      ctx.restore();
    }
  }

  ctx.restore();
};
