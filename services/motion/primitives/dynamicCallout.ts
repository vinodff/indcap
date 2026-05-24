/**
 * dynamic-callout — Dynamic Blueprint Specification Callout & Pointer Line.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 *
 * Renders:
 *   1. A pulsing coordinate crosshair focal target on a specific point.
 *   2. An animated pointer line (diagonal, then horizontal) drawing over time.
 *   3. A neon laser pulse sliding along the drawn line.
 *   4. A glassmorphic specs card snapping open with spring scale overshoot.
 *   5. Inside: category badge chip, bold title, and fine description lines.
 *
 * params.text accepts pipe-separated inputs:
 *   "Category Badge | Title Spec | Description Detail"
 *   e.g. "DISPLAY | Ultra Retina XDR | 120Hz Refresh Rate"
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

// ── Draw Crosshair / Pulse Target ───────────────────────────────────────────
function drawCrosshair(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string, pulse: number): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;

  // Outer target ring
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.4 * (1 + pulse * 0.25), 0, Math.PI * 2);
  ctx.stroke();

  // Core dot
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Tick marks
  const tickLen = 6;
  ctx.beginPath();
  // Top
  ctx.moveTo(cx, cy - size * 0.2); ctx.lineTo(cx, cy - size * 0.2 - tickLen);
  // Bottom
  ctx.moveTo(cx, cy + size * 0.2); ctx.lineTo(cx, cy + size * 0.2 + tickLen);
  // Left
  ctx.moveTo(cx - size * 0.2, cy); ctx.lineTo(cx - size * 0.2 - tickLen, cy);
  // Right
  ctx.moveTo(cx + size * 0.2, cy); ctx.lineTo(cx + size * 0.2 + tickLen, cy);
  ctx.stroke();

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
export const dynamicCallout = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;

  // Global fades
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.10)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.90, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // Parse pipe-separated texts
  const labels = (p.text || '').split('|').map(s => s.trim()).filter(Boolean);
  const badgeLabel = labels[0] || 'SPECIFICATION';
  const titleLabel = labels[1] || 'OLED Display';
  const descLabel  = labels[2] || '120Hz ProMotion';

  // ── Coordinates ────────────────────────────────────────────────────────────
  // Anchor at center-left, callout box floats center-right
  const fx = width * 0.34;
  const fy = height * 0.53;
  const p1x = fx + 70,  p1y = fy - 70;
  const p2x = fx + 210, p2y = fy - 70;

  // ── Timelines ──────────────────────────────────────────────────────────────
  // 0.05 → 0.22: Focus target appears & pulses
  // 0.22 → 0.38: Diagonal line segment grows
  // 0.38 → 0.54: Horizontal line segment grows
  // 0.54 → 0.72: Specs card snaps open
  // 0.72 → 0.90: Idle float bobbing
  const targetT = easeOutCubic(clamp01(remap(t01, 0.05, 0.22)));
  const line1T  = clamp01(remap(t01, 0.22, 0.38));
  const line2T  = clamp01(remap(t01, 0.38, 0.54));
  const cardT   = easeOutBack (clamp01(remap(t01, 0.54, 0.72)), 1.25);

  const bobY = Math.sin(t01 * Math.PI * 3.5) * 4 * intensity;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── 1. Focus Target ────────────────────────────────────────────────────────
  if (targetT > 0.05) {
    const pulse = (t01 * 5) % 1.0;
    ctx.save();
    ctx.globalAlpha = targetT;
    drawCrosshair(ctx, fx, fy, 28, palette.primary, pulse);
    ctx.restore();
  }

  // ── 2. Pointer Line Segments ───────────────────────────────────────────────
  let curX = fx;
  let curY = fy;

  if (line1T > 0) {
    ctx.save();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    curX = lerp(fx, p1x, line1T);
    curY = lerp(fy, p1y, line1T);
    ctx.lineTo(curX, curY);
    ctx.stroke();
    ctx.restore();
  }

  if (line2T > 0) {
    ctx.save();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    curX = lerp(p1x, p2x, line2T);
    curY = p1y; // horizontal
    ctx.lineTo(curX, curY);
    ctx.stroke();
    ctx.restore();
  }

  // Laser Pulse Dot running along the line
  if (t01 > 0.22 && t01 < 0.54) {
    const totalLineT = clamp01(remap(t01, 0.22, 0.54));
    let dotX = fx;
    let dotY = fy;
    if (totalLineT < 0.5) {
      const tNorm = totalLineT / 0.5;
      dotX = lerp(fx, p1x, tNorm);
      dotY = lerp(fy, p1y, tNorm);
    } else {
      const tNorm = (totalLineT - 0.5) / 0.5;
      dotX = lerp(p1x, p2x, tNorm);
      dotY = p1y;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
  }

  // ── 3. Specifications Glass Card ───────────────────────────────────────────
  if (cardT > 0.005) {
    const cardW = 195;
    const cardH = 74;

    ctx.save();
    // Card snaps open anchored to Node 2 (p2x, p2y)
    ctx.translate(p2x, p2y + bobY);
    ctx.scale(cardT, cardT);

    // Glass panel fill
    roundRect(ctx, 0, -cardH / 2, cardW, cardH, 14);
    ctx.fillStyle = hexA('#ffffff', 0.08);
    ctx.fill();

    // Specular linear boundary
    const borderGrad = ctx.createLinearGradient(0, -cardH/2, cardW, cardH/2);
    borderGrad.addColorStop(0, 'rgba(255,255,255,0.22)');
    borderGrad.addColorStop(1, 'rgba(0,0,0,0.2)');
    roundRect(ctx, 0, -cardH / 2, cardW, cardH, 14);
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Vertical color band at start edge
    roundRect(ctx, 0, -cardH / 2, 4, cardH, 2);
    ctx.fillStyle = palette.accent;
    ctx.fill();

    // Category badge chip
    const chipW = ctx.measureText(badgeLabel).width * 0.8 + 14;
    const chipH = 15;
    const chipY = -cardH / 2 + 10;
    roundRect(ctx, 12, chipY, chipW, chipH, 3);
    ctx.fillStyle = hexA(palette.accent, 0.18);
    ctx.fill();
    roundRect(ctx, 12, chipY, chipW, chipH, 3);
    ctx.strokeStyle = hexA(palette.accent, 0.4);
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.font = `700 8.5px ${FONT}`;
    ctx.fillStyle = palette.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeLabel, 12 + chipW / 2, chipY + chipH / 2 + 0.5);

    // Main specs title
    ctx.font = `700 14px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleLabel, 12, -cardH / 2 + 36);

    // Specs description detail
    ctx.font = `600 10.5px ${FONT}`;
    ctx.fillStyle = hexA('#ffffff', 0.55);
    ctx.fillText(descLabel, 12, -cardH / 2 + 56);

    ctx.restore();
  }

  ctx.restore();
};
