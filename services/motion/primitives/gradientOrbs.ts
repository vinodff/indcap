/**
 * gradient-orbs — Floating Gradient Orbs with Soft Blend.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 * Inspired by Apple / Stripe / Linear-style gradient orb backgrounds.
 *
 * Renders 5-8 perfectly circular gradient spheres that:
 *   1. Each orb has a smooth radial gradient (center → transparent edge)
 *   2. Orbs drift at different speeds on unique Lissajous trajectories
 *   3. 'lighter' composite blending creates beautiful color intersections
 *   4. Each orb gently pulses in scale independently
 *   5. Colors are palette-derived but softened with white for pastel elegance
 *   6. A subtle base gradient layer anchors the background
 *   7. No extra decorations — pure, minimalist, premium gradient orbs
 *
 * Perfect as a layer 0 background underneath text or UI primitives,
 * or standalone for ambient/section-background beats.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeInOutCubic, lerp } from '../easing';

interface Orb {
  cx: number;        // base center x [0,1]
  cy: number;        // base center y [0,1]
  r: number;         // base radius relative [0.05, 0.25]
  freqX: number;     // X Lissajous frequency
  freqY: number;     // Y Lissajous frequency
  ampX: number;      // X drift amplitude [0, 0.15]
  ampY: number;      // Y drift amplitude [0, 0.15]
  phaseX: number;    // X phase offset
  phaseY: number;    // Y phase offset
  pulseFreq: number; // scale pulse frequency
  pulseAmp: number;  // scale pulse amplitude [0, 0.15]
  color: string;     // center color
  alpha: number;     // max alpha [0.3, 0.8]
}

export const gradientOrbs = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;

  // ── Fades ─────────────────────────────────────────────────────────────────
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.15)));
  const fadeOut = 1 - easeInOutCubic(clamp01(remap(t01, 0.85, 1.0)));
  const globalAlpha = fadeIn * fadeOut;
  if (globalAlpha < 0.005) return;

  // ── Orb configuration ─────────────────────────────────────────────────────
  const orbCount = intensity === 3 ? 8 : intensity === 1 ? 4 : 6;

  // Softened palette colors (mix with white for pastel elegance)
  const colors = [
    mixHex(palette.primary, '#ffffff', 0.4),
    mixHex(palette.accent, '#ffffff', 0.3),
    mixHex(palette.secondary, '#ffffff', 0.5),
    mixHex(palette.primary, '#ffffff', 0.2),
    mixHex(palette.accent, '#ffffff', 0.5),
    mixHex(palette.secondary, '#ffffff', 0.3),
    mixHex(palette.primary, palette.accent, 0.5),
    mixHex(palette.secondary, palette.accent, 0.4),
  ];

  // Deterministic orb positions based on a simple hash
  const orbs: Orb[] = [];
  for (let i = 0; i < orbCount; i++) {
    const seed = i * 137.5 + 42;
    const rand1 = (Math.sin(seed) * 0.5 + 0.5) % 1;
    const rand2 = (Math.sin(seed * 2.3) * 0.5 + 0.5) % 1;
    const rand3 = (Math.sin(seed * 3.7) * 0.5 + 0.5) % 1;

    orbs.push({
      cx: 0.15 + rand1 * 0.7,
      cy: 0.15 + rand2 * 0.7,
      r: 0.08 + rand3 * 0.17 * (intensity * 0.5),
      freqX: 0.3 + (i * 0.17 + rand1) % 1.0,
      freqY: 0.3 + (i * 0.23 + rand2) % 1.0,
      ampX: 0.04 + rand1 * 0.08,
      ampY: 0.04 + rand2 * 0.08,
      phaseX: rand1 * Math.PI * 2,
      phaseY: rand2 * Math.PI * 2,
      pulseFreq: 0.4 + rand3 * 0.8,
      pulseAmp: 0.05 + rand3 * 0.10,
      color: colors[i % colors.length],
      alpha: 0.5 + rand3 * 0.3,
    });
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // Base dark background
  const baseGrad = ctx.createRadialGradient(
    width / 2, height * 0.4, 0,
    width / 2, height * 0.4, Math.max(width, height) * 0.7,
  );
  baseGrad.addColorStop(0, hexA(mixHex(palette.bg || '#0a0a14', palette.primary, 0.08), 0.9));
  baseGrad.addColorStop(1, hexA(palette.bg || '#0a0a14', 1));
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, width, height);

  // Additive blend for orb intersections
  ctx.globalCompositeOperation = 'lighter';

  const t = t01 * Math.PI * 2;

  for (const orb of orbs) {
    // Lissajous trajectory
    const dx = Math.sin(t * orb.freqX + orb.phaseX) * orb.ampX;
    const dy = Math.cos(t * orb.freqY + orb.phaseY) * orb.ampY;

    const ox = (orb.cx + dx) * width;
    const oy = (orb.cy + dy) * height;

    // Scale pulse
    const pulse = 1 + Math.sin(t * orb.pulseFreq) * orb.pulseAmp;
    const r = orb.r * Math.min(width, height) * pulse;

    // Radial gradient from center color to transparent
    const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
    grad.addColorStop(0, hexA(orb.color, orb.alpha));
    grad.addColorStop(0.4, hexA(orb.color, orb.alpha * 0.5));
    grad.addColorStop(0.7, hexA(orb.color, orb.alpha * 0.15));
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // globalAlpha
};
