/**
 * title-opener — Premium cinematic title opener at After Effects template quality.
 *
 * A complete title sequence combining multiple animation layers:
 *   1. Deep space gradient background with drifting nebula orbs
 *   2. Orbiting decorative rings and geometric accents
 *   3. Main title with staggered per-character elastic reveal (scale + fade)
 *   4. Glowing accent bar that draws across beneath the title
 *   5. Subtitle that slides up with soft blur-in
 *   6. Floating particle field with sparkle glints
 *   7. Film grain overlay and subtle vignette
 *   8. Light sweep across the scene during the reveal
 *
 * This is the kind of template that sells for $20-40 on Envato/VideoHive.
 * Use it for video intros, chapter titles, keynote moments, brand openers.
 *
 * params.text       — main title text (default: "CREATERIN")
 * params.icon       — emoji or icon name for decorative accent
 * param intensity   — 1=simple, 2=standard, 3=premium (full production)
 *
 * Timeline:
 *   0.00-0.10 — background fade-in, orbs start drifting
 *   0.00-0.08 — decorative geometry appears
 *   0.08-0.28 — main title letters animate in (staggered)
 *   0.28-0.38 — accent bar draws across
 *   0.38-0.50 — subtitle slides up
 *   0.50-0.85 — hold with gentle ambient animation
 *   0.85-1.00 — fade out
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, drawSparkle, roundRect } from '../decorations';
import { clamp01, remap, easeInOutCubic, easeOutCubic, easeOutBack, lerp } from '../easing';
import { getSafeArea, fitSingleLine } from '../safeArea';
import { drawLucideIcon } from '../iconRenderer';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;
const fontTemplate = (px: number) => `900 ${px}px ${FONT_STACK}`;

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface OrbConfig {
  cx: number; cy: number; r: number;
  ampX: number; ampY: number;
  freqX: number; freqY: number;
  phaseX: number; phaseY: number;
  pulseFreq: number; pulseAmp: number;
  color: string; alpha: number;
}

export const titleOpener = (pc: PrimitiveContext, p: ParamType): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = (p.text || 'CREATERIN').toUpperCase();
  const intensity = p.intensity || 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.10)));
  const fadeOut = 1 - easeInOutCubic(clamp01(remap(t01, 0.85, 1.0)));
  const globalAlpha = fadeIn * fadeOut;
  if (globalAlpha < 0.005) return;

  const safe = getSafeArea(width, height, 0.08);
  const desiredPx = Math.min(width, height) * (intensity === 3 ? 0.14 : intensity === 1 ? 0.09 : 0.115);
  const fontPx = fitSingleLine(ctx, text, fontTemplate, safe.width, desiredPx,
    Math.max(24, Math.min(width, height) * 0.05));

  const cx = width / 2;
  const cy = height / 2;
  const diag = Math.hypot(width, height);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── 1. Deep space background ─────────────────────────────────────
  const bgGrad = ctx.createRadialGradient(cx, height * 0.35, 0, cx, height * 0.35, diag * 0.65);
  bgGrad.addColorStop(0, hexA(mixHex(palette.bg || '#0a0a14', palette.primary, 0.12), 1));
  bgGrad.addColorStop(0.5, hexA(mixHex(palette.bg || '#0a0a14', palette.primary, 0.04), 1));
  bgGrad.addColorStop(1, hexA(palette.bg || '#0a0a14', 1));
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // ── 2. Nebula orbs (drifting color blobs) ─────────────────────────
  const orbCount = intensity === 3 ? 5 : intensity === 1 ? 2 : 3;
  const orbColors = [
    mixHex(palette.primary, '#ffffff', 0.3),
    mixHex(palette.accent, '#ffffff', 0.2),
    mixHex(palette.secondary, '#ffffff', 0.35),
    mixHex(palette.primary, palette.accent, 0.5),
    mixHex(palette.secondary, palette.accent, 0.4),
  ];
  const orbs: OrbConfig[] = [];
  for (let i = 0; i < orbCount; i++) {
    const s = seededRand(i * 137 + 42);
    orbs.push({
      cx: 0.15 + s() * 0.7,
      cy: 0.15 + s() * 0.7,
      r: 0.12 + s() * 0.18,
      ampX: 0.03 + s() * 0.08, ampY: 0.03 + s() * 0.08,
      freqX: 0.2 + s() * 0.5, freqY: 0.2 + s() * 0.5,
      phaseX: s() * Math.PI * 2, phaseY: s() * Math.PI * 2,
      pulseFreq: 0.3 + s() * 0.8, pulseAmp: 0.05 + s() * 0.1,
      color: orbColors[i % orbColors.length],
      alpha: 0.25 + s() * 0.2,
    });
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const t = t01 * Math.PI * 2;
  for (const orb of orbs) {
    const dx = Math.sin(t * orb.freqX + orb.phaseX) * orb.ampX;
    const dy = Math.cos(t * orb.freqY + orb.phaseY) * orb.ampY;
    const ox = (orb.cx + dx) * width;
    const oy = (orb.cy + dy) * height;
    const pulse = 1 + Math.sin(t * orb.pulseFreq) * orb.pulseAmp;
    const r = orb.r * Math.min(width, height) * pulse;
    const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
    grad.addColorStop(0, hexA(orb.color, orb.alpha));
    grad.addColorStop(0.4, hexA(orb.color, orb.alpha * 0.4));
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── 3. Decorative geometric rings ─────────────────────────────────
  if (intensity >= 2) {
    ctx.save();
    ctx.strokeStyle = hexA(palette.accent, 0.08);
    ctx.lineWidth = 1;

    for (let i = 0; i < (intensity === 3 ? 3 : 2); i++) {
      const ringR = diag * (0.25 + i * 0.12);
      const rotSpeed = 0.3 + i * 0.15;
      const rot = t01 * Math.PI * 2 * rotSpeed;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(1, 0.35);

      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // ── 4. Particle field ─────────────────────────────────────────────
  const particleCount = intensity === 3 ? 50 : intensity === 1 ? 15 : 30;
  const pRand = seededRand(text.length * 7 + 13);
  ctx.save();
  ctx.globalAlpha = globalAlpha * (intensity === 3 ? 0.5 : 0.3);

  for (let i = 0; i < particleCount; i++) {
    const px = pRand() * width;
    const py = pRand() * height;
    const size = 0.5 + pRand() * 1.5;
    const twinkle = 0.3 + 0.7 * Math.sin(t01 * Math.PI * (1 + pRand() * 3) + i * 1.3);
    if (twinkle < 0.1) continue;

    ctx.fillStyle = hexA(i % 5 === 0 ? palette.accent : '#ffffff', twinkle * 0.5);
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── 5. Main title — staggered letter reveal ───────────────────────
  const titleChars = text.split('');
  const charCount = titleChars.length;
  ctx.font = fontTemplate(fontPx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText(text).width;
  const charWidth = charCount > 0 ? textWidth / charCount : fontPx * 0.6;
  const titleStartX = cx - textWidth / 2 + charWidth / 2;

  const titleInStart = 0.08;
  const titleInEnd = 0.28;
  const titleHoldEnd = 0.82;

  for (let i = 0; i < charCount; i++) {
    const stagger = (i / charCount) * 0.7;
    const localT = clamp01(remap(t01, titleInStart + stagger * (titleInEnd - titleInStart), titleInEnd));
    const outT = clamp01(remap(t01, titleHoldEnd + (i / charCount) * 0.04, 1.0));

    const revealIn = easeOutBack(localT, 2.5);
    const revealOut = 1 - easeInOutCubic(outT);
    const charAlpha = revealIn * revealOut;
    if (charAlpha < 0.01) continue;

    const x = titleStartX + i * charWidth;
    const scale = lerp(0.3, 1, revealIn);
    const yBob = (1 - revealIn) * fontPx * 0.15;

    ctx.save();
    ctx.translate(x, cy - fontPx * 0.22 + yBob);
    ctx.scale(scale, scale);
    ctx.globalAlpha = globalAlpha * charAlpha;

    // Glow
    const glowAmount = lerp(fontPx * 0.6, fontPx * 0.12, easeInOutCubic(localT));
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = glowAmount;

    // Gradient text fill
    const textGrad = ctx.createLinearGradient(0, -fontPx / 2, 0, fontPx / 2);
    textGrad.addColorStop(0, '#ffffff');
    textGrad.addColorStop(1, hexA('#ffffff', 0.7));
    ctx.fillStyle = textGrad;
    ctx.fillText(titleChars[i], 0, 0);

    // Bright core overlay
    if (intensity >= 2 && localT < 0.5) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = globalAlpha * charAlpha * (1 - localT) * 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(titleChars[i], 0, 0);
    }

    ctx.restore();
  }

  // ── 6. Accent bar beneath title ───────────────────────────────────
  const barT = clamp01(remap(t01, 0.28, 0.38));
  const barOut = 1 - clamp01(remap(t01, 0.80, 1.0));
  const barAlpha = easeOutCubic(barT) * barOut;
  if (barAlpha > 0.01) {
    const barW = textWidth * 0.5 * easeOutCubic(barT);
    const barH = max(2, fontPx * 0.025);
    const barY = cy + fontPx * 0.15;

    ctx.save();
    ctx.globalAlpha = globalAlpha * barAlpha;
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = fontPx * 0.15;

    const barGrad = ctx.createLinearGradient(cx - barW / 2, barY, cx + barW / 2, barY);
    barGrad.addColorStop(0, 'rgba(255,255,255,0)');
    barGrad.addColorStop(0.2, hexA(palette.accent, 0.2));
    barGrad.addColorStop(0.5, hexA(palette.accent, 0.8));
    barGrad.addColorStop(0.8, hexA(palette.accent, 0.2));
    barGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = barGrad;
    roundRect(ctx, cx - barW / 2, barY - barH / 2, barW, barH, barH / 2);
    ctx.fill();
    ctx.restore();
  }

  // ── 7. Subtitle ───────────────────────────────────────────────────
  const subText = intensity === 3 ? 'MOTION GRAPHICS STUDIO' : intensity === 1 ? 'STUDIO' : 'MOTION STUDIO';
  const subT = clamp01(remap(t01, 0.38, 0.50));
  const subOut = 1 - clamp01(remap(t01, 0.82, 1.0));
  const subAlpha = easeOutCubic(subT) * subOut;
  if (subAlpha > 0.01) {
    const subSize = fontPx * 0.3;
    ctx.save();
    ctx.globalAlpha = globalAlpha * subAlpha;
    ctx.font = `500 ${subSize}px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = hexA('#ffffff', 0.6);

    const slideUp = (1 - easeOutCubic(subT)) * 12;
    ctx.fillText(subText, cx, cy + fontPx * 0.3 + slideUp);
    ctx.restore();
  }

  // ── 8. Sparkle glints ────────────────────────────────────────────
  if (intensity >= 2) {
    const sparkCount = intensity === 3 ? 6 : 3;
    const sRand = seededRand(73);
    ctx.save();
    ctx.globalAlpha = globalAlpha * 0.5;

    for (let i = 0; i < sparkCount; i++) {
      const sx = cx + (sRand() - 0.5) * textWidth * 1.2;
      const sy = cy + (sRand() - 0.5) * fontPx * 1.5;
      const sparkSize = fontPx * (0.04 + sRand() * 0.08);
      const sparkPhase = (t01 * 0.8 + i * 1.7) % 1;
      const sparkAlpha = Math.sin(sparkPhase * Math.PI) * 0.8;
      if (sparkAlpha < 0.05) continue;

      ctx.globalAlpha = globalAlpha * sparkAlpha;
      ctx.fillStyle = hexA(i % 2 === 0 ? palette.accent : '#ffffff', 1);
      ctx.shadowColor = palette.accent;
      ctx.shadowBlur = sparkSize * 3;
      drawSparkle(ctx, sx, sy, sparkSize, t01 * 0.5 + i);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── 9. Light sweep ───────────────────────────────────────────────
  if (intensity >= 2) {
    const sweepT = (t01 * 0.6) % 1;
    ctx.save();
    ctx.globalAlpha = globalAlpha * 0.04;
    const sweepGrad = ctx.createLinearGradient(sweepT * width, 0, sweepT * width + 80, height);
    sweepGrad.addColorStop(0, 'rgba(255,255,255,0)');
    sweepGrad.addColorStop(0.5, hexA(palette.accent, 0.8));
    sweepGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sweepGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // ── 10. Vignette ─────────────────────────────────────────────────
  ctx.save();
  const vigGrad = ctx.createRadialGradient(cx, cy, diag * 0.3, cx, cy, diag * 0.7);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
  vigGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // ── 11. Film grain ───────────────────────────────────────────────
  if (intensity >= 2) {
    const grainCount = Math.floor((width * height) / 6000);
    const grainSeed = Math.floor(t01 * 60) * 7919 + 1;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.04;

    for (let i = 0; i < grainCount; i++) {
      const r = ((grainSeed + i * 7) * 233280 + 1) % 233280;
      const gx = (r * 37) % width;
      const gy = ((r * 73) >> 1) % height;
      const ga = ((r * 11) % 100) / 2000;
      ctx.fillStyle = `rgba(255,255,255,${ga})`;
      ctx.fillRect(gx, gy, 1, 1);
    }
    ctx.restore();
  }

  ctx.restore();
};

type ParamType = PrimitiveParams;
function max(a: number, b: number): number { return a > b ? a : b; }
