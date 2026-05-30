/**
 * circular-progress — Animated Ring Progress with Percentage Counter.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 * Inspired by Jitter's "Circular Loader" and Apple-style ring progress.
 *
 * Renders a premium circular progress indicator that:
 *   1. Background track ring fades in with glassmorphism
 *   2. Active arc fills clockwise with animated gradient sweep
 *   3. Percentage counter ticks up in the center with digit animation
 *   4. On completion (100%), a checkmark appears with sparkle burst
 *   5. Final ring pulses gently with glow aura
 *
 * params.text sets target percentage or label (e.g. "87%" or "Progress | 87")
 * If text contains "|", first part is label, second is target percent
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

export const circularProgress = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const rawText = p.text || 'Progress | 87';
  const intensity = p.intensity ?? 2;

  // Parse target percentage (default 87)
  const parts = rawText.split('|').map(s => s.trim());
  const label = parts.length > 1 ? parts[0] : '';
  const targetPercent = Math.min(100, Math.max(0, parseInt(parts[parts.length - 1]) || 87));
  const targetArc = targetPercent / 100;

  // ── Global fades ──────────────────────────────────────────────────────────
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.10)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // ── Animation phases ──────────────────────────────────────────────────────
  // Ring track appearance: 0.00 → 0.15
  const ringTrackT = easeOutCubic(clamp01(remap(t01, 0, 0.15)));

  // Arc fill: 0.10 → 0.55 (fills to target percentage)
  const arcFillT = easeOutCubic(clamp01(remap(t01, 0.10, 0.55)));

  // Counter digits: 0.18 → 0.58 (counts up)
  const counterT = easeOutCubic(clamp01(remap(t01, 0.18, 0.58)));

  // Completion sparkle burst: 0.55 → 0.75
  const completeT = clamp01(remap(t01, 0.55, 0.75));

  // Pulse idle: 0.60 → 0.88
  const pulseIdleT = clamp01(remap(t01, 0.60, 0.88));

  // Label reveal: 0.20 → 0.35
  const labelRevealT = easeOutCubic(clamp01(remap(t01, 0.20, 0.35)));

  const isComplete = arcFillT >= 1;
  const displayPercent = Math.round(lerp(0, targetPercent, counterT));

  // ── Layout with responsive sizing ────────────────────────────────────────
  const aspectRatio = width / height;
  // Responsive ring radius - larger on desktop, smaller on mobile/portrait
  const baseRingR = Math.min(width, height) * 0.15;
  const ringR = aspectRatio < 0.6 ? baseRingR * 0.85 : baseRingR;
  const ringWidth = ringR * 0.18;
  const cx = width / 2;
  let cy = height * 0.45;
  if (p.anchor === 'top') cy = height * 0.25;
  else if (p.anchor === 'bottom') cy = height * 0.65;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── Background ambient glow ───────────────────────────────────────────────
  const ambientR = ringR * 2.2;
  const bgGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, ambientR);
  bgGlow.addColorStop(0, hexA(palette.accent, 0.06 * intensity * arcFillT));
  bgGlow.addColorStop(0.5, hexA(palette.primary, 0.03 * intensity));
  bgGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bgGlow;
  ctx.fillRect(cx - ambientR, cy - ambientR, ambientR * 2, ambientR * 2);

  // ── Track ring (background) ───────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha *= ringTrackT;

  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = ringWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  // ── Active arc (filled portion) ──────────────────────────────────────────
  const arcProgress = arcFillT * targetArc;
  if (arcProgress > 0.001) {
    ctx.save();

    // Glow behind arc
    ctx.shadowColor = hexA(palette.accent, 0.4 * arcFillT);
    ctx.shadowBlur = 12 * intensity;

    // Gradient stroke along the arc
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * arcProgress;

    // Sweeping gradient
    const grad = ctx.createConicGradient(startAngle, cx, cy);
    grad.addColorStop(0, palette.primary);
    grad.addColorStop(0.3, palette.accent);
    grad.addColorStop(0.6, mixHex(palette.accent, '#ffffff', 0.3));
    grad.addColorStop(1, palette.secondary);

    ctx.beginPath();
    ctx.arc(cx, cy, ringR, startAngle, endAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = ringWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore(); // track alpha

  // ── Completion dot at end of arc ──────────────────────────────────────────
  if (arcProgress > 0.05) {
    const dotAngle = -Math.PI / 2 + Math.PI * 2 * arcProgress;
    const dotX = cx + Math.cos(dotAngle) * ringR;
    const dotY = cy + Math.sin(dotAngle) * ringR;

    ctx.save();
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(dotX, dotY, ringWidth * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = palette.accent;
    ctx.fill();
    ctx.restore();
  }

  // ── Percentage counter ────────────────────────────────────────────────────
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Responsive font sizing - smaller on small screens
  const basePercentSize = ringR * 0.55;
  const percentSize = aspectRatio < 0.6 ? basePercentSize * 0.9 : basePercentSize;
  ctx.font = `800 ${percentSize}px ${FONT}`;

  // Counter shake on each digit change
  const digitShake = counterT < 1 ? Math.sin(displayPercent * 0.5) * 1.5 : 0;

  ctx.save();
  ctx.translate(cx + digitShake, cy);

  // Gradient text
  const percentGrad = ctx.createLinearGradient(cx - ringR, cy, cx + ringR, cy);
  percentGrad.addColorStop(0, '#ffffff');
  percentGrad.addColorStop(0.5, palette.accent);
  percentGrad.addColorStop(1, hexA('#ffffff', 0.8));
  ctx.fillStyle = percentGrad;

  ctx.shadowColor = hexA(palette.accent, 0.3);
  ctx.shadowBlur = 8;

  ctx.fillText(`${displayPercent}%`, 0, 0);

  // Underline shimmer
  if (arcFillT > 0.3 && arcFillT < 1) {
    ctx.save();
    ctx.shadowBlur = 0;
    const underlineW = percentSize * 2.5 * arcFillT;
    const underlineY = percentSize * 0.45;
    const shimGrad = ctx.createLinearGradient(-underlineW / 2, underlineY, underlineW / 2, underlineY);
    shimGrad.addColorStop(0, 'rgba(255,255,255,0)');
    shimGrad.addColorStop(0.5, hexA(palette.accent, 0.6));
    shimGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shimGrad;
    ctx.fillRect(-underlineW / 2, underlineY, underlineW, 2);
    ctx.restore();
  }

  ctx.restore(); // shake
  ctx.restore(); // text align

  // ── Label below percentage with responsive sizing and truncation ──────────
  if (label) {
    ctx.save();
    ctx.globalAlpha = globalAlpha * labelRevealT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Responsive label size - scale down on small screens
    const baseLabelSize = ringR * 0.18;
    const labelSize = aspectRatio < 0.6 ? baseLabelSize * 0.85 : baseLabelSize;
    ctx.font = `600 ${labelSize}px ${FONT}`;

    // Responsive padding - 20px on desktop, 10px on mobile
    const padding = aspectRatio < 0.6 ? 10 : 20;
    const maxLabelWidth = ringR * 1.2; // 60% of circle diameter

    // Truncate or wrap label if too long
    const truncatedLabel = truncateLabelText(label.toUpperCase(), ctx, maxLabelWidth);

    ctx.fillStyle = hexA('#ffffff', 0.6);
    ctx.fillText(
      truncatedLabel,
      cx,
      cy + percentSize * 0.65 + (1 - labelRevealT) * 10 + padding,
    );
    ctx.restore();
  }

  // ── Completion sparkles (when 100% reached) ───────────────────────────────
  if (isComplete && completeT > 0 && completeT < 1) {
    const count = 6 + intensity * 3;
    ctx.save();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + completeT * 0.7;
      const dist = lerp(ringR + ringWidth, ringR + ringWidth + 60 + 40 * intensity, completeT);
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const size = lerp(3, 1, completeT) * intensity;
      const alpha = 1 - completeT;

      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = hexA(i % 2 === 0 ? palette.accent : '#ffffff', alpha);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Checkmark on completion ──────────────────────────────────────────────
  if (isComplete && completeT > 0.1) {
    ctx.save();
    const checkT = clamp01((completeT - 0.1) / 0.3);
    ctx.globalAlpha = checkT;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = ringWidth * 0.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 15;

    const checkSize = ringR * 0.4;
    const checkCx = cx;
    const checkCy = cy + ringR + ringWidth + 20;

    ctx.beginPath();
    ctx.moveTo(checkCx - checkSize * 0.3, checkCy);
    ctx.lineTo(checkCx - checkSize * 0.05, checkCy + checkSize * 0.35);
    ctx.lineTo(checkCx + checkSize * 0.4, checkCy - checkSize * 0.3);

    // Draw with stroke-dashoffset animation
    const totalLen = checkSize * 1.2;
    ctx.setLineDash([totalLen]);
    ctx.lineDashOffset = totalLen * (1 - checkT);
    ctx.stroke();
    ctx.restore();
  }

  // ── Idle pulse glow on the ring ──────────────────────────────────────────
  if (isComplete && pulseIdleT > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(pulseIdleT * Math.PI * 5);
    ctx.save();
    ctx.globalAlpha = 0.15 * pulse;
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 25 * pulse;
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = ringWidth * 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore(); // global
};

function truncateLabelText(
  text: string,
  ctx: CanvasRenderingContext2D,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + (truncated.length > 0 ? '...' : '');
}
