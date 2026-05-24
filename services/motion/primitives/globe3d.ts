/**
 * globe-3d — 3D Wireframe Globe with Location Pins.
 *
 * Phase 11 — Advanced Motion Graphics (Hera / Jitter level).
 * Uses math3d.ts for true 3D perspective projection.
 *
 * Renders a fully 3D rotating globe with:
 *   1. Latitude & longitude wireframe grid with anti-aliased lines
 *   2. Gradient-filled continent landmass approximations
 *   3. Location marker pins with pulsing glow rings
 *   4. Smooth auto-rotation around Y-axis
 *   5. Entry: springs in from small scale with elastic overshoot
 *   6. Atmospheric glow bloom behind the globe
 *   7. Floating particles in the background space
 *   8. Optional text label below with underline accent
 *
 * params.icon: "globe" (default) — no variants
 * params.text: optional label shown below globe (e.g.,  "WORLDWIDE")
 * params.anchor: position of label
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';
import {
  v3, v3RotateY, lookAtMatrix, perspectiveMatrix, projectPoint,
  type Vec3, type Mat4, type ScreenPoint,
} from '../math3d';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

// ── Generate latitude ring (horizontal circle around sphere ──────────────────
function latRing(latAngle: number, segments: number, r: number): Vec3[] {
  const pts: Vec3[] = [];
  const phi = latAngle; // angle from top
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    pts.push(v3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta),
    ));
  }
  return pts;
}

// ── Generate longitude arc (vertical half-circle) ────────────────────────────
function lonArc(lonAngle: number, segments: number, r: number): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const phi = (i / segments) * Math.PI;
    pts.push(v3(
      r * Math.sin(phi) * Math.cos(lonAngle),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(lonAngle),
    ));
  }
  return pts;
}

// ── Project a set of world-space points ──────────────────────────────────────
function projectRing(
  pts: Vec3[],
  rotY: number,
  viewMat: Mat4,
  projMat: Mat4,
  sw: number,
  sh: number,
): (ScreenPoint | null)[] {
  return pts.map(p => {
    const r = v3RotateY(p, rotY);
    return projectPoint(r, viewMat, projMat, sw, sh);
  });
}

// ── Draw a filled continent area ─────────────────────────────────────────────
interface Continent {
  lon: number;   // center longitude in radians
  lat: number;   // center latitude in radians
  w: number;     // angular width
  h: number;     // angular height
}

function drawContinent(
  ctx: CanvasRenderingContext2D,
  cont: Continent,
  rotY: number,
  viewMat: Mat4,
  projMat: Mat4,
  sw: number,
  sh: number,
  r: number,
  color: string,
  alpha: number,
): void {
  const steps = 20;
  const pts: ScreenPoint[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps);
    const lon = cont.lon - cont.w / 2 + t * cont.w;
    const lat = cont.lat - cont.h / 2;
    const p = v3(
      r * Math.cos(lat) * Math.cos(lon),
      r * Math.sin(lat),
      r * Math.cos(lat) * Math.sin(lon),
    );
    const rotated = v3RotateY(p, rotY);
    const proj = projectPoint(rotated, viewMat, projMat, sw, sh);
    if (proj) pts.push(proj);
  }

  for (let i = steps; i >= 0; i--) {
    const t = (i / steps);
    const lon = cont.lon - cont.w / 2 + t * cont.w;
    const lat = cont.lat + cont.h / 2;
    const p = v3(
      r * Math.cos(lat) * Math.cos(lon),
      r * Math.sin(lat),
      r * Math.cos(lat) * Math.sin(lon),
    );
    const rotated = v3RotateY(p, rotY);
    const proj = projectPoint(rotated, viewMat, projMat, sw, sh);
    if (proj) pts.push(proj);
  }

  if (pts.length < 3) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

// ── Pin locations (lat, lon in degrees) ──────────────────────────────────────
interface Pin {
  latDeg: number;
  lonDeg: number;
}

const PINS: Pin[] = [
  { latDeg: 40.7, lonDeg: -74.0 },  // New York
  { latDeg: 51.5, lonDeg: -0.1 },   // London
  { latDeg: 35.7, lonDeg: 139.7 },  // Tokyo
  { latDeg: -33.9, lonDeg: 151.2 }, // Sydney
  { latDeg: 19.4, lonDeg: -99.1 },  // Mexico City
  { latDeg: 28.6, lonDeg: 77.2 },   // New Delhi
  { latDeg: -23.6, lonDeg: -46.6 }, // São Paulo
  { latDeg: 31.2, lonDeg: 121.5 },  // Shanghai
];

function latLonToVec3(latDeg: number, lonDeg: number, r: number): Vec3 {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  return v3(
    r * Math.cos(lat) * Math.cos(lon),
    r * Math.sin(lat),
    r * Math.cos(lat) * Math.sin(lon),
  );
}

// ── Main primitive ───────────────────────────────────────────────────────────
export const globe3d = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const label = p.text || '';
  const intensity = p.intensity ?? 2;

  // ── Global fades ──────────────────────────────────────────────────────────
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // ── Entry animation ───────────────────────────────────────────────────────
  const entryT = easeOutBack(clamp01(remap(t01, 0.05, 0.30)), 1.5);

  // ── Globe radius (in world units) ─────────────────────────────────────────
  const globeR = 1.0;

  // ── Camera setup ──────────────────────────────────────────────────────────
  const camDist = 3.8;
  const eye: Vec3 = v3(0, 0.1, camDist);
  const target: Vec3 = v3(0, 0, 0);
  const upVec: Vec3 = v3(0, 1, 0);
  const fovRad = (45 * Math.PI) / 180;
  const aspect = width / height;
  const viewMat = lookAtMatrix(eye, target, upVec);
  const projMat = perspectiveMatrix(fovRad, aspect, 0.1, 100);

  // ── Auto-rotation ─────────────────────────────────────────────────────────
  const rotY = t01 * Math.PI * 1.2 + Math.sin(t01 * Math.PI * 0.3) * 0.05;

  // ── Scale from entry ──────────────────────────────────────────────────────
  const scale = lerp(0.2, 1, entryT);
  const screenScale = Math.min(width, height) * 0.0016 * scale;

  // ── Center position ───────────────────────────────────────────────────────
  let cx = width / 2;
  let cy = height * 0.42;
  if (p.anchor === 'top') cy = height * 0.28;
  else if (p.anchor === 'bottom') cy = height * 0.55;

  // ── Layout helper: scale world units → screen pixels ─────────────────────
  const toScreen = (pt: Vec3): ScreenPoint | null => {
    const rotated = v3RotateY(pt, rotY);
    const sp = projectPoint(rotated, viewMat, projMat, width, height);
    if (!sp) return null;
    return {
      x: cx + (sp.x - width / 2) * screenScale,
      y: cy + (sp.y - height / 2) * screenScale,
      depth: sp.depth,
      scale: sp.scale,
    };
  };

  // ── Globe world-space points (scaled) ─────────────────────────────────────
  const r = globeR;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── Background space gradient ──────────────────────────────────────────────
  const bgR = Math.max(width, height) * 0.6;
  const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, bgR);
  bgGrad.addColorStop(0, hexA(mixHex(palette.bg || '#0a0a14', palette.primary, 0.12), 0.95));
  bgGrad.addColorStop(0.5, hexA(palette.bg || '#0a0a14', 0.98));
  bgGrad.addColorStop(1, hexA(palette.bg || '#0a0a14', 1));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // ── Floating background particles (stars) ─────────────────────────────────
  const starCount = 40 + intensity * 15;
  for (let si = 0; si < starCount; si++) {
    const seed = si * 73.7;
    const sx = ((Math.sin(seed) * 0.5 + 0.5) % 1) * width;
    const sy = ((Math.sin(seed * 2.3) * 0.5 + 0.5) % 1) * height;
    const sr = 0.5 + (Math.sin(seed * 1.7) * 0.5 + 0.5) * 1.5;
    const sAlpha = (Math.sin(seed * 3.1) * 0.5 + 0.5) * 0.4 * globalAlpha;
    // Twinkle
    const twinkle = 0.5 + 0.5 * Math.sin(t01 * Math.PI * 3 + seed);

    ctx.save();
    ctx.globalAlpha = sAlpha * twinkle;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, sr * twinkle, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Globe glow bloom ──────────────────────────────────────────────────────
  const bloomR2 = r * 2.2 * screenScale;
  const bloomAlpha = 0.12 * intensity * entryT;
  const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, bloomR2);
  bloom.addColorStop(0, hexA(palette.accent, bloomAlpha * 0.5));
  bloom.addColorStop(0.3, hexA(palette.primary, bloomAlpha * 0.3));
  bloom.addColorStop(0.6, hexA(palette.accent, bloomAlpha * 0.1));
  bloom.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(cx, cy, bloomR2, 0, Math.PI * 2);
  ctx.fill();

  // ── Orbit ring behind globe ───────────────────────────────────────────────
  const orbitR = r * 1.6 * screenScale;
  ctx.save();
  ctx.globalAlpha = 0.08 * intensity * entryT;
  ctx.strokeStyle = hexA(palette.accent, 0.5);
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.arc(cx, cy, orbitR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ── Continent landmass areas ──────────────────────────────────────────────
  const continents: Continent[] = [
    { lon: -0.5,  lat: 0.55,  w: 0.8,  h: 0.6  },  // Europe/Africa
    { lon: -1.8,  lat: 0.4,   w: 0.9,  h: 0.5  },  // Americas
    { lon: 1.8,   lat: 0.45,  w: 1.2,  h: 0.7  },  // Asia
    { lon: 2.2,   lat: -0.5,  w: 0.7,  h: 0.3  },  // Australia/Oceania
    { lon: -1.9,  lat: -0.4,  w: 0.5,  h: 0.3  },  // South America
  ];

  const landColor = mixHex(palette.accent, palette.primary, 0.5);
  for (const cont of continents) {
    drawContinent(ctx, cont, rotY, viewMat, projMat, width, height, r, landColor, 0.15 * entryT);
  }

  // ── Latitude rings ────────────────────────────────────────────────────────
  const latCount = 8;
  for (let li = 1; li < latCount; li++) {
    const latAngle = (li / latCount) * Math.PI;
    const pts = latRing(latAngle, 36, r);
    const projPts = projectRing(pts, rotY, viewMat, projMat, width, height);

    ctx.save();
    ctx.globalAlpha = 0.2 * entryT;
    ctx.strokeStyle = hexA(palette.accent, 0.08);
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    let started = false;
    for (const sp of projPts) {
      if (!sp) { started = false; continue; }
      const sx = cx + (sp.x - width / 2) * screenScale;
      const sy = cy + (sp.y - height / 2) * screenScale;
      if (!started) { ctx.moveTo(sx, sy); started = true; }
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── Longitude arcs ───────────────────────────────────────────────────────
  const lonCount = 12;
  for (let li = 0; li < lonCount; li++) {
    const lonAngle = (li / lonCount) * Math.PI * 2;
    const pts = lonArc(lonAngle, 24, r);
    const projPts = projectRing(pts, rotY, viewMat, projMat, width, height);

    ctx.save();
    ctx.globalAlpha = 0.15 * entryT;
    ctx.strokeStyle = hexA(palette.secondary, 0.06);
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    let started = false;
    for (const sp of projPts) {
      if (!sp) { started = false; continue; }
      const sx = cx + (sp.x - width / 2) * screenScale;
      const sy = cy + (sp.y - height / 2) * screenScale;
      if (!started) { ctx.moveTo(sx, sy); started = true; }
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── Globe outer rim glow ──────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.3 * entryT;
  ctx.strokeStyle = hexA(palette.accent, 0.15);
  ctx.lineWidth = 2;
  ctx.shadowColor = hexA(palette.accent, 0.2);
  ctx.shadowBlur = 15;
  // Project the equator for the rim ellipse
  const rimPts = latRing(Math.PI / 2, 48, r);
  const rimProj = projectRing(rimPts, rotY, viewMat, projMat, width, height);
  ctx.beginPath();
  let rimStarted = false;
  for (const sp of rimProj) {
    if (!sp) { rimStarted = false; continue; }
    const sx = cx + (sp.x - width / 2) * screenScale;
    const sy = cy + (sp.y - height / 2) * screenScale;
    if (!rimStarted) { ctx.moveTo(sx, sy); rimStarted = true; }
    else ctx.lineTo(sx, sy);
  }
  ctx.stroke();
  ctx.restore();

  // ── Location pins ─────────────────────────────────────────────────────────
  const pinAlpha = easeOutCubic(clamp01(remap(t01, 0.25, 0.45)));

  if (pinAlpha > 0.01) {
    const activePins = intensity >= 3 ? PINS : PINS.slice(0, 4);

    for (const pin of activePins) {
      const worldPos = latLonToVec3(pin.latDeg, pin.lonDeg, r);
      const sp = toScreen(worldPos);
      if (!sp) continue;

      // Check if pin is on the visible front side (z > 0 after rotation)
      const rotatedCheck = v3RotateY(worldPos, rotY);
      if (rotatedCheck.z < 0) continue; // behind globe

      // Pin pulse
      const pinPulse = 0.6 + 0.4 * Math.sin(t01 * Math.PI * 4 + pin.latDeg);

      // Glow ring
      ctx.save();
      ctx.globalAlpha = pinAlpha * pinPulse * 0.5;
      ctx.strokeStyle = hexA(palette.accent, 0.6);
      ctx.lineWidth = 1.5;
      ctx.shadowColor = hexA(palette.accent, 0.5);
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 4 + pinPulse * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Pin dot
      ctx.save();
      ctx.globalAlpha = pinAlpha * pinPulse;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Label below globe ─────────────────────────────────────────────────────
  if (label) {
    const labelT = easeOutCubic(clamp01(remap(t01, 0.50, 0.65)));

    if (labelT > 0.01) {
      ctx.save();
      ctx.globalAlpha = globalAlpha * labelT;
      ctx.translate(0, lerp(12, 0, labelT));

      const labelSize = Math.min(width, height) * 0.03;
      ctx.font = `700 ${labelSize}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const labelY = cy + r * screenScale + 24;

      // Underline accent
      const labelW = ctx.measureText(label).width;
      const lineW = labelW * 0.6;
      const lineY = labelY + labelSize * 1.2;
      ctx.strokeStyle = hexA(palette.accent, 0.4);
      ctx.lineWidth = 2;
      ctx.shadowColor = hexA(palette.accent, 0.3);
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(cx - lineW / 2, lineY);
      ctx.lineTo(cx + lineW / 2, lineY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Label text with gradient
      const grad = ctx.createLinearGradient(cx - labelW / 2, labelY, cx + labelW / 2, labelY);
      grad.addColorStop(0, hexA('#ffffff', 0.7));
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(1, hexA('#ffffff', 0.7));
      ctx.fillStyle = grad;
      ctx.fillText(label, cx, labelY);

      ctx.restore();
    }
  }

  ctx.restore(); // global
};
