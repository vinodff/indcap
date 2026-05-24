/**
 * liquid-morph — Organic Liquid Morphing Transition.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 *
 * Renders a full-screen organic liquid blob that:
 *   1. Grows from a focal point using metaball-style Bézier blobs
 *   2. Multiple overlapping color blobs merge and morph with perlin-like noise
 *   3. A central reveal "hole" grows through the blob to expose underlying content
 *   4. Trailing ink-drop tendrils shoot outward during the wipe
 *   5. Color transitions from the palette's primary → secondary → accent
 *   6. Edge highlights give a wet, refractive look
 *
 * Animation uses:
 *   - Superellipse/metaball polygon approximation (no WebGL SDF needed)
 *   - Canvas compositing (destination-out) to cut the reveal hole
 *   - Layered semi-transparent blobs with perlin-offset Bézier control points
 *
 * anchor param controls the focal origin:
 *   'top-left' | 'center' (default) | 'bottom-right' | 'top' | 'bottom'
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeInOutCubic, easeOutCubic, lerp } from '../easing';

// ── Seeded PRNG for stable noise offsets ─────────────────────────────────────
const mulberry32 = (seed: number) => {
  let a = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Smooth blob polygon: N-sided polygon with Bézier curve smoothing ──────────
// Each vertex is perturbed by time-animated noise for organic morphing.
function drawMorphBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseR: number,
  sides: number,
  noiseAmp: number,
  noiseFreq: number,
  timeOffset: number,
  seed: number,
): void {
  const rng = mulberry32(seed);
  const phaseOffsets = Array.from({ length: sides }, () => rng() * Math.PI * 2);
  const freqMults   = Array.from({ length: sides }, () => 0.8 + rng() * 0.6);

  // Compute vertex positions
  const pts: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const base = (i / sides) * Math.PI * 2;
    const noise =
      Math.sin(timeOffset * noiseFreq * freqMults[i] + phaseOffsets[i]) * noiseAmp +
      Math.sin(timeOffset * noiseFreq * 0.5 * freqMults[(i + 2) % sides] + phaseOffsets[(i + 1) % sides]) * noiseAmp * 0.5;
    const r = baseR + noise;
    pts.push([cx + Math.cos(base) * r, cy + Math.sin(base) * r]);
  }

  // Smooth with catmull-rom-like cubic Bézier interpolation
  ctx.beginPath();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    if (i === 0) ctx.moveTo(p1[0], p1[1]);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2[0], p2[1]);
  }
  ctx.closePath();
}

// ── Ink tendril: thin tapered Bézier stroke shooting outward ─────────────────
function drawTendril(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number,
  angle: number,
  length: number,
  width: number,
  color: string,
  progress: number,
): void {
  const wobble = Math.sin(angle * 3.7) * 0.4;
  const endX = ox + Math.cos(angle + wobble) * length * progress;
  const endY = oy + Math.sin(angle + wobble) * length * progress;
  const cpX  = ox + Math.cos(angle + wobble * 1.5) * length * 0.5;
  const cpY  = oy + Math.sin(angle + wobble * 1.5) * length * 0.5;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.quadraticCurveTo(cpX, cpY, endX, endY);
  ctx.strokeStyle = color;
  ctx.lineWidth = width * (1 - progress * 0.7);
  ctx.lineCap = 'round';
  ctx.globalAlpha *= (1 - progress * 0.6);
  ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
export const liquidMorph = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;

  // Determine focal origin from anchor
  let ox = width / 2, oy = height / 2;
  if (p.anchor === 'top')    { ox = width / 2; oy = height * 0.05; }
  if (p.anchor === 'bottom') { ox = width / 2; oy = height * 0.95; }
  if (p.anchor === 'left')   { ox = width * 0.05; oy = height / 2; }
  if (p.anchor === 'right')  { ox = width * 0.95; oy = height / 2; }

  const maxR = Math.hypot(width, height) * 0.72; // radius to cover full screen

  // ── Phase timelines ──────────────────────────────────────────────────────
  // 0.0 → 0.45: blob grows from focal point (cover phase)
  // 0.45 → 0.72: reveal hole grows through the blob (uncover phase)
  // 0.72 → 1.0: blob shrinks/exits off-screen
  const coverT   = easeInOutCubic(clamp01(remap(t01, 0.0,  0.45)));
  const holeT    = easeOutCubic  (clamp01(remap(t01, 0.45, 0.72)));
  const exitT    = easeInOutCubic(clamp01(remap(t01, 0.72, 1.0)));
  const timeFlow = t01 * 6.0; // drives noise animation

  const blobR    = lerp(0, maxR * 1.12, coverT) * (1 - exitT * 0.9);
  const holeR    = holeT * maxR * 1.05;
  const tendrilP = clamp01(remap(t01, 0.08, 0.45));

  if (blobR < 2) return;

  ctx.save();

  // ── Layer 1: deep shadow / substrate glow at focal point ─────────────────
  {
    const glowR = blobR * 0.4;
    const glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, glowR);
    glow.addColorStop(0, hexA(palette.primary, 0.35 * coverT));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  // ── Layer 2: main liquid blob — multiple overlapping blobs for metaball feel
  const blobCount = intensity >= 3 ? 5 : intensity === 2 ? 4 : 3;
  const sides     = intensity >= 3 ? 14 : 10;

  const blobConfigs = [
    { rMult: 1.0,  offX:  0,           offY:  0,           color: palette.primary,   alpha: 0.92, seed: 11 },
    { rMult: 0.82, offX:  blobR * 0.18, offY: -blobR * 0.12, color: palette.secondary, alpha: 0.75, seed: 22 },
    { rMult: 0.70, offX: -blobR * 0.14, offY:  blobR * 0.16, color: palette.accent,    alpha: 0.65, seed: 33 },
    { rMult: 0.55, offX:  blobR * 0.24, offY:  blobR * 0.20, color: palette.primary,   alpha: 0.50, seed: 44 },
    { rMult: 0.42, offX: -blobR * 0.28, offY: -blobR * 0.22, color: palette.accent,    alpha: 0.40, seed: 55 },
  ].slice(0, blobCount);

  for (const cfg of blobConfigs) {
    drawMorphBlob(
      ctx,
      ox + cfg.offX * coverT,
      oy + cfg.offY * coverT,
      blobR * cfg.rMult,
      sides,
      blobR * 0.12,  // noise amplitude
      1.2,           // noise frequency multiplier
      timeFlow + cfg.seed,
      cfg.seed,
    );

    // Gradient fill radiating from focal point
    const bFill = ctx.createRadialGradient(
      ox, oy, 0,
      ox + cfg.offX * coverT, oy + cfg.offY * coverT,
      blobR * cfg.rMult * 1.1,
    );
    const c0 = mixHex(cfg.color, '#ffffff', 0.15);
    bFill.addColorStop(0, hexA(c0, cfg.alpha));
    bFill.addColorStop(0.6, hexA(cfg.color, cfg.alpha * 0.85));
    bFill.addColorStop(1, hexA(mixHex(cfg.color, '#000000', 0.3), cfg.alpha * 0.7));

    ctx.save();
    ctx.globalAlpha = (1 - exitT * 0.95);
    ctx.fillStyle = bFill;
    ctx.fill();
    ctx.restore();
  }

  // ── Layer 3: wet edge highlight / refraction rim ──────────────────────────
  {
    drawMorphBlob(ctx, ox, oy, blobR * 1.01, sides, blobR * 0.12, 1.2, timeFlow, 11);
    const rimGrad = ctx.createRadialGradient(ox, oy, blobR * 0.88, ox, oy, blobR * 1.05);
    rimGrad.addColorStop(0, 'rgba(255,255,255,0)');
    rimGrad.addColorStop(0.6, hexA('#ffffff', 0.12 * (1 - exitT)));
    rimGrad.addColorStop(1, hexA('#ffffff', 0.25 * (1 - exitT)));
    ctx.save();
    ctx.globalAlpha = (1 - exitT);
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.restore();
  }

  // ── Layer 4: ink tendrils radiating outward ───────────────────────────────
  if (intensity >= 2 && tendrilP > 0) {
    const tendrilCount = intensity === 3 ? 12 : 8;
    const rng = mulberry32(99);
    for (let i = 0; i < tendrilCount; i++) {
      const angle = (i / tendrilCount) * Math.PI * 2 + rng() * 0.5;
      const tLen  = blobR * (0.5 + rng() * 0.6);
      const tW    = blobR * (0.015 + rng() * 0.02) * intensity;
      const colors = [palette.primary, palette.secondary, palette.accent];
      drawTendril(
        ctx,
        ox + Math.cos(angle) * blobR * 0.4,
        oy + Math.sin(angle) * blobR * 0.4,
        angle,
        tLen,
        tW,
        hexA(colors[i % 3], 0.55),
        tendrilP,
      );
    }
  }

  // ── Layer 5: reveal hole (destination-out cut through the blob) ───────────
  if (holeR > 2) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    // Primary hole
    drawMorphBlob(ctx, ox, oy, holeR, sides, holeR * 0.08, 1.8, timeFlow * 1.3, 77);
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fill();

    // Slightly smaller softer hole to create a ragged wet edge
    drawMorphBlob(ctx, ox, oy, holeR * 0.88, sides - 2, holeR * 0.06, 2.0, timeFlow * 1.5, 88);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fill();

    ctx.restore();

    // Wet glow inside the hole rim (drawn back in normal mode)
    const rimInner = ctx.createRadialGradient(ox, oy, holeR * 0.75, ox, oy, holeR * 1.02);
    rimInner.addColorStop(0, 'rgba(255,255,255,0)');
    rimInner.addColorStop(0.7, hexA(palette.accent, 0.25 * holeT));
    rimInner.addColorStop(1, hexA('#ffffff', 0.15 * holeT));
    ctx.save();
    ctx.fillStyle = rimInner;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // ── Layer 6: center bloom / lensing at focal origin ──────────────────────
  {
    const bR2 = Math.min(blobR, maxR) * 0.18;
    const bloom = ctx.createRadialGradient(ox, oy, 0, ox, oy, bR2);
    bloom.addColorStop(0, hexA('#ffffff', 0.25 * coverT * (1 - holeT)));
    bloom.addColorStop(0.5, hexA(palette.accent, 0.15 * coverT * (1 - holeT)));
    bloom.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  ctx.restore();
};
