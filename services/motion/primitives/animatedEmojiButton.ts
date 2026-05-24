/**
 * animated-emoji-button — Large Emoji Button with Pulse & Click Burst.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 * Inspired by Jitter's "Animated Emoji Button" and "Interactive Button: Glow".
 *
 * Renders a large circular glass button with an animated emoji that:
 *   1. Springs in from center with elastic overshoot and wobble
 *   2. Emoji gently pulses/breathes with a glowing ring aura
 *   3. On "click" (mid-timeline), button squishes, emoji compresses,
 *      then a radial shockwave + particle burst explodes outward
 *   4. Emoji morphs to a success state (checkmark/star) with sparkles
 *   5. Final state glows before exit fade
 *
 * params.icon selects the emoji (use emoji or lucide icon name)
 * params.text shown as label below the button
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';
import { drawLucideIcon } from '../iconRenderer';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

interface Sparkle {
  angle: number;
  speed: number;
  size: number;
  color: string;
  phase: number;
}

export const animatedEmojiButton = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const emoji = p.icon || '🎉';
  const label = p.text || '';
  const intensity = p.intensity ?? 2;

  // ── Global fades ──────────────────────────────────────────────────────────
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // ── Animation phases ──────────────────────────────────────────────────────
  // Entry: 0.00 → 0.20 (spring in)
  const entryT = easeOutBack(clamp01(remap(t01, 0, 0.20)), 1.4);

  // Idle pulse: 0.20 → 0.50
  const pulseT = clamp01(remap(t01, 0.20, 0.50));

  // Click squish: 0.50 → 0.58 (compress), 0.58 → 0.64 (release bounce)
  const clicked = t01 >= 0.50;
  const clickCompressT = clamp01(remap(t01, 0.50, 0.57));
  const clickReleaseT = easeOutBack(clamp01(remap(t01, 0.57, 0.64)), 1.2);

  // Shockwave: 0.57 → 0.78
  const shockwaveT = clamp01(remap(t01, 0.57, 0.78));

  // Particle burst: 0.58 → 0.80
  const particleT = clamp01(remap(t01, 0.58, 0.80));

  // Success state fade: 0.64 → 0.72
  const successT = easeOutCubic(clamp01(remap(t01, 0.64, 0.72)));

  // ── Layout ────────────────────────────────────────────────────────────────
  const btnR = Math.min(width, height) * 0.12;
  const cx = width / 2;
  let cy = height * 0.45;
  if (p.anchor === 'top') cy = height * 0.25;
  else if (p.anchor === 'bottom') cy = height * 0.65;

  // Button scale: entry → click squish
  const entryScale = lerp(0, 1, entryT);
  const squishX = clicked
    ? lerp(1, 1.12, clickCompressT) * lerp(1.12, 1, clickReleaseT)
    : 1;
  const squishY = clicked
    ? lerp(1, 0.85, clickCompressT) * lerp(0.85, 1, clickReleaseT)
    : 1;
  const scale = entryScale * (1 - fadeOut * 0.2);

  // Idle glow pulse
  const glowPulse = 0.85 + 0.15 * Math.sin(pulseT * Math.PI * 4);

  // Emoji wobble during entry
  const wobbleRot = (1 - entryT) * 0.15 * Math.sin(t01 * 30);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── Background ambient glow ───────────────────────────────────────────────
  const ambientR = btnR * 3.5 * glowPulse;
  const bgGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, ambientR);
  bgGlow.addColorStop(0, hexA(palette.accent, 0.10 * intensity * glowPulse));
  bgGlow.addColorStop(0.4, hexA(palette.primary, 0.05 * intensity));
  bgGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bgGlow;
  ctx.fillRect(0, 0, width, height);

  // ── Shockwave ring ────────────────────────────────────────────────────────
  if (clicked && shockwaveT > 0 && shockwaveT < 1) {
    ctx.save();
    const ringR = btnR + shockwaveT * 120 * intensity;
    ctx.strokeStyle = hexA(palette.accent, 0.7 * (1 - shockwaveT));
    ctx.lineWidth = lerp(4, 1, shockwaveT) * intensity;
    ctx.shadowColor = hexA(palette.accent, 0.5 * (1 - shockwaveT));
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Particle burst ────────────────────────────────────────────────────────
  if (clicked && particleT > 0 && particleT < 1) {
    const count = 8 + intensity * 4;
    const colors = [palette.accent, palette.primary, palette.secondary, '#ffffff'];
    ctx.save();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + particleT * 0.5;
      const dist = lerp(btnR * 0.3, btnR * 1.8 + 60 * intensity, particleT);
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist;
      const size = lerp(5, 1.5, particleT) * intensity;
      const alpha = 1 - particleT;
      ctx.fillStyle = hexA(colors[i % colors.length], alpha);
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Draw the button ───────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale * squishX, scale * squishY);
  ctx.rotate(wobbleRot);

  // Drop shadow
  ctx.shadowColor = hexA(palette.accent, 0.3 * glowPulse);
  ctx.shadowBlur = 20 * glowPulse * intensity;
  ctx.shadowOffsetY = 8;

  // Button circle background
  ctx.beginPath();
  ctx.arc(0, 0, btnR, 0, Math.PI * 2);
  const btnGrad = ctx.createRadialGradient(-btnR * 0.3, -btnR * 0.3, 0, 0, 0, btnR);
  btnGrad.addColorStop(0, hexA(mixHex(palette.primary, '#ffffff', 0.3), 0.9));
  btnGrad.addColorStop(0.6, hexA(palette.primary, 0.85));
  btnGrad.addColorStop(1, hexA(mixHex(palette.primary, '#000000', 0.3), 0.95));
  ctx.fillStyle = btnGrad;
  ctx.fill();

  // Border stroke
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = hexA('#ffffff', 0.25);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, btnR - 1, 0, Math.PI * 2);
  ctx.stroke();

  // Inner glossy sheen
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, btnR, 0, Math.PI * 2);
  ctx.clip();
  const sheenGrad = ctx.createLinearGradient(-btnR, -btnR, btnR, btnR);
  sheenGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
  sheenGrad.addColorStop(0.3, 'rgba(255,255,255,0)');
  sheenGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
  sheenGrad.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(-btnR, -btnR, btnR * 2, btnR * 2);
  ctx.restore();

  // ── Emoji / Icon ──────────────────────────────────────────────────────────
  const iconSize = btnR * 1.1;
  let showEmoji = !clicked || successT < 0.1;
  let showSuccessIcon = clicked && successT > 0;

  // Emoji wobble animation
  if (showEmoji) {
    ctx.save();
    const emojiScale = clicked
      ? lerp(1, 0.7, clickCompressT) * lerp(0.7, 1, clickReleaseT)
      : 0.9 + 0.1 * Math.sin(pulseT * Math.PI * 3);
    ctx.scale(emojiScale, emojiScale);
    ctx.font = `${iconSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'transparent';
    ctx.fillText(emoji, 0, 2);
    ctx.restore();
  }

  // Success icon (checkmark/star overlay)
  if (showSuccessIcon) {
    ctx.save();
    const successScale = lerp(1.6, 1, successT);
    const successRot = successT < 1 ? lerp(-Math.PI * 0.3, 0, successT) : 0;
    ctx.scale(successScale, successScale);
    ctx.rotate(successRot);
    ctx.globalAlpha = successT;

    drawLucideIcon(ctx, 'sparkles', 0, 0, iconSize * 0.8, palette.accent, { fill: true });
    ctx.restore();
  }

  ctx.restore(); // button transform

  // ── Label below button ────────────────────────────────────────────────────
  if (label) {
    ctx.save();
    ctx.globalAlpha = globalAlpha * entryT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelSize = Math.min(width, height) * 0.028;
    ctx.font = `700 ${labelSize}px ${FONT}`;

    // Gradient text
    const labelGrad = ctx.createLinearGradient(0, cy + btnR + 12, 0, cy + btnR + 12 + labelSize * 2);
    labelGrad.addColorStop(0, '#ffffff');
    labelGrad.addColorStop(1, hexA('#ffffff', 0.7));
    ctx.fillStyle = labelGrad;

    const labelY = cy + btnR + 12 + (1 - entryT) * 20;
    ctx.fillText(label.toUpperCase(), cx, labelY);
    ctx.restore();
  }

  ctx.restore(); // global
};
