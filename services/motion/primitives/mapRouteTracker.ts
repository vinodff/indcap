/**
 * map-route-tracker — Interactive Travel Map & Route Line Tracker.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 *
 * Renders:
 *   1. A high-tech blueprint coordinate grid + dotted outline of world continents.
 *   2. Location A locator pin drops with elastic bounce + continuous radar wave.
 *   3. Dotted Bezier arc line draws itself from Location A to Location B.
 *   4. An airplane icon flies along the arc, rotated to match path tangent.
 *   5. Location B locator pin drops with details label glass card.
 *
 * params.text accepts pipe-separated inputs:
 *   "Origin Location | Destination Location | Card Label Detail"
 *   e.g. "New York | London | Remote Work"
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

// ── Seeded PRNG for Dotted Map Outline ───────────────────────────────────────
const mulberry32 = (seed: number) => {
  let a = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Draw Dotted Continent Approximation ──────────────────────────────────────
function drawDottedMap(ctx: CanvasRenderingContext2D, width: number, height: number, color: string, alpha: number): void {
  const rng = mulberry32(101);
  ctx.save();
  ctx.fillStyle = hexA(color, alpha * 0.12);

  // Continent definitions: bounding boxes to generate dots
  // [minX, maxX, minY, maxY] in relative screen coordinates [0, 1]
  const landmasses = [
    { xMin: 0.15, xMax: 0.35, yMin: 0.25, yMax: 0.75, dotDensity: 140 }, // Americas
    { xMin: 0.45, xMax: 0.85, yMin: 0.15, yMax: 0.60, dotDensity: 220 }, // Eurasia/Africa
    { xMin: 0.72, xMax: 0.88, yMin: 0.65, yMax: 0.85, dotDensity: 70 },  // Australia
  ];

  for (const land of landmasses) {
    for (let i = 0; i < land.dotDensity; i++) {
      // Generate coordinates clustered in the landmass shape
      const rx = lerp(land.xMin, land.xMax, rng());
      const ry = lerp(land.yMin, land.yMax, rng());

      // Filter out points to make rough organic shapes
      const dx = rx - (land.xMin + land.xMax) / 2;
      const dy = ry - (land.yMin + land.yMax) / 2;
      const wVal = (land.xMax - land.xMin) * 0.48;
      const hVal = (land.yMax - land.yMin) * 0.48;
      // Ellipse test with noise
      const dist = (dx * dx) / (wVal * wVal) + (dy * dy) / (hVal * hVal) + (rng() * 0.22);
      if (dist < 1.0) {
        ctx.beginPath();
        ctx.arc(rx * width, ry * height, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

// ── Bezier Math Helpers ──────────────────────────────────────────────────────
interface Pt2D { x: number; y: number; }

function getBezierPt(p0: Pt2D, cp: Pt2D, p1: Pt2D, t: number): Pt2D {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * cp.x + t * t * p1.x,
    y: mt * mt * p0.y + 2 * mt * t * cp.y + t * t * p1.y,
  };
}

function getBezierTangent(p0: Pt2D, cp: Pt2D, p1: Pt2D, t: number): Pt2D {
  // Derivative: B'(t) = 2*(1-t)*(cp - p0) + 2*t*(p1 - cp)
  const mt = 1 - t;
  return {
    x: 2 * mt * (cp.x - p0.x) + 2 * t * (p1.x - cp.x),
    y: 2 * mt * (cp.y - p0.y) + 2 * t * (p1.y - cp.y),
  };
}

// ── Draw Airplane Icon ───────────────────────────────────────────────────────
function drawAirplane(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, angle: number, color: string): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.beginPath();
  // Nose
  ctx.moveTo(size * 0.45, 0);
  // Left Wing
  ctx.lineTo(-size * 0.15, -size * 0.42);
  ctx.lineTo(-size * 0.12, -size * 0.12);
  // Tail Left
  ctx.lineTo(-size * 0.40, -size * 0.15);
  ctx.lineTo(-size * 0.45, 0);
  // Tail Right
  ctx.lineTo(-size * 0.40, size * 0.15);
  ctx.lineTo(-size * 0.12, size * 0.12);
  // Right Wing
  ctx.lineTo(-size * 0.15, size * 0.42);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
export const mapRouteTracker = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;

  // Global fades
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.10)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.90, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // Parse labels
  const labels = (p.text || '').split('|').map(s => s.trim()).filter(Boolean);
  const startLabel = labels[0] || 'Origin';
  const endLabel   = labels[1] || 'Destination';
  const descLabel  = labels[2] || 'Route Active';

  // ── Coordinates ────────────────────────────────────────────────────────────
  const locA: Pt2D = { x: width * 0.28, y: height * 0.58 };
  const locB: Pt2D = { x: width * 0.72, y: height * 0.38 };
  // Arc control point (pull upwards to create curve)
  const arcCP: Pt2D = { x: (locA.x + locB.x) / 2, y: Math.min(locA.y, locB.y) - 100 };

  // ── Timelines ──────────────────────────────────────────────────────────────
  // 0.00 → 0.18: Map grid + Dots fade in
  // 0.18 → 0.35: Location A pin bounce + ping
  // 0.35 → 0.70: Route line animation + flight path
  // 0.70 → 0.88: Location B pin bounce + detail card popup
  // 0.88 → 0.90: Hold
  const mapAlpha = easeOutCubic(clamp01(remap(t01, 0.0, 0.18)));
  const pinAT    = easeOutBack (clamp01(remap(t01, 0.18, 0.35)), 1.3);
  const routeT   = easeInOutCubic(clamp01(remap(t01, 0.35, 0.70)));
  const pinBT    = easeOutBack (clamp01(remap(t01, 0.70, 0.85)), 1.3);
  const cardT    = easeOutBack (clamp01(remap(t01, 0.76, 0.89)), 1.15);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── 1. Coordinate Grid Backdrop ───────────────────────────────────────────
  if (mapAlpha > 0.05) {
    ctx.save();
    ctx.globalAlpha = mapAlpha * 0.05;
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 0.8;

    // Draw grid lines
    const gridSpacing = 40;
    for (let x = 0; x < width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Concentric grid circle (sonar ring at center)
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Dotted world map
    drawDottedMap(ctx, width, height, palette.primary, mapAlpha);
  }

  // ── 2. Dotted Route Arc Path ───────────────────────────────────────────────
  if (routeT > 0.005) {
    ctx.save();
    ctx.strokeStyle = hexA(palette.primary, 0.32);
    ctx.lineWidth = 2.0;
    ctx.setLineDash([5, 5]);

    // Draw background dashed path guide
    ctx.beginPath();
    ctx.moveTo(locA.x, locA.y);
    ctx.quadraticCurveTo(arcCP.x, arcCP.y, locB.x, locB.y);
    ctx.stroke();

    // Draw active animated glowing path segment
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 3.0;
    ctx.setLineDash([6, 4]);
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 10;

    // We draw segment by segment up to routeT
    ctx.beginPath();
    ctx.moveTo(locA.x, locA.y);
    const steps = Math.floor(routeT * 40);
    for (let i = 1; i <= steps; i++) {
      const stepT = (i / 40) * routeT;
      const pt = getBezierPt(locA, arcCP, locB, stepT);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    ctx.restore();

    // ── 3. Airplane Icon (following path) ────────────────────────────────────
    if (routeT < 1.0) {
      const planePt = getBezierPt(locA, arcCP, locB, routeT);
      const tangent = getBezierTangent(locA, arcCP, locB, routeT);
      const angle = Math.atan2(tangent.y, tangent.x);

      // Airplane backing shadow
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 4;
      drawAirplane(ctx, planePt.x, planePt.y, 20, angle, palette.accent);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }
  }

  // ── 4. Location A Pin Drop & Label ─────────────────────────────────────────
  if (pinAT > 0.005) {
    ctx.save();
    // Continuous radiating radar wave
    const pulseCycle = (t01 * 4.5) % 1.0;
    ctx.beginPath();
    ctx.arc(locA.x, locA.y, 10 + pulseCycle * 32, 0, Math.PI * 2);
    ctx.strokeStyle = hexA(palette.primary, 0.45 * (1 - pulseCycle));
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Center locator node dot
    ctx.translate(locA.x, locA.y);
    ctx.scale(pinAT, pinAT);
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = palette.primary;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label card
    ctx.font = `600 12px ${FONT}`;
    const txtW = ctx.measureText(startLabel).width + 16;
    const cardH = 24;
    roundRect(ctx, -txtW / 2, -34, txtW, cardH, 5);
    ctx.fillStyle = hexA('#1a1a2e', 0.9);
    ctx.fill();
    roundRect(ctx, -txtW / 2, -34, txtW, cardH, 5);
    ctx.strokeStyle = hexA(palette.primary, 0.45);
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(startLabel, 0, -34 + cardH / 2);
    ctx.restore();
  }

  // ── 5. Location B Pin Drop & Info Card Popup ───────────────────────────────
  if (pinBT > 0.005) {
    ctx.save();
    // Radar pulse B
    const pulseCycleB = (t01 * 4.8 + 0.5) % 1.0;
    ctx.beginPath();
    ctx.arc(locB.x, locB.y, 10 + pulseCycleB * 32, 0, Math.PI * 2);
    ctx.strokeStyle = hexA(palette.accent, 0.45 * (1 - pulseCycleB));
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Locator B node dot
    ctx.translate(locB.x, locB.y);
    ctx.scale(pinBT, pinBT);
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fillStyle = palette.accent;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Info Glass Card (drops down/up on B)
    if (cardT > 0.005) {
      ctx.save();
      ctx.translate(locB.x, locB.y);
      ctx.scale(cardT, cardT);

      const cardW = 145;
      const cardH = 68;
      const cardX = -cardW / 2;
      const cardY = 18; // offset below pin node

      // Glass fill
      roundRect(ctx, cardX, cardY, cardW, cardH, 12);
      ctx.fillStyle = hexA('#ffffff', 0.08);
      ctx.fill();

      // Colored backing tint glow
      const cGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
      cGrad.addColorStop(0, hexA(palette.accent, 0.15));
      cGrad.addColorStop(1, 'transparent');
      roundRect(ctx, cardX, cardY, cardW, cardH, 12);
      ctx.fillStyle = cGrad;
      ctx.fill();

      // Specular border outline
      roundRect(ctx, cardX, cardY, cardW, cardH, 12);
      ctx.strokeStyle = hexA('#ffffff', 0.16);
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Highlight Top Bezel bar
      roundRect(ctx, cardX, cardY, cardW, 3, 1.5);
      ctx.fillStyle = palette.accent;
      ctx.fill();

      // Card Title text
      ctx.font = `700 13px ${FONT}`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(endLabel, 0, cardY + 12);

      // Card Description text
      ctx.font = `600 10px ${FONT}`;
      ctx.fillStyle = hexA('#ffffff', 0.55);
      ctx.fillText(descLabel, 0, cardY + 34);

      ctx.restore();
    }
  }

  ctx.restore();
};
