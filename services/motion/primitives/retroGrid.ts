/**
 * retro-grid — Phase 9 upgrade: true 3D perspective grid via math3d engine.
 *
 * Replaces the old 2D-faked grid with a real software-rendered perspective
 * floor grid projected through the custom 3D camera (lookAt + perspective).
 *
 * Visual composition:
 *   - Animated 3D grid floor at y = -1.5 with camera that orbits + dollies
 *   - Synthwave horizon sun (half-disk with scan-line cuts) glowing at vanishing pt
 *   - Horizontal scan-line sweep across the frame for Tron / vaporwave feel
 *   - Starfield (100 depth-sorted points) visible above horizon
 *   - Atmospheric glow at horizon line
 *
 * Acts as a background primitive — layer 0.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import {
  v3, perspectiveMatrix, lookAtMatrix, projectPoint,
  type Vec3, type ScreenPoint,
} from '../math3d';
import { clamp01, easeInOutCubic, lerp, remap } from '../easing';

// Local hexA — avoids import from decorations to keep this file self-contained.
const hexA = (hex: string, a: number): string => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(255,255,255,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

// Seeded PRNG for stable star positions across frames.
const mulberry32 = (seed: number) => {
  let a = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const retroGrid = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;

  const fadeIn  = clamp01(remap(t01, 0, 0.10));
  const fadeOut = clamp01(remap(t01, 0.90, 1.0));
  const visible = fadeIn * (1 - fadeOut);
  if (visible < 0.01) return;

  // ── 1. Build animated camera ────────────────────────────────────────────────
  // Camera slowly orbits in XZ and dollies in.
  const orbitAngle = t01 * Math.PI * 0.25;          // slow orbit
  const dollZ = lerp(12, 6, easeInOutCubic(t01));    // dolly in
  const eyeY  = lerp(3.2, 2.0, easeInOutCubic(t01)); // crane down

  const eye: Vec3 = {
    x: Math.sin(orbitAngle) * dollZ,
    y: eyeY,
    z: Math.cos(orbitAngle) * dollZ,
  };
  const target: Vec3 = { x: 0, y: -0.5, z: 0 };
  const up: Vec3     = { x: 0, y: 1,    z: 0 };

  const aspect  = width / height;
  const fovRad  = (58 * Math.PI) / 180;
  const viewMat = lookAtMatrix(eye, target, up);
  const projMat = perspectiveMatrix(fovRad, aspect, 0.1, 150);

  const proj = (wx: number, wy: number, wz: number): ScreenPoint | null =>
    projectPoint(v3(wx, wy, wz), viewMat, projMat, width, height);

  ctx.save();
  ctx.globalAlpha = visible;

  // ── 2. Sky gradient (above horizon) ────────────────────────────────────────
  const horizonPt = proj(0, -1.5, -60);
  const horizonY  = horizonPt ? clamp01(horizonPt.y / height) * height : height * 0.42;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0,   hexA(palette.bg, 0.92));
  skyGrad.addColorStop(0.7, hexA(palette.bg, 0.6));
  skyGrad.addColorStop(1,   hexA(palette.primary, 0.25));
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, horizonY);

  // ── 3. Starfield above horizon ─────────────────────────────────────────────
  {
    const rng = mulberry32(91);
    const starCount = intensity === 3 ? 200 : intensity === 1 ? 80 : 130;
    for (let i = 0; i < starCount; i++) {
      const sx = (rng() - 0.5) * 100;
      const sy = (rng() * 0.5 + 0.2) * 25;
      const sz = -(rng() * 90 + 10);
      const sp = proj(sx, sy, sz);
      if (!sp || sp.y > horizonY) continue;
      const brightness = 0.5 + rng() * 0.5;
      const twinkle    = 0.7 + 0.3 * Math.sin(t01 * Math.PI * (3 + rng() * 5) + i * 1.7);
      const size       = Math.max(0.5, sp.scale * 90 * (0.3 + rng() * 0.7));
      ctx.fillStyle = hexA(palette.text, brightness * twinkle * 0.85);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, Math.min(size, 2.2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── 4. Synthwave sun at vanishing point ────────────────────────────────────
  {
    const sunX  = width / 2;
    const sunY  = horizonY;
    const sunR  = Math.min(width, height) * (intensity === 3 ? 0.20 : 0.15);

    // Outer glow
    const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2.4);
    glow.addColorStop(0,   hexA(palette.accent, 0.75));
    glow.addColorStop(0.35, hexA(palette.primary, 0.45));
    glow.addColorStop(1,   hexA(palette.primary, 0));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sun disc (half circle above horizon, half below)
    const sunGrad = ctx.createLinearGradient(sunX, sunY - sunR, sunX, sunY + sunR * 0.5);
    sunGrad.addColorStop(0,   hexA(palette.accent, 0.95));
    sunGrad.addColorStop(0.4, hexA(palette.primary, 0.85));
    sunGrad.addColorStop(1,   hexA(palette.secondary, 0.6));
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, Math.PI, 0); // upper half
    ctx.closePath();
    ctx.fill();

    // Scan-line cuts across sun (horizontal bands masked out)
    if (intensity >= 2) {
      const lineCount = intensity === 3 ? 10 : 7;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < lineCount; i++) {
        const lineFrac = (i + 1) / (lineCount + 1);
        const lineY = sunY - sunR * lineFrac;
        const halfX = Math.sqrt(Math.max(0, sunR * sunR - (lineY - sunY) ** 2));
        const lineH = sunR * 0.06;
        ctx.fillStyle = `rgba(0,0,0,${0.5 + lineFrac * 0.3})`;
        ctx.fillRect(sunX - halfX, lineY - lineH / 2, halfX * 2, lineH);
      }
      ctx.restore();
    }

    // Bright horizon line
    ctx.fillStyle = hexA('#ffffff', 0.75);
    ctx.fillRect(0, sunY - 1.5, width, 1.5);
  }

  // ── 5. Floor gradient ─────────────────────────────────────────────────────
  {
    const floorGrad = ctx.createLinearGradient(0, horizonY, 0, height);
    floorGrad.addColorStop(0,   hexA(palette.bg, 0.65));
    floorGrad.addColorStop(1,   hexA(palette.bg, 0.90));
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizonY, width, height - horizonY);
  }

  // ── 6. 3D perspective grid on floor (y = -1.5) ───────────────────────────
  {
    const groundY    = -1.5;
    const gridSize   = intensity === 3 ? 28 : 20;
    const gridSpacing = 2.0;

    ctx.save();
    ctx.lineCap = 'round';

    // Z-parallel lines (run left-right across the floor, depth = axis)
    for (let xi = -gridSize; xi <= gridSize; xi++) {
      const wx = xi * gridSpacing;
      const isCenter = xi === 0;
      const segments: [ScreenPoint, ScreenPoint][] = [];

      for (let zi = -gridSize; zi < gridSize; zi++) {
        const a = proj(wx, groundY,  zi      * gridSpacing);
        const b = proj(wx, groundY, (zi + 1) * gridSpacing);
        if (!a || !b) continue;
        // Only draw segments in lower-screen half (below horizon)
        if (a.y < horizonY * 0.9 && b.y < horizonY * 0.9) continue;
        segments.push([a, b]);
      }

      for (const [a, b] of segments) {
        const avgDepth = (a.depth + b.depth) / 2;
        const proximity = clamp01(1 + avgDepth / 35);  // 0 = far, 1 = near
        const lineAlpha = (isCenter ? 0.55 : 0.14) * proximity;
        if (lineAlpha < 0.008) continue;
        ctx.strokeStyle = isCenter ? hexA(palette.accent, lineAlpha) : hexA(palette.primary, lineAlpha);
        ctx.lineWidth   = isCenter ? 1.8 : Math.max(0.5, proximity * 1.0);
        if (isCenter) {
          ctx.shadowColor = palette.accent;
          ctx.shadowBlur  = 4;
        }
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // X-parallel lines (run front-back, constant Z)
    for (let zi = -gridSize; zi <= gridSize; zi++) {
      const wz = zi * gridSpacing;
      const isCenter = zi === 0;
      const a = proj(-gridSize * gridSpacing, groundY, wz);
      const b = proj( gridSize * gridSpacing, groundY, wz);
      if (!a || !b) continue;
      if (a.y < horizonY * 0.9 && b.y < horizonY * 0.9) continue;

      const avgDepth  = (a.depth + b.depth) / 2;
      const proximity = clamp01(1 + avgDepth / 35);
      const lineAlpha = (isCenter ? 0.55 : 0.11) * proximity;
      if (lineAlpha < 0.008) continue;
      ctx.strokeStyle = isCenter ? hexA(palette.accent, lineAlpha) : hexA(palette.primary, lineAlpha);
      ctx.lineWidth   = isCenter ? 1.8 : Math.max(0.4, proximity * 0.8);
      if (isCenter) {
        ctx.shadowColor = palette.accent;
        ctx.shadowBlur  = 4;
      }
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // ── 7. Scrolling horizontal scan-line sweep ───────────────────────────────
  if (intensity >= 2) {
    const scanY  = horizonY + (height - horizonY) * ((t01 * 1.4) % 1);
    const scanH  = Math.max(2, (height - horizonY) * 0.018);
    const scanGr = ctx.createLinearGradient(0, scanY - scanH, 0, scanY + scanH);
    scanGr.addColorStop(0,   'rgba(0,0,0,0)');
    scanGr.addColorStop(0.5, hexA(palette.accent, 0.28));
    scanGr.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = scanGr;
    ctx.fillRect(0, scanY - scanH, width, scanH * 2);
    ctx.restore();
  }

  // ── 8. Horizon glow band ───────────────────────────────────────────────────
  {
    const hg = ctx.createLinearGradient(0, horizonY - height * 0.12, 0, horizonY + height * 0.06);
    hg.addColorStop(0,   'rgba(0,0,0,0)');
    hg.addColorStop(0.5, hexA(palette.accent, 0.14));
    hg.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
  void p;
};
