/**
 * card-carousel-3d — 3D Card Flip Carousel.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 *
 * Renders a stacked set of 3D feature cards that animate and flip in 3D space:
 *   - Card 0 starts at the front, Card 1 in the middle, Card 2 at the back.
 *   - At t01 = 0.5, Card 0 flips up and out, Card 1 moves to the front,
 *     and Card 2 moves to the middle position.
 *   - Renders with glassmorphism, specular outlines, and floating shadows.
 *
 * params.text accepts pipe-separated card titles:
 *   "Pro Features | Easy Setup | Fast Exports"
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import {
  v3, lookAtMatrix, perspectiveMatrix, projectPoint,
  type Vec3, type ScreenPoint,
} from '../math3d';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';
import { drawLucideIcon } from '../iconRenderer';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

// ── Rotate a 3D point around local X and Y axes ──────────────────────────────
function rotate3D(pt: Vec3, rotX: number, rotY: number): Vec3 {
  // Rotate Y
  const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
  const x1 = pt.x * cosY + pt.z * sinY;
  const z1 = -pt.x * sinY + pt.z * cosY;

  // Rotate X
  const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
  const y2 = pt.y * cosX - z1 * sinX;
  const z2 = pt.y * sinX + z1 * cosX;

  return v3(x1, y2, z2);
}

// ── Draw a filled card face with screen corners ──────────────────────────────
function fillCardFace(
  ctx: CanvasRenderingContext2D,
  a: ScreenPoint, b: ScreenPoint, c: ScreenPoint, d: ScreenPoint,
  fillStyle: string | CanvasGradient,
): void {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

// ── Draw card outline stroke ──────────────────────────────────────────────────
function strokeCardFace(
  ctx: CanvasRenderingContext2D,
  a: ScreenPoint, b: ScreenPoint, c: ScreenPoint, d: ScreenPoint,
  strokeStyle: string | CanvasGradient,
  lw: number,
): void {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lw;
  ctx.stroke();
}

// ─────────────────────────────────────────────────────────────────────────────
export const cardCarousel3d = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;

  // Global fades
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.12)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // Parse card titles
  const titles = (p.text || '').split('|').map(s => s.trim()).filter(Boolean);
  const cardData = [
    { title: titles[0] || 'PRO FEATURES', icon: 'zap', color: palette.primary },
    { title: titles[1] || 'EASY SETUP', icon: 'sparkles', color: palette.accent },
    { title: titles[2] || 'FAST EXPORTS', icon: 'tv', color: palette.secondary },
  ];

  // ── 3D Camera Setup ────────────────────────────────────────────────────────
  const camDist = 4.0;
  // Slow background orbit / drift
  const driftX = Math.sin(t01 * Math.PI * 1.5) * 0.1;
  const eye: Vec3 = { x: driftX, y: 0.2, z: camDist };
  const target: Vec3 = { x: 0, y: 0, z: 0 };
  const upVec: Vec3 = { x: 0, y: 1, z: 0 };
  const fovRad = (48 * Math.PI) / 180;
  const aspect = width / height;
  const viewMat = lookAtMatrix(eye, target, upVec);
  const projMat = perspectiveMatrix(fovRad, aspect, 0.1, 100);

  // ── Card Local Dims ────────────────────────────────────────────────────────
  const hw = 0.90; // half width
  const hh = 0.55; // half height

  // ── Animation Timings ──────────────────────────────────────────────────────
  // Entrance (0.0 -> 0.15)
  const entranceProgress = easeOutBack(clamp01(remap(t01, 0.0, 0.15)), 1.2);
  
  // Transition Phase (0.45 -> 0.65) where front card flips away and stack moves up
  const flipProgress = easeInOutCubic(clamp01(remap(t01, 0.45, 0.65)));

  // Float bob cycle
  const bobY = Math.sin(t01 * Math.PI * 4.0) * 0.06 * intensity;

  // Define position states for the three stack layers:
  // Layer 0: Front focus card
  // Layer 1: Middle stacked card
  // Layer 2: Back stacked card
  interface CardState {
    pos: Vec3;
    rotX: number;
    rotY: number;
    alpha: number;
  }

  const sFront: CardState = { pos: v3(0, bobY, 0.4), rotX: -0.06, rotY: 0, alpha: 0.96 };
  const sMid: CardState   = { pos: v3(0.18, 0.12 + bobY, -0.4), rotX: -0.04, rotY: -0.15, alpha: 0.75 };
  const sBack: CardState  = { pos: v3(0.32, 0.22 + bobY, -1.2), rotX: -0.02, rotY: -0.28, alpha: 0.45 };
  
  // Exit flip animation for the front card (flies up and rotates away)
  const sFlipOut: CardState = {
    pos: v3(-0.6, 1.2 + bobY, 1.0),
    rotX: -0.8,
    rotY: 0.3,
    alpha: 0.0,
  };

  // Interpolate state per card based on t01 progress
  const cardsToDraw: { data: typeof cardData[0]; state: CardState; index: number }[] = [];

  // Card 0: Front -> Flips Out
  const c0State: CardState = {
    pos: v3(
      lerp(sFront.pos.x, sFlipOut.pos.x, flipProgress),
      lerp(sFront.pos.y, sFlipOut.pos.y, flipProgress),
      lerp(sFront.pos.z, sFlipOut.pos.z, flipProgress),
    ),
    rotX: lerp(sFront.rotX, sFlipOut.rotX, flipProgress),
    rotY: lerp(sFront.rotY, sFlipOut.rotY, flipProgress),
    alpha: lerp(sFront.alpha, sFlipOut.alpha, flipProgress),
  };
  cardsToDraw.push({ data: cardData[0], state: c0State, index: 0 });

  // Card 1: Middle -> Front
  const c1State: CardState = {
    pos: v3(
      lerp(sMid.pos.x, sFront.pos.x, flipProgress),
      lerp(sMid.pos.y, sFront.pos.y, flipProgress),
      lerp(sMid.pos.z, sFront.pos.z, flipProgress),
    ),
    rotX: lerp(sMid.rotX, sFront.rotX, flipProgress),
    rotY: lerp(sMid.rotY, sFront.rotY, flipProgress),
    alpha: lerp(sMid.alpha, sFront.alpha, flipProgress),
  };
  cardsToDraw.push({ data: cardData[1], state: c1State, index: 1 });

  // Card 2: Back -> Middle
  const c2State: CardState = {
    pos: v3(
      lerp(sBack.pos.x, sMid.pos.x, flipProgress),
      lerp(sBack.pos.y, sMid.pos.y, flipProgress),
      lerp(sBack.pos.z, sMid.pos.z, flipProgress),
    ),
    rotX: lerp(sBack.rotX, sMid.rotX, flipProgress),
    rotY: lerp(sBack.rotY, sMid.rotY, flipProgress),
    alpha: lerp(sBack.alpha, sMid.alpha, flipProgress),
  };
  cardsToDraw.push({ data: cardData[2], state: c2State, index: 2 });

  // Painter's sorting: Sort cards by Z depth (average center depth) so back renders first
  cardsToDraw.sort((a, b) => a.state.pos.z - b.state.pos.z);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── Render background ambient glow ─────────────────────────────────────────
  {
    const glow = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.min(width, height) * 0.6);
    glow.addColorStop(0, hexA(palette.primary, 0.08));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  // ── Render Stack of Cards ──────────────────────────────────────────────────
  for (const card of cardsToDraw) {
    const { title, icon, color } = card.data;
    const { pos, rotX, rotY, alpha } = card.state;

    // Apply entrance scaling offset
    const scale = entranceProgress;
    const finalHW = hw * scale;
    const finalHH = hh * scale;

    // Define 4 local corners
    const localCorners = [
      v3(-finalHW,  finalHH, 0), // Top-Left
      v3( finalHW,  finalHH, 0), // Top-Right
      v3( finalHW, -finalHH, 0), // Bottom-Right
      v3(-finalHW, -finalHH, 0), // Bottom-Left
    ];

    // Rotate and translate corners into world space, then project to screen
    const pts = localCorners.map(pt => {
      const rotated = rotate3D(pt, rotX, rotY);
      const translated = v3(rotated.x + pos.x, rotated.y + pos.y, rotated.z + pos.z);
      return projectPoint(translated, viewMat, projMat, width, height);
    });

    // Skip if any point failed projection
    if (pts.some(pt => !pt)) continue;

    const [ptl, ptr, pbr, pbl] = pts as ScreenPoint[];

    ctx.save();
    ctx.globalAlpha *= alpha;

    // 1. Draw Card Drop Shadow (floating relative to card depth)
    {
      const shadowOffset = 18 * ptl.scale;
      const sh_ptl = { ...ptl, y: ptl.y + shadowOffset };
      const sh_ptr = { ...ptr, y: ptr.y + shadowOffset };
      const sh_pbr = { ...pbr, y: pbr.y + shadowOffset };
      const sh_pbl = { ...pbl, y: pbl.y + shadowOffset };
      fillCardFace(ctx, sh_ptl, sh_ptr, sh_pbr, sh_pbl, hexA('#000000', 0.16 * alpha));
    }

    // 2. Glassmorphic Card fill
    const cardGrad = ctx.createLinearGradient(ptl.x, ptl.y, pbr.x, pbr.y);
    cardGrad.addColorStop(0, hexA('#ffffff', 0.12));
    cardGrad.addColorStop(0.5, hexA('#ffffff', 0.04));
    cardGrad.addColorStop(1, hexA('#000000', 0.15));
    fillCardFace(ctx, ptl, ptr, pbr, pbl, cardGrad);

    // Accent backing color tint glow (edge blur simulation)
    const tintGrad = ctx.createLinearGradient(ptl.x, ptl.y, pbr.x, pbr.y);
    tintGrad.addColorStop(0, hexA(color, 0.12));
    tintGrad.addColorStop(1, 'transparent');
    fillCardFace(ctx, ptl, ptr, pbr, pbl, tintGrad);

    // 3. Specular Border Outlines
    const strokeGrad = ctx.createLinearGradient(ptl.x, ptl.y, pbr.x, pbr.y);
    strokeGrad.addColorStop(0, 'rgba(255,255,255,0.45)');
    strokeGrad.addColorStop(0.4, hexA(color, 0.2));
    strokeGrad.addColorStop(1, 'rgba(0,0,0,0.3)');
    strokeCardFace(ctx, ptl, ptr, pbr, pbl, strokeGrad, 1.8 * ptl.scale);

    // Left colored edge accent strip
    ctx.beginPath();
    ctx.moveTo(ptl.x, ptl.y);
    ctx.lineTo(pbl.x, pbl.y);
    const leftEdgeGrad = ctx.createLinearGradient(ptl.x, ptl.y, pbl.x, pbl.y);
    leftEdgeGrad.addColorStop(0, color);
    leftEdgeGrad.addColorStop(1, mixHex(color, '#000000', 0.4));
    ctx.strokeStyle = leftEdgeGrad;
    ctx.lineWidth = 3.5 * ptl.scale;
    ctx.stroke();

    // 4. Content Center Layout (Icon & Label)
    const ccx = (ptl.x + ptr.x + pbr.x + pbl.x) / 4;
    const ccy = (ptl.y + ptr.y + pbr.y + pbl.y) / 4;
    const angle = Math.atan2(ptr.y - ptl.y, ptr.x - ptl.x);

    ctx.save();
    ctx.translate(ccx, ccy);
    ctx.rotate(angle);

    const contentScale = ptl.scale * 1.5;
    ctx.scale(contentScale, contentScale);

    // Draw Icon (shifted left)
    const iconSize = 26;
    const gap = 10;
    ctx.font = `700 16px ${FONT}`;
    const textW = ctx.measureText(title).width;
    const totalW = iconSize + gap + textW;

    const startX = -totalW / 2 + iconSize / 2;
    const textX = startX + iconSize / 2 + gap + textW / 2;

    ctx.save();
    ctx.translate(startX, 0);
    // Add micro-rotation bounce for icon
    ctx.rotate(Math.sin(t01 * Math.PI * 2 + card.index) * 0.15);
    drawLucideIcon(ctx, icon, 0, 0, iconSize, color, { fill: true, glowColor: color, glowBlur: 10 });
    ctx.restore();

    // Draw Text Label
    const textGrad = ctx.createLinearGradient(-textW/2, -10, textW/2, 10);
    textGrad.addColorStop(0, '#ffffff');
    textGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = textGrad;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, textX, 0);

    ctx.restore(); // end content transform

    ctx.restore(); // end card alpha
  }

  ctx.restore();
};
