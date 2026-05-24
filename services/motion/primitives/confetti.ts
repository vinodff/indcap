/**
 * confetti — physics-based colored confetti burst celebration.
 *
 * Rectangular and circular confetti pieces launch with gravity. Mix includes
 * 20% drawStar shapes, 20% drawDiamond, and 10% drawHexagon for visual variety.
 * SparkDust bokeh blooms at the launch origin. Metallic shimmer on shapes.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, lerp, remap } from '../easing';
import { hexA, drawStar, drawDiamond, drawHexagon } from '../decorations';
import { drawSparkDust } from '../textures';

interface Piece {
  x0: number;
  vx: number;
  vy0: number;
  gravity: number;
  delay: number;
  color: string;
  size: number;
  aspect: number;
  rotSpeed: number;
  rotOffset: number;
  kind: 'rect' | 'circle' | 'star' | 'diamond' | 'hex';
}

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

const FEST_COLORS = ['#FF4E50', '#FC913A', '#F9D423', '#EDE574', '#E1F5C4', '#00CDAC',
  '#02AAB0', '#5F6FFF', '#CF89FF', '#FF89CF'];

function kindFromRand(r: number): Piece['kind'] {
  if (r < 0.20) return 'star';
  if (r < 0.40) return 'diamond';
  if (r < 0.50) return 'hex';
  if (r < 0.625) return 'circle';
  return 'rect';
}

export const confetti = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, durationSec, palette } = pc;
  const intensity = p.intensity || 2;

  const count = intensity === 3 ? 80 : intensity === 1 ? 30 : 50;
  const rand = rng(count * 13 + Math.round(durationSec * 100));

  const palColors = [palette.primary, palette.secondary, palette.accent, ...FEST_COLORS];

  const pieces: Piece[] = [];
  for (let i = 0; i < count; i++) {
    const spread = width * (0.15 + rand() * 0.7);
    pieces.push({
      x0: spread,
      vx: (rand() - 0.5) * width * 0.9,
      vy0: -(height * lerp(0.6, 1.4, rand())),
      gravity: height * lerp(0.8, 1.5, rand()),
      delay: rand() * 0.25,
      color: palColors[Math.floor(rand() * palColors.length)],
      size: lerp(5, 14, rand()) * (width / 1080),
      aspect: lerp(1.5, 3.5, rand()),
      rotSpeed: (rand() - 0.5) * Math.PI * 10,
      rotOffset: rand() * Math.PI * 2,
      kind: kindFromRand(rand()),
    });
  }

  const globalAlpha = clamp01(remap(t01, 0, 0.05)) * (1 - clamp01(remap(t01, 0.82, 1)));
  if (globalAlpha < 0.01) return;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── SparkDust bloom at launch origin ─────────────────────────────
  if (t01 < 0.3) {
    const launchAlpha = (1 - t01 / 0.3) * globalAlpha * 0.8;
    drawSparkDust(ctx, width / 2, height, Math.min(width, height) * 0.8, launchAlpha * 0.5);
    drawSparkDust(ctx, width * 0.25, height, Math.min(width, height) * 0.5, launchAlpha * 0.35);
    drawSparkDust(ctx, width * 0.75, height, Math.min(width, height) * 0.5, launchAlpha * 0.35);
  }

  // burst label
  if (p.text) {
    const textT = clamp01(remap(t01, 0.05, 0.25)) * (1 - clamp01(remap(t01, 0.75, 0.9)));
    if (textT > 0.01) {
      const scale = easeOutCubic(textT);
      const fs = Math.min(width, height) * 0.1 * (intensity === 3 ? 1.15 : 1);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(scale, scale);
      ctx.font = `900 ${fs}px 'Space Grotesk', Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = globalAlpha * textT;
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = fs * 0.6;
      ctx.fillStyle = palette.text;
      ctx.fillText((p.text || '').toUpperCase(), 0, 0);
      ctx.restore();
    }
  }

  for (const piece of pieces) {
    const t = clamp01(remap(t01, piece.delay, 1.0));
    if (t <= 0) continue;
    const sec = t * durationSec * (1 - piece.delay);

    const px = piece.x0 + piece.vx * sec;
    const py = height + piece.vy0 * sec + 0.5 * piece.gravity * sec * sec;

    if (py > height + piece.size * 4) continue;

    const rot = piece.rotOffset + piece.rotSpeed * sec;
    const fade = 1 - clamp01((py - height * 0.9) / (height * 0.15));

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.globalAlpha = globalAlpha * fade;
    ctx.fillStyle = piece.color;
    ctx.shadowColor = piece.color;
    ctx.shadowBlur = piece.size * 0.5;

    if (piece.kind === 'circle') {
      ctx.beginPath();
      ctx.ellipse(0, 0, piece.size, piece.size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (piece.kind === 'star') {
      ctx.beginPath();
      drawStar(ctx, 0, 0, piece.size * 1.1, piece.size * 0.45, 4, rot);
      ctx.fill();
      // metallic shimmer
      ctx.globalAlpha = globalAlpha * fade * 0.4;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      drawStar(ctx, 0, 0, piece.size * 0.6, piece.size * 0.2, 4, rot);
      ctx.fill();
    } else if (piece.kind === 'diamond') {
      ctx.beginPath();
      drawDiamond(ctx, 0, 0, piece.size * 1.6, piece.size * 2.2);
      ctx.fill();
    } else if (piece.kind === 'hex') {
      ctx.beginPath();
      drawHexagon(ctx, 0, 0, piece.size * 0.9, rot);
      ctx.fill();
    } else {
      // rect with squish
      const squish = Math.abs(Math.cos(rot));
      ctx.fillRect(-piece.size, -piece.size * piece.aspect * squish / 2, piece.size * 2, piece.size * piece.aspect * squish);
    }
    ctx.restore();
  }

  ctx.restore();
};
