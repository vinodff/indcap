/**
 * morphing-shapes — Abstract Geometric Shape Morphing with Gradient.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 * Inspired by gradient morphing shape animations in modern motion design.
 *
 * Renders a sequence of geometric primitives that smoothly morph:
 *   1. Ambient gradient background pulses with the active shape color
 *   2. Shape scales in with elastic spring, then begins morphing
 *   3. Smooth vertex interpolation between Circle → Triangle → Square
 *      → Pentagon → Hexagon → Diamond with 12-point vertex mapping
 *   4. Gradient fill shifts colors per shape across the palette
 *   5. Glow bloom intensity pulses on each morph transition
 *   6. Particle sparkles burst at morph completion points
 *   7. Subtle rotation during idle, gentle float bob
 *
 * params.text optional label shown below the morphing shape
 * params.icon unused (shapes auto-cycle)
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

// ── Shape definitions (12 points each, normalized -1..1) ────────────────────

function circlePoints(n: number): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    pts.push([Math.cos(a), Math.sin(a)]);
  }
  return pts;
}

function regularPolygon(sides: number, n: number): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i < n; i++) {
    const frac = i / n;
    const vertIdx = Math.floor(frac * sides);
    const localFrac = (frac * sides) - vertIdx;
    const a1 = (vertIdx / sides) * Math.PI * 2 - Math.PI / 2;
    const a2 = ((vertIdx + 1) / sides) * Math.PI * 2 - Math.PI / 2;
    const x = lerp(Math.cos(a1), Math.cos(a2), localFrac);
    const y = lerp(Math.sin(a1), Math.sin(a2), localFrac);
    pts.push([x, y]);
  }
  return pts;
}

function starPoints(points: number, n: number, innerRatio = 0.4): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i < n; i++) {
    const frac = i / n;
    const spikeIdx = Math.floor(frac * points * 2);
    const localFrac = (frac * points * 2) - spikeIdx;
    const isOuter = spikeIdx % 2 === 0;
    const r = isOuter ? 1 : innerRatio;
    const rNext = isOuter ? innerRatio : 1;
    const angleIdx = Math.floor(spikeIdx / 2);
    const a1 = (angleIdx / points) * Math.PI * 2 - Math.PI / 2;
    const a2 = ((angleIdx + (isOuter ? 0.5 : 0.5)) / points) * Math.PI * 2 - Math.PI / 2;
    const dist = lerp(r, rNext, localFrac);
    const angle = lerp(a1, a2, localFrac);
    pts.push([Math.cos(angle) * dist, Math.sin(angle) * dist]);
  }
  return pts;
}

function diamondPoints(n: number): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i < n; i++) {
    const frac = i / n;
    const seg = frac < 0.25 ? 0 : frac < 0.5 ? 1 : frac < 0.75 ? 2 : 3;
    const local = ((frac * 4) - seg);
    const corners = [[0, -1], [0.7, 0], [0, 1], [-0.7, 0]];
    const c1 = corners[seg];
    const c2 = corners[(seg + 1) % 4];
    pts.push([lerp(c1[0], c2[0], local), lerp(c1[1], c2[1], local)]);
  }
  return pts;
}

const N = 12;
const SHAPES: number[][][] = [
  circlePoints(N),
  regularPolygon(3, N),    // triangle
  regularPolygon(4, N),    // square
  regularPolygon(5, N),    // pentagon
  regularPolygon(6, N),    // hexagon
  diamondPoints(N),        // diamond
  starPoints(5, N, 0.38),  // 5-point star
];

const SHAPE_NAMES = ['Circle', 'Triangle', 'Square', 'Pentagon', 'Hexagon', 'Diamond', 'Star'];

// ── Morph between two shape point arrays ─────────────────────────────────────
function morphPoints(a: number[][], b: number[][], t: number): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < a.length; i++) {
    result.push([
      lerp(a[i][0], b[i][0], t),
      lerp(a[i][1], b[i][1], t),
    ]);
  }
  return result;
}

// ── Draw a filled morph shape with gradient ──────────────────────────────────
function drawShape(
  ctx: CanvasRenderingContext2D,
  pts: number[][],
  cx: number, cy: number,
  size: number,
  rotation: number,
  gradColors: string[],
  glowColor: string,
  glowAlpha: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  // Glow
  if (glowAlpha > 0.01) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 30 * glowAlpha;
  }

  ctx.beginPath();
  ctx.moveTo(pts[0][0] * size, pts[0][1] * size);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i][0] * size, pts[i][1] * size);
  }
  ctx.closePath();

  const grad = ctx.createLinearGradient(-size, -size, size, size);
  gradColors.forEach((c, i) => grad.addColorStop(i / (gradColors.length - 1 || 1), c));
  ctx.fillStyle = grad;
  ctx.fill();

  // Subtle inner stroke
  ctx.shadowBlur = 0;
  ctx.strokeStyle = hexA('#ffffff', 0.12);
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// ── Seeded random for particle positions ─────────────────────────────────────
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Main primitive ───────────────────────────────────────────────────────────
export const morphingShapes = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const label = p.text || '';
  const intensity = p.intensity ?? 2;

  // ── Global fades ──────────────────────────────────────────────────────────
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // ── Shape sequence timing ─────────────────────────────────────────────────
  // Total morph cycle: 0.08 → 0.82
  const morphStart = 0.08;
  const morphEnd = 0.82;
  const morphRange = morphEnd - morphStart;
  const segmentLen = morphRange / (SHAPES.length - 1);

  const rawProgress = clamp01(remap(t01, morphStart, morphEnd));
  const currentSeg = rawProgress / segmentLen;
  const fromIdx = Math.min(Math.floor(currentSeg), SHAPES.length - 2);
  const toIdx = fromIdx + 1;
  const segT = clamp01((currentSeg - fromIdx) / 1);

  // Ease the morph transition
  const morphT = easeInOutCubic(segT);

  // Current interpolated shape
  const fromShape = SHAPES[fromIdx];
  const toShape = SHAPES[toIdx];
  const currentPoints = morphPoints(fromShape, toShape, morphT);

  // ── Rotation ──────────────────────────────────────────────────────────────
  const totalRotation = t01 * Math.PI * 0.3;
  const baseRotation = totalRotation;

  // ── Size with entry animation ────────────────────────────────────────────
  const entryT = easeOutBack(clamp01(remap(t01, 0.02, 0.16)), 1.3);
  const shapeSize = Math.min(width, height) * 0.20 * entryT * (1 - fadeOut * 0.1);

  // ── Float bob ─────────────────────────────────────────────────────────────
  const floatY = Math.sin(t01 * Math.PI * 2.5) * shapeSize * 0.04;

  // ── Center position ──────────────────────────────────────────────────────
  let cx = width / 2;
  let cy = height * 0.42;
  if (p.anchor === 'top') cy = height * 0.25;
  else if (p.anchor === 'bottom') cy = height * 0.60;
  cy += floatY;

  // ── Gradient colors for current shape pair ────────────────────────────────
  const colorPairs: [string, string, string][] = [
    [palette.primary, palette.accent, mixHex(palette.accent, '#ffffff', 0.3)],
    [palette.accent, palette.secondary, mixHex(palette.primary, '#ffffff', 0.2)],
    [palette.secondary, palette.primary, mixHex(palette.accent, '#ffffff', 0.3)],
    [mixHex(palette.primary, palette.accent, 0.5), palette.accent, palette.secondary],
    [palette.accent, mixHex(palette.secondary, '#ffffff', 0.2), palette.primary],
    [palette.primary, palette.secondary, mixHex(palette.accent, '#ffffff', 0.3)],
    [palette.accent, palette.primary, mixHex(palette.secondary, '#ffffff', 0.2)],
  ];

  const fromColors = colorPairs[fromIdx % colorPairs.length];
  const toColors = colorPairs[toIdx % colorPairs.length];
  const currentColors: string[] = [
    lerpColor(fromColors[0], toColors[0], morphT),
    lerpColor(fromColors[1], toColors[1], morphT),
    lerpColor(fromColors[2], toColors[2], morphT),
  ];

  // ── Glow bloom ────────────────────────────────────────────────────────────
  // Pulse glow on each morph transition completion
  const morphPulse = Math.sin(segT * Math.PI);
  const glowAlpha = 0.3 + 0.7 * morphPulse * intensity * 0.3;
  const glowColor = currentColors[0];

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── Background ambient gradient ───────────────────────────────────────────
  const bgR = Math.max(width, height) * 0.7;
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bgR);
  bgGrad.addColorStop(0, hexA(currentColors[0], 0.08 * intensity));
  bgGrad.addColorStop(0.4, hexA(currentColors[1], 0.04 * intensity));
  bgGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // ── Orbit rings (decorative) ────────────────────────────────────────────
  const ringCount = 2;
  for (let ri = 0; ri < ringCount; ri++) {
    const ringR = shapeSize * (1.6 + ri * 0.5);
    const ringAlpha = 0.08 + (0.5 + 0.5 * Math.sin(t01 * Math.PI * 1.5 + ri)) * 0.06;
    ctx.save();
    ctx.globalAlpha = ringAlpha;
    ctx.strokeStyle = hexA(currentColors[ri % currentColors.length], 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Particle sparkles at morph transition midpoints ──────────────────────
  const particleIntensity = Math.sin(segT * Math.PI * 2);
  if (particleIntensity > 0.3) {
    const rng = seededRandom(Math.floor(t01 * 100));
    const count = Math.floor(3 + intensity * 2 * particleIntensity);
    ctx.save();
    for (let pi = 0; pi < count; pi++) {
      const angle = rng() * Math.PI * 2;
      const dist = shapeSize * (0.6 + rng() * 1.2);
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const size = 1 + rng() * 2.5;
      const alpha = rng() * 0.6 * particleIntensity;
      ctx.fillStyle = hexA(currentColors[pi % currentColors.length], alpha);
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Draw the morphing shape ─────────────────────────────────────────────
  if (entryT > 0.01) {
    drawShape(ctx, currentPoints, cx, cy, shapeSize, baseRotation, currentColors, glowColor, glowAlpha * globalAlpha);
  }

  // ── Shape name label ─────────────────────────────────────────────────────
  const nameT = easeOutCubic(clamp01(remap(t01, morphStart + fromIdx * segmentLen + 0.04, morphStart + fromIdx * segmentLen + 0.12)));
  const currentName = SHAPE_NAMES[fromIdx];

  if (nameT > 0.01 && entryT > 0.5) {
    ctx.save();
    ctx.globalAlpha = globalAlpha * nameT;
    ctx.translate(0, lerp(10, 0, nameT));

    const nameSize = Math.min(width, height) * 0.028;
    ctx.font = `600 ${nameSize}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Label background chip
    const nameW = ctx.measureText(currentName).width + nameSize * 2;
    const nameH = nameSize * 1.6;
    const nameX = cx - nameW / 2;
    const nameY = cy + shapeSize * 0.6 + 16;

    ctx.beginPath();
    ctx.roundRect(nameX, nameY, nameW, nameH, nameH / 2);
    ctx.fillStyle = hexA(currentColors[1], 0.15);
    ctx.fill();
    ctx.strokeStyle = hexA(currentColors[0], 0.3);
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.fillStyle = hexA('#ffffff', 0.8);
    ctx.fillText(currentName, cx, nameY + nameH * 0.15);

    ctx.restore();
  }

  // ── User label text below ────────────────────────────────────────────────
  if (label) {
    const userLabelT = easeOutCubic(clamp01(remap(t01, 0.60, 0.75)));
    if (userLabelT > 0.01) {
      ctx.save();
      ctx.globalAlpha = globalAlpha * userLabelT;
      ctx.translate(0, lerp(8, 0, userLabelT));

      const ulSize = Math.min(width, height) * 0.022;
      ctx.font = `500 ${ulSize}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = hexA('#ffffff', 0.5);
      ctx.fillText(label, cx, cy + shapeSize * 0.6 + (SHAPE_NAMES[fromIdx] ? 48 : 16));

      ctx.restore();
    }
  }

  ctx.restore(); // global
};

// ── Utility: interpolate two hex colors ──────────────────────────────────────
function lerpColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const rr = Math.round(lerp(ar, br, t));
  const rg = Math.round(lerp(ag, bg, t));
  const rb = Math.round(lerp(ab, bb, t));
  return `#${rr.toString(16).padStart(2, '0')}${rg.toString(16).padStart(2, '0')}${rb.toString(16).padStart(2, '0')}`;
}
