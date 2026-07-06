/**
 * hyper-text — Magic UI "Hyper Text" port.
 *
 * Each character cycles through random glyphs at a high rate, then locks
 * to the target character one position at a time left-to-right. Reads as
 * a hacker / cyber decryption animation.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, remap } from '../easing';
import { getSafeArea, fitSingleLine } from '../safeArea';
import { setLetterSpacing , roundRect} from '../decorations';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', monospace`;
const fontTemplate = (px: number) => `900 ${px}px ${FONT_STACK}`;
const SCRAMBLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

export const hyperText = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = (p.text || 'HYPER').toUpperCase();
  const intensity = p.intensity || 2;

  const safe = getSafeArea(width, height, 0.08);
  const desired = Math.min(width, height) * (intensity === 3 ? 0.14 : intensity === 1 ? 0.09 : 0.115);
  const fontPx = fitSingleLine(
    ctx,
    text,
    fontTemplate,
    safe.width,
    desired,
    Math.max(22, Math.min(width, height) * 0.045),
  );

  const fadeIn = easeOutCubic(clamp01(remap(t01, 0, 0.08)));
  const resolveT = clamp01(remap(t01, 0.05, 0.7));
  const fadeOut = 1 - clamp01(remap(t01, 0.88, 1));
  const visible = fadeIn * fadeOut;
  if (visible < 0.001) return;

  // Each character "locks" at its own progress threshold: char i locks at
  // (i+1)/N of resolveT.
  const chars = [...text];
  const lockedFor = (i: number): boolean => resolveT >= (i + 1) / chars.length - 0.001;

  ctx.save();
  ctx.globalAlpha = visible;
  ctx.font = fontTemplate(fontPx);
  setLetterSpacing(ctx, fontPx * 0.04);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  // Measure full target string to position
  const totalW = ctx.measureText(text).width;
  const x0 = (width - totalW) / 2;
  const cy = height / 2;

  // Choose a per-frame seed for scrambled chars
  const frameSeed = Math.floor(t01 * 60);

  let cx = x0;
  chars.forEach((c, i) => {
    const charW = ctx.measureText(c).width;
    if (c === ' ') {
      cx += charW;
      return;
    }
    let display = c;
    if (!lockedFor(i)) {
      // Pick a different random char each frame
      const r = pseudoInt(frameSeed * 1009 + i * 31);
      display = SCRAMBLE[r % SCRAMBLE.length];
    }
    const isLocked = lockedFor(i);
    // Color: scrambled chars are accent, locked chars are primary
    ctx.fillStyle = isLocked ? palette.text : palette.accent;
    ctx.shadowColor = isLocked ? palette.primary : palette.accent;
    ctx.shadowBlur = fontPx * 0.32;
    ctx.fillText(display, cx + (isLocked ? 0 : (Math.sin((frameSeed + i) * 7) * fontPx * 0.03)), cy);
    cx += charW;
  });
  ctx.shadowColor = 'transparent';

  // Status chip in the top showing "DECODING..." → "DECODED"
  if (intensity >= 2) {
    const ts = Math.max(11, fontPx * 0.18);
    ctx.font = `900 ${ts}px ${FONT_STACK}`;
    setLetterSpacing(ctx, ts * 0.1);
    const label = resolveT >= 1 ? 'DECODED' : `DECODING  ${Math.round(resolveT * 100)}%`;
    const w = ctx.measureText(label).width + ts * 1.4;
    const h = ts * 2;
    const cxc = width / 2 - w / 2;
    const cyc = cy - fontPx * 0.85 - h - 8;
    ctx.fillStyle = resolveT >= 1 ? palette.primary : palette.accent;
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    roundRect(ctx, cxc, cyc, w, h, 4);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = palette.bg;
    ctx.textAlign = 'center';
    ctx.fillText(label, cxc + w / 2, cyc + h / 2);
  }

  setLetterSpacing(ctx, 0);
  ctx.restore();
};

function pseudoInt(n: number): number {
  return Math.abs(Math.imul(n | 0, 2654435761)) & 0x7fffffff;
}
