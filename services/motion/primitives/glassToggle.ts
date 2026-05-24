/**
 * glass-toggle — Smooth Glassmorphism Toggle Switch.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 * Inspired by Jitter's "Liquid Glass Toggle" and "On/Off Toggle".
 *
 * Renders a premium glassmorphic toggle switch that:
 *   1. Track fades in with glass panel, soft border, and backdrop blur effect
 *   2. Knob springs in from the left (OFF position) with elastic overshoot
 *   3. Knob slides to the right (ON position) with magnetic snap
 *   4. ON state: track fills with accent gradient glow, knob gets inner shadow
 *   5. Label animates next to the toggle, changing from "Off" to "On"
 *   6. Subtle pulse ring emanates from knob on state change
 *
 * params.text provides the label (e.g. "Dark Mode", "Notifications")
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

export const glassToggle = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const label = p.text || 'Toggle Setting';
  const intensity = p.intensity ?? 2;

  // ── Global fades ──────────────────────────────────────────────────────────
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.10)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // ── Animation phases ──────────────────────────────────────────────────────
  // Track appearance: 0.00 → 0.15
  const trackT = easeOutCubic(clamp01(remap(t01, 0, 0.15)));

  // Knob entry (OFF position): 0.10 → 0.25
  const knobEntryT = easeOutBack(clamp01(remap(t01, 0.10, 0.25)), 1.3);

  // Toggle slide to ON: 0.40 → 0.60
  const toggleSlideT = easeOutBack(clamp01(remap(t01, 0.40, 0.60)), 1.5);

  // State glow transition: 0.55 → 0.70
  const stateGlowT = easeOutCubic(clamp01(remap(t01, 0.55, 0.70)));

  // Pulse ring on toggle: 0.55 → 0.75
  const pulseRingT = clamp01(remap(t01, 0.55, 0.75));

  // Label reveal: 0.20 → 0.35
  const labelT = easeOutCubic(clamp01(remap(t01, 0.20, 0.35)));

  const isOn = toggleSlideT >= 0.5;

  // ── Layout ────────────────────────────────────────────────────────────────
  const trackW = Math.min(width * 0.22, 90);
  const trackH = trackW * 0.52;
  const knobR = trackH * 0.38;
  const knobMargin = trackH * 0.1;
  const knobOffX = -(trackW / 2 - knobMargin - knobR);
  const knobOnX = trackW / 2 - knobMargin - knobR;

  let cx = width / 2;
  let cy = height * 0.5;
  if (p.anchor === 'top') cy = height * 0.25;
  else if (p.anchor === 'bottom') cy = height * 0.75;

  // Allow room for label on the right
  cx -= width * 0.02;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── Ambient glow behind toggle ────────────────────────────────────────────
  const ambientR = trackW * 1.2;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, ambientR);
  glow.addColorStop(0, hexA(palette.accent, 0.08 * intensity * stateGlowT));
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - ambientR, cy - ambientR, ambientR * 2, ambientR * 2);

  // ── Draw track ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(cx - trackW / 2, cy - trackH / 2);
  ctx.globalAlpha *= trackT;

  // Track background (glass)
  const trackColor = isOn
    ? mixHex(palette.accent, palette.primary, stateGlowT * 0.5)
    : 'rgba(255,255,255,0.08)';

  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;

  roundRect(ctx, 0, 0, trackW, trackH, trackH / 2);
  const trackGrad = ctx.createLinearGradient(0, 0, 0, trackH);
  if (isOn) {
    const c = mixHex(palette.accent, palette.primary, 0.3);
    trackGrad.addColorStop(0, hexA(c, 0.8 + stateGlowT * 0.2));
    trackGrad.addColorStop(1, hexA(mixHex(c, '#000000', 0.2), 0.9));
  } else {
    trackGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
    trackGrad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    trackGrad.addColorStop(1, 'rgba(255,255,255,0.03)');
  }
  ctx.fillStyle = trackGrad;
  ctx.fill();

  // Track border
  ctx.shadowColor = 'transparent';
  roundRect(ctx, 0, 0, trackW, trackH, trackH / 2);
  const borderC = isOn
    ? hexA(palette.accent, 0.5 * stateGlowT)
    : 'rgba(255,255,255,0.15)';
  ctx.strokeStyle = borderC;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── Knob ──────────────────────────────────────────────────────────────────
  const knobX = lerp(knobOffX, knobOnX, toggleSlideT) * trackT * knobEntryT;
  const knobScale = trackT * knobEntryT;

  ctx.save();
  ctx.translate(knobX + knobR, trackH / 2);
  ctx.scale(knobScale, knobScale);

  // Knob shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;

  ctx.beginPath();
  ctx.arc(0, 0, knobR, 0, Math.PI * 2);

  // Knob gradient
  const knobGrad = ctx.createRadialGradient(-knobR * 0.3, -knobR * 0.3, 0, 0, 0, knobR);
  knobGrad.addColorStop(0, '#ffffff');
  knobGrad.addColorStop(0.6, hexA('#ffffff', 0.95));
  knobGrad.addColorStop(1, hexA('#e2e8f0', 0.9));
  ctx.fillStyle = knobGrad;
  ctx.fill();

  // Knob border
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, knobR, 0, Math.PI * 2);
  ctx.stroke();

  // Inner accent dot when ON
  if (isOn && stateGlowT > 0.2) {
    ctx.save();
    ctx.globalAlpha = stateGlowT;
    ctx.beginPath();
    ctx.arc(0, 0, knobR * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = palette.accent;
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }

  ctx.restore(); // knob transform

  // ── Pulse ring around knob on toggle ──────────────────────────────────────
  if (isOn && pulseRingT > 0 && pulseRingT < 1) {
    ctx.save();
    const ringX = knobOnX + knobR;
    const ringR2 = knobR + pulseRingT * 25;
    ctx.strokeStyle = hexA(palette.accent, 0.5 * (1 - pulseRingT));
    ctx.lineWidth = 2.5 * (1 - pulseRingT);
    ctx.beginPath();
    ctx.arc(ringX, trackH / 2, ringR2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore(); // track transform

  // ── Label ─────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = globalAlpha * labelT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const labelSize = Math.min(width, height) * 0.025;
  ctx.font = `700 ${labelSize}px ${FONT}`;

  const labelX = cx + trackW / 2 + 16;
  const stateLabel = isOn ? 'ON' : 'OFF';
  const displayLabel = `${label} ${stateLabel}`;

  // State label color transition
  const labelColor = isOn
    ? mixHex('#ffffff', palette.accent, stateGlowT)
    : 'rgba(255,255,255,0.6)';
  ctx.fillStyle = labelColor;
  ctx.shadowColor = isOn ? hexA(palette.accent, 0.4 * stateGlowT) : 'transparent';
  ctx.shadowBlur = isOn ? 10 * stateGlowT : 0;

  ctx.fillText(displayLabel, labelX, cy + (1 - labelT) * 8);
  ctx.restore();

  ctx.restore(); // global
};
