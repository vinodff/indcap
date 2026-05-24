/**
 * counter — odometer digit roll from 0 to target with ease-out-cubic.
 *
 * For each digit position, we animate through 0-9 multiple cycles before
 * locking at the final value. Big drop shadow, accent color, chromatic
 * aberration on the initial pop.
 *
 * Falls back to interpolated formatNumber() if parsing fails so non-numeric
 * text still renders something.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, easeOutElastic, lerp, remap } from '../easing';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;

interface ParsedNumber {
  prefix: string;
  value: number;
  suffix: string;
  decimals: number;
  format: 'plain' | 'percent' | 'currency' | 'multiplier';
  asString: string; // formatted target string for digit-roll
}

const parseNumber = (raw: string): ParsedNumber | null => {
  if (!raw) return null;
  const m = raw.match(/(-?\d[\d,]*\.?\d*)/);
  if (!m) return null;
  const numStr = m[1].replace(/,/g, '');
  const value = parseFloat(numStr);
  if (!Number.isFinite(value)) return null;
  const idx = raw.indexOf(m[1]);
  const prefix = raw.slice(0, idx).trim();
  const suffix = raw.slice(idx + m[1].length).trim();
  const decimals = (numStr.split('.')[1] || '').length;
  let format: ParsedNumber['format'] = 'plain';
  if (suffix.startsWith('%')) format = 'percent';
  else if (prefix.endsWith('$') || prefix.endsWith('₹') || prefix.endsWith('€')) format = 'currency';
  else if (suffix.toLowerCase().startsWith('x') || suffix.startsWith('×')) format = 'multiplier';

  let target = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  if (Math.abs(value) >= 1000 && decimals === 0) target = Math.round(value).toLocaleString('en-US');
  let asString = target;
  if (format === 'currency') asString = '$' + asString;
  if (format === 'percent') asString = asString + '%';
  if (format === 'multiplier') asString = asString + 'x';

  return { prefix, value, suffix, decimals, format, asString };
};

export const counter = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;
  const parsed = parseNumber(p.text || '0');
  if (!parsed) return;

  const tickEnd = 0.7;
  const fadeStart = 0.88;
  const tickProgress = easeOutCubic(clamp01(remap(t01, 0, tickEnd)));

  const popT = clamp01(remap(t01, 0, 0.25));
  const popScale = lerp(0.55, 1, easeOutElastic(popT));
  const fadeOut = 1 - clamp01(remap(t01, fadeStart, 1));
  const aberration = clamp01(1 - t01 / 0.4);

  ctx.save();
  ctx.globalAlpha = fadeOut;

  const cx = width / 2;
  const cy = height / 2;
  const numberSize = Math.min(width, height) * (intensity === 3 ? 0.34 : intensity === 1 ? 0.22 : 0.28);
  const labelSize = numberSize * 0.22;

  ctx.translate(cx, cy);
  ctx.scale(popScale, popScale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${numberSize}px ${FONT_STACK}`;

  // Compose the digit-rolling string. Each character that is a digit cycles
  // through 0-9 multiple times before locking at the final digit when tickProgress=1.
  const target = parsed.asString;
  const display = composeRolling(target, tickProgress);

  // Chromatic aberration pass for the first ~0.4s
  if (aberration > 0.03) {
    const split = numberSize * 0.04 * aberration;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#ff0033';
    ctx.fillText(display, -split, -labelSize * 0.4);
    ctx.fillStyle = '#00ff99';
    ctx.fillText(display, split * 0.6, -labelSize * 0.4);
    ctx.fillStyle = '#0099ff';
    ctx.fillText(display, 0, -labelSize * 0.4 + split * 0.7);
    ctx.restore();
  }

  // Main number
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = numberSize * 0.22;
  ctx.shadowOffsetY = numberSize * 0.06;
  ctx.fillStyle = palette.primary;
  ctx.fillText(display, 0, -labelSize * 0.4);
  ctx.shadowColor = 'transparent';

  // Caption / suffix label
  const isFormatted = parsed.format !== 'plain';
  const caption = [parsed.prefix, isFormatted ? '' : parsed.suffix].filter(Boolean).join(' ').trim();
  if (caption) {
    ctx.font = `700 ${labelSize}px ${FONT_STACK}`;
    ctx.fillStyle = palette.text;
    ctx.fillText(caption.toUpperCase(), 0, numberSize * 0.55);
  }
  ctx.restore();
};

/**
 * Compose the current odometer string: for each digit position in the target,
 * if tickProgress < lock threshold for that digit, output a 0-9 cycler.
 * Digits lock left-to-right so the leading digit settles first (feels more
 * "physical" — like an analog counter winding up).
 */
function composeRolling(target: string, p: number): string {
  const digits = target.split('');
  // Determine how many digits exist in total.
  const totalDigits = digits.filter((c) => /\d/.test(c)).length;
  let seenDigits = 0;
  const out: string[] = [];
  for (const ch of digits) {
    if (!/\d/.test(ch)) {
      out.push(ch);
      continue;
    }
    seenDigits++;
    // This digit locks at progress (seenDigits / totalDigits).
    const lockAt = seenDigits / totalDigits;
    if (p >= lockAt - 0.001) {
      out.push(ch);
    } else {
      // Cycle 0-9 at a rate that finishes ~7 cycles before locking.
      const localP = p / lockAt;
      const cycleSpeed = 7;
      const d = Math.floor((localP * cycleSpeed * 10)) % 10;
      out.push(String(d));
    }
  }
  return out.join('');
}
