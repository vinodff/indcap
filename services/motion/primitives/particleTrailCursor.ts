import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeInOutCubic, easeOutCubic, lerp } from '../easing';

interface TrailParticle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  hue: number;
  life: number;
}

export const particleTrailCursor = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.1)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.85, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const particleCount = intensity === 3 ? 60 : intensity === 2 ? 35 : 20;
  const trailLength = Math.min(intensity * 12, 36);

  const pathAngle = t01 * Math.PI * 4;
  const pathRadius = Math.min(width, height) * 0.3;
  const cx = width / 2;
  const cy = height / 2;

  const cursorX = cx + Math.sin(pathAngle) * pathRadius * 0.6
    + Math.sin(t01 * Math.PI * 1.7) * pathRadius * 0.2;
  const cursorY = cy + Math.cos(pathAngle * 0.7) * pathRadius * 0.4
    + Math.cos(t01 * Math.PI * 2.1) * pathRadius * 0.15;

  const particles: TrailParticle[] = [];
  for (let i = 0; i < particleCount; i++) {
    const trailT = i / particleCount;
    const timeOffset = trailT * trailLength * 0.03;
    const angle = (t01 - timeOffset) * Math.PI * 4;
    const px = cx + Math.sin(angle) * pathRadius * 0.6
      + Math.sin((t01 - timeOffset) * Math.PI * 1.7) * pathRadius * 0.2;
    const py = cy + Math.cos(angle * 0.7) * pathRadius * 0.4
      + Math.cos((t01 - timeOffset) * Math.PI * 2.1) * pathRadius * 0.15;

    const spreadX = (Math.random() - 0.5) * (1 - trailT) * 12;
    const spreadY = (Math.random() - 0.5) * (1 - trailT) * 12;

    particles.push({
      x: px + spreadX,
      y: py + spreadY,
      size: (2 + Math.random() * 4) * (1 - trailT * 0.6),
      alpha: (1 - trailT) * (0.5 + Math.random() * 0.5),
      hue: i / particleCount,
      life: 1 - trailT,
    });
  }

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  ctx.save();
  ctx.shadowColor = hexA(palette.accent, 0.6);
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cursorX, cursorY, 8 + 4 * Math.sin(t01 * Math.PI * 3), 0, Math.PI * 2);
  const cursorGrad = ctx.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, 14);
  cursorGrad.addColorStop(0, hexA('#ffffff', 0.9));
  cursorGrad.addColorStop(0.4, hexA(palette.accent, 0.6));
  cursorGrad.addColorStop(1, hexA(palette.accent, 0));
  ctx.fillStyle = cursorGrad;
  ctx.fill();
  ctx.restore();

  ctx.save();
  for (const p of particles) {
    const alpha = p.alpha * globalAlpha;
    if (alpha < 0.01) continue;

    const color = mixHex(palette.primary, palette.accent, p.hue);
    ctx.fillStyle = hexA(color, alpha);
    ctx.shadowColor = hexA(color, alpha * 0.5);
    ctx.shadowBlur = 8 * p.size;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (let w = 0; w < 3; w++) {
    const widthRatio = 1 - w * 0.3;
    ctx.save();
    ctx.globalAlpha = globalAlpha * (0.15 - w * 0.04);
    ctx.strokeStyle = hexA(w === 1 ? palette.accent : palette.primary, 0.3);
    ctx.lineWidth = 1.5 * widthRatio;
    ctx.beginPath();
    ctx.moveTo(particles[0]?.x ?? cursorX, particles[0]?.y ?? cursorY);
    for (let i = 1; i < particles.length; i += 2) {
      const prev = particles[Math.max(0, i - 1)];
      const curr = particles[i];
      ctx.lineTo(
        prev.x + (curr.x - prev.x) * 0.5,
        prev.y + (curr.y - prev.y) * 0.5,
      );
    }
    ctx.stroke();
    ctx.restore();
  }

  const ringCount = intensity >= 2 ? 4 : 2;
  for (let ri = 0; ri < ringCount; ri++) {
    const ringRadius = 14 + ri * 10 + 6 * Math.sin(t01 * Math.PI * 2 + ri);
    const ringAlpha = 0.3 - ri * 0.07;
    if (ringAlpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = ringAlpha * globalAlpha;
    ctx.strokeStyle = hexA(palette.accent, 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cursorX, cursorY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
};
