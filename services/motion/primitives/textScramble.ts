/**
 * text-scramble — Cyber text decode effect with per-character scramble.
 *
 * Each character in the text string rapidly cycles through random alphanumeric
 * glyphs before settling into its final character. The scramble cascades in a
 * wave from left to right. A glowing scanline sweeps across the text, and a
 * subtle digital grid pulses behind it.
 *
 * Highly popular in tech/gaming/cybersecurity motion graphics and title cards.
 * Inspired by the "hacker terminal" and "Arrival" text reveal aesthetic.
 *
 * Intensity:
 *   1 — Slow scramble, subtle glow, no grid
 *   2 — Medium speed, mid glow, faint grid
 *   3 — Fast scramble, max glow, full grid + data streams
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, setLetterSpacing } from '../decorations';
import { clamp01, remap, easeInOutCubic, easeOutCubic, lerp } from '../easing';
import { getSafeArea, fitSingleLine } from '../safeArea';

const FONT_STACK = `'Space Mono', 'JetBrains Mono', 'Fira Code', 'Courier New', monospace`;
const fontTemplate = (px: number) => `700 ${px}px ${FONT_STACK}`;

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~';

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

export const textScramble = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = (p.text || 'CYBER').toUpperCase();
  const intensity = p.intensity || 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.1)));
  const fadeOut = 1 - easeOutCubic(clamp01(remap(t01, 0.85, 1.0)));
  const globalAlpha = fadeIn * fadeOut;
  if (globalAlpha < 0.005) return;

  const safe = getSafeArea(width, height, 0.1);
  const desiredPx = Math.min(width, height) * (intensity === 3 ? 0.18 : intensity === 1 ? 0.1 : 0.14);
  const fontPx = fitSingleLine(
    ctx, text, fontTemplate, safe.width, desiredPx,
    Math.max(20, Math.min(width, height) * 0.05),
  );

  ctx.save();

  // ── Digital grid background (intensity 2+) ──────────────────────────
  if (intensity >= 2) {
    const gridAlpha = 0.04 * intensity * (1 - fadeOut);
    ctx.save();
    ctx.globalAlpha = globalAlpha * gridAlpha;
    ctx.strokeStyle = hexA(palette.accent, 1);
    ctx.lineWidth = 0.5;

    const gridSize = Math.min(width, height) * 0.06;
    const pulse = 0.7 + 0.3 * Math.sin(t01 * Math.PI * 2);
    ctx.globalAlpha *= pulse;

    for (let gx = 0; gx <= width; gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    for (let gy = 0; gy <= height; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Data stream particles (intensity 3) ────────────────────────────
  if (intensity >= 3) {
    const streamCount = 8;
    const streamRand = seededRand(text.length * 7 + 31);
    ctx.save();
    ctx.globalAlpha = globalAlpha * 0.15;

    for (let i = 0; i < streamCount; i++) {
      const sx = streamRand() * width;
      const syBase = streamRand() * height;
      const speed = 0.3 + streamRand() * 0.5;
      const yOffset = ((t01 * speed + streamRand() * 10) % 1) * height;
      const sy = (syBase + yOffset) % height;
      const len = 4 + (streamRand() * 8) | 0;

      ctx.font = `600 ${Math.min(width, height) * 0.018}px ${FONT_STACK}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = hexA(palette.accent, 0.3 + 0.3 * Math.sin(t01 * 3 + i));

      for (let j = 0; j < len; j++) {
        const cy = sy - j * 14;
        if (cy < -20) continue;
        const alpha = 1 - j / len;
        ctx.globalAlpha = globalAlpha * 0.12 * alpha;
        ctx.fillText(CHARSET[(streamRand() * CHARSET.length) | 0], sx, cy);
      }
    }
    ctx.restore();
  }

  // ── Layout chars ──────────────────────────────────────────────────
  const cx = width / 2;
  const cy = height / 2;
  ctx.font = fontTemplate(fontPx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setLetterSpacing(ctx, fontPx * 0.03);

  const charWidth = ctx.measureText('W').width;
  const textWidth = ctx.measureText(text).width;
  const startX = cx - textWidth / 2;
  const totalChars = text.length;

  // Scramble timeline
  const scrambleWaveStart = 0.05;
  const scrambleWaveEnd = 0.55;
  const holdEnd = 0.82;
  const charStaggerRange = 0.35;

  const rand = seededRand(totalChars * 13 + 7);

  // ── Glow / scanline ──────────────────────────────────────────────
  const scanlineT = clamp01((t01 % 0.6) / 0.6);
  const scanY = cy - fontPx * 0.6 + scanlineT * fontPx * 1.2;

  ctx.save();
  ctx.globalAlpha = globalAlpha * (intensity === 3 ? 0.2 : 0.1);
  const scanGrad = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
  scanGrad.addColorStop(0, 'rgba(255,255,255,0)');
  scanGrad.addColorStop(0.5, hexA(palette.accent, 0.8));
  scanGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 2, width, 4);
  ctx.restore();

  // ── Draw each character ──────────────────────────────────────────
  for (let i = 0; i < totalChars; i++) {
    const char = text[i];
    const xPos = startX + i * charWidth + charWidth / 2;

    // Scramble timing: stagger from left to right
    const charStagger = (i / totalChars) * charStaggerRange;
    const localScrambleT = clamp01(remap(t01, scrambleWaveStart + charStagger, scrambleWaveEnd + charStagger));
    const isScrambling = localScrambleT > 0 && localScrambleT < 0.85;
    const isRevealed = localScrambleT >= 0.85;
    const outT = clamp01(remap(t01, holdEnd + (i / totalChars) * 0.08, 1.0));
    const outFade = 1 - easeInOutCubic(outT);

    const charAlpha = (isRevealed || isScrambling ? 1 : 0) * outFade;
    if (charAlpha < 0.01) continue;

    // Scramble effect: cycle through random chars
    let displayChar: string;
    let scrambleAlpha = 1;

    if (isScrambling) {
      const cycleSpeed = intensity === 3 ? 12 : intensity === 1 ? 4 : 8;
      const cycleIdx = Math.floor(localScrambleT * cycleSpeed * 20) % Math.max(1, Math.floor(20 * localScrambleT + 1));
      const resolveProgress = easeInOutCubic(clamp01(remap(localScrambleT, 0.6, 0.9)));
      const useRealChar = resolveProgress > rand() * 0.8;

      if (useRealChar && cycleIdx > 3) {
        displayChar = char;
        scrambleAlpha = 0.7 + 0.3 * resolveProgress;
      } else {
        const r = rand();
        displayChar = CHARSET[(r * CHARSET.length) | 0];
        scrambleAlpha = 0.5 + 0.5 * Math.sin(localScrambleT * cycleSpeed * 12);
      }
    } else if (isRevealed) {
      displayChar = char;
      scrambleAlpha = 1;
    } else {
      continue;
    }

    // Position with subtle scramble jitter
    const jitter = isScrambling
      ? (rand() - 0.5) * fontPx * 0.08 * (1 - easeInOutCubic(clamp01(remap(localScrambleT, 0.6, 0.9))))
      : 0;

    ctx.save();
    ctx.globalAlpha = globalAlpha * charAlpha * scrambleAlpha;

    // Glow
    const glowAmount = isScrambling
      ? lerp(fontPx * 0.8, fontPx * 0.15, easeInOutCubic(clamp01(remap(localScrambleT, 0, 0.7))))
      : fontPx * 0.12;
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = glowAmount;

    // Color: accent while scrambling, white when revealed
    const colorT = clamp01(remap(localScrambleT, 0.7, 0.95));
    ctx.fillStyle = palette.accent;
    ctx.fillText(displayChar, xPos + jitter, cy);

    // Bright core overlay (inner glow)
    if (intensity >= 2 && isScrambling) {
      ctx.shadowBlur = 0;
      ctx.globalAlpha = globalAlpha * charAlpha * scrambleAlpha * 0.3;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(displayChar, xPos + jitter, cy);
    }

    ctx.restore();
  }

  setLetterSpacing(ctx, 0);
  ctx.restore();
};
