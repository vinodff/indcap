/**
 * mesh-gradient-bg — Animated mesh gradient background with drifting color blobs.
 *
 * Phase 12 — Advanced Background Primitives.
 *
 * Renders a fluid mesh gradient by:
 *   1. Placing N color "blobs" (control points) on a virtual grid
 *   2. Each blob drifts along a Lissajous trajectory at its own speed
 *   3. Blobs are connected via interpolated color fields (Sibson/inverse-distance)
 *   4. 'lighter' composite blend creates smooth color intersections
 *   5. Each blob gently pulses in size independently
 *   6. Colors are palette-derived with soft pastel mixing
 *   7. Optional overlay grid lines for tech aesthetic at high intensity
 *
 * Perfect as a layer-0 background beneath text or UI primitives.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeInOutCubic, lerp } from '../easing';

interface MeshBlob {
  cx: number;
  cy: number;
  r: number;
  freqX: number;
  freqY: number;
  ampX: number;
  ampY: number;
  phaseX: number;
  phaseY: number;
  pulseFreq: number;
  pulseAmp: number;
  color: string;
  alpha: number;
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const meshGradientBg = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.15)));
  const fadeOut = 1 - easeInOutCubic(clamp01(remap(t01, 0.85, 1.0)));
  const globalAlpha = fadeIn * fadeOut;
  if (globalAlpha < 0.005) return;

  const blobCount = intensity === 3 ? 9 : intensity === 1 ? 4 : 6;

  const colors = [
    mixHex(palette.primary, '#ffffff', 0.35),
    mixHex(palette.accent, '#ffffff', 0.25),
    mixHex(palette.secondary, '#ffffff', 0.4),
    mixHex(palette.primary, '#ffffff', 0.15),
    mixHex(palette.accent, '#ffffff', 0.45),
    mixHex(palette.secondary, '#ffffff', 0.25),
    mixHex(palette.primary, palette.accent, 0.5),
    mixHex(palette.secondary, palette.accent, 0.35),
    mixHex(palette.accent, '#ffffff', 0.3),
  ];

  const rand = seededRand(blobCount * 31 + 7);
  const blobs: MeshBlob[] = [];

  for (let i = 0; i < blobCount; i++) {
    blobs.push({
      cx: 0.1 + rand() * 0.8,
      cy: 0.1 + rand() * 0.8,
      r: 0.12 + rand() * 0.2 * (intensity * 0.5),
      freqX: 0.2 + rand() * 0.6,
      freqY: 0.2 + rand() * 0.6,
      ampX: 0.03 + rand() * 0.1,
      ampY: 0.03 + rand() * 0.1,
      phaseX: rand() * Math.PI * 2,
      phaseY: rand() * Math.PI * 2,
      pulseFreq: 0.3 + rand() * 0.9,
      pulseAmp: 0.05 + rand() * 0.12,
      color: colors[i % colors.length],
      alpha: 0.4 + rand() * 0.4,
    });
  }

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // Base dark fill
  const baseGrad = ctx.createRadialGradient(
    width / 2, height * 0.4, 0,
    width / 2, height * 0.4, Math.max(width, height) * 0.75,
  );
  baseGrad.addColorStop(0, hexA(mixHex(palette.bg || '#0a0a14', palette.primary, 0.08), 0.85));
  baseGrad.addColorStop(1, hexA(palette.bg || '#0a0a14', 1));
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'lighter';

  const t = t01 * Math.PI * 2;

  for (const blob of blobs) {
    const dx = Math.sin(t * blob.freqX + blob.phaseX) * blob.ampX;
    const dy = Math.cos(t * blob.freqY + blob.phaseY) * blob.ampY;

    const ox = (blob.cx + dx) * width;
    const oy = (blob.cy + dy) * height;

    const pulse = 1 + Math.sin(t * blob.pulseFreq) * blob.pulseAmp;
    const r = blob.r * Math.min(width, height) * pulse;

    const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
    grad.addColorStop(0, hexA(blob.color, blob.alpha));
    grad.addColorStop(0.35, hexA(blob.color, blob.alpha * 0.55));
    grad.addColorStop(0.65, hexA(blob.color, blob.alpha * 0.15));
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle mesh wireframe overlay at higher intensities
  if (intensity >= 2) {
    ctx.globalCompositeOperation = 'screen';
    ctx.lineWidth = 0.5;

    const gridRows = 4;
    const gridCols = 6;

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const gx = (c + 1) / (gridCols + 1) * width;
        const gy = (r + 1) / (gridRows + 1) * height;

        let totalDist = 0;
        let weightedColor = { r: 0, g: 0, b: 0 };

        for (const blob of blobs) {
          const bdx = Math.sin(t * blob.freqX + blob.phaseX) * blob.ampX;
          const bdy = Math.cos(t * blob.freqY + blob.phaseY) * blob.ampY;
          const bx = (blob.cx + bdx) * width;
          const by = (blob.cy + bdy) * height;
          const dist = Math.hypot(gx - bx, gy - by);
          if (dist < 1) continue;
          const w = 1 / (dist * dist);
          totalDist += w;
          const cHex = blob.color.replace('#', '');
          if (cHex.length === 6) {
            weightedColor.r += w * parseInt(cHex.slice(0, 2), 16);
            weightedColor.g += w * parseInt(cHex.slice(2, 4), 16);
            weightedColor.b += w * parseInt(cHex.slice(4, 6), 16);
          }
        }

        if (totalDist > 0) {
          weightedColor.r /= totalDist;
          weightedColor.g /= totalDist;
          weightedColor.b /= totalDist;

          const meshAlpha = 0.04 + 0.03 * Math.sin(t * 0.5 + r * 1.3 + c * 0.7);
          ctx.fillStyle = `rgba(${weightedColor.r | 0},${weightedColor.g | 0},${weightedColor.b | 0},${meshAlpha})`;
          ctx.beginPath();
          ctx.arc(gx, gy, Math.min(width, height) * 0.012, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  ctx.restore();
};
