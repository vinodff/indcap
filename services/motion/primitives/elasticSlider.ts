import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

interface LiquidDrop {
  x: number;
  y: number;
  size: number;
  alpha: number;
  phase: number;
}

export const elasticSlider = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;
  const label = p.text || 'AI Temperature';

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  const trackW = Math.min(width * 0.78, 500);
  const trackH = 8;
  const knobR = 22;
  const cx = width / 2 - trackW / 2;
  const cy = height / 2;

  const t = clamp01(remap(t01, 0.1, 0.45));
  const springVal = easeOutBack(t, 1.5);
  const knobX = cx + springVal * (trackW - 2 * knobR) + knobR;

  const bounceT = clamp01(remap(t01, 0.45, 0.55));
  const bounceEffect = Math.sin(bounceT * Math.PI * 6) * (1 - bounceT) * 3;

  const slideBackT = clamp01(remap(t01, 0.65, 0.85));
  const slideBackSpring = 1 - easeOutCubic(slideBackT);
  const finalKnobX = lerp(knobX, cx + knobR, slideBackSpring);

  const currentKnobX = finalKnobX;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  ctx.font = `700 14px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = hexA('#ffffff', 0.7);
  ctx.fillText(label, cx, cy - knobR - 16);

  const valuePercent = ((currentKnobX - cx - knobR) / (trackW - 2 * knobR)) * 100;
  ctx.font = `700 18px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = hexA(palette.accent, 0.9);
  ctx.fillText(`${Math.round(valuePercent)}%`, cx + trackW, cy - knobR - 16);

  ctx.save();
  ctx.shadowColor = hexA(palette.accent, 0.15);
  ctx.shadowBlur = 6;

  const trackBgGrad = ctx.createLinearGradient(cx, cy, cx, cy + trackH);
  trackBgGrad.addColorStop(0, hexA('#ffffff', 0.08));
  trackBgGrad.addColorStop(1, hexA('#ffffff', 0.02));
  ctx.fillStyle = trackBgGrad;
  roundRect(ctx, cx, cy - trackH / 2, trackW, trackH, trackH / 2);
  ctx.fill();
  ctx.restore();

  const fillW = currentKnobX - cx - knobR + knobR;
  if (fillW > 0) {
    const fillGrad = ctx.createLinearGradient(cx, cy, cx + trackW, cy);
    fillGrad.addColorStop(0, hexA(palette.primary, 0.5));
    fillGrad.addColorStop(1, hexA(palette.accent, 0.7));
    ctx.fillStyle = fillGrad;
    roundRect(ctx, cx, cy - trackH / 2, fillW, trackH, trackH / 2);

    ctx.save();
    ctx.shadowColor = hexA(palette.accent, 0.2);
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.restore();
  }

  const glowSize = knobR * (2 + 0.3 * Math.sin(t01 * Math.PI * 2));
  const glowGrad = ctx.createRadialGradient(
    currentKnobX, cy, 0,
    currentKnobX, cy, glowSize,
  );
  glowGrad.addColorStop(0, hexA(palette.accent, 0.2));
  glowGrad.addColorStop(0.5, hexA(palette.accent, 0.05));
  glowGrad.addColorStop(1, hexA(palette.accent, 0));
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(currentKnobX, cy, glowSize, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = hexA(palette.accent, 0.4);
  ctx.shadowBlur = 14;

  const knobGrad = ctx.createRadialGradient(
    currentKnobX - knobR * 0.25, cy - knobR * 0.25, 0,
    currentKnobX, cy, knobR,
  );
  knobGrad.addColorStop(0, hexA('#ffffff', 0.4));
  knobGrad.addColorStop(0.4, hexA(palette.primary, 0.7));
  knobGrad.addColorStop(1, hexA(palette.accent, 0.3));
  ctx.fillStyle = knobGrad;
  ctx.beginPath();
  ctx.arc(currentKnobX, cy, knobR, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = hexA('#ffffff', 0.2);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(currentKnobX, cy, knobR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = hexA('#ffffff', 0.6);
  ctx.beginPath();
  ctx.arc(currentKnobX, cy, knobR * 0.25, 0, Math.PI * 2);
  ctx.fill();

  const dropCount = intensity >= 3 ? 8 : intensity >= 2 ? 5 : 3;
  const drops: LiquidDrop[] = [];
  for (let i = 0; i < dropCount; i++) {
    const dropPhase = i / dropCount;
    const radius = knobR * (0.4 + 0.6 * dropPhase);
    const angle = t01 * Math.PI * 2 * (1 + i * 0.3) + dropPhase * Math.PI * 2;
    const wobble = 0.3 * Math.sin(t01 * Math.PI * 3 + i * 1.5);

    drops.push({
      x: currentKnobX + Math.cos(angle) * (knobR + radius * (0.5 + wobble * 0.3)),
      y: cy + Math.sin(angle) * (knobR + radius * (0.5 + wobble * 0.3)),
      size: 2 + Math.sin(t01 * Math.PI * 4 + i) * 1.5,
      alpha: 0.3 + 0.2 * Math.sin(t01 * Math.PI * 2 + i * 0.7),
      phase: dropPhase,
    });
  }

  for (const drop of drops) {
    ctx.save();
    ctx.globalAlpha = drop.alpha * globalAlpha;
    ctx.fillStyle = hexA(palette.accent, 0.5);
    ctx.shadowColor = hexA(palette.accent, 0.3);
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(drop.x, drop.y, Math.max(0.5, drop.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (t < 0.5) {
    const rippleCount = 2;
    for (let ri = 0; ri < rippleCount; ri++) {
      const rippleProgress = clamp01(remap(t, ri * 0.15, ri * 0.15 + 0.2));
      const rippleR = knobR + rippleProgress * knobR * 3;
      const rippleAlpha = (1 - rippleProgress) * 0.3;
      ctx.save();
      ctx.globalAlpha = rippleAlpha * globalAlpha;
      ctx.strokeStyle = hexA(palette.accent, 0.4);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(currentKnobX, cy, rippleR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
};
