import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutCubic, easeInOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

export const liquidLoader = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const label = p.text || '';
  const intensity = p.intensity ?? 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const cx = width / 2;
  const cy = height * 0.42;
  const blobR = Math.min(width, height) * 0.12;
  const pointCount = 64;

  const mainColor = mixHex(palette.primary, palette.accent, 0.5);
  const glowColor = hexA(mainColor, 0.4);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  const bgR = Math.max(width, height) * 0.5;
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bgR);
  bgGrad.addColorStop(0, hexA(mixHex(palette.bg || '#0a0a14', palette.primary, 0.08), 0.9));
  bgGrad.addColorStop(1, hexA(palette.bg || '#0a0a14', 1));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * Math.PI * 2;
    const wave1 = Math.sin(angle * 3 + t01 * Math.PI * 2) * 0.15;
    const wave2 = Math.sin(angle * 5 - t01 * Math.PI * 1.3) * 0.1;
    const wave3 = Math.sin(angle * 7 + t01 * Math.PI * 0.7) * 0.06;
    const wave4 = Math.sin(t01 * Math.PI * 1.1) * Math.sin(angle * 2) * 0.08;
    const r = blobR * (1 + wave1 + wave2 + wave3 + wave4);
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }

  ctx.save();
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 25 + 10 * Math.sin(t01 * Math.PI * 2);

  ctx.beginPath();
  const smoothStep = 2;
  for (let i = 0; i < points.length; i += smoothStep) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];
    const p2 = points[(i + 2) % points.length];
    const cp1x = p0.x + (p1.x - p0.x) * 0.5;
    const cp1y = p0.y + (p1.y - p0.y) * 0.5;
    const cp2x = p1.x + (p2.x - p1.x) * 0.5;
    const cp2y = p1.y + (p2.y - p1.y) * 0.5;
    if (i === 0) ctx.moveTo(p0.x, p0.y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
  }
  ctx.closePath();

  const grad = ctx.createRadialGradient(cx - blobR * 0.2, cy - blobR * 0.2, 0, cx, cy, blobR);
  grad.addColorStop(0, palette.primary);
  grad.addColorStop(0.4, mainColor);
  grad.addColorStop(1, palette.accent);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = hexA('#ffffff', 0.15);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();

  const orbCount = intensity >= 3 ? 4 : intensity >= 2 ? 3 : 2;
  for (let oi = 0; oi < orbCount; oi++) {
    const orbAngle = t01 * Math.PI * 2 * (1 + oi * 0.3) + (oi / orbCount) * Math.PI * 2;
    const orbDist = blobR * (0.7 + 0.3 * Math.sin(t01 * Math.PI * 0.5 + oi * 2));
    const ox = cx + orbDist * Math.cos(orbAngle);
    const oy = cy + orbDist * Math.sin(orbAngle);
    const or = 2 + Math.sin(t01 * Math.PI * 3 + oi) * 0.8;

    const oColors = [palette.accent, palette.primary, palette.secondary, '#ffffff'];
    ctx.save();
    ctx.globalAlpha = (0.3 + 0.2 * Math.sin(t01 * Math.PI * 2 + oi)) * globalAlpha;
    ctx.fillStyle = oColors[oi % oColors.length];
    ctx.shadowColor = hexA(oColors[oi % oColors.length], 0.6);
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(ox, oy, or, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const spinAngle = t01 * Math.PI * 2 * 2;
  const ringR = blobR * 0.35;
  const dashLen = Math.PI * ringR * 2 * 0.25;
  ctx.save();
  ctx.globalAlpha = 0.6 * globalAlpha;
  ctx.strokeStyle = hexA('#ffffff', 0.3);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([dashLen, Math.PI * ringR * 2 - dashLen]);
  ctx.lineDashOffset = -spinAngle * ringR;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  const percentageT = easeOutCubic(clamp01(remap(t01, 0.15, 0.50)));
  if (percentageT > 0.01) {
    const percent = Math.round(percentageT * 100);
    ctx.save();
    ctx.globalAlpha = percentageT * globalAlpha;
    const numSize = blobR * 0.55;
    ctx.font = `700 ${numSize}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = hexA('#ffffff', 0.2);
    ctx.shadowBlur = 8;
    ctx.fillStyle = hexA('#ffffff', 0.9);
    ctx.fillText(`${percent}%`, cx, cy + 2);
    ctx.restore();
  }

  if (label) {
    const labelT = easeOutCubic(clamp01(remap(t01, 0.30, 0.45)));
    if (labelT > 0.01) {
      ctx.save();
      ctx.globalAlpha = globalAlpha * labelT;
      ctx.translate(cx, 0);

      const labelSize = Math.min(width, height) * 0.025;
      ctx.font = `600 ${labelSize}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const labelY = cy + blobR + 20;
      ctx.shadowColor = hexA(palette.accent, 0.2);
      ctx.shadowBlur = 4;
      ctx.fillStyle = hexA('#ffffff', 0.5);
      ctx.fillText(label, cx, labelY);

      ctx.restore();
    }
  }

  ctx.restore();
};
