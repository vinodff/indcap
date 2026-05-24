/**
 * particles-3d — Depth-sorted 3D particle system.
 *
 * Phase 9 — Hyper-Realistic 3D upgrade.
 *
 * Emitter types (set via anchor):
 *   center → Sphere burst: particles explode outward from origin
 *   top    → Fountain: particles eject upward with gravity pull-down
 *   bottom → Vortex: particles spiral upward in a helix
 *   left   → Explosion ring: flat ring blast in the XZ plane
 *   right  → Rain: particles fall from above
 *
 * Per-particle depth sorting: painter's algorithm (far to near).
 * Particles closer to camera are drawn larger and brighter.
 * Fast particles trail elongated streaks in perspective.
 * Far particles tint toward fog color for atmospheric depth.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import {
  projectPoint, lookAtMatrix, perspectiveMatrix,
  type Vec3, type ScreenPoint,
} from '../math3d';
import { hexA, mixHex } from '../decorations';
import { clamp01, easeOutCubic, remap } from '../easing';

// ─── Seeded PRNG ─────────────────────────────────────────────────────────────

const mulberry32 = (seed: number) => {
  let a = (seed ^ 0xface1234) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ─── Particle definition ─────────────────────────────────────────────────────

interface Particle3D {
  // Initial position
  ox: number; oy: number; oz: number;
  // Velocity
  vx: number; vy: number; vz: number;
  // Properties
  size: number;      // base size at unit depth
  color: string;
  alpha: number;
  life: number;      // 0→1 birth→death within its own lifespan
  birthT: number;    // t01 when this particle is "born"
  deathT: number;    // t01 when it fades to zero
  hasStreak: boolean;
}

// ─── Emitter factory ─────────────────────────────────────────────────────────

const makeParticles = (
  emitter: string,
  count: number,
  colors: string[],
  seed: number,
): Particle3D[] => {
  const rng = mulberry32(seed);
  const particles: Particle3D[] = [];
  const PI2 = Math.PI * 2;

  for (let i = 0; i < count; i++) {
    const birthT = rng() * 0.3;  // stagger births across first 30% of duration
    const lifespan = 0.4 + rng() * 0.5;
    const deathT = Math.min(1, birthT + lifespan);
    const color = colors[Math.floor(rng() * colors.length)];
    const baseSize = 0.06 + rng() * 0.12;
    const speed = 0.8 + rng() * 2.2;
    let vx = 0, vy = 0, vz = 0;
    let ox = 0, oy = 0, oz = 0;

    if (emitter === 'center') {
      // Sphere burst
      const phi = Math.acos(2 * rng() - 1);
      const theta = rng() * PI2;
      vx = Math.sin(phi) * Math.cos(theta) * speed;
      vy = Math.sin(phi) * Math.sin(theta) * speed;
      vz = Math.cos(phi) * speed;
      ox = 0; oy = 0; oz = 0;

    } else if (emitter === 'top') {
      // Fountain: upward cone
      const coneAngle = (rng() * 0.5 + 0.1) * Math.PI / 4;
      const theta = rng() * PI2;
      vx = Math.sin(coneAngle) * Math.cos(theta) * speed;
      vy = Math.cos(coneAngle) * speed * 1.5;
      vz = Math.sin(coneAngle) * Math.sin(theta) * speed;
      ox = (rng() - 0.5) * 0.8;
      oy = -0.5;
      oz = (rng() - 0.5) * 0.8;

    } else if (emitter === 'bottom') {
      // Vortex helix
      const helixAngle = (i / count) * PI2 * 3 + rng() * 0.4;
      const helixR = 0.3 + rng() * 0.9;
      ox = Math.cos(helixAngle) * helixR;
      oy = -2 + rng() * 0.5;
      oz = Math.sin(helixAngle) * helixR;
      vx = -Math.sin(helixAngle) * 0.8;
      vy = (1.2 + rng() * 1.5) * speed * 0.6;
      vz =  Math.cos(helixAngle) * 0.8;

    } else if (emitter === 'left') {
      // Explosion ring in XZ plane
      const ringAngle = rng() * PI2;
      const ringSpeed = speed * (0.6 + rng() * 0.8);
      vx = Math.cos(ringAngle) * ringSpeed;
      vy = (rng() - 0.5) * 0.8;
      vz = Math.sin(ringAngle) * ringSpeed;
      ox = 0; oy = (rng() - 0.5) * 0.5; oz = 0;

    } else {
      // Rain: particles fall from above
      ox = (rng() - 0.5) * 8;
      oy = 3 + rng() * 4;
      oz = (rng() - 0.5) * 8 - 2;
      vx = (rng() - 0.5) * 0.3;
      vy = -(1.5 + rng() * 2.5);
      vz = (rng() - 0.5) * 0.3;
    }

    particles.push({
      ox, oy, oz, vx, vy, vz,
      size: baseSize,
      color,
      alpha: 0.7 + rng() * 0.3,
      life: 0,
      birthT,
      deathT,
      hasStreak: rng() > 0.55,
    });
  }

  return particles;
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export const particles3d = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;
  const anchor = p.anchor ?? 'center';
  const emitterType = anchor;

  const fadeIn  = clamp01(remap(t01, 0, 0.08));
  const fadeOut = clamp01(remap(t01, 0.88, 1.0));
  const globalAlpha = easeOutCubic(fadeIn) * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // Particle count by intensity
  const particleCount = intensity === 3 ? 280 : intensity === 1 ? 80 : 160;

  const colors = [palette.primary, palette.secondary, palette.accent,
                  mixHex(palette.primary, '#ffffff', 0.4),
                  mixHex(palette.accent, '#ffffff', 0.3)];

  // Particles are deterministic at any t01 — compute from seed
  const SEED = 0xabcd ^ (p.icon ? p.icon.charCodeAt(0) * 7 : 0);
  const particles = makeParticles(emitterType, particleCount, colors, SEED);

  // Camera: slowly orbiting, looking at center
  const camAngle = t01 * Math.PI * 0.5;
  const camZ = emitterType === 'top' ? 6 : emitterType === 'right' ? 5 : 7;
  const camY = emitterType === 'right' ? 4 : 2;
  const eye: Vec3 = {
    x: Math.sin(camAngle) * camZ,
    y: camY,
    z: Math.cos(camAngle) * camZ,
  };
  const camTarget: Vec3 = { x: 0, y: 0.5, z: 0 };
  const aspect = width / height;
  const viewMat = lookAtMatrix(eye, camTarget, { x: 0, y: 1, z: 0 });
  const projMat = perspectiveMatrix((65 * Math.PI) / 180, aspect, 0.1, 80);

  // Gravity constants by emitter type
  const gravity = emitterType === 'top' ? -1.5
    : emitterType === 'bottom' ? 0.0
    : emitterType === 'right' ? 0.0
    : -0.8;

  // Project + collect visible particles with their screen positions
  interface DrawnParticle {
    sp: ScreenPoint;
    sp2?: ScreenPoint;  // for streak: previous position
    radius: number;
    color: string;
    alpha: number;
    depth: number;
  }
  const drawn: DrawnParticle[] = [];

  for (const part of particles) {
    if (t01 < part.birthT) continue;
    if (t01 > part.deathT) continue;

    const lifeT = clamp01((t01 - part.birthT) / (part.deathT - part.birthT));

    // Physics integration: position = origin + velocity*lifeT + 0.5*g*lifeT²
    const simT = lifeT * (part.deathT - part.birthT) * 3.0; // scale time
    const wx = part.ox + part.vx * simT;
    const wy = part.oy + part.vy * simT + 0.5 * gravity * simT * simT;
    const wz = part.oz + part.vz * simT;

    const worldPt: Vec3 = { x: wx, y: wy, z: wz };
    const sp = projectPoint(worldPt, viewMat, projMat, width, height);
    if (!sp) continue;

    // Fade in/out based on particle lifespan
    const lifeFade = lifeT < 0.15
      ? lifeT / 0.15
      : lifeT > 0.75
        ? 1 - (lifeT - 0.75) / 0.25
        : 1;

    // Size scales with perspective (near=large, far=small)
    const baseRadius = part.size * Math.min(width, height) * 0.08;
    const radius = Math.max(1.5, baseRadius * sp.scale * 6);

    // Atmospheric fog: far particles tinted toward bg
    const fogT = clamp01(1 + sp.depth / 18); // depth is negative
    const fColor = fogT > 0.1 ? part.color : mixHex(part.color, palette.bg ?? '#050505', 1 - fogT);
    const fAlpha = part.alpha * lifeFade * globalAlpha * Math.max(0.1, fogT);

    // Streak: sample a tiny bit earlier in time for tail
    let sp2: ScreenPoint | undefined;
    if (part.hasStreak) {
      const prevSimT = Math.max(0, simT - 0.15);
      const px2 = part.ox + part.vx * prevSimT;
      const py2 = part.oy + part.vy * prevSimT + 0.5 * gravity * prevSimT * prevSimT;
      const pz2 = part.oz + part.vz * prevSimT;
      const s2 = projectPoint({ x: px2, y: py2, z: pz2 }, viewMat, projMat, width, height);
      sp2 = s2 ?? undefined;
    }

    drawn.push({ sp, sp2, radius, color: fColor, alpha: fAlpha, depth: sp.depth });
  }

  // Painter's algorithm: sort far to near (most negative depth first)
  drawn.sort((a, b) => a.depth - b.depth);

  ctx.save();

  for (const d of drawn) {
    if (d.alpha < 0.01 || d.radius < 0.5) continue;
    ctx.save();
    ctx.globalAlpha = d.alpha;

    if (d.sp2 && Math.hypot(d.sp.x - d.sp2.x, d.sp.y - d.sp2.y) > d.radius * 0.8) {
      // Draw streak (line from previous to current)
      const dx = d.sp.x - d.sp2.x;
      const dy = d.sp.y - d.sp2.y;
      const len = Math.hypot(dx, dy);
      const nx = -dy / len, ny = dx / len;  // perpendicular
      const hw = Math.max(1, d.radius * 0.5);  // half-width

      const sg = ctx.createLinearGradient(d.sp2.x, d.sp2.y, d.sp.x, d.sp.y);
      sg.addColorStop(0, hexA(d.color, 0));
      sg.addColorStop(0.7, hexA(d.color, d.alpha * 0.7));
      sg.addColorStop(1, hexA(d.color, d.alpha));

      ctx.beginPath();
      ctx.moveTo(d.sp2.x + nx*hw, d.sp2.y + ny*hw);
      ctx.lineTo(d.sp.x  + nx*hw, d.sp.y  + ny*hw);
      ctx.lineTo(d.sp.x  - nx*hw, d.sp.y  - ny*hw);
      ctx.lineTo(d.sp2.x - nx*hw, d.sp2.y - ny*hw);
      ctx.closePath();
      ctx.fillStyle = sg;
      ctx.fill();
    }

    // Glow halo
    const g = ctx.createRadialGradient(d.sp.x, d.sp.y, 0, d.sp.x, d.sp.y, d.radius * 2.5);
    g.addColorStop(0, hexA(d.color, 0.8));
    g.addColorStop(0.4, hexA(d.color, 0.4));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(d.sp.x, d.sp.y, d.radius * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Hard core
    ctx.fillStyle = hexA(mixHex(d.color, '#ffffff', 0.5), 0.9);
    ctx.beginPath();
    ctx.arc(d.sp.x, d.sp.y, Math.max(0.8, d.radius * 0.5), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
};
