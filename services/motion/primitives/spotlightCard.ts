import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

export const spotlightCard = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const label = p.text || 'Premium Feature';
  const intensity = p.intensity ?? 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const cx = width / 2;
  const cy = height * 0.42;

  const entryT = easeOutBack(clamp01(remap(t01, 0.05, 0.35)), 1.5);

  const cardW = Math.min(width, height) * 0.38;
  const cardH = cardW * 0.65;
  const cardR = cardW * 0.06;

  const lightX = cx + Math.sin(t01 * Math.PI * 1.8) * cardW * 0.35;
  const lightY = cy + Math.cos(t01 * Math.PI * 1.4) * cardH * 0.3;

  const scale = lerp(0.5, 1, entryT);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.5);
  bgGrad.addColorStop(0, hexA(mixHex(palette.bg || '#0a0a14', palette.primary, 0.06), 0.95));
  bgGrad.addColorStop(0.6, hexA(palette.bg || '#0a0a14', 0.98));
  bgGrad.addColorStop(1, hexA(palette.bg || '#0a0a14', 1));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const floatY = Math.sin(t01 * Math.PI * 0.8) * 2;
  ctx.translate(0, floatY);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 25;
  ctx.shadowOffsetY = 8;

  ctx.beginPath();
  ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, cardR);
  ctx.fillStyle = '#151518';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, cardR);
  ctx.clip();

  const spotR = Math.max(cardW, cardH) * 0.7;
  const spotGrad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, spotR);
  spotGrad.addColorStop(0, hexA(mixHex(palette.primary, '#ffffff', 0.2), 0.12));
  spotGrad.addColorStop(0.3, hexA(mixHex(palette.accent, '#ffffff', 0.1), 0.06));
  spotGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = spotGrad;
  ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

  ctx.strokeStyle = hexA(palette.accent, 0.08);
  ctx.lineWidth = 0.5;
  ctx.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);

  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, cardR);
  ctx.clip();

  const borderGrad = ctx.createLinearGradient(
    lightX - cardW, lightY - cardH,
    lightX + cardW, lightY + cardH,
  );
  borderGrad.addColorStop(0, hexA(palette.primary, 0));
  borderGrad.addColorStop(0.4, hexA(palette.primary, 0.15));
  borderGrad.addColorStop(0.5, hexA(palette.accent, 0.25));
  borderGrad.addColorStop(0.6, hexA(palette.primary, 0.15));
  borderGrad.addColorStop(1, hexA(palette.primary, 0));
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-cardW / 2 + 0.75, -cardH / 2 + 0.75, cardW - 1.5, cardH - 1.5, cardR - 0.75);
  ctx.stroke();

  ctx.restore();

  const contentT = easeOutCubic(clamp01(remap(t01, 0.25, 0.45)));

  if (contentT > 0.01) {
    ctx.save();
    ctx.globalAlpha = contentT;

    const marginL = cardW * 0.08;
    const marginT = cardH * 0.08;
    const innerW = cardW - marginL * 2;

    const titleSize = innerW * 0.1;
    ctx.font = `700 ${titleSize}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = hexA('#ffffff', 0.85);
    ctx.fillText(label, -cardW / 2 + marginL, -cardH / 2 + marginT);

    const lines = 3 + intensity;
    const lineH = innerW * 0.06;
    const lineGap = lineH * 0.45;
    const lineY = -cardH / 2 + marginT + titleSize * 1.6;

    for (let li = 0; li < lines; li++) {
      const lw = [0.85, 0.95, 0.6, 0.75, 0.5][li] || 0.7;
      ctx.save();
      ctx.translate(
        -8 * (1 - contentT) * (li % 2 === 0 ? 1 : -1),
        li * (lineH + lineGap),
      );

      ctx.fillStyle = hexA(palette.primary, 0.12 + li * 0.02);
      ctx.beginPath();
      ctx.roundRect(-cardW / 2 + marginL, lineY, innerW * lw, lineH, 2);
      ctx.fill();

      const subW = innerW * 0.15;
      const subH = lineH * 0.35;
      ctx.fillStyle = hexA(palette.accent, 0.2 + li * 0.03);
      ctx.beginPath();
      ctx.roundRect(-cardW / 2 + marginL, lineY + lineH * 0.55, subW, subH, 1.5);
      ctx.fill();

      ctx.restore();
    }

    const pillY = cardH / 2 - marginT - innerW * 0.08;
    ctx.fillStyle = hexA(palette.accent, 0.35);
    ctx.beginPath();
    ctx.roundRect(-innerW * 0.2, -cardH / 2 + pillY, innerW * 0.4, innerW * 0.07, innerW * 0.035);
    ctx.fill();

    const pillFs = innerW * 0.032;
    ctx.font = `600 ${pillFs}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hexA('#ffffff', 0.65);
    ctx.fillText('Learn More', 0, -cardH / 2 + pillY + innerW * 0.035);

    ctx.restore();
  }

  const rimGlowT = clamp01(remap(t01, 0.05, 0.15));
  if (rimGlowT > 0 && rimGlowT < 1) {
    ctx.save();
    ctx.globalAlpha = (1 - rimGlowT) * 0.4;
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 15;
    ctx.strokeStyle = hexA(palette.accent, 0.2);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, cardR);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
};
