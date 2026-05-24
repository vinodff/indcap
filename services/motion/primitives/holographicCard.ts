import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

export const holographicCard = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const label = p.text || 'Holographic';
  const intensity = p.intensity ?? 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const cx = width / 2;
  const cy = height * 0.42;

  const entryT = easeOutBack(clamp01(remap(t01, 0.05, 0.30)), 1.5);

  const cardW = Math.min(width, height) * 0.35;
  const cardH = cardW * 0.62;
  const cardR = cardW * 0.04;

  const tiltX = Math.sin(t01 * Math.PI * 1.2) * 0.06;
  const tiltY = Math.cos(t01 * Math.PI * 0.9) * 0.04;

  const scale = lerp(0.4, 1, entryT);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.5);
  bgGrad.addColorStop(0, hexA(mixHex(palette.bg || '#0a0a14', palette.primary, 0.05), 0.95));
  bgGrad.addColorStop(0.5, hexA(palette.bg || '#0a0a14', 0.98));
  bgGrad.addColorStop(1, hexA(palette.bg || '#0a0a14', 1));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const particles = 15 + intensity * 8;
  for (let pi = 0; pi < particles; pi++) {
    const seed = pi * 37.1;
    const px = ((Math.sin(seed) * 0.5 + 0.5) % 1) * width;
    const py = ((Math.sin(seed * 1.3) * 0.5 + 0.5) % 1) * height;
    const pr = 0.5 + (Math.sin(seed * 2.7) * 0.5 + 0.5) * 1.5;
    const pa = (Math.sin(seed * 2.1) * 0.5 + 0.5) * 0.3 * globalAlpha;
    const twinkle = 0.5 + 0.5 * Math.sin(t01 * Math.PI * 2 + seed);

    ctx.save();
    ctx.globalAlpha = pa * twinkle;
    const holoColors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#9b59b6'];
    ctx.fillStyle = holoColors[pi % holoColors.length];
    ctx.beginPath();
    ctx.arc(px, py, pr * twinkle, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  viewTransform(ctx, tiltX, tiltY);

  ctx.save();
  ctx.shadowColor = hexA('#000000', 0.3);
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;

  ctx.beginPath();
  ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, cardR);
  ctx.fillStyle = '#111115';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, cardR);
  ctx.clip();

  const sheenAngle = t01 * Math.PI * 2;
  const sheenX = Math.cos(sheenAngle) * cardW;
  const sheenY = Math.sin(sheenAngle) * cardH;

  const sheenGrad = ctx.createLinearGradient(
    -cardW / 2 + sheenX - cardW * 0.3,
    -cardH / 2 + sheenY - cardH * 0.3,
    -cardW / 2 + sheenX + cardW * 0.3,
    -cardH / 2 + sheenY + cardH * 0.3,
  );
  sheenGrad.addColorStop(0, 'rgba(255,255,255,0)');
  sheenGrad.addColorStop(0.2, 'rgba(255,255,255,0)');
  sheenGrad.addColorStop(0.35, hexA('#ff6b6b', 0.06));
  sheenGrad.addColorStop(0.45, hexA('#ffd93d', 0.08));
  sheenGrad.addColorStop(0.55, hexA('#6bcb77', 0.06));
  sheenGrad.addColorStop(0.65, hexA('#4d96ff', 0.08));
  sheenGrad.addColorStop(0.75, hexA('#9b59b6', 0.06));
  sheenGrad.addColorStop(0.85, 'rgba(255,255,255,0)');
  sheenGrad.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = sheenGrad;
  ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = hexA('#ffffff', 0.03);

  for (let hi = 1; hi < 8; hi++) {
    const y = -cardH / 2 + (hi / 8) * cardH;
    ctx.beginPath();
    ctx.moveTo(-cardW / 2, y);
    ctx.lineTo(cardW / 2, y + cardH * 0.02);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  const borderGrad = ctx.createLinearGradient(-cardW / 2, -cardH / 2, cardW / 2, cardH / 2);
  borderGrad.addColorStop(0, hexA('#ff6b6b', 0.15));
  borderGrad.addColorStop(0.25, hexA('#ffd93d', 0.2));
  borderGrad.addColorStop(0.5, hexA('#6bcb77', 0.15));
  borderGrad.addColorStop(0.75, hexA('#4d96ff', 0.2));
  borderGrad.addColorStop(1, hexA('#9b59b6', 0.15));
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-cardW / 2 + 0.75, -cardH / 2 + 0.75, cardW - 1.5, cardH - 1.5, cardR - 0.75);
  ctx.stroke();
  ctx.restore();

  const contentT = easeOutCubic(clamp01(remap(t01, 0.20, 0.40)));
  if (contentT > 0.01) {
    ctx.save();
    ctx.globalAlpha = contentT;

    const m1 = cardW * 0.08;
    const m2 = cardH * 0.08;
    const iw = cardW - m1 * 2;

    const titleFs = iw * 0.09;
    ctx.font = `700 ${titleFs}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = hexA('#ffffff', 0.85);
    ctx.fillText(label, -cardW / 2 + m1, -cardH / 2 + m2);

    const subFs = iw * 0.035;
    ctx.font = `400 ${subFs}px ${FONT}`;
    ctx.fillStyle = hexA('#ffffff', 0.4);
    ctx.fillText('Premium Edition', -cardW / 2 + m1, -cardH / 2 + m2 + titleFs * 1.4);

    const badgeY = -cardH / 2 + m2 + titleFs * 1.4 + subFs * 2;
    ctx.fillStyle = hexA(palette.accent, 0.12);
    ctx.beginPath();
    ctx.roundRect(-cardW / 2 + m1, badgeY, iw * 0.35, iw * 0.07, iw * 0.035);
    ctx.fill();
    ctx.font = `500 ${iw * 0.03}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hexA(palette.accent, 0.6);
    ctx.fillText('HOLOGRAPHIC', -cardW / 2 + m1 + iw * 0.175, badgeY + iw * 0.035);

    const featureY = badgeY + iw * 0.12;
    const features = ['Real-time ray tracing', 'HDR display support', 'AI-enhanced rendering'];
    const visibleFeatures = intensity >= 2 ? features : features.slice(0, 2);

    for (let fi = 0; fi < visibleFeatures.length; fi++) {
      const fy = featureY + fi * (iw * 0.07);
      ctx.fillStyle = hexA('#ffffff', 0.35);
      ctx.font = `400 ${iw * 0.028}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`✦  ${visibleFeatures[fi]}`, -cardW / 2 + m1, fy);
    }

    const pillY = cardH / 2 - m2 - iw * 0.07;
    ctx.fillStyle = hexA('#ffffff', 0.08);
    ctx.beginPath();
    ctx.roundRect(-iw * 0.22, -cardH / 2 + pillY, iw * 0.44, iw * 0.065, iw * 0.033);
    ctx.fill();
    ctx.font = `600 ${iw * 0.028}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hexA('#ffffff', 0.5);
    ctx.fillText('Explore →', 0, -cardH / 2 + pillY + iw * 0.033);

    ctx.restore();
  }

  const glowPulse = 0.5 + 0.5 * Math.sin(t01 * Math.PI * 2.5);
  ctx.save();
  ctx.globalAlpha = 0.08 * glowPulse;
  ctx.shadowColor = hexA('#9b59b6', 0.3);
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, cardR);
  ctx.strokeStyle = 'rgba(155,89,182,0)';
  ctx.lineWidth = 0;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
  ctx.restore();
  ctx.restore();
};

function viewTransform(ctx: CanvasRenderingContext2D, tiltX: number, tiltY: number): void {
  const cosX = Math.cos(tiltX);
  const sinX = Math.sin(tiltX);
  const cosY = Math.cos(tiltY);
  const sinY = Math.sin(tiltY);

  ctx.transform(
    cosY, sinX * sinY,
    0, cosX,
    0, 0,
  );
}
