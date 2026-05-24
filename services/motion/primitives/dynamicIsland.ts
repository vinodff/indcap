/**
 * dynamic-island — Apple Dynamic Island interaction clone with morph states.
 *
 * Renders a pill-shaped UI element that morphs through states:
 *   1. COLLAPSED: Small pill at top center (default idle state)
 *   2. EXPANDING: Pill stretches horizontally with smooth morph
 *   3. EXPANDED: Full-width island showing content (icon + text)
 *   4. INTERACTING: Glow pulse, shimmer sweep, active state
 *   5. CONTRACTING: Reverse morph back to collapsed state
 *
 * Features:
 *   - Smooth bezier morph between pill and expanded rect
 *   - Glassmorphic background with dynamic lighting
 *   - Content fades in/out during expansion/contraction
 *   - Subtle floating animation in collapsed state
 *   - Glow intensifies during interaction
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeInOutCubic, easeOutCubic, easeOutBack, lerp } from '../easing';
import { drawLucideIcon } from '../iconRenderer';

const FONT = `'Inter', 'SF Pro Display', 'Segoe UI', sans-serif`;

export const dynamicIsland = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = p.text || 'Now Playing';
  const intensity = p.intensity || 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.1)));
  const fadeOut = 1 - easeInOutCubic(clamp01(remap(t01, 0.85, 1.0)));
  const globalAlpha = fadeIn * fadeOut;
  if (globalAlpha < 0.005) return;

  // State timeline
  const collapsedEnd = 0.2;
  const expandStart = 0.2;
  const expandEnd = 0.4;
  const expandedHold = 0.7;
  const contractStart = 0.7;
  const contractEnd = 0.88;

  const collapsedT = clamp01(remap(t01, 0, collapsedEnd));
  const expandT = clamp01(remap(t01, expandStart, expandEnd));
  const holdT = clamp01(remap(t01, expandEnd, expandedHold));
  const contractT = clamp01(remap(t01, contractStart, contractEnd));

  // Morph progress: 0 = collapsed pill, 1 = fully expanded
  const morphProgress = (() => {
    if (expandT > 0 && expandT < 1) return easeOutBack(expandT, 1.5);
    if (holdT > 0 && holdT < 1) return 1;
    if (contractT > 0) return 1 - easeInOutCubic(contractT);
    return 0;
  })();

  const isExpanded = morphProgress > 0.01;
  const isCollapsed = morphProgress < 0.01;

  const cx = width / 2;
  const topY = height * 0.06;

  // Dimensions morphing
  const collapsedW = Math.min(width * 0.12, 120);
  const collapsedH = Math.min(height * 0.035, 32);
  const expandedW = Math.min(width * 0.7, 360);
  const expandedH = Math.min(height * 0.065, 52);

  const pillW = lerp(collapsedW, expandedW, morphProgress);
  const pillH = lerp(collapsedH, expandedH, morphProgress);
  const pillRadius = pillH / 2;

  const pillX = cx - pillW / 2;
  const pillY = topY + (isCollapsed ? Math.sin(t01 * Math.PI * 3) * 3 : 0);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── Ambient glow behind the island ───────────────────────────────────
  const glowIntensity = isExpanded ? 0.15 : 0.05;
  const glowSize = pillW * 1.2;
  ctx.save();
  const glowGrad = ctx.createRadialGradient(cx, pillY + pillH / 2, 0, cx, pillY + pillH / 2, glowSize);
  glowGrad.addColorStop(0, hexA(palette.accent, glowIntensity));
  glowGrad.addColorStop(0.5, hexA(palette.primary, glowIntensity * 0.5));
  glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(cx - glowSize, pillY - glowSize * 0.5, glowSize * 2, glowSize * 2);
  ctx.restore();

  // ── Island pill background ───────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = hexA(palette.primary, isExpanded ? 0.25 : 0.1);
  ctx.shadowBlur = isExpanded ? 30 : 12;
  ctx.shadowOffsetY = isExpanded ? 8 : 4;

  const bgGrad = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillH);
  bgGrad.addColorStop(0, hexA('#ffffff', 0.15));
  bgGrad.addColorStop(0.2, hexA('#ffffff', 0.08));
  bgGrad.addColorStop(0.8, hexA('#000000', 0.15));
  bgGrad.addColorStop(1, hexA('#000000', 0.25));
  ctx.fillStyle = bgGrad;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillRadius);
  ctx.fill();
  ctx.restore();

  // ── Border with dynamic glow ─────────────────────────────────────────
  const borderAlpha = lerp(0.1, 0.35, morphProgress);
  const borderGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
  borderGrad.addColorStop(0, hexA(palette.primary, borderAlpha));
  borderGrad.addColorStop(0.4, hexA('#ffffff', borderAlpha * 0.5));
  borderGrad.addColorStop(0.7, hexA(palette.accent, borderAlpha));
  borderGrad.addColorStop(1, hexA(palette.secondary, borderAlpha * 0.7));
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 1;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillRadius);
  ctx.stroke();

  // ── Inner highlight (top edge specular) ──────────────────────────────
  ctx.save();
  roundRect(ctx, pillX + 1, pillY + 1, pillW - 2, pillH * 0.4, pillRadius);
  ctx.clip();
  const highlightGrad = ctx.createLinearGradient(0, pillY, 0, pillY + pillH * 0.4);
  highlightGrad.addColorStop(0, hexA('#ffffff', 0.1));
  highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = highlightGrad;
  ctx.fillRect(pillX, pillY, pillW, pillH * 0.4);
  ctx.restore();

  // ── Content (visible when expanded) ──────────────────────────────────
  if (isExpanded) {
    const contentAlpha = clamp01(remap(morphProgress, 0.3, 0.8));
    if (contentAlpha > 0.01) {
      ctx.globalAlpha = globalAlpha * contentAlpha;

      // Icon
      const iconSize = pillH * 0.45;
      const iconX = pillX + pillH * 0.35;
      const iconY = pillY + pillH / 2;
      const iconGlow = 1 + 0.1 * Math.sin(t01 * Math.PI * 4);

      ctx.save();
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = 6 * holdT;
      drawLucideIcon(ctx, 'sparkles', iconX, iconY, iconSize * iconGlow, palette.accent, {
        fill: holdT > 0.5,
        alpha: 1,
        glowColor: palette.accent,
        glowBlur: holdT > 0.3 ? 8 : 0,
      });
      ctx.restore();

      // Text
      const textX = iconX + iconSize * 0.8;
      ctx.font = `600 ${pillH * 0.34}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, textX, iconY);

      // Subtitle or status (during hold/interaction phase)
      if (holdT > 0.3 && intensity >= 2) {
        const subAlpha = clamp01(remap(holdT, 0.3, 0.6));
        ctx.font = `500 ${pillH * 0.22}px ${FONT}`;
        ctx.fillStyle = hexA('#ffffff', 0.5 * subAlpha);

        // Measure title width to position subtitle
        const titleW = ctx.measureText(text).width;
        const subX = textX + titleW + 12;
        ctx.textAlign = 'left';

        // Animated thinking dots
        const dotCount = 3;
        const dotSize = max(2.5, pillH * 0.05);
        for (let i = 0; i < dotCount; i++) {
          const dotAlpha = 0.3 + 0.7 * Math.sin(t01 * Math.PI * 4 + i * 1.8);
          ctx.fillStyle = hexA(palette.accent, dotAlpha * subAlpha);
          ctx.beginPath();
          ctx.arc(subX + i * dotSize * 2.5, iconY, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // ── Shimmer sweep during interaction ─────────────────────────────────
  if (holdT > 0.2 && intensity >= 2) {
    ctx.save();
    roundRect(ctx, pillX, pillY, pillW, pillH, pillRadius);
    ctx.clip();

    const sweepSpeed = 2.5;
    const sweepPos = (t01 * sweepSpeed) % 1;
    const sweepX = pillX - pillW * 0.3 + sweepPos * pillW * 1.6;

    const shimmerGrad = ctx.createLinearGradient(sweepX, pillY, sweepX + pillW * 0.25, pillY);
    shimmerGrad.addColorStop(0, 'rgba(255,255,255,0)');
    shimmerGrad.addColorStop(0.5, hexA(palette.accent, 0.06));
    shimmerGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shimmerGrad;
    ctx.fillRect(pillX, pillY, pillW, pillH);
    ctx.restore();
  }

  // ── Edge glow pulse while expanded ───────────────────────────────────
  if (holdT > 0.3) {
    const pulseAlpha = 0.1 + 0.1 * Math.sin(t01 * Math.PI * 3);
    const pulseGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
    pulseGrad.addColorStop(0, hexA(palette.accent, pulseAlpha));
    pulseGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = pulseGrad;
    ctx.lineWidth = 1.5;
    roundRect(ctx, pillX, pillY, pillW, pillH, pillRadius);
    ctx.stroke();
  }

  ctx.restore();
};

function max(a: number, b: number): number { return a > b ? a : b; }
