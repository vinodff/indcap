/**
 * split-text-reveal — Cinematic 3D perspective split text reveal.
 *
 * Text is divided at the center. The left half rotates around its Y-axis
 * and translates left; the right half mirrors the motion. A glowing accent
 * beam emanates from the split. Particles burst at the split moment, and
 * optional secondary content can be revealed behind the parting halves.
 *
 * This is a staple of high-end motion design — used in movie titles,
 * product launches, tech keynotes, and premium brand videos.
 *
 * Intensity:
 *   1 — Gentle split, subtle glow beam, no particles
 *   2 — Medium speed, beam glow, particle burst
 *   3 — Fast split, max glow + particles, secondary content revealed
 *
 * params.text — primary title text (upper case recommended)
 * params.icon — optional secondary content revealed behind the split (intensity 3)
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, drawSparkle } from '../decorations';
import { clamp01, remap, easeInOutCubic, easeOutCubic, easeOutBack, lerp } from '../easing';
import { getSafeArea, fitSingleLine } from '../safeArea';
import { drawLucideIcon } from '../iconRenderer';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;
const fontTemplate = (px: number) => `900 ${px}px ${FONT_STACK}`;

export const splitTextReveal = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = (p.text || 'SPLIT').toUpperCase();
  const intensity = p.intensity || 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = 1 - easeOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * fadeOut;
  if (globalAlpha < 0.005) return;

  const safe = getSafeArea(width, height, 0.08);
  const desiredPx = Math.min(width, height) * (intensity === 3 ? 0.18 : intensity === 1 ? 0.1 : 0.14);
  const fontPx = fitSingleLine(ctx, text, fontTemplate, safe.width, desiredPx,
    Math.max(20, Math.min(width, height) * 0.05));

  const cx = width / 2;
  const cy = height / 2;
  ctx.font = fontTemplate(fontPx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText(text).width;
  const charCount = text.length;
  const charWidth = charCount > 0 ? textWidth / charCount : fontPx * 0.6;

  // Find the split index — center of the text
  const midIdx = Math.floor(charCount / 2);
  const midX = cx - textWidth / 2 + midIdx * charWidth;

  // Split timeline
  const splitStart = 0.10;
  const splitEnd = 0.38;
  const holdStart = 0.38;
  const holdEnd = 0.78;
  const splitT = clamp01(remap(t01, splitStart, splitEnd));
  const holdT = clamp01(remap(t01, holdStart, holdEnd));
  const outT = clamp01(remap(t01, holdEnd, 1.0));

  // Split angle: 0 = closed, ~0.6π = fully open (radians)
  const angle = easeOutBack(splitT, 2.0) * 1.1;
  const slideDist = textWidth * 0.45 * easeOutBack(splitT, 1.6);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── Secondary content revealed behind split (intensity 3) ──────────
  if (intensity >= 3 && holdT > 0) {
    const revealAlpha = easeInOutCubic(clamp01(remap(holdT, 0, 0.3))) * (1 - easeInOutCubic(clamp01(remap(outT, 0, 0.4))));
    if (revealAlpha > 0.01) {
      const iconName = p.icon || 'sparkles';
      const iconSize = fontPx * 0.55;
      const iconGlow = 1 + 0.08 * Math.sin(t01 * Math.PI * 3);
      ctx.save();
      ctx.globalAlpha = globalAlpha * revealAlpha;
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = iconSize * 0.5;
      drawLucideIcon(ctx, iconName, cx, cy, iconSize * iconGlow, palette.accent, {
        fill: true,
        alpha: 1,
        glowColor: palette.accent,
        glowBlur: 12,
      });
      ctx.restore();

      // Subtle text label under icon
      if (holdT > 0.5) {
        const labelAlpha = clamp01(remap(holdT, 0.5, 0.7)) * (1 - clamp01(remap(outT, 0, 0.3)));
        ctx.font = `600 ${fontPx * 0.22}px ${FONT_STACK}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.globalAlpha = globalAlpha * labelAlpha * 0.6;
        ctx.fillStyle = hexA('#ffffff', 1);
        ctx.fillText('DISCOVER', cx, cy + fontPx * 0.4);
      }
    }
  }

  // ── Glowing center beam ──────────────────────────────────────────
  if (angle > 0.05) {
    const beamAlpha = clamp01(remap(angle, 0.1, 0.5)) * (1 - clamp01(remap(outT, 0, 0.5)));
    if (beamAlpha > 0.01) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = globalAlpha * beamAlpha * (intensity === 3 ? 0.7 : 0.4);

      const beamW = lerp(fontPx * 0.15, fontPx * 0.04, clamp01(remap(angle, 0.1, 0.8)));
      const beamH = fontPx * 1.2;

      const beamGrad = ctx.createLinearGradient(midX, cy - beamH / 2, midX, cy + beamH / 2);
      beamGrad.addColorStop(0, 'rgba(255,255,255,0)');
      beamGrad.addColorStop(0.2, hexA(palette.accent, 1));
      beamGrad.addColorStop(0.5, hexA('#ffffff', 1));
      beamGrad.addColorStop(0.8, hexA(palette.accent, 1));
      beamGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = beamGrad;

      // Soft glow aura
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = fontPx * 0.6;
      ctx.fillRect(midX - beamW / 2, cy - beamH / 2, beamW, beamH);

      // Bright core
      ctx.shadowBlur = 0;
      ctx.globalAlpha = globalAlpha * beamAlpha * 0.5;
      ctx.fillStyle = hexA('#ffffff', 1);
      ctx.fillRect(midX - beamW * 0.3, cy - beamH * 0.3, beamW * 0.6, beamH * 0.6);
      ctx.restore();
    }
  }

  // ── Particle burst at split moment ────────────────────────────────
  if (intensity >= 2 && splitT > 0.1 && splitT < 0.7) {
    const burstAlpha = clamp01(remap(splitT, 0.1, 0.25)) * (1 - clamp01(remap(splitT, 0.4, 0.7)));
    if (burstAlpha > 0.01) {
      const particleCount = intensity === 3 ? 16 : 8;
      ctx.save();
      ctx.globalAlpha = globalAlpha * burstAlpha * 0.6;

      for (let i = 0; i < particleCount; i++) {
        const seed = i * 31 + 7;
        const a = (seed * 1.7 + splitT * 2) % (Math.PI * 2);
        const dist = fontPx * (0.3 + (seed % 5) / 5 * 1.2) * easeOutCubic(clamp01(remap(splitT, 0.1, 0.6)));
        const px = midX + Math.cos(a) * dist;
        const py = cy + Math.sin(a) * dist * 0.5;
        const size = fontPx * (0.04 + (seed % 3) / 10);

        ctx.fillStyle = i % 3 === 0 ? hexA(palette.accent, 1) : hexA('#ffffff', 0.8);
        ctx.shadowColor = palette.accent;
        ctx.shadowBlur = size * 3;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ── Sparkle glints at split edges (intensity 3) ───────────────────
  if (intensity >= 3 && angle > 0.2 && angle < 0.9) {
    const glintAlpha = Math.sin(angle * Math.PI * 2) * 0.8;
    if (glintAlpha > 0.1) {
      ctx.save();
      ctx.globalAlpha = globalAlpha * glintAlpha;
      ctx.fillStyle = hexA(palette.accent, 1);
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = fontPx * 0.15;

      const leftEdgeX = midX - slideDist - textWidth * 0.15;
      const rightEdgeX = midX + slideDist + textWidth * 0.15;
      const sparkSize = fontPx * 0.1;

      drawSparkle(ctx, leftEdgeX, cy - fontPx * 0.05, sparkSize, t01 * 0.3);
      ctx.fill();
      drawSparkle(ctx, rightEdgeX, cy + fontPx * 0.05, sparkSize, -t01 * 0.3);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Draw left and right text halves ───────────────────────────────
  const leftHalf = text.slice(0, midIdx);
  const rightHalf = text.slice(midIdx);

  // Left half — rotates around right edge, slides left
  if (leftHalf) {
    const leftEdgeX = cx - textWidth / 2;
    const chars = leftHalf.length;
    const leftPivotX = leftEdgeX + chars * charWidth;

    ctx.save();
    ctx.translate(leftPivotX, cy);
    // 3D Y-rotation simulation: scale X by cos(angle), shift left
    const leftScaleX = Math.cos(angle);
    if (leftScaleX > 0.01) {
      ctx.scale(-leftScaleX, 1);
      ctx.translate(slideDist / leftScaleX, 0);
      ctx.globalAlpha = globalAlpha * clamp01(leftScaleX + 0.2);

      // Glow on the splitting edge
      const edgeGlow = clamp01(remap(angle, 0.1, 0.5));
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = fontPx * 0.3 * edgeGlow;

      ctx.fillStyle = palette.text;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(leftHalf, 0, 0);
    }
    ctx.restore();
  }

  // Right half — rotates around left edge, slides right
  if (rightHalf) {
    const rightEdgeX = cx + textWidth / 2;
    const chars = rightHalf.length;
    const rightPivotX = rightEdgeX - chars * charWidth;

    ctx.save();
    ctx.translate(rightPivotX, cy);
    const rightScaleX = Math.cos(angle);
    if (rightScaleX > 0.01) {
      ctx.scale(rightScaleX, 1);
      ctx.translate(slideDist / rightScaleX, 0);
      ctx.globalAlpha = globalAlpha * clamp01(rightScaleX + 0.2);

      const edgeGlow = clamp01(remap(angle, 0.1, 0.5));
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = fontPx * 0.3 * edgeGlow;

      ctx.fillStyle = palette.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(rightHalf, 0, 0);
    }
    ctx.restore();
  }

  // ── Ambient light sweep across the scene (intensity 2+) ───────────
  if (intensity >= 2 && angle > 0.1) {
    ctx.save();
    ctx.globalAlpha = globalAlpha * 0.04;
    const sweepAngle = (t01 * 0.8) % Math.PI;
    const sweepX1 = cx + Math.cos(sweepAngle) * textWidth;
    const sweepY1 = cy - fontPx;
    const sweepX2 = cx + Math.cos(sweepAngle + 0.3) * textWidth;
    const sweepY2 = cy + fontPx;

    const lightGrad = ctx.createLinearGradient(sweepX1, sweepY1, sweepX2, sweepY2);
    lightGrad.addColorStop(0, 'rgba(255,255,255,0)');
    lightGrad.addColorStop(0.5, hexA(palette.accent, 0.5));
    lightGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  ctx.restore();
};
