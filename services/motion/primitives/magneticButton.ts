import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

export const magneticButton = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const label = p.text || 'Get Started';
  const intensity = p.intensity ?? 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const cx = width / 2;
  const cy = height * 0.45;

  const entryT = easeOutBack(clamp01(remap(t01, 0.05, 0.35)), 1.4);

  const cursorX = cx + Math.sin(t01 * Math.PI * 1.5) * width * 0.08 * intensity;
  const cursorY = cy + Math.cos(t01 * Math.PI * 1.2) * height * 0.04 * intensity;
  const pullStrength = 0.3 + 0.2 * Math.sin(t01 * Math.PI * 2.5);

  const btnW = Math.min(width, height) * 0.32;
  const btnH = btnW * 0.28;
  const btnR = btnH * 0.5;

  const targetX = cx;
  const targetY = cy;
  const pullX = (cursorX - targetX) * pullStrength;
  const pullY = (cursorY - targetY) * pullStrength;
  const pullT = easeOutCubic(clamp01(remap(t01, 0.10, 0.25)));
  const bx = targetX + pullX * pullT;
  const by = targetY + pullY * pullT;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.5);
  bgGrad.addColorStop(0, hexA(mixHex(palette.bg || '#0a0a14', palette.primary, 0.06), 0.95));
  bgGrad.addColorStop(1, hexA(palette.bg || '#0a0a14', 1));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const scale = lerp(0.5, 1, entryT);
  ctx.translate(bx, by);
  ctx.scale(scale, scale);

  const floatOffset = 2 * Math.sin(t01 * Math.PI * 1.8);
  ctx.translate(0, floatOffset);

  ctx.save();
  ctx.shadowColor = hexA(palette.accent, 0.25);
  ctx.shadowBlur = 20 + 8 * Math.sin(t01 * Math.PI * 2.5);
  ctx.shadowOffsetY = 4;

  const btnGrad = ctx.createLinearGradient(-btnW / 2, -btnH / 2, btnW / 2, btnH / 2);
  btnGrad.addColorStop(0, palette.primary);
  btnGrad.addColorStop(0.5, mixHex(palette.primary, palette.accent, 0.5));
  btnGrad.addColorStop(1, palette.accent);

  ctx.beginPath();
  ctx.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, btnR);
  ctx.fillStyle = btnGrad;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = hexA('#ffffff', 0.12);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-btnW / 2 + 0.5, -btnH / 2 + 0.5, btnW - 1, btnH - 1, btnR - 0.5);
  ctx.stroke();

  ctx.restore();

  const fs = btnH * 0.38;
  ctx.save();
  ctx.font = `700 ${fs}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = hexA('#ffffff', 0.15);
  ctx.shadowBlur = 6;

  const textGrad = ctx.createLinearGradient(-btnW * 0.4, 0, btnW * 0.4, 0);
  textGrad.addColorStop(0, hexA('#ffffff', 0.85));
  textGrad.addColorStop(0.5, '#ffffff');
  textGrad.addColorStop(1, hexA('#ffffff', 0.85));
  ctx.fillStyle = textGrad;
  ctx.fillText(label, 0, 1);

  ctx.restore();

  const ringT = easeOutCubic(clamp01(remap(t01, 0.15, 0.25)));
  if (ringT > 0.01) {
    const ringCount = intensity >= 2 ? 2 : 1;
    for (let ri = 0; ri < ringCount; ri++) {
      const ringProgress = ((t01 * 2 + ri * 0.5) % 1);
      const ringScale = 1 + ringProgress * 0.5;
      const ringAlpha = (1 - ringProgress) * 0.25 * ringT;

      ctx.save();
      ctx.globalAlpha = ringAlpha * globalAlpha;
      ctx.strokeStyle = hexA(palette.accent, 0.5);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(
        -btnW / 2 * ringScale,
        -btnH / 2 * ringScale,
        btnW * ringScale,
        btnH * ringScale,
        btnR * ringScale,
      );
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();

  if (p.text && p.text.length > 1) {
    const subT = easeOutCubic(clamp01(remap(t01, 0.40, 0.55)));
    if (subT > 0.01) {
      ctx.save();
      ctx.globalAlpha = globalAlpha * subT * 0.6;
      ctx.translate(cx, 0);

      const subSize = Math.min(width, height) * 0.022;
      ctx.font = `400 ${subSize}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      ctx.fillStyle = hexA('#ffffff', 0.4);
      ctx.fillText(p.text, cx, cy + btnH / 2 * scale + 20);

      ctx.restore();
    }
  }

  ctx.restore();
};
