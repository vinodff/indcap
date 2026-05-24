/**
 * glitch-text — text with RGB chromatic aberration, scan lines, and
 * occasional horizontal tear glitches. CRT / cyber feel.
 *
 * Renders the same text 3 times in red / green / blue with a horizontal
 * jitter offset that decays. Adds horizontal scan lines and sporadic
 * "torn band" rectangles that displace a horizontal slice.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, lerp, remap } from '../easing';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;

export const glitchText = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  const text = (p.text || 'GLITCH').toUpperCase();

  // Envelope: snap in over 0.05, hold to 0.85, fade out.
  const inT = easeOutCubic(clamp01(remap(t01, 0, 0.05)));
  const fadeOut = 1 - clamp01(remap(t01, 0.85, 1));
  const visible = inT * fadeOut;
  if (visible < 0.001) return;

  const fontSize = Math.min(width, height) * (intensity === 3 ? 0.16 : intensity === 1 ? 0.1 : 0.13);
  const cx = width / 2;
  const cy = height / 2;

  // Jitter shrinks from a chaotic max to near-zero over the beat.
  const jitterDecay = 1 - clamp01(remap(t01, 0, 0.7));
  const jitterAmp = fontSize * 0.08 * jitterDecay;
  const seed = Math.floor(t01 * 60);
  const jx = (pseudo(seed) - 0.5) * 2 * jitterAmp;
  const jy = (pseudo(seed + 11) - 0.5) * jitterAmp * 0.4;

  ctx.save();
  ctx.globalAlpha = visible;
  ctx.font = `900 ${fontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Three-channel split with additive composition gives chromatic look.
  ctx.globalCompositeOperation = 'lighter';
  const split = fontSize * (intensity === 3 ? 0.07 : intensity === 1 ? 0.025 : 0.045) * (0.6 + jitterDecay * 0.4);
  ctx.fillStyle = '#ff0033';
  ctx.fillText(text, cx + jx - split, cy + jy);
  ctx.fillStyle = '#00ff88';
  ctx.fillText(text, cx + jx + split * 0.6, cy + jy);
  ctx.fillStyle = '#0099ff';
  ctx.fillText(text, cx + jx, cy + jy + split * 0.7);
  // White core on top to keep it readable
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = palette.text;
  ctx.fillText(text, cx + jx, cy + jy);

  // Horizontal scan lines
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(0,0,0,${0.18 * visible})`;
  const lineSpacing = Math.max(3, Math.floor(height / 200));
  for (let y = 0; y < height; y += lineSpacing * 2) {
    ctx.fillRect(0, y, width, lineSpacing);
  }

  // Occasional "tear band" — pick 1-3 random horizontal bands and offset
  const bandCount = intensity === 3 ? 3 : intensity === 1 ? 1 : 2;
  for (let b = 0; b < bandCount; b++) {
    const phase = (t01 * 6 + b * 0.37) % 1;
    if (phase < 0.7) continue; // bands only flash briefly
    const bandY = (pseudo(seed + b * 31) * height) | 0;
    const bandH = 8 + Math.floor(pseudo(seed + b * 7) * 18);
    const bandOffset = (pseudo(seed + b * 13) - 0.5) * width * 0.12;
    // Pull a slice and redraw it offset (visually similar to drawImage
    // but cheaper since we just draw a tinted rect).
    ctx.fillStyle = hexA(palette.accent, 0.4 * visible);
    ctx.fillRect(bandOffset, bandY, width, bandH);
  }

  ctx.restore();
};

function pseudo(n: number): number {
  // Cheap deterministic noise; output in [0,1).
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(255,255,255,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
