/**
 * polaroid-stack — Vintage Polaroid Photo Stack with Fan Layout.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 * Inspired by polaroid / instant camera aesthetic in modern motion design.
 *
 * Renders a stack of polaroid-style photos that:
 *   1. Drop in from above one by one with elastic bounce and slight rotation
 *   2. Each has a white border frame, dark inner "photo" area with gradient fill
 *   3. Stack fans out with staggered rotation offsets (-6 to +6 degrees)
 *   4. Heavy drop shadows create depth between layers
 *   5. Once settled, a caption label peels in from below the stack
 *   6. Gentle idle sway animation before exit fade
 *
 * params.text accepts pipe-separated labels for each photo:
 *   "Label 1 | Label 2 | Label 3"
 *   e.g. "Idea → Script → Render"
 *
 * params.icon controls the photo content style:
 *   "gradient" (default) — abstract gradient fills per photo
 *   "grid" — tech/blueprint grid pattern
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

interface PolaroidPhoto {
  label: string;
  color: string;
  accentColor: string;
}

export const polaroidStack = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const rawLabels = (p.text || 'Idea → Script → Render').split('|').map(s => s.trim());
  const photoStyle = (p.icon ?? 'gradient') as 'gradient' | 'grid';
  const intensity = p.intensity ?? 2;

  const photoCount = Math.min(rawLabels.length, 4);
  const labels = rawLabels.slice(0, photoCount);

  // Generate photo configs
  const photoColors = [palette.primary, palette.accent, palette.secondary, mixHex(palette.primary, palette.accent, 0.5)];
  const photos: PolaroidPhoto[] = labels.map((label, i) => ({
    label,
    color: photoColors[i % photoColors.length],
    accentColor: i === 0 ? palette.accent : photoColors[(i + 1) % photoColors.length],
  }));

  // ── Global fades ──────────────────────────────────────────────────────────
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.06)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // ── Layout ────────────────────────────────────────────────────────────────
  const polaroidW = Math.min(width * 0.40, 200);
  const polaroidH = polaroidW * 1.25;
  const borderSize = polaroidW * 0.08;
  const photoW = polaroidW - borderSize * 2;
  const photoH = polaroidH - borderSize * 2 - polaroidW * 0.08;

  const cx = width / 2;
  let cy = height * 0.45;
  if (p.anchor === 'top') cy = height * 0.28;
  else if (p.anchor === 'bottom') cy = height * 0.62;

  // Rotation offsets for fan effect
  const rotations = [-6, 4, -2, 8];

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── Background ambient warmth ─────────────────────────────────────────────
  const warmR = polaroidW * 2;
  const warmth = ctx.createRadialGradient(cx, cy, 0, cx, cy, warmR);
  warmth.addColorStop(0, hexA('#fef3c7', 0.05 * intensity));
  warmth.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = warmth;
  ctx.fillRect(cx - warmR, cy - warmR, warmR * 2, warmR * 2);

  // ── Draw each polaroid (back to front, so first is at bottom) ────────────
  for (let pi = 0; pi < photos.length; pi++) {
    const photo = photos[pi];
    const isLast = pi === photos.length - 1;

    // Stagger: each drops in with delay
    const dropDelay = 0.06 + pi * 0.12;
    const dropT = easeOutBack(clamp01(remap(t01, dropDelay, dropDelay + 0.20)), 1.3);

    // Each photo also fades in slightly before its drop
    const preFade = clamp01(remap(t01, dropDelay - 0.04, dropDelay));

    if (dropT <= 0.001 && preFade <= 0) continue;
    const visible = dropT > 0 ? dropT : preFade;

    // Fan positioning
    const fanAngle = (rotations[pi] || 0) * (Math.PI / 180);
    const fanOffsetX = pi * -polaroidW * 0.04;
    const fanOffsetY = pi * -polaroidH * 0.02;

    // Drop animation: fall from above with bounce
    const dropY = lerp(-polaroidH * 1.5, 0, dropT);
    const dropRot = lerp(-0.15, 0, dropT);
    const totalRot = fanAngle + dropRot;

    // Idle sway
    const swayPhase = pi * 0.5 + (t01 - dropDelay) * 1.5;
    const sway = dropT >= 1 ? Math.sin(swayPhase) * 0.5 * (Math.PI / 180) : 0;

    ctx.save();
    ctx.globalAlpha = visible;
    ctx.translate(cx + fanOffsetX, cy + fanOffsetY + dropY);
    ctx.rotate(totalRot + sway);

    // ── Drop shadow ───────────────────────────────────────────────────────
    const shadowDepth = (photos.length - pi) * 3;
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 12 + shadowDepth;
    ctx.shadowOffsetX = -2 + pi * 0.5;
    ctx.shadowOffsetY = 4 + pi * 1.5;

    // ── Polaroid white frame ──────────────────────────────────────────────
    const halfW = polaroidW / 2;
    const halfH = polaroidH / 2;
    roundRect(ctx, -halfW, -halfH, polaroidW, polaroidH, 4);
    ctx.fillStyle = mixHex('#fefefe', '#f5f0e8', 0.3);
    ctx.fill();

    // Subtle frame border
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.5;
    roundRect(ctx, -halfW, -halfH, polaroidW, polaroidH, 4);
    ctx.stroke();

    // ── Inner photo area ──────────────────────────────────────────────────
    const imgX = -photoW / 2;
    const imgY = -halfH + borderSize;
    const imgR = 2;

    // Photo area shadow (inner shadow effect)
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;

    // Photo gradient background
    roundRect(ctx, imgX, imgY, photoW, photoH, imgR);
    const photoGrad = ctx.createLinearGradient(imgX, imgY, imgX + photoW, imgY + photoH);

    if (photoStyle === 'gradient') {
      photoGrad.addColorStop(0, hexA(mixHex(photo.color, '#ffffff', 0.3), 0.6));
      photoGrad.addColorStop(0.4, hexA(photo.color, 0.5));
      photoGrad.addColorStop(0.7, hexA(photo.accentColor, 0.4));
      photoGrad.addColorStop(1, hexA(mixHex(photo.accentColor, '#000000', 0.3), 0.5));
    } else {
      photoGrad.addColorStop(0, hexA('#1a1a2e', 0.7));
      photoGrad.addColorStop(1, hexA('#0f0f1a', 0.8));
    }
    ctx.fillStyle = photoGrad;
    ctx.fill();
    ctx.restore();

    // ── Grid overlay for "grid" style ─────────────────────────────────────
    if (photoStyle === 'grid') {
      ctx.save();
      roundRect(ctx, imgX, imgY, photoW, photoH, imgR);
      ctx.clip();

      ctx.strokeStyle = hexA(palette.accent, 0.08);
      ctx.lineWidth = 0.5;
      const gridSpacing = photoW * 0.12;
      for (let gx = imgX; gx < imgX + photoW; gx += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(gx, imgY);
        ctx.lineTo(gx, imgY + photoH);
        ctx.stroke();
      }
      for (let gy = imgY; gy < imgY + photoH; gy += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(imgX, gy);
        ctx.lineTo(imgX + photoW, gy);
        ctx.stroke();
      }

      // Center crosshair
      ctx.strokeStyle = hexA(palette.accent, 0.2);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, imgY + photoH * 0.4);
      ctx.lineTo(0, imgY + photoH * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-5, imgY + photoH * 0.5);
      ctx.lineTo(5, imgY + photoH * 0.5);
      ctx.stroke();

      ctx.restore();
    }

    // ── Accent stripe on photo (like a color streak) ──────────────────────
    ctx.save();
    const stripeY = imgY + photoH * 0.15;
    const stripeH = photoH * 0.04;
    ctx.fillStyle = hexA(photo.accentColor, 0.25);
    roundRect(ctx, imgX + photoW * 0.08, stripeY, photoW * 0.84, stripeH, 2);
    ctx.fill();
    ctx.restore();

    // ── Decorative icon / shape inside photo area ─────────────────────────
    ctx.save();
    const iconSize = photoW * 0.12;
    ctx.font = `${iconSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const icons = ['📸', '🎬', '✨', '🎯'];
    ctx.fillText(icons[pi % icons.length], 0, imgY + photoH * 0.55);
    ctx.restore();

    // ── Label at bottom of polaroid ───────────────────────────────────────
    ctx.save();
    const labelSize = polaroidW * 0.065;
    ctx.font = `600 ${labelSize}px ${FONT}`;
    ctx.fillStyle = '#444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Label reveal (peel in)
    if (pi === photos.length - 1) {
      const labelReveal = easeOutCubic(clamp01(remap(t01, dropDelay + 0.15, dropDelay + 0.28)));
      ctx.globalAlpha = labelReveal;
      ctx.translate(0, lerp(labelSize * 1.5, 0, labelReveal));
    }

    const labelY = halfH - borderSize * 1.4;
    ctx.fillText(photo.label, 0, labelY);
    ctx.restore();

    // ── Corner decoration (tiny rounded accent) ───────────────────────────
    if (isLast) {
      const cdR = 3;
      const cdGap = 6;
      ctx.fillStyle = hexA(palette.accent, 0.3);
      ctx.beginPath();
      ctx.arc(-halfW + cdGap, -halfH + cdGap, cdR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(halfW - cdGap, -halfH + cdGap, cdR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-halfW + cdGap, halfH - cdGap, cdR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(halfW - cdGap, halfH - cdGap, cdR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // polaroid transform
  }

  // ── Subtitle below stack ──────────────────────────────────────────────────
  const subtitleReveal = easeOutCubic(clamp01(remap(t01, 0.55, 0.70)));
  if (subtitleReveal > 0.01 && photos.length > 0) {
    ctx.save();
    ctx.globalAlpha = globalAlpha * subtitleReveal;
    ctx.translate(0, lerp(12, 0, subtitleReveal));

    const subSize = Math.min(width, height) * 0.022;
    ctx.font = `500 ${subSize}px ${FONT}`;
    ctx.fillStyle = hexA('#ffffff', 0.5);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Subtle line above
    const lineW = Math.min(width * 0.15, 80);
    ctx.strokeStyle = hexA(palette.accent, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - lineW / 2, cy + polaroidH / 2 + 20);
    ctx.lineTo(cx + lineW / 2, cy + polaroidH / 2 + 20);
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore(); // global
};
