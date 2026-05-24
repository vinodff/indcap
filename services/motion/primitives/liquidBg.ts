/**
 * liquid-bg — animated organic blob / lava-lamp background.
 *
 * Multiple elliptical blobs drift and morph with sine-wave perturbations,
 * overlapping with screen blend for rich color mixing. Bokeh glints at
 * each blob center. Sparkle icon at center. Hexagon shapes float in the
 * blob field. LensFlare at scene center on intense beats.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, lerp, remap } from '../easing';
import { hexA, drawHexagon, drawSparkle } from '../decorations';
import { drawLucideIcon } from '../iconRenderer';
import { drawBokeh, drawLensFlare } from '../textures';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Blob {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  driftX: number;
  driftY: number;
  driftFreqX: number;
  driftFreqY: number;
  morphFreq: number;
  morphAmp: number;
  color: string;
  alpha: number;
  rotation: number;
  rotSpeed: number;
}

export const liquidBg = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, durationSec, palette } = pc;
  const intensity = p.intensity || 2;

  const inAlpha = clamp01(remap(t01, 0, 0.15));
  const outAlpha = 1 - clamp01(remap(t01, 0.85, 1));
  const globalAlpha = inAlpha * outAlpha;
  if (globalAlpha < 0.01) return;

  const blobCount = intensity === 3 ? 6 : intensity === 1 ? 3 : 4;
  const rand = rng(blobCount * 17 + Math.round(durationSec * 100));

  const colors = [palette.primary, palette.secondary, palette.accent,
    palette.primary, palette.accent, palette.secondary];

  const blobs: Blob[] = [];
  for (let i = 0; i < blobCount; i++) {
    blobs.push({
      cx: 0.15 + rand() * 0.7,
      cy: 0.15 + rand() * 0.7,
      rx: 0.25 + rand() * 0.3,
      ry: 0.2 + rand() * 0.25,
      driftX: 0.05 + rand() * 0.12,
      driftY: 0.04 + rand() * 0.1,
      driftFreqX: 0.15 + rand() * 0.25,
      driftFreqY: 0.12 + rand() * 0.2,
      morphFreq: 0.5 + rand() * 1.0,
      morphAmp: 0.08 + rand() * 0.15,
      color: colors[i % colors.length],
      alpha: 0.35 + rand() * 0.35,
      rotation: rand() * Math.PI * 2,
      rotSpeed: (rand() - 0.5) * 0.3,
    });
  }

  const sec = t01 * durationSec;
  const hexRand = rng(99 + Math.round(durationSec * 100));

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.hypot(width, height) * 0.6);
  bgGrad.addColorStop(0, hexA(palette.bg, 0.85));
  bgGrad.addColorStop(1, hexA(palette.bg, 1));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'screen';

  // ── Blobs + bokeh at each center ─────────────────────────────────
  for (const blob of blobs) {
    const cx = (blob.cx + Math.sin(sec * blob.driftFreqX * Math.PI * 2) * blob.driftX) * width;
    const cy = (blob.cy + Math.cos(sec * blob.driftFreqY * Math.PI * 2) * blob.driftY) * height;
    const morphScale = 1 + Math.sin(sec * blob.morphFreq * Math.PI * 2) * blob.morphAmp;
    const rx = blob.rx * width * morphScale;
    const ry = blob.ry * height / morphScale;
    const rot = blob.rotation + blob.rotSpeed * sec;

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    grad.addColorStop(0, hexA(blob.color, blob.alpha * globalAlpha));
    grad.addColorStop(0.55, hexA(blob.color, blob.alpha * globalAlpha * 0.5));
    grad.addColorStop(1, hexA(blob.color, 0));

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(rx, ry);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bokeh glint at blob center
    drawBokeh(ctx, cx, cy, Math.min(rx, ry) * 0.35, globalAlpha * blob.alpha * 0.5);
  }

  // ── Floating hexagon shapes in blob field ─────────────────────────
  if (intensity >= 2) {
    ctx.globalCompositeOperation = 'screen';
    const hexCount = intensity === 3 ? 6 : 3;
    for (let h = 0; h < hexCount; h++) {
      const hx = (hexRand() * 0.8 + 0.1) * width;
      const hy0 = (hexRand() * 0.8 + 0.1) * height;
      const hDrift = Math.sin(sec * lerp(0.15, 0.4, hexRand()) * Math.PI * 2 + h) * height * 0.05;
      const hy = hy0 + hDrift;
      const hr = lerp(0.02, 0.07, hexRand()) * Math.min(width, height);
      const hRot = sec * lerp(0.1, 0.4, hexRand()) * (hexRand() > 0.5 ? 1 : -1);
      const hAlpha = lerp(0.05, 0.18, hexRand()) * globalAlpha;
      const hColor = colors[h % colors.length];

      ctx.save();
      ctx.globalAlpha = hAlpha;
      ctx.strokeStyle = hexA(hColor, 1);
      ctx.lineWidth = Math.max(1, hr * 0.06);
      ctx.shadowColor = hColor;
      ctx.shadowBlur = hr * 0.5;
      ctx.beginPath();
      drawHexagon(ctx, hx, hy, hr, hRot);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Sparkle shapes on blob surfaces ──────────────────────────────
  if (intensity >= 2) {
    const spRand = rng(55 + Math.round(sec * 3));
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let s = 0; s < 5; s++) {
      const sx = width * (0.1 + spRand() * 0.8);
      const sy = height * (0.1 + spRand() * 0.8);
      const spSize = lerp(0.008, 0.025, spRand()) * Math.min(width, height);
      const spAlpha = globalAlpha * lerp(0.2, 0.5, spRand());
      ctx.globalAlpha = spAlpha;
      ctx.fillStyle = hexA(palette.accent, 1);
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = spSize * 2;
      ctx.beginPath();
      drawSparkle(ctx, sx, sy, spSize);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Lens flare at scene center (intensity 3, pulsing) ────────────
  if (intensity === 3) {
    const pulseMag = 0.5 + 0.5 * Math.sin(sec * 0.7 * Math.PI * 2);
    const flareAlpha = globalAlpha * pulseMag * 0.5;
    const flareSize = Math.min(width, height) * lerp(0.15, 0.4, pulseMag);
    drawLensFlare(ctx, width / 2, height / 2, flareSize, flareAlpha);
  }

  // ── Sparkles icon at center ───────────────────────────────────────
  if (p.text || intensity === 3) {
    ctx.globalCompositeOperation = 'source-over';
    const textAlpha = clamp01(remap(t01, 0.1, 0.3)) * (1 - clamp01(remap(t01, 0.8, 0.95)));
    if (textAlpha > 0.02) {
      if (p.text) {
        const fs = Math.min(width, height) * 0.09;
        ctx.font = `900 ${fs}px 'Space Grotesk', Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = globalAlpha * textAlpha;
        ctx.shadowColor = palette.accent;
        ctx.shadowBlur = fs * 0.6;
        ctx.fillStyle = palette.text;
        ctx.fillText(p.text.toUpperCase(), width / 2, height / 2);
      }

      if (intensity >= 2) {
        const iconSize = Math.min(width, height) * 0.07;
        const iconBob = Math.sin(sec * Math.PI * 2) * iconSize * 0.3;
        drawLucideIcon(ctx, 'sparkles', width / 2, height / 2 - (p.text ? Math.min(width, height) * 0.12 : 0) + iconBob, iconSize, palette.accent, {
          fill: true, stroke: false,
          alpha: globalAlpha * textAlpha * 0.8,
          glowColor: palette.accent,
          glowBlur: iconSize * 0.5,
        });
      }
    }
  }

  ctx.restore();
};
