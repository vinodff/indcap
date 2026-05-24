import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

export const deviceMockup = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const label = p.text || '';
  const intensity = p.intensity ?? 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const entryT = easeOutBack(clamp01(remap(t01, 0.05, 0.35)), 1.6);

  const deviceW = Math.min(width, height) * 0.26 * lerp(0.15, 1, entryT);
  const deviceH = deviceW * 2.05;
  const cornerR = deviceW * 0.12;
  const cx = width / 2;
  const cy = height * 0.42;

  const floatY = Math.sin(t01 * Math.PI * 1.8) * 3;
  const floatRot = Math.sin(t01 * Math.PI * 1.2) * 0.015;

  ctx.save();
  ctx.globalAlpha = globalAlpha;
  ctx.translate(cx, cy + floatY);
  ctx.rotate(floatRot);

  const shadowOff = 8 + 4 * (1 - entryT);
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 30 + shadowOff;
  ctx.shadowOffsetY = shadowOff;

  ctx.beginPath();
  ctx.roundRect(-deviceW / 2, -deviceH / 2, deviceW, deviceH, cornerR);
  const bodyGrad = ctx.createLinearGradient(0, -deviceH / 2, 0, deviceH / 2);
  bodyGrad.addColorStop(0, '#2a2a2e');
  bodyGrad.addColorStop(0.5, '#1c1c1e');
  bodyGrad.addColorStop(1, '#121214');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const borderW = 1.5;
  ctx.strokeStyle = hexA('#ffffff', 0.06);
  ctx.lineWidth = borderW;
  ctx.beginPath();
  ctx.roundRect(-deviceW / 2 + borderW / 2, -deviceH / 2 + borderW / 2, deviceW - borderW, deviceH - borderW, cornerR - borderW / 2);
  ctx.stroke();

  const sideBtnW = deviceW * 0.02;
  const sideBtnH = deviceW * 0.08;
  ctx.fillStyle = hexA('#3a3a3c', 0.6);
  ctx.beginPath();
  ctx.roundRect(deviceW / 2 + 1, -sideBtnH * 1.5, sideBtnW, sideBtnH, 1);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(deviceW / 2 + 1, sideBtnH * 0.5, sideBtnW, sideBtnH, 1);
  ctx.fill();

  const screenMargin = deviceW * 0.035;
  const screenX = -deviceW / 2 + screenMargin;
  const screenY = -deviceH / 2 + screenMargin;
  const screenW = deviceW - screenMargin * 2;
  const screenH = deviceH - screenMargin * 2;
  const screenCorner = cornerR - screenMargin;

  ctx.beginPath();
  ctx.roundRect(screenX, screenY, screenW, screenH, screenCorner);
  const screenGrad = ctx.createLinearGradient(0, screenY, 0, screenY + screenH);
  screenGrad.addColorStop(0, mixHex(palette.bg || '#0a0a14', palette.primary, 0.15));
  screenGrad.addColorStop(1, mixHex(palette.bg || '#0a0a14', palette.secondary, 0.1));
  ctx.fillStyle = screenGrad;
  ctx.fill();

  const statusBarH = screenW * 0.08;
  ctx.fillStyle = hexA('#ffffff', 0.12);
  ctx.beginPath();
  ctx.roundRect(screenX + screenW * 0.05, screenY + screenW * 0.035, screenW * 0.22, statusBarH * 0.4, 4);
  ctx.fill();
  ctx.fillStyle = hexA('#ffffff', 0.08);
  ctx.beginPath();
  ctx.roundRect(screenX + screenW * 0.72, screenY + screenW * 0.035, screenW * 0.23, statusBarH * 0.4, 3);
  ctx.fill();

  const notchW = screenW * 0.18;
  const notchH = screenW * 0.04;
  ctx.fillStyle = '#1c1c1e';
  ctx.beginPath();
  ctx.roundRect(-notchW / 2, screenY, notchW, notchH, notchH / 2);
  ctx.fill();

  const contentT = easeOutCubic(clamp01(remap(t01, 0.25, 0.55)));
  const contentAlpha = contentT;

  if (contentAlpha > 0.01) {
    const contentL = screenX + screenW * 0.08;
    const contentR = screenX + screenW * 0.92;
    const contentTop = screenY + screenW * 0.14;
    const contentW = contentR - contentL;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(screenX, screenY, screenW, screenH, screenCorner);
    ctx.clip();

    ctx.globalAlpha = contentAlpha;

    const blockH = contentW * 0.1;
    const blockGap = blockH * 0.6;
    const colors = [palette.primary, palette.accent, palette.secondary, palette.primary, palette.accent];

    for (let row = 0; row < 5; row++) {
      const yPos = contentTop + row * (blockH + blockGap);
      const wMul = [0.7, 0.9, 0.5, 0.85, 0.65][row];
      const offset = 8 * Math.sin(row * 2.5 + t01 * Math.PI * 0.5);

      ctx.save();
      ctx.translate(offset * (1 - contentT), 0);

      ctx.fillStyle = hexA(colors[row % colors.length], 0.2);
      ctx.beginPath();
      ctx.roundRect(contentL, yPos, contentW * wMul, blockH, 3);
      ctx.fill();

      const subBlockW = contentW * 0.12;
      const subBlockH = blockH * 0.35;
      ctx.fillStyle = hexA(colors[row % colors.length], 0.35);
      ctx.beginPath();
      ctx.roundRect(contentL, yPos + blockH * 0.55, subBlockW, subBlockH, 2);
      ctx.fill();

      ctx.restore();
    }

    const pillY = screenY + screenH - screenW * 0.15;
    ctx.fillStyle = hexA(palette.accent, 0.5);
    ctx.beginPath();
    ctx.roundRect(cx - contentW * 0.3, pillY - 0, contentW * 0.6, contentW * 0.08, contentW * 0.04);
    ctx.fill();

    ctx.fillStyle = hexA('#ffffff', 0.7);
    const pillFS = contentW * 0.035;
    ctx.font = `600 ${pillFS}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Get Started', cx, pillY + contentW * 0.04);

    ctx.restore();
  }

  const glareT = clamp01(remap(t01, 0.1, 0.3));
  if (glareT > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-deviceW / 2, -deviceH / 2, deviceW, deviceH, cornerR);
    ctx.clip();

    const glareAlpha = 0.04 * (1 - easeOutCubic(glareT));
    const glareGrad = ctx.createLinearGradient(
      -deviceW / 2, -deviceH / 2,
      deviceW / 2, deviceH / 2,
    );
    glareGrad.addColorStop(0, hexA('#ffffff', glareAlpha));
    glareGrad.addColorStop(0.3, 'rgba(255,255,255,0)');
    ctx.fillStyle = glareGrad;
    ctx.fillRect(-deviceW / 2, -deviceH / 2, deviceW, deviceH);

    ctx.restore();
  }

  ctx.restore();

  if (label) {
    const labelT = easeOutCubic(clamp01(remap(t01, 0.55, 0.70)));
    if (labelT > 0.01) {
      ctx.save();
      ctx.globalAlpha = globalAlpha * labelT;
      ctx.translate(cx, 0);

      const labelSize = Math.min(width, height) * 0.028;
      ctx.font = `700 ${labelSize}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const labelY = cy + deviceH / 2 + 28;

      const labelW = ctx.measureText(label).width;
      const lineY = labelY + labelSize * 1.3;
      const lineW = labelW * 0.5;

      ctx.strokeStyle = hexA(palette.accent, 0.4);
      ctx.lineWidth = 2;
      ctx.shadowColor = hexA(palette.accent, 0.3);
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(cx - lineW / 2, lineY);
      ctx.lineTo(cx + lineW / 2, lineY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      const grad = ctx.createLinearGradient(cx - labelW / 2, labelY, cx + labelW / 2, labelY);
      grad.addColorStop(0, hexA('#ffffff', 0.6));
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(1, hexA('#ffffff', 0.6));
      ctx.fillStyle = grad;
      ctx.fillText(label, cx, labelY);

      ctx.restore();
    }
  }
};
