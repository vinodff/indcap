/**
 * shimmer-text — Magic UI "Animated Shiny Text" port.
 *
 * Technique: render the text in a base color, then composite a moving
 * diagonal light bar via the `lighter` blend mode so the text underneath
 * "lights up" in the highlight pass.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, lerp, remap } from '../easing';
import { getSafeArea, fitMultiline } from '../safeArea';
import { setLetterSpacing } from '../decorations';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;
const fontTemplate = (px: number) => `900 ${px}px ${FONT_STACK}`;

export const shimmerText = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = (p.text || 'SHIMMER').toUpperCase();
  const intensity = p.intensity || 2;

  const safe = getSafeArea(width, height, 0.1);
  const desired = Math.min(width, height) * (intensity === 3 ? 0.15 : intensity === 1 ? 0.1 : 0.13);
  const { px: fontPx, lines } = fitMultiline(
    ctx,
    text,
    fontTemplate,
    safe.width,
    safe.height * 0.7,
    desired,
    height > width ? 4 : 2,
    1.1,
    Math.max(22, Math.min(width, height) * 0.045),
  );
  if (lines.length === 0) return;

  const inT = easeOutCubic(clamp01(remap(t01, 0, 0.18)));
  const fadeOut = 1 - clamp01(remap(t01, 0.88, 1));
  const visible = inT * fadeOut;
  if (visible < 0.001) return;

  const lineHeight = fontPx * 1.1;
  const totalH = lines.length * lineHeight;
  const blockTop = (height - totalH) / 2 + lineHeight / 2;

  ctx.save();
  ctx.font = fontTemplate(fontPx);
  setLetterSpacing(ctx, -fontPx * 0.015);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = visible;

  // ── Base pass: muted text color so the shimmer reads as a highlight ───
  const baseColor = palette.text;
  const mutedColor = mixWithBlack(baseColor, 0.45);
  lines.forEach((line, li) => {
    const y = blockTop + li * lineHeight;
    ctx.fillStyle = mutedColor;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = fontPx * 0.18;
    ctx.shadowOffsetY = fontPx * 0.05;
    ctx.fillText(line, width / 2, y);
  });
  ctx.shadowColor = 'transparent';

  // ── Shimmer pass: diagonal gradient that travels across, masked by text ─
  // The shimmer goes from left to right twice across the beat.
  const shimmerPhase = (t01 * 1.6) % 1;
  const beamW = Math.max(120, fontPx * 6);
  const beamX = lerp(-beamW, width + beamW, shimmerPhase);
  const angle = -Math.PI / 7; // mild diagonal

  // Build the shimmer gradient
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(beamX, height / 2);
  ctx.rotate(angle);

  const sg = ctx.createLinearGradient(-beamW / 2, 0, beamW / 2, 0);
  sg.addColorStop(0, 'rgba(255,255,255,0)');
  sg.addColorStop(0.45, 'rgba(255,255,255,0)');
  sg.addColorStop(0.5, palette.accent);
  sg.addColorStop(0.55, 'rgba(255,255,255,0)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sg;
  // The "shimmer" rect needs to cover the text vertical span
  ctx.fillRect(-beamW / 2, -height, beamW, height * 2);
  ctx.restore();

  // ── Crisp top pass: white text drawn ONLY where the shimmer overlaps ──
  // Cheap mask via clipping: redraw text in white with the shimmer position
  // controlling alpha. We approximate by drawing the text in white inside a
  // clipped region tied to the shimmer phase.
  ctx.save();
  // Clip to a vertical band that travels with the beam
  ctx.beginPath();
  const bandW = beamW * 0.6;
  const bandTopX = beamX - bandW / 2;
  // Skew the clip rect by the same angle to look like the shimmer
  ctx.save();
  ctx.translate(beamX, height / 2);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.rect(-bandW / 2, -height, bandW, height * 2);
  ctx.clip();
  // Draw the text in palette.text (white-ish) inside this clipped band
  ctx.translate(-beamX, -height / 2);
  ctx.rotate(-angle);
  lines.forEach((line, li) => {
    const y = blockTop + li * lineHeight;
    ctx.fillStyle = palette.text;
    ctx.fillText(line, width / 2, y);
  });
  ctx.restore();
  ctx.restore();
  // Suppress unused-var warning
  void bandTopX;

  setLetterSpacing(ctx, 0);
  ctx.restore();
};

function mixWithBlack(hex: string, t: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16) * (1 - t);
  const g = parseInt(h.slice(2, 4), 16) * (1 - t);
  const b = parseInt(h.slice(4, 6), 16) * (1 - t);
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}
