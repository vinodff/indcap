/**
 * countdown — dramatic 3 → 2 → 1 → GO! zoom-smash countdown.
 *
 * Each number SMASHES to full size with easeOutBack spring overshoot.
 * Zap icon flashes behind each digit on impact. GO! gets a Rocket icon +
 * lens flare. Burst line tips become 4-point stars. LensFlare blooms on
 * GO! impact.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutBack, easeInCubic, easeOutCubic, lerp, remap } from '../easing';
import { hexA, drawStar } from '../decorations';
import { drawLucideIcon } from '../iconRenderer';
import { drawLensFlare } from '../textures';

const FONT_STACK = `'Space Grotesk', 'Impact', 'Arial Black', sans-serif`;

export const countdown = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  const finalLabel = p.text || 'GO!';

  let labels: string[];
  if (p.text && /\d/.test(p.text)) {
    labels = p.text.toUpperCase().split(/[\s,|]+/).filter(Boolean);
  } else {
    labels = ['3', '2', '1', finalLabel.toUpperCase()];
  }

  const totalSteps = labels.length;
  const stepDur = 1 / totalSteps;

  const globalFade = 1 - clamp01(remap(t01, 0.95, 1));
  if (globalFade < 0.01) return;

  const stepIdx = Math.min(Math.floor(t01 / stepDur), totalSteps - 1);
  const localT = (t01 - stepIdx * stepDur) / stepDur;
  const isLast = stepIdx === totalSteps - 1;
  const label = labels[stepIdx];

  const fontPx = Math.min(width, height) * (isLast ? (intensity === 3 ? 0.22 : 0.18) : (intensity === 3 ? 0.3 : 0.24));

  const inT = clamp01(remap(localT, 0, 0.3));
  const outT = clamp01(remap(localT, 0.75, 1));
  const scale = easeOutBack(inT, isLast ? 2.8 : 2.1) * lerp(1, 0.6, easeInCubic(outT));
  const alpha = clamp01(inT * 3) * (1 - easeInCubic(outT)) * globalFade;

  if (alpha < 0.01 || scale < 0.01) return;

  ctx.save();
  ctx.translate(width / 2, height / 2);

  // ── Radial burst lines with star tips ─────────────────────────────
  const impactT = clamp01(remap(localT, 0, 0.35));
  const burstAlpha = (1 - easeOutCubic(impactT)) * (isLast ? 0.95 : 0.6) * globalFade;
  if (burstAlpha > 0.02) {
    const lineCount = isLast ? 16 : 10;
    const burstR = Math.min(width, height) * (0.3 + 0.25 * easeOutCubic(impactT));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const innerR = burstR * 0.25;
      const lineW = Math.max(1.5, fontPx * 0.025 * (isLast ? 1.5 : 1));
      const grad = ctx.createLinearGradient(
        Math.cos(angle) * innerR, Math.sin(angle) * innerR,
        Math.cos(angle) * burstR, Math.sin(angle) * burstR,
      );
      grad.addColorStop(0, hexA(palette.accent, burstAlpha));
      grad.addColorStop(1, hexA(palette.primary, 0));
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineW;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      ctx.lineTo(Math.cos(angle) * burstR, Math.sin(angle) * burstR);
      ctx.stroke();

      // Star tip at burst line end
      if (burstAlpha > 0.2) {
        const tipX = Math.cos(angle) * burstR;
        const tipY = Math.sin(angle) * burstR;
        const starSize = fontPx * 0.06 * burstAlpha;
        ctx.fillStyle = hexA(palette.accent, burstAlpha * 0.8);
        ctx.beginPath();
        drawStar(ctx, tipX, tipY, starSize, starSize * 0.4, 4, angle);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── Lens flare for GO! ────────────────────────────────────────────
  if (isLast && impactT < 0.4) {
    const flareAlpha = (1 - impactT / 0.4) * 0.9 * globalFade;
    const flareSize = Math.min(width, height) * lerp(0.9, 0.2, impactT / 0.4);
    drawLensFlare(ctx, 0, 0, flareSize, flareAlpha);
  }

  // ── Zap icon behind number (on impact) ──────────────────────────
  if (intensity >= 2 && impactT < 0.5) {
    const zapAlpha = (1 - impactT / 0.5) * 0.55 * globalFade;
    const zapSize = fontPx * lerp(2.5, 1.2, impactT / 0.5);
    const zapIcon = isLast ? 'rocket' : 'zap';
    drawLucideIcon(ctx, zapIcon, 0, 0, zapSize, palette.accent, {
      fill: true,
      stroke: false,
      alpha: zapAlpha,
      glowColor: palette.accent,
      glowBlur: zapSize * 0.4,
    });
  }

  // ── Label ─────────────────────────────────────────────────────────
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${fontPx}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // glow ring behind number
  const glowR = fontPx * (isLast ? 0.75 : 0.6);
  const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
  glowGrad.addColorStop(0, hexA(isLast ? palette.accent : palette.primary, 0.3));
  glowGrad.addColorStop(1, hexA(palette.bg, 0));
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fill();

  // 3D extrusion
  const extrudeDepth = fontPx * 0.04;
  const extrudeLayers = isLast ? 8 : 5;
  for (let i = extrudeLayers; i >= 1; i--) {
    const ot = i / extrudeLayers;
    ctx.fillStyle = hexA(ot > 0.5 ? palette.bg : palette.secondary, ot * 0.7);
    ctx.fillText(label, i * extrudeDepth, i * extrudeDepth);
  }

  // main face
  ctx.shadowColor = isLast ? palette.accent : palette.primary;
  ctx.shadowBlur = fontPx * (isLast ? 0.5 : 0.3);
  ctx.fillStyle = isLast ? palette.accent : palette.text;
  ctx.fillText(label, 0, 0);

  // white inner highlight
  ctx.shadowBlur = 0;
  ctx.globalAlpha = alpha * 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, 0, 0);

  ctx.restore();
};
