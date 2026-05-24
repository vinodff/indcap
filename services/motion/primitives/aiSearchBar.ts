/**
 * ai-search-bar — AI-style animated search input with sparkles and live thinking state.
 *
 * Renders a glassmorphic search bar with:
 *   1. Animated search icon (magnifying glass) with glow pulse
 *   2. Sparkle particles emanating from the input area
 *   3. Live thinking state: animated cursor, pulsing dots, shimmer
 *   4. Smooth morph between idle → focused → thinking states
 *   5. Typing simulation with staggered character reveal
 *   6. Subtle ambient glow beneath the search bar
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect, drawSparkle } from '../decorations';
import { clamp01, remap, easeInOutCubic, easeOutCubic, lerp } from '../easing';
import { drawLucideIcon } from '../iconRenderer';

const FONT = `'Inter', 'SF Pro Display', 'Segoe UI', sans-serif`;

interface SparkleParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  angle: number;
}

export const aiSearchBar = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = p.text || 'Ask AI anything...';
  const intensity = p.intensity || 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.12)));
  const fadeOut = 1 - easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const visible = fadeIn * fadeOut;
  if (visible < 0.005) return;

  const cx = width / 2;
  const cy = height / 2;

  // Bar dimensions
  const barW = Math.min(width * 0.82, 520);
  const barH = Math.min(height * 0.14, 56);
  const barX = cx - barW / 2;
  const barY = cy - barH / 2;
  const radius = barH * 0.45;

  // State machine based on t01
  const idleEnd = 0.25;
  const focusStart = 0.25;
  const focusEnd = 0.45;
  const thinkingStart = 0.45;
  const thinkingEnd = 0.82;
  const resultStart = 0.82;

  const stateT = (s: number, e: number) => clamp01(remap(t01, s, e));

  const idleT = stateT(0, idleEnd);
  const focusT = stateT(focusStart, focusEnd);
  const thinkT = stateT(thinkingStart, thinkingEnd);
  const resultT = stateT(resultStart, 1.0);

  ctx.save();
  ctx.globalAlpha = visible;

  // ── Ambient glow beneath the bar ─────────────────────────────────────
  const glowScaleY = 1 + 0.5 * (1 - idleT);
  ctx.save();
  const ambientGlow = ctx.createRadialGradient(cx, barY + barH, 0, cx, barY + barH, barW * 0.5 * glowScaleY);
  ambientGlow.addColorStop(0, hexA(palette.accent, 0.12 * (1 - idleT)));
  ambientGlow.addColorStop(0.5, hexA(palette.accent, 0.04 * (1 - idleT)));
  ambientGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ambientGlow;
  ctx.fillRect(barX - 20, barY + barH - 10, barW + 40, barH * 1.2);
  ctx.restore();

  // ── Bar background (glassmorphism) ───────────────────────────────────
  ctx.save();
  ctx.shadowColor = hexA(palette.primary, 0.15);
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;

  const barBgGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
  barBgGrad.addColorStop(0, hexA('#ffffff', 0.12));
  barBgGrad.addColorStop(0.5, hexA('#ffffff', 0.06));
  barBgGrad.addColorStop(1, hexA('#ffffff', 0.03));
  ctx.fillStyle = barBgGrad;
  roundRect(ctx, barX, barY, barW, barH, radius);
  ctx.fill();
  ctx.restore();

  // ── Bar border ───────────────────────────────────────────────────────
  const borderAlpha = lerp(0.08, 0.25, Math.max(focusT, thinkT));
  const borderGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY + barH);
  borderGrad.addColorStop(0, hexA(palette.primary, borderAlpha));
  borderGrad.addColorStop(0.5, hexA(palette.accent, borderAlpha * 1.5));
  borderGrad.addColorStop(1, hexA(palette.secondary, borderAlpha));
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 1.2;
  roundRect(ctx, barX, barY, barW, barH, radius);
  ctx.stroke();

  // ── Search icon (magnifying glass) ───────────────────────────────────
  const iconSize = barH * 0.42;
  const iconX = barX + barH * 0.35;
  const iconY = cy;
  const iconPulse = 1 + 0.08 * Math.sin(t01 * Math.PI * (focusT > 0 ? 8 : 3));

  ctx.save();
  if (focusT > 0) {
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 8 * focusT;
  }
  drawLucideIcon(ctx, 'sparkles', iconX, iconY, iconSize * iconPulse, palette.accent, {
    fill: thinkT > 0,
    alpha: 1,
    glowColor: palette.accent,
    glowBlur: thinkT > 0 ? 10 : 0,
  });
  ctx.restore();

  // ── Input text ───────────────────────────────────────────────────────
  const inputX = iconX + iconSize * 0.7;
  const inputY = cy;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  if (idleT < 1) {
    // Show placeholder text
    const placeholderAlpha = 1 - focusT;
    ctx.font = `500 ${barH * 0.35}px ${FONT}`;
    ctx.fillStyle = hexA('#ffffff', 0.3 * placeholderAlpha);
    ctx.fillText(text, inputX, inputY);
  }

  // ── Typing simulation (staggered character reveal during thinking) ───
  if (thinkT > 0) {
    const typedText = text;
    const charCount = Math.floor(clamp01(remap(thinkT, 0, 0.7)) * typedText.length);
    const visibleText = typedText.slice(0, charCount);

    ctx.font = `500 ${barH * 0.38}px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(visibleText, inputX, inputY);

    // ── Animated cursor ────────────────────────────────────────────────
    const cursorBlink = Math.sin(t01 * Math.PI * 5) > 0;
    if (cursorBlink) {
      const cursorX = inputX + ctx.measureText(visibleText).width + 4;
      ctx.fillStyle = hexA(palette.accent, 0.9);
      ctx.fillRect(cursorX, inputY - barH * 0.22, 2, barH * 0.44);
    }

    // ── Thinking dots (when fully typed or during) ─────────────────────
    const dotPhase = charCount >= typedText.length ? 0 : 0.5;
    const dotCount = 3;
    const dotSize = max(3, barH * 0.06);
    const dotGap = dotSize * 2.5;
    const dotsX = inputX + ctx.measureText(visibleText).width + 14;

    for (let i = 0; i < dotCount; i++) {
      const dotAlpha = 0.3 + 0.7 * Math.sin(t01 * Math.PI * 3 + i * 1.5 + dotPhase);
      ctx.fillStyle = hexA(palette.accent, dotAlpha);
      ctx.beginPath();
      ctx.arc(dotsX + i * dotGap, inputY, dotSize * (0.6 + 0.4 * dotAlpha), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Result text ──────────────────────────────────────────────────────
  if (resultT > 0) {
    const resultAlpha = easeOutCubic(resultT);
    ctx.font = `500 ${barH * 0.38}px ${FONT}`;
    ctx.fillStyle = hexA('#ffffff', resultAlpha);
    ctx.fillText(text, inputX, inputY);
  }

  // ── Sparkle particles around the search bar ──────────────────────────
  const sparkleCount = intensity === 3 ? 10 : intensity === 1 ? 3 : 6;
  const sparkleActive = focusT > 0 || thinkT > 0;

  if (sparkleActive) {
    const sparkleAlpha = lerp(0.3, 0.9, Math.max(focusT, thinkT));

    for (let i = 0; i < sparkleCount; i++) {
      const seed = i * 73 + 17;
      const angle = (seed * 1.3 + t01 * 0.5) % (Math.PI * 2);
      const dist = barW * 0.5 * (0.3 + (Math.sin(seed + t01 * 2) * 0.5 + 0.5) * 0.5);
      const sx = cx + Math.cos(angle) * dist;
      const sy = cy + Math.sin(angle) * dist * 0.6;
      const sparkSize = barH * 0.08 * (0.5 + 0.5 * Math.sin(t01 * 2.5 + i * 1.1));
      const sa = sparkleAlpha * (0.3 + 0.7 * (Math.sin(t01 * 3 + i * 0.7) * 0.5 + 0.5));

      ctx.save();
      ctx.globalAlpha = sa;
      ctx.fillStyle = hexA(i % 2 === 0 ? palette.accent : palette.primary, 1);
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = sparkSize * 2;
      drawSparkle(ctx, sx, sy, sparkSize, t01 * 0.5 + i);
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Shimmer sweep across the bar (thinking state) ────────────────────
  if (thinkT > 0) {
    const sweepX = (barX - barW * 0.3) + (t01 * 0.6 % 1) * barW * 1.6;
    ctx.save();
    ctx.clip();
    const shimmerGrad = ctx.createLinearGradient(sweepX, barY, sweepX + barW * 0.2, barY);
    shimmerGrad.addColorStop(0, 'rgba(255,255,255,0)');
    shimmerGrad.addColorStop(0.5, hexA(palette.accent, 0.08));
    shimmerGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shimmerGrad;
    ctx.fillRect(barX, barY, barW, barH);
    ctx.restore();
  }

  ctx.restore();
};

function max(a: number, b: number): number { return a > b ? a : b; }
