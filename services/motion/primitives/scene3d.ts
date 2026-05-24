/**
 * scene-3d — Full 3D environment world background.
 *
 * Phase 9 — Hyper-Realistic 3D upgrade.
 *
 * Renders:
 *   1. Animated 3D perspective grid floor (vanishing-point scrolling)
 *   2. Floating 3D geometry (cubes + rings) — depth-sorted, flat-shaded
 *   3. 3D star field — 400 depth-sorted point stars with parallax
 *   4. Volumetric atmospheric fog — palette-colored haze at distance
 *   5. Directional diffuse lighting from a fixed world-space sun
 *
 * All rendered via custom software 3D engine (math3d.ts).
 * No WebGL. Pure Canvas 2D.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import {
  v3,
  projectPoint, flatShade,
  type Vec3, type CameraState, type ScreenPoint,
  perspectiveMatrix, lookAtMatrix, applyRoll,
} from '../math3d';
import { hexA, mixHex } from '../decorations';
import { clamp01, easeInOutCubic, lerp, remap } from '../easing';

// ─── Seeded PRNG ─────────────────────────────────────────────────────────────

const mulberry32 = (seed: number) => {
  let a = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ─── Cube geometry (12 triangles, 6 faces) ───────────────────────────────────

type Face = [Vec3, Vec3, Vec3, Vec3]; // quad = 2 tris

const makeCubeFaces = (cx: number, cy: number, cz: number, s: number): Face[] => [
  // Front
  [v3(cx-s,cy+s,cz+s), v3(cx+s,cy+s,cz+s), v3(cx+s,cy-s,cz+s), v3(cx-s,cy-s,cz+s)],
  // Back
  [v3(cx+s,cy+s,cz-s), v3(cx-s,cy+s,cz-s), v3(cx-s,cy-s,cz-s), v3(cx+s,cy-s,cz-s)],
  // Left
  [v3(cx-s,cy+s,cz-s), v3(cx-s,cy+s,cz+s), v3(cx-s,cy-s,cz+s), v3(cx-s,cy-s,cz-s)],
  // Right
  [v3(cx+s,cy+s,cz+s), v3(cx+s,cy+s,cz-s), v3(cx+s,cy-s,cz-s), v3(cx+s,cy-s,cz+s)],
  // Top
  [v3(cx-s,cy+s,cz-s), v3(cx+s,cy+s,cz-s), v3(cx+s,cy+s,cz+s), v3(cx-s,cy+s,cz+s)],
  // Bottom
  [v3(cx-s,cy-s,cz+s), v3(cx+s,cy-s,cz+s), v3(cx+s,cy-s,cz-s), v3(cx-s,cy-s,cz-s)],
];

// ─── Ring / torus approximation (polygon ring) ───────────────────────────────

const makeRingFaces = (
  cx: number, cy: number, cz: number,
  outerR: number, innerR: number,
  segs: number,
  rotX: number, rotY: number,
): Face[] => {
  const faces: Face[] = [];
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const cos0 = Math.cos(a0), sin0 = Math.sin(a0);
    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);
    // Quad in the XY plane, then rotated
    const pts: Vec3[] = [
      v3(cos0 * outerR, sin0 * outerR, 0),
      v3(cos1 * outerR, sin1 * outerR, 0),
      v3(cos1 * innerR, sin1 * innerR, 0),
      v3(cos0 * innerR, sin0 * innerR, 0),
    ];
    // Apply rotX then rotY then translate
    const transformed = pts.map(p => {
      // rotX
      const ry = p.y * Math.cos(rotX) - p.z * Math.sin(rotX);
      const rz = p.y * Math.sin(rotX) + p.z * Math.cos(rotX);
      const q = v3(p.x, ry, rz);
      // rotY
      const rx2 = q.x * Math.cos(rotY) + q.z * Math.sin(rotY);
      const rz2 = -q.x * Math.sin(rotY) + q.z * Math.cos(rotY);
      return v3(cx + rx2, cy + q.y, cz + rz2);
    });
    faces.push(transformed as Face);
  }
  return faces;
};

// ─── Lighting ─────────────────────────────────────────────────────────────────

const SUN_DIR = v3(0.6, 0.9, 0.4); // normalized approx
const SUN_NORM = (() => {
  const l = Math.sqrt(SUN_DIR.x**2 + SUN_DIR.y**2 + SUN_DIR.z**2);
  return v3(SUN_DIR.x/l, SUN_DIR.y/l, SUN_DIR.z/l);
})();

// ─── Main ─────────────────────────────────────────────────────────────────────

export const scene3d = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  const fadeIn  = clamp01(remap(t01, 0, 0.12));
  const fadeOut = clamp01(remap(t01, 0.88, 1.0));
  const alpha   = fadeIn * (1 - fadeOut);
  if (alpha < 0.005) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  // ── 1. Deep space background gradient ──────────────────────────────────────
  const bg = ctx.createRadialGradient(width/2, height*0.4, 0, width/2, height/2, Math.hypot(width, height)*0.6);
  bg.addColorStop(0, hexA(palette.primary, 0.12));
  bg.addColorStop(0.5, hexA(palette.secondary, 0.06));
  bg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // ── 2. Build animated camera ────────────────────────────────────────────────
  // Camera slowly orbits and pushes in
  const camAngle = t01 * Math.PI * 0.35;                     // orbit
  const camZ     = lerp(10, 5, easeInOutCubic(t01));         // dolly in
  const camY     = lerp(3.5, 2.0, easeInOutCubic(t01));      // crane down
  const camEye: Vec3 = {
    x: Math.sin(camAngle) * camZ,
    y: camY,
    z: Math.cos(camAngle) * camZ,
  };
  const camTarget: Vec3 = { x: 0, y: -0.5, z: 0 };
  const cam: CameraState = {
    eye: camEye,
    target: camTarget,
    up: { x: 0, y: 1, z: 0 },
    fovRad: (60 * Math.PI) / 180,
    near: 0.1,
    far: 120,
    roll: 0,
  };
  const aspect = width / height;
  const upVec = cam.roll !== 0 ? applyRoll(cam.eye, cam.target, cam.roll) : { x:0, y:1, z:0 };
  const viewMat = lookAtMatrix(cam.eye, cam.target, upVec);
  const projMat = perspectiveMatrix(cam.fovRad, aspect, cam.near, cam.far);

  // ── 3. 3D Star field ────────────────────────────────────────────────────────
  {
    const rng = mulberry32(42);
    const starCount = intensity === 3 ? 350 : intensity === 1 ? 150 : 250;
    ctx.save();
    for (let i = 0; i < starCount; i++) {
      const sx = (rng() - 0.5) * 80;
      const sy = (rng() * 0.7 + 0.1) * 30;
      const sz = -(rng() * 80 + 5);
      const sp = projectPoint(v3(sx, sy, sz), viewMat, projMat, width, height);
      if (!sp) continue;
      const brightness = 0.4 + rng() * 0.6;
      const size = Math.max(0.5, sp.scale * 120 * (0.3 + rng() * 0.7));
      const twinkle = 0.7 + 0.3 * Math.sin(t01 * Math.PI * (4 + rng() * 6) + i * 1.3);
      ctx.fillStyle = hexA(palette.text, brightness * twinkle * 0.8);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, Math.min(size, 2.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── 4. Horizon glow ─────────────────────────────────────────────────────────
  {
    const horizonY = height * 0.42;
    const hg = ctx.createLinearGradient(0, horizonY - height*0.15, 0, horizonY + height*0.08);
    hg.addColorStop(0, 'rgba(0,0,0,0)');
    hg.addColorStop(0.5, hexA(palette.accent, 0.18));
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, width, height);
  }

  // ── 5. 3D Perspective grid (floor plane y = -1.5) ──────────────────────────
  {
    const groundY = -1.5;
    const gridSize = intensity === 3 ? 30 : 20;
    const gridSpacing = 2;
    ctx.save();
    ctx.lineCap = 'round';

    // Determine fog parameters for grid lines
    const projectGridPoint = (gx: number, gz: number): ScreenPoint | null =>
      projectPoint(v3(gx, groundY, gz), viewMat, projMat, width, height);

    // Draw Z-parallel lines (left-right)
    for (let xi = -gridSize; xi <= gridSize; xi++) {
      const x = xi * gridSpacing;
      const pts: (ScreenPoint | null)[] = [];
      const zSteps = gridSize * 2 + 1;
      for (let zi = 0; zi <= zSteps; zi++) {
        const z = (-gridSize + zi) * gridSpacing;
        pts.push(projectGridPoint(x, z));
      }
      // Draw segments
      for (let si = 0; si < pts.length - 1; si++) {
        const a = pts[si], b = pts[si+1];
        if (!a || !b) continue;
        const depthFactor = clamp01(1 + (a.depth + b.depth) * 0.022); // closer=brighter
        const isCenter = xi === 0;
        const lineAlpha = (isCenter ? 0.45 : 0.12) * depthFactor;
        if (lineAlpha < 0.01) continue;
        ctx.strokeStyle = isCenter
          ? hexA(palette.accent, lineAlpha)
          : hexA(palette.primary, lineAlpha);
        ctx.lineWidth = isCenter ? 1.5 : 0.8;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Draw X-parallel lines (forward-back)
    for (let zi = -gridSize; zi <= gridSize; zi++) {
      const z = zi * gridSpacing;
      const a = projectGridPoint(-gridSize * gridSpacing, z);
      const b = projectGridPoint( gridSize * gridSpacing, z);
      if (!a || !b) continue;
      const depthFactor = clamp01(1 + (a.depth + b.depth) * 0.022);
      const isCenter = zi === 0;
      const lineAlpha = (isCenter ? 0.45 : 0.10) * depthFactor;
      if (lineAlpha < 0.01) continue;
      ctx.strokeStyle = isCenter
        ? hexA(palette.accent, lineAlpha)
        : hexA(palette.primary, lineAlpha);
      ctx.lineWidth = isCenter ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── 6. Floating 3D geometry ─────────────────────────────────────────────────
  {
    interface GeomObject {
      faces: [Vec3, Vec3, Vec3, Vec3][];
      avgDepth: number;
      color: string;
      brightness: number;
    }

    const objects: GeomObject[] = [];
    const rng = mulberry32(77);
    const objCount = intensity === 3 ? 12 : intensity === 1 ? 4 : 8;
    const colors = [palette.primary, palette.secondary, palette.accent, palette.text];

    for (let i = 0; i < objCount; i++) {
      const angle = (i / objCount) * Math.PI * 2 + t01 * Math.PI * 0.4;
      const radius = 4 + rng() * 7;
      const ox = Math.sin(angle) * radius;
      const oy = lerp(-0.5, 2.5, rng()) + Math.sin(t01 * Math.PI * 2 + i * 0.8) * 0.4;
      const oz = Math.cos(angle) * radius - 3;
      const size = 0.3 + rng() * 0.5;
      const isRing = rng() > 0.55;
      const color = colors[i % colors.length];
      const spinY = t01 * Math.PI * (0.5 + rng() * 1.5) + rng() * Math.PI * 2;
      const spinX = t01 * Math.PI * (0.3 + rng() * 1.0) + rng() * Math.PI * 2;

      let faces: Face[];
      if (isRing) {
        const segs = intensity >= 2 ? 16 : 10;
        faces = makeRingFaces(ox, oy, oz, size, size * 0.55, segs, spinX, spinY);
      } else {
        // Cube with rotation — rotate center approach
        const rawFaces = makeCubeFaces(0, 0, 0, size);
        faces = rawFaces.map(face =>
          face.map(pt => {
            // rotate around Y then X
            const ry = pt.x * Math.cos(spinY) + pt.z * Math.sin(spinY);
            const rz = -pt.x * Math.sin(spinY) + pt.z * Math.cos(spinY);
            const q = v3(ry, pt.y, rz);
            const ry2 = q.y * Math.cos(spinX) - q.z * Math.sin(spinX);
            const rz2 = q.y * Math.sin(spinX) + q.z * Math.cos(spinX);
            return v3(ox + q.x, oy + ry2, oz + rz2);
          }) as Face
        );
      }

      // Compute face depths for depth sorting
      for (const face of faces) {
        const projected = face.map(pt => projectPoint(pt, viewMat, projMat, width, height));
        const visible = projected.filter(Boolean) as ScreenPoint[];
        if (visible.length < 3) continue;
        const avgD = visible.reduce((s, sp) => s + sp.depth, 0) / visible.length;

        // Flat shade based on face normal
        const lightBrightness = flatShade(face[0], face[1], face[2], SUN_NORM);
        // Fog: objects far away fade toward transparent
        const fogT = clamp01(1 - (-avgD - 2) / 25);

        objects.push({
          faces: [face],
          avgDepth: avgD,
          color,
          brightness: lightBrightness * fogT,
        });
      }
    }

    // Painter's algorithm: sort by avgDepth (most negative = furthest away = draw first)
    objects.sort((a, b) => a.avgDepth - b.avgDepth);

    for (const obj of objects) {
      for (const face of obj.faces) {
        const spts = face.map(pt => projectPoint(pt, viewMat, projMat, width, height));
        const valid = spts.filter(Boolean) as ScreenPoint[];
        if (valid.length < 3) continue;

        const fillAlpha = 0.55 * obj.brightness;
        const strokeAlpha = 0.8 * obj.brightness;
        if (fillAlpha < 0.02) continue;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(valid[0].x, valid[0].y);
        for (let vi = 1; vi < valid.length; vi++) ctx.lineTo(valid[vi].x, valid[vi].y);
        ctx.closePath();

        // Fill with gradient shading
        const faceColorBright = obj.color;
        const faceColorDark = mixHex(obj.color, '#000000', 0.6);
        const fill = ctx.createLinearGradient(
          valid[0].x, valid[0].y,
          valid[valid.length-1].x, valid[valid.length-1].y,
        );
        fill.addColorStop(0, hexA(faceColorBright, fillAlpha));
        fill.addColorStop(1, hexA(faceColorDark, fillAlpha * 0.6));
        ctx.fillStyle = fill;
        ctx.fill();

        ctx.strokeStyle = hexA(obj.color, strokeAlpha);
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ── 7. Ground fog (volumetric haze near ground) ─────────────────────────────
  {
    // Project the horizon ground line
    const horizonPt = projectPoint(v3(0, -1.5, -30), viewMat, projMat, width, height);
    const fogYBottom = horizonPt ? Math.max(0, horizonPt.y) : height * 0.5;
    const fogGrad = ctx.createLinearGradient(0, fogYBottom - height*0.12, 0, fogYBottom + height*0.18);
    fogGrad.addColorStop(0, 'rgba(0,0,0,0)');
    fogGrad.addColorStop(0.4, hexA(palette.primary, 0.08));
    fogGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // ── 8. Center light bloom (atmospheric halo) ───────────────────────────────
  {
    const bloomPt = projectPoint(v3(0, 0, 0), viewMat, projMat, width, height);
    if (bloomPt) {
      const bloomR = Math.min(width, height) * 0.3;
      const bloom = ctx.createRadialGradient(bloomPt.x, bloomPt.y, 0, bloomPt.x, bloomPt.y, bloomR);
      bloom.addColorStop(0, hexA(palette.accent, 0.12));
      bloom.addColorStop(0.4, hexA(palette.primary, 0.05));
      bloom.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = bloom;
      ctx.beginPath();
      ctx.arc(bloomPt.x, bloomPt.y, bloomR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
};
