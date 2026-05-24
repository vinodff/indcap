import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, remap, lerp, easeOutCubic, easeInCubic } from '../easing';

// Layered waveform config: each band is a sine at a different freq / amplitude / speed
interface Band {
  freq: number;
  speed: number;
  ampMult: number;
  colorT: number;   // 0..1 into the palette gradient
  lineWidth: number;
  phaseOffset: number;
}

const BANDS: Band[] = [
  { freq: 2.1, speed: 1.0, ampMult: 0.85, colorT: 0.0, lineWidth: 4.0, phaseOffset: 0 },
  { freq: 3.4, speed: 1.6, ampMult: 0.60, colorT: 0.25, lineWidth: 2.8, phaseOffset: 0.7 },
  { freq: 1.7, speed: 0.8, ampMult: 0.70, colorT: 0.5,  lineWidth: 3.2, phaseOffset: 1.4 },
  { freq: 4.8, speed: 2.1, ampMult: 0.40, colorT: 0.75, lineWidth: 2.0, phaseOffset: 2.1 },
  { freq: 2.8, speed: 1.3, ampMult: 0.55, colorT: 1.0,  lineWidth: 1.6, phaseOffset: 3.0 },
];

// Sample amplitude envelope: speech-like bursts
function getAmplitude(t01: number): number {
  // Speech-like envelope: ramps up, has 3 "word bursts", trails off
  const attack  = clamp01(remap(t01, 0.00, 0.12));
  const release = 1 - clamp01(remap(t01, 0.85, 1.00));
  const burst1  = Math.sin(clamp01(remap(t01, 0.15, 0.40)) * Math.PI);
  const burst2  = Math.sin(clamp01(remap(t01, 0.42, 0.65)) * Math.PI) * 0.9;
  const burst3  = Math.sin(clamp01(remap(t01, 0.67, 0.85)) * Math.PI) * 0.75;
  const envelope = Math.max(burst1, burst2, burst3);
  return easeOutCubic(attack) * release * (0.35 + envelope * 0.65);
}

function lerpColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `rgb(${r},${g},${b})`;
}

export const voiceWaveform = (
  { ctx, width: W, height: H, t01, palette }: PrimitiveContext,
  params: PrimitiveParams,
): void => {
  const label = params.text ?? '';

  // Layout
  const waveAreaH = H * 0.28;
  const waveY     = H * 0.5;
  const waveW     = W * 0.82;
  const waveX     = (W - waveW) / 2;

  // Global amplitude envelope (speech-like)
  const amp = getAmplitude(t01);

  // Background pill / glow
  const bgAlpha = easeOutCubic(clamp01(remap(t01, 0, 0.15)));
  if (bgAlpha > 0) {
    ctx.save();
    const pillH = waveAreaH + H * 0.12;
    const pillR = pillH / 2;
    const grad  = ctx.createLinearGradient(waveX, 0, waveX + waveW, 0);
    grad.addColorStop(0, `rgba(0,0,0,${bgAlpha * 0.55})`);
    grad.addColorStop(0.5, `rgba(0,0,0,${bgAlpha * 0.72})`);
    grad.addColorStop(1, `rgba(0,0,0,${bgAlpha * 0.55})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(waveX - W * 0.02, waveY - pillH / 2, waveW + W * 0.04, pillH, pillR);
    ctx.fill();

    // Glow behind waveform using primary colour
    const glowR = ctx.createRadialGradient(W / 2, waveY, 0, W / 2, waveY, waveW * 0.55);
    glowR.addColorStop(0, `rgba(${hexToRgb(palette.primary)},${amp * bgAlpha * 0.20})`);
    glowR.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowR;
    ctx.fillRect(waveX - W * 0.05, waveY - waveAreaH, waveW + W * 0.10, waveAreaH * 2);
    ctx.restore();
  }

  // Draw each band
  const steps = Math.ceil(waveW / 2.5);   // sample density
  for (const band of BANDS) {
    const lineAlpha = easeOutCubic(clamp01(remap(t01, 0.05, 0.25))) *
                      (1 - easeInCubic(clamp01(remap(t01, 0.88, 1.0))));
    if (lineAlpha < 0.01) continue;

    // Band colour interpolated between primary and accent
    const color = lerpColor(palette.primary, palette.accent, band.colorT);

    ctx.save();
    ctx.globalAlpha = lineAlpha * (0.45 + amp * 0.55);
    ctx.strokeStyle = color;
    ctx.lineWidth = band.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Glow pass
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 + amp * 18;

    const maxAmpPx = waveAreaH * 0.48;
    const phase = t01 * band.speed * Math.PI * 8 + band.phaseOffset;

    ctx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const xNorm = s / steps;
      const x = waveX + xNorm * waveW;

      // Waveform: sum of two sine waves (main + harmonic) with edge fade-off
      const edgeFade = Math.sin(xNorm * Math.PI);   // 0 at edges, 1 at centre
      const sine1 = Math.sin(xNorm * Math.PI * 2 * band.freq + phase);
      const sine2 = Math.sin(xNorm * Math.PI * 2 * band.freq * 2.1 + phase * 1.3) * 0.35;
      const y = waveY + (sine1 + sine2) * edgeFade * maxAmpPx * band.ampMult * amp;

      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Mirror reflection below (subtle, low alpha)
    ctx.globalAlpha = lineAlpha * amp * 0.18;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    for (let s = 0; s <= steps; s++) {
      const xNorm = s / steps;
      const x = waveX + xNorm * waveW;
      const edgeFade = Math.sin(xNorm * Math.PI);
      const sine1 = Math.sin(xNorm * Math.PI * 2 * band.freq + phase);
      const sine2 = Math.sin(xNorm * Math.PI * 2 * band.freq * 2.1 + phase * 1.3) * 0.35;
      const baseY = waveY + (sine1 + sine2) * edgeFade * maxAmpPx * band.ampMult * amp;
      // Reflect: mirror below waveY
      const y = waveY * 2 - baseY + waveAreaH * 0.18;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  // Pulsing circle indicator at each end
  const indicatorAlpha = easeOutCubic(clamp01(remap(t01, 0.10, 0.30))) *
                         (1 - easeInCubic(clamp01(remap(t01, 0.88, 1.0))));
  if (indicatorAlpha > 0.01) {
    for (const sx of [waveX - W * 0.03, waveX + waveW + W * 0.03]) {
      const pulse = 1 + Math.sin(t01 * Math.PI * 7) * amp * 0.3;
      ctx.save();
      ctx.globalAlpha = indicatorAlpha * (0.6 + amp * 0.4);
      ctx.shadowColor = palette.primary;
      ctx.shadowBlur = 12 + amp * 20;
      ctx.fillStyle = palette.primary;
      ctx.beginPath();
      ctx.arc(sx, waveY, W * 0.012 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Optional transcript label
  if (label) {
    const textAlpha = easeOutCubic(clamp01(remap(t01, 0.18, 0.40))) *
                      (1 - easeInCubic(clamp01(remap(t01, 0.82, 1.0))));
    if (textAlpha > 0.01) {
      const fs = Math.min(W * 0.04, H * 0.05, 36);
      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.font = `500 ${fs}px 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillText(label, W / 2, waveY + waveAreaH * 0.72, waveW);
      ctx.restore();
    }
  }
};

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}
