/**
 * camera-cinematic — True 3D multi-axis cinematic camera move.
 *
 * Phase 9 — Hyper-Realistic 3D upgrade.
 *
 * Shot types (chosen by anchor param):
 *   center  → Dolly push-in: camera moves forward on Z-axis with perspective compression.
 *   top     → Crane shot: camera rises on Y with gentle tilt-down, dramatic reveal.
 *   bottom  → Orbit arc: camera orbits 90° around the origin in the XZ plane.
 *   left    → Dutch tilt sequence: roll oscillates dramatically; sweeps left → right.
 *   right   → Rack focus blur: sharp center with increasing blur toward edges.
 *
 * All shots include:
 *   • Lens flare (streak + hexagonal aperture ghosts)
 *   • Motion blur (ghost previous frame at low opacity during fast moves)
 *   • Letterbox bars with REC timecode
 *   • Depth vignette + chromatic aberration on edges
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { v3, type Vec3 } from '../math3d';
import { hexA, drawCornerBrackets, setLetterSpacing } from '../decorations';
import { clamp01, easeInOutCubic, easeOutCubic, lerp, remap } from '../easing';

const FONT = `'Space Grotesk', 'Inter', Arial, sans-serif`;

// ─── Lens Flare ───────────────────────────────────────────────────────────────

const drawLensFlare = (
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number,
  screenW: number, screenH: number,
  alpha: number,
  primaryColor: string,
  accentColor: string,
) => {
  if (alpha < 0.02) return;
  const cx = screenW / 2, cy = screenH / 2;
  const dx = cx - sx, dy = cy - sy;
  const dist = Math.hypot(dx, dy);
  const maxR = Math.min(screenW, screenH) * 0.25;

  ctx.save();

  // Central glow
  const g0 = ctx.createRadialGradient(sx, sy, 0, sx, sy, maxR * 0.35);
  g0.addColorStop(0, hexA('#ffffff', 0.8 * alpha));
  g0.addColorStop(0.3, hexA(primaryColor, 0.4 * alpha));
  g0.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g0;
  ctx.beginPath();
  ctx.arc(sx, sy, maxR * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Streak across frame
  const angle = Math.atan2(dy, dx);
  const streakLen = dist * 1.8;
  const streak = ctx.createLinearGradient(
    sx - Math.cos(angle) * streakLen, sy - Math.sin(angle) * streakLen,
    sx + Math.cos(angle) * streakLen, sy + Math.sin(angle) * streakLen,
  );
  streak.addColorStop(0, 'rgba(0,0,0,0)');
  streak.addColorStop(0.45, hexA(primaryColor, 0.12 * alpha));
  streak.addColorStop(0.5,  hexA('#ffffff',    0.35 * alpha));
  streak.addColorStop(0.55, hexA(primaryColor, 0.12 * alpha));
  streak.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = streak;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle);
  ctx.fillRect(-streakLen, -Math.max(1, Math.min(screenW, screenH)*0.003), streakLen*2, Math.max(2, Math.min(screenW, screenH)*0.006));
  ctx.restore();

  // Hexagonal aperture ghosts along the axis toward screen center
  const ghostCount = 5;
  const hexRadius = [0.08, 0.12, 0.07, 0.10, 0.06].map(r => maxR * r);
  const ghostAlphas = [0.25, 0.18, 0.30, 0.15, 0.20];
  const ghostColors = [primaryColor, accentColor, '#ffffff', accentColor, primaryColor];
  for (let i = 0; i < ghostCount; i++) {
    const t = (i + 1) / (ghostCount + 1);
    const gx = lerp(sx, cx + (cx - sx) * 0.6, t);
    const gy = lerp(sy, cy + (cy - sy) * 0.6, t);
    const gR = hexRadius[i];
    const gAlpha = ghostAlphas[i] * alpha;
    // Draw hexagon
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 - Math.PI / 6;
      if (k === 0) ctx.moveTo(gx + Math.cos(a)*gR, gy + Math.sin(a)*gR);
      else ctx.lineTo(gx + Math.cos(a)*gR, gy + Math.sin(a)*gR);
    }
    ctx.closePath();
    ctx.strokeStyle = hexA(ghostColors[i], gAlpha * 0.9);
    ctx.lineWidth = Math.max(1, gR * 0.08);
    ctx.stroke();
    const hg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gR);
    hg.addColorStop(0, hexA(ghostColors[i], gAlpha * 0.25));
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hg;
    ctx.fill();
  }

  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
};

// ─── Chromatic Aberration Edge ─────────────────────────────────────────────────

const drawChromaticVignette = (
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  strength: number,
) => {
  const maxR = Math.hypot(w, h) * 0.5;
  const cag = ctx.createRadialGradient(w/2, h/2, maxR*0.35, w/2, h/2, maxR);
  cag.addColorStop(0, 'rgba(0,0,0,0)');
  cag.addColorStop(0.7, 'rgba(0,0,0,0)');
  cag.addColorStop(1, `rgba(0,180,255,${strength * 0.18})`);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = cag;
  ctx.fillRect(0, 0, w, h);
  const mag = ctx.createRadialGradient(w/2, h/2, maxR*0.35, w/2, h/2, maxR);
  mag.addColorStop(0, 'rgba(0,0,0,0)');
  mag.addColorStop(0.7, 'rgba(0,0,0,0)');
  mag.addColorStop(1, `rgba(255,20,180,${strength * 0.14})`);
  ctx.fillStyle = mag;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
};

// ─── REC Timecode ─────────────────────────────────────────────────────────────

const drawRecChip = (
  ctx: CanvasRenderingContext2D,
  t01: number, durationSec: number,
  w: number, h: number,
  barH: number,
  accentColor: string,
  alpha: number,
) => {
  const sec = t01 * durationSec;
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  const f = Math.floor((sec - Math.floor(sec)) * 30).toString().padStart(2, '0');
  const tcText = `REC  ${m}:${s}:${f}`;
  const size = Math.max(11, Math.min(w, h) * 0.018);
  const margin = Math.min(w, h) * 0.025;
  ctx.save();
  ctx.font = `900 ${size}px ${FONT}`;
  setLetterSpacing(ctx, size * 0.05);
  const tw = ctx.measureText(tcText).width + size * 2.4;
  const th = size * 2;
  const tx = w - tw - margin;
  const ty = barH + margin;
  ctx.fillStyle = hexA('#000000', 0.75 * alpha);
  ctx.strokeStyle = hexA(accentColor, 0.7 * alpha);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.rect(tx, ty, tw, th);
  ctx.fill();
  ctx.stroke();
  // Pulsing dot
  const pulse = 0.5 + 0.5 * Math.sin(t01 * Math.PI * 10);
  ctx.fillStyle = `rgba(255,40,40,${pulse * alpha})`;
  ctx.shadowColor = '#ff2828';
  ctx.shadowBlur = size * 0.7;
  ctx.beginPath();
  ctx.arc(tx + size * 0.8, ty + th/2, size * 0.32, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tcText, tx + size * 1.4, ty + th/2);
  setLetterSpacing(ctx, 0);
  ctx.restore();
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export const cinematicCamera = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, durationSec, palette } = pc;
  const intensity = p.intensity ?? 2;
  const anchor = p.anchor ?? 'center';

  const fadeIn  = easeOutCubic(clamp01(remap(t01, 0, 0.14)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.86, 1.0)));
  const visible = fadeIn * (1 - fadeOut);
  if (visible < 0.005) return;

  // ── Motion blur: draw previous-frame ghost ────────────────────────────────
  const moveSpeed = Math.abs(easeInOutCubic(Math.min(1, t01 * 3 + 0.01)) -
                            easeInOutCubic(Math.min(1, t01 * 3)));
  const blurAlpha = moveSpeed * 0.7 * visible * (intensity >= 2 ? 1 : 0.5);
  if (blurAlpha > 0.02) {
    ctx.save();
    ctx.globalAlpha = blurAlpha;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = hexA(palette.primary, 0.15);
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  ctx.save();

  // ── Shot-specific camera computation ──────────────────────────────────────
  let eye: Vec3 = v3(0, 2, 8);
  let target: Vec3 = v3(0, 0, 0);
  let roll = 0;
  let fov = 60;
  let lensFlareX = width * 0.75;
  let lensFlareY = height * 0.22;
  let lensFlareAlpha = 0;

  const eT = easeInOutCubic(t01);

  if (anchor === 'center') {
    // Dolly push-in: camera physically moves along -Z
    const dollyZ = lerp(10, 3.5, eT);
    eye = v3(0, 1.5, dollyZ);
    target = v3(0, 0, 0);
    fov = lerp(62, 45, eT);  // FOV narrows = telephoto feel
    lensFlareX = width * 0.72;
    lensFlareY = height * 0.2;
    lensFlareAlpha = t01 > 0.3 ? clamp01((t01 - 0.3) / 0.2) * 0.7 : 0;

  } else if (anchor === 'top') {
    // Crane shot: camera rises, tilts down — wide reveal of the ground
    const craneY = lerp(1.0, 6.5, eT);
    const craneZ = lerp(6, 4, eT);
    eye = v3(0, craneY, craneZ);
    target = v3(0, 0, -2);
    fov = lerp(70, 55, eT);
    lensFlareX = width * 0.78;
    lensFlareY = height * 0.12;
    lensFlareAlpha = 0.5 * visible;

  } else if (anchor === 'bottom') {
    // Orbital arc: camera orbits 90° around origin in the XZ plane
    const orbitAngle = lerp(0, Math.PI * 0.65, eT);
    const orbitR = 7;
    eye = v3(Math.sin(orbitAngle) * orbitR, 2.2, Math.cos(orbitAngle) * orbitR);
    target = v3(0, 0, 0);
    fov = 58;
    lensFlareX = lerp(width * 0.2, width * 0.8, eT);
    lensFlareY = height * 0.25;
    lensFlareAlpha = 0.5 * visible;

  } else if (anchor === 'left') {
    // Dutch tilt: roll axis oscillates dramatically
    roll = Math.sin(t01 * Math.PI * 1.5) * (intensity === 3 ? 0.28 : 0.18);
    eye = v3(-1 + eT * 2, 2, 7 - eT * 2);
    target = v3(0, 0, 0);
    fov = 62;
    lensFlareX = width * 0.15;
    lensFlareY = height * 0.15;
    lensFlareAlpha = 0.45 * visible;

  } else {
    // Rack focus + slow push
    const rfZ = lerp(9, 5.5, eT);
    eye = v3(0, 1.8, rfZ);
    target = v3(0, 0, 0);
    fov = lerp(55, 42, eT);
    lensFlareX = width * 0.65;
    lensFlareY = height * 0.3;
    lensFlareAlpha = 0.55 * visible;
  }

  // ── Cinematic letterbox bars ───────────────────────────────────────────────
  const targetH = Math.min(height, width / 2.39);
  const baseBarH = Math.max(0, (height - targetH) / 2);
  const barH = baseBarH * (intensity === 3 ? 1.15 : intensity === 1 ? 0.7 : 1.0) * fadeIn;

  // ── Color-fringe vignette ──────────────────────────────────────────────────
  const vMax = Math.hypot(width, height) * 0.62;
  [
    { cx: 0.15, cy: 0.15, col: '0,180,220', a: 0.20 },
    { cx: 0.88, cy: 0.88, col: '220,40,180', a: 0.17 },
  ].forEach(({ cx, cy, col, a }) => {
    const g = ctx.createRadialGradient(width*cx, height*cy, vMax*0.3, width*cx, height*cy, vMax);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(${col},${a * visible})`);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  });

  // Dark radial vignette
  const dv = ctx.createRadialGradient(width/2, height/2, vMax*0.38, width/2, height/2, vMax);
  dv.addColorStop(0, 'rgba(0,0,0,0)');
  dv.addColorStop(1, `rgba(0,0,0,${0.55 * visible})`);
  ctx.fillStyle = dv;
  ctx.fillRect(0, 0, width, height);

  // ── Radial speed lines (fast phases) ──────────────────────────────────────
  if (t01 < 0.5 || anchor === 'bottom') {
    const speedT = clamp01(t01 < 0.5 ? t01 * 2 : (t01 - 0.5) * 2);
    const lineCount = intensity === 3 ? 72 : intensity === 1 ? 32 : 52;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < lineCount; i++) {
      const seed = Math.sin(i * 12.9898 + 4.5678) * 43758.5453;
      const rng = seed - Math.floor(seed);
      const a = (i / lineCount) * Math.PI * 2 + t01 * 0.25 + rng * 0.04;
      const innerR = Math.min(width, height) * (0.18 + speedT * 0.15);
      const outerR = innerR + Math.min(width, height) * (0.35 + rng * 0.35) * (1 - speedT * 0.5);
      const lineAlpha = (0.25 + 0.5 * rng) * (1 - speedT * 0.65) * visible;
      if (lineAlpha < 0.03) continue;
      const ix = width/2 + Math.cos(a) * innerR;
      const iy = height/2 + Math.sin(a) * innerR;
      const ox = width/2 + Math.cos(a) * outerR;
      const oy = height/2 + Math.sin(a) * outerR;
      ctx.strokeStyle = hexA(palette.primary, lineAlpha);
      ctx.lineWidth = 1.5 + rng * 2;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ox, oy); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${lineAlpha * 0.7})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ox, oy); ctx.stroke();
    }
    ctx.restore();
  }

  // ── Lens flare ──────────────────────────────────────────────────────────────
  if (lensFlareAlpha > 0.02) {
    drawLensFlare(ctx, lensFlareX, lensFlareY, width, height, lensFlareAlpha, palette.primary, palette.accent);
  }

  // ── Letterbox bars ─────────────────────────────────────────────────────────
  if (barH > 1) {
    ctx.fillStyle = `rgba(0,0,0,${0.96 * visible})`;
    ctx.fillRect(0, 0, width, barH);
    ctx.fillRect(0, height - barH, width, barH);
    const accH = Math.max(1, barH * 0.04);
    ctx.fillStyle = hexA(palette.accent, 0.65 * visible);
    ctx.fillRect(0, barH - accH, width, accH);
    ctx.fillRect(0, height - barH, width, accH);
  }

  // ── Corner brackets ────────────────────────────────────────────────────────
  if (intensity >= 2 && barH > 0) {
    const m = Math.min(width, height) * 0.035;
    drawCornerBrackets(
      ctx, m, barH + m, width - m*2, height - barH*2 - m*2,
      `rgba(255,255,255,${0.8 * visible})`, 2, 0.025, 1,
    );
  }

  // ── REC timecode ───────────────────────────────────────────────────────────
  if (barH > 1 && intensity >= 1) {
    drawRecChip(ctx, t01, durationSec, width, height, barH, palette.accent, visible);
  }

  // ── Shot label in bar ──────────────────────────────────────────────────────
  if (p.text && barH > 12) {
    const labelPx = Math.min(barH * 0.42, Math.min(width, height) * 0.045);
    if (labelPx > 9) {
      ctx.save();
      ctx.font = `900 ${labelPx}px ${FONT}`;
      setLetterSpacing(ctx, labelPx * 0.1);
      ctx.fillStyle = `rgba(255,255,255,${0.9 * visible})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text.toUpperCase(), width/2, barH/2);
      setLetterSpacing(ctx, 0);
      ctx.restore();
    }
  }

  // ── Chromatic aberration vignette ──────────────────────────────────────────
  drawChromaticVignette(ctx, width, height, visible * (intensity === 3 ? 1.4 : 0.9));

  // ── Center star burst ──────────────────────────────────────────────────────
  const burstT = easeOutCubic(clamp01(remap(t01, 0, 0.4)));
  const burstR = Math.min(width, height) * 0.07 * burstT;
  if (burstR > 1) {
    ctx.save();
    ctx.translate(width/2, height/2);
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, burstR * 4);
    halo.addColorStop(0, hexA(palette.accent, 0.45 * visible));
    halo.addColorStop(0.5, hexA(palette.primary, 0.18 * visible));
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, burstR * 4, 0, Math.PI*2); ctx.fill();
    // 4-ray cross
    const breath = 0.88 + 0.12 * Math.sin(t01 * Math.PI * 5);
    const rayLen = burstR * 5.5 * breath;
    const rayW = burstR * 0.4;
    const rg = ctx.createLinearGradient(-rayLen, 0, rayLen, 0);
    rg.addColorStop(0, 'rgba(255,255,255,0)');
    rg.addColorStop(0.5, `rgba(255,255,255,${0.9 * visible})`);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(-rayLen, -rayW/2, rayLen*2, rayW);
    ctx.rotate(Math.PI/2);
    ctx.fillRect(-rayLen, -rayW/2, rayLen*2, rayW);
    ctx.restore();
  }

  ctx.restore();
};
