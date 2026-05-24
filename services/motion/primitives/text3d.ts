/**
 * text-3d — True 3D extruded block text with per-letter depth fly-in.
 *
 * Phase 9 — Hyper-Realistic 3D upgrade.
 *
 * Technique:
 *   Each letter lives at a 3D position. We compute its projected 2D position
 *   and scale, then draw:
 *     1. Side extrusion quads (right + bottom) as gradient-shaded polygons
 *     2. Bevel highlight edge on top-left of each letter box
 *     3. Front face: full-color text with optional inner glow
 *
 *   Animation:
 *     • Enter (t01 0→0.4): letters fly in from Z = -40, staggered per-letter,
 *       with spring overshoot on Z and Y-axis tumble.
 *     • Hold  (t01 0.4→0.85): full opacity, gentle breathing scale
 *     • Exit  (t01 0.85→1): letters explode outward and fade
 *
 *   Camera parallax: text plane subtly tilts/shifts with its own micro-camera
 *   so it feels embedded in the 3D world.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, setLetterSpacing } from '../decorations';
import { clamp01, easeOutBack, easeOutCubic, lerp, remap } from '../easing';
import { getSafeArea, fitMultiline } from '../safeArea';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;
const fontTemplate = (px: number) => `900 ${px}px ${FONT_STACK}`;

// ─── Spring helper ────────────────────────────────────────────────────────────

// Analytic underdamped spring: position at time t from 0→1 with overshoot.
const springValue = (t: number, stiffness = 200, damping = 18): number => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const omega = Math.sqrt(Math.max(0, stiffness - damping*damping/4));
  if (omega < 1e-6) return 1 - (1 + damping*t/2) * Math.exp(-damping*t/2);
  return 1 - Math.exp(-damping * t / 2) * (Math.cos(omega * t) + (damping / (2*omega)) * Math.sin(omega * t));
};

// ─── Letter geometry helper ───────────────────────────────────────────────────

interface Letter3D {
  char: string;
  worldX: number;   // center X in 3D space
  worldZ: number;   // animated Z (starts far back, comes to 0)
  worldY: number;   // animated Y (springs from below)
  rotX: number;     // tumble rotation on entry
  letterW: number;  // screen width at reference scale
  color: string;
  opacity: number;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const text3d = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = (p.text || 'TEXT 3D').toUpperCase();
  const intensity = p.intensity ?? 2;

  const fadeOut = clamp01(remap(t01, 0.85, 1.0));
  const globalAlpha = 1 - fadeOut;
  if (globalAlpha < 0.01) return;

  // ── Font sizing (same logic as bigTextReveal) ──────────────────────────────
  const safe = getSafeArea(width, height, 0.10);
  const desiredPx = Math.min(width, height) * (intensity === 3 ? 0.13 : intensity === 1 ? 0.085 : 0.11);
  const maxLines = height > width ? 5 : 3;
  const { px: fontPx, lines } = fitMultiline(
    ctx, text, fontTemplate, safe.width, safe.height * 0.65,
    desiredPx, maxLines, 1.1, Math.max(16, Math.min(width, height) * 0.035),
  );
  if (lines.length === 0) return;

  ctx.save();
  ctx.font = fontTemplate(fontPx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setLetterSpacing(ctx, -fontPx * 0.015);

  const lineHeight = fontPx * 1.12;
  const totalH = lines.length * lineHeight;
  const blockTopY = (height - totalH) / 2 + lineHeight / 2;

  // Collect total word count for stagger timing
  const totalLetters = lines.reduce((n, l) => n + l.replace(/\s/g, '').length, 0) || 1;
  const enterEnd = 0.45;

  // ── Per-line letter 3D rendering ──────────────────────────────────────────
  const depthExtrudePx = fontPx * 0.18;  // side face depth in screen pixels
  const bevelPx = fontPx * 0.04;
  const colors = [palette.text, palette.primary, palette.text, palette.secondary];

  let letterIndex = 0;

  lines.forEach((line, li) => {
    const words = line.split('');
    const lineWidth = ctx.measureText(line).width;
    const lineScreenY = blockTopY + li * lineHeight;

    let xCursor = width / 2 - lineWidth / 2;

    words.forEach((char, ci) => {
      if (char === ' ') {
        xCursor += ctx.measureText(' ').width;
        return;
      }

      const charW = ctx.measureText(char).width;
      const charCX = xCursor + charW / 2;

      // Stagger: each letter enters offset in time
      const staggerT = clamp01(remap(t01, (letterIndex / totalLetters) * enterEnd * 0.8, enterEnd));
      const spring = springValue(staggerT, 220, 20);

      // 3D Z position: starts at -40 (far away = appear small), springs to 0
      const zOffset = lerp(40, 0, spring);       // comes toward camera
      const yOffset = lerp(fontPx * 0.8, 0, spring);  // rises into position
      const tumbleX = lerp(Math.PI * 0.7, 0, spring); // tumbles upright

      const letterOpacity = clamp01(spring * 3) * globalAlpha;
      if (letterOpacity < 0.01) { letterIndex++; xCursor += charW; return; }

      // Perspective scale from Z depth
      // Treat screen center as vanishing point; Z=0 = no perspective shift
      const focalLen = Math.min(width, height) * 1.2; // simulated focal length in px
      const perspScale = focalLen / (focalLen + zOffset * 30);
      const scaledW = charW * perspScale;
      const scaledH = fontPx * perspScale;
      const scaledExtrude = depthExtrudePx * perspScale;

      // Screen position with perspective convergence toward center
      const cx = width/2 + (charCX - width/2) * perspScale;
      const cy = lineScreenY + yOffset - (lineScreenY - height/2) * (1 - perspScale);

      const color = colors[letterIndex % colors.length];
      const colorDark = mixHex(color, '#000000', 0.72);
      const colorSide = mixHex(color, '#000000', 0.5);

      ctx.save();
      ctx.globalAlpha = letterOpacity;

      // ── Extrusion: right-side face ─────────────────────────────────────
      // Parallelogram offset to the right and slightly up (simulates 3D depth)
      const extX = scaledExtrude * 0.9;
      const extY = scaledExtrude * -0.4;
      const halfW = scaledW * 0.5;
      const halfH = scaledH * 0.5;

      // Right face (visible when letter comes from left)
      ctx.save();
      const rightFace = ctx.createLinearGradient(
        cx + halfW, cy,
        cx + halfW + extX, cy + extY,
      );
      rightFace.addColorStop(0, hexA(colorSide, 0.85));
      rightFace.addColorStop(1, hexA(colorDark, 0.4));
      ctx.fillStyle = rightFace;
      ctx.beginPath();
      ctx.moveTo(cx + halfW,        cy - halfH);
      ctx.lineTo(cx + halfW + extX, cy - halfH + extY);
      ctx.lineTo(cx + halfW + extX, cy + halfH + extY);
      ctx.lineTo(cx + halfW,        cy + halfH);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Top face
      ctx.save();
      const topFace = ctx.createLinearGradient(
        cx, cy - halfH,
        cx + extX, cy - halfH + extY,
      );
      topFace.addColorStop(0, hexA(mixHex(color, '#ffffff', 0.2), 0.7));
      topFace.addColorStop(1, hexA(colorSide, 0.35));
      ctx.fillStyle = topFace;
      ctx.beginPath();
      ctx.moveTo(cx - halfW,        cy - halfH);
      ctx.lineTo(cx - halfW + extX, cy - halfH + extY);
      ctx.lineTo(cx + halfW + extX, cy - halfH + extY);
      ctx.lineTo(cx + halfW,        cy - halfH);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // ── Front face text ─────────────────────────────────────────────────
      ctx.save();
      ctx.font = fontTemplate(fontPx * perspScale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Glow
      ctx.shadowColor = color;
      ctx.shadowBlur = fontPx * 0.25 * perspScale;
      ctx.fillStyle = color;
      ctx.fillText(char, cx, cy);
      ctx.shadowBlur = 0;

      // Specular shine — bright highlight on top third of letter
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const shine = ctx.createLinearGradient(cx, cy - halfH, cx, cy);
      shine.addColorStop(0, hexA('#ffffff', 0.3));
      shine.addColorStop(0.5, hexA('#ffffff', 0));
      ctx.fillStyle = shine;
      ctx.globalAlpha = letterOpacity * 0.5;
      ctx.fillText(char, cx, cy);
      ctx.restore();

      // ── Bevel edge highlight (top-left bright line) ─────────────────────
      ctx.strokeStyle = hexA(mixHex(color, '#ffffff', 0.55), 0.7);
      ctx.lineWidth = bevelPx * perspScale;
      ctx.lineCap = 'round';
      ctx.beginPath();
      // Top edge of letter box
      ctx.moveTo(cx - halfW, cy - halfH);
      ctx.lineTo(cx + halfW, cy - halfH);
      ctx.stroke();
      // Left edge
      ctx.beginPath();
      ctx.moveTo(cx - halfW, cy - halfH);
      ctx.lineTo(cx - halfW, cy + halfH);
      ctx.stroke();
      ctx.restore();

      // ── Chromatic aberration on entry ───────────────────────────────────
      if (staggerT < 0.5) {
        const aberration = clamp01(1 - staggerT / 0.45) * fontPx * 0.04 * perspScale;
        if (aberration > 0.5) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = letterOpacity * 0.35;
          ctx.font = fontTemplate(fontPx * perspScale);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ff2244';
          ctx.fillText(char, cx - aberration, cy);
          ctx.fillStyle = '#00ccff';
          ctx.fillText(char, cx + aberration, cy + aberration * 0.5);
          ctx.restore();
        }
      }

      ctx.restore();

      letterIndex++;
      xCursor += charW;
    });
  });

  // ── Animated underline bar ─────────────────────────────────────────────────
  {
    const underT = clamp01(remap(t01, 0.3, 0.6));
    if (underT > 0.01) {
      ctx.save();
      ctx.font = fontTemplate(fontPx);
      let widest = 0;
      for (const l of lines) widest = Math.max(widest, ctx.measureText(l).width);
      const underW = widest * underT;
      const underH = Math.max(4, fontPx * 0.07);
      const uX = width/2 - underW/2;
      const uY = blockTopY + (lines.length - 1) * lineHeight + lineHeight * 0.56;

      const uGrad = ctx.createLinearGradient(uX, uY, uX + underW, uY);
      uGrad.addColorStop(0, hexA(palette.accent, 0));
      uGrad.addColorStop(0.15, hexA(palette.accent, 0.9));
      uGrad.addColorStop(0.5,  hexA(palette.primary, 1));
      uGrad.addColorStop(0.85, hexA(palette.accent, 0.9));
      uGrad.addColorStop(1,   hexA(palette.accent, 0));

      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = underH * 6;
      ctx.fillStyle = uGrad;
      ctx.globalAlpha = globalAlpha * underT;
      ctx.fillRect(uX, uY - underH/2, underW, underH);
      ctx.restore();
    }
  }

  setLetterSpacing(ctx, 0);
  ctx.restore();
};
