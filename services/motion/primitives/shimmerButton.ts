import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, remap, lerp, easeOutBack, easeOutCubic, easeInCubic } from '../easing';
import { roundRect } from '../decorations';

export const shimmerButton = (
  { ctx, width: W, height: H, t01, palette }: PrimitiveContext,
  params: PrimitiveParams,
): void => {
  const label = params.text ?? 'GET STARTED';

  // ── Phases ──────────────────────────────────────────────────────────────────
  const entryP  = clamp01(remap(t01, 0.00, 0.28));
  const holdP   = clamp01(remap(t01, 0.28, 0.78));
  const exitP   = clamp01(remap(t01, 0.82, 1.00));

  const globalFade = easeOutCubic(entryP) * (1 - easeInCubic(exitP));
  if (globalFade < 0.01) return;

  // Button dims
  const btnW  = Math.min(W * 0.54, 420);
  const btnH  = Math.min(H * 0.11, 72);
  const btnR  = btnH / 2;                    // fully pill-shaped
  const btnX  = (W - btnW) / 2;
  const btnY  = H * 0.5 - btnH / 2;

  // Entry scale — button pops in from below with spring
  const entryScale = easeOutBack(entryP, 1.30);
  const entryTX    = lerp(0, H * 0.06, 1 - easeOutCubic(entryP)); // slide from below

  ctx.save();
  ctx.globalAlpha = globalFade;
  ctx.translate(W / 2, H / 2 + entryTX);
  ctx.scale(entryScale, entryScale);
  ctx.translate(-W / 2, -H / 2);

  // ── Outer glow ──────────────────────────────────────────────────────────────
  const glowPulse = 1 + Math.sin(holdP * Math.PI * 4) * 0.12;
  const glowR = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, btnW * 0.62 * glowPulse);
  glowR.addColorStop(0, `rgba(${hexRgb(palette.primary)},0.22)`);
  glowR.addColorStop(0.5, `rgba(${hexRgb(palette.primary)},0.08)`);
  glowR.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowR;
  ctx.fillRect(btnX - btnW * 0.5, btnY - btnH * 2, btnW * 2, btnH * 5);

  // ── Button shadow ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = `rgba(${hexRgb(palette.primary)},0.50)`;
  ctx.shadowBlur = btnH * 0.55;
  ctx.shadowOffsetY = btnH * 0.18;
  ctx.fillStyle = palette.primary;
  roundRect(ctx, btnX, btnY, btnW, btnH, btnR);
  ctx.fill();
  ctx.restore();

  // ── Button fill — metallic gradient ─────────────────────────────────────────
  const metalGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
  metalGrad.addColorStop(0.00, shiftLightness(palette.primary, 0.28));
  metalGrad.addColorStop(0.38, palette.primary);
  metalGrad.addColorStop(0.70, shiftLightness(palette.primary, -0.12));
  metalGrad.addColorStop(1.00, shiftLightness(palette.primary, -0.22));
  ctx.fillStyle = metalGrad;
  roundRect(ctx, btnX, btnY, btnW, btnH, btnR);
  ctx.fill();

  // ── Shimmer sweep ────────────────────────────────────────────────────────────
  // Sweeps repeatedly during hold phase
  const shimmerCycles = 2.5;
  const rawSweep = (holdP * shimmerCycles) % 1;           // 0..1 looping
  const sweepPos = lerp(-btnW * 0.4, btnW * 1.4, rawSweep);
  const sweepW   = btnW * 0.22;

  ctx.save();
  roundRect(ctx, btnX, btnY, btnW, btnH, btnR);
  ctx.clip();

  const shimGrad = ctx.createLinearGradient(
    btnX + sweepPos - sweepW / 2, btnY,
    btnX + sweepPos + sweepW / 2, btnY + btnH,
  );
  shimGrad.addColorStop(0.0, 'rgba(255,255,255,0.0)');
  shimGrad.addColorStop(0.4, 'rgba(255,255,255,0.35)');
  shimGrad.addColorStop(0.6, 'rgba(255,255,255,0.55)');
  shimGrad.addColorStop(1.0, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = shimGrad;
  ctx.fillRect(btnX + sweepPos - sweepW, btnY, sweepW * 2, btnH);

  // Top specular edge highlight
  const specGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH * 0.45);
  specGrad.addColorStop(0, 'rgba(255,255,255,0.28)');
  specGrad.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = specGrad;
  ctx.fillRect(btnX, btnY, btnW, btnH * 0.45);

  ctx.restore();

  // ── Button border (fine 1px rim) ─────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.30)';
  ctx.lineWidth = 1.2;
  roundRect(ctx, btnX + 0.6, btnY + 0.6, btnW - 1.2, btnH - 1.2, btnR - 0.6);
  ctx.stroke();
  ctx.restore();

  // ── Label text ───────────────────────────────────────────────────────────────
  const fs = Math.min(btnH * 0.38, W * 0.04, 28);
  ctx.save();
  ctx.font = `700 ${fs}px 'Segoe UI', 'Arial Black', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 6;
  ctx.fillText(label, W / 2, H / 2 + fs * 0.04);

  // Letter-spacing shimmer: text gets a tiny brightness boost where sweep passes
  const sweepMid = btnX + sweepPos;
  const textGlow = Math.max(0, 1 - Math.abs((W / 2) - sweepMid) / (btnW * 0.3));
  if (textGlow > 0.05) {
    ctx.globalAlpha = textGlow * 0.5;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, W / 2, H / 2 + fs * 0.04);
  }
  ctx.restore();

  // ── Subtitle / subtext below button ─────────────────────────────────────────
  if (params.icon) {
    const subFS = fs * 0.55;
    const subAlpha = easeOutCubic(clamp01(remap(t01, 0.22, 0.40)));
    ctx.save();
    ctx.globalAlpha = globalFade * subAlpha * 0.60;
    ctx.font = `400 ${subFS}px 'Segoe UI', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(params.icon, W / 2, btnY + btnH + subFS * 0.8);
    ctx.restore();
  }

  ctx.restore();
};

function hexRgb(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
}

function shiftLightness(hex: string, delta: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, Math.max(0, parseInt(h.slice(0, 2), 16) + Math.round(delta * 255)));
  const g = Math.min(255, Math.max(0, parseInt(h.slice(2, 4), 16) + Math.round(delta * 255)));
  const b = Math.min(255, Math.max(0, parseInt(h.slice(4, 6), 16) + Math.round(delta * 255)));
  return `rgb(${r},${g},${b})`;
}
