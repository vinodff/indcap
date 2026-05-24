/**
 * typewriter — characters appear one at a time with a blinking cursor.
 *
 * Terminal icon in top-left corner. SparkDust bursts at cursor position on
 * each new character. Sparkles icon flashes near the cursor. Scan beam
 * sweeps the text area. CRT vignette corners on intensity 3.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, remap } from '../easing';
import { getSafeArea, fitMultiline } from '../safeArea';
import { hexA, setLetterSpacing } from '../decorations';
import { drawLucideIcon } from '../iconRenderer';
import { drawSparkDust } from '../textures';

const FONT_STACK = `'Courier New', 'Courier', monospace`;
const fontTemplate = (px: number) => `700 ${px}px ${FONT_STACK}`;

export const typewriter = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, durationSec, palette } = pc;
  const text = p.text || 'TYPING...';
  const intensity = p.intensity || 2;

  const safe = getSafeArea(width, height, 0.1);
  const desiredPx = Math.min(width, height) * (intensity === 3 ? 0.11 : intensity === 1 ? 0.07 : 0.09);
  const maxLines = height > width ? 5 : 3;
  const { px: fontPx, lines } = fitMultiline(
    ctx,
    text,
    fontTemplate,
    safe.width,
    safe.height * 0.65,
    desiredPx,
    maxLines,
    1.25,
    Math.max(16, Math.min(width, height) * 0.035),
  );
  if (lines.length === 0) return;

  const lineHeight = fontPx * 1.25;
  const totalH = lines.length * lineHeight;
  const blockTop = (height - totalH) / 2 + lineHeight * 0.5;

  const globalAlpha = 1 - clamp01(remap(t01, 0.88, 1));
  if (globalAlpha < 0.01) return;

  const totalChars = lines.join('').length;
  const typeEnd = 0.75;
  const deleteStart = 0.80;

  let charsShown: number;
  if (t01 <= typeEnd) {
    const typeT = easeOutCubic(remap(t01, 0, typeEnd));
    charsShown = Math.floor(typeT * totalChars);
  } else if (t01 >= deleteStart) {
    const delT = remap(t01, deleteStart, 1.0);
    charsShown = Math.round((1 - delT) * totalChars);
  } else {
    charsShown = totalChars;
  }

  const cursorOn = Math.floor(t01 * durationSec * 2) % 2 === 0;
  const cursorAlpha = t01 > 0.82 ? (1 - remap(t01, 0.82, 0.95)) : 1;

  ctx.save();
  ctx.font = fontTemplate(fontPx);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = globalAlpha;
  setLetterSpacing(ctx, fontPx * 0.01);

  let charsSoFar = 0;
  let cursorX = width / 2 - (lines[0] ? ctx.measureText(lines[0]).width : 0) / 2;
  let cursorY = blockTop;

  // ── Terminal icon — top left of text block ─────────────────────────
  if (intensity >= 2) {
    const iconSize = fontPx * 1.1;
    const iconX = safe.x + iconSize * 0.7;
    const iconY = blockTop - lineHeight * 0.8;
    drawLucideIcon(ctx, 'terminal', iconX, iconY, iconSize, palette.primary, {
      stroke: true, strokeWidth: 2, alpha: globalAlpha * 0.7,
      glowColor: palette.accent, glowBlur: iconSize * 0.35,
    });
  }

  lines.forEach((line, li) => {
    const lineX = width / 2 - ctx.measureText(line).width / 2;
    const lineY = blockTop + li * lineHeight;

    if (intensity === 3 && li === 0 && lines.length === 1) {
      ctx.save();
      ctx.globalAlpha = globalAlpha * 0.15;
      ctx.fillStyle = palette.primary;
      ctx.fillRect(safe.x, lineY - lineHeight * 0.6, safe.width, totalH + lineHeight * 0.2);
      ctx.restore();
    }

    const charsInLine = line.length;
    const charsToShowOnLine = Math.max(0, Math.min(charsInLine, charsShown - charsSoFar));
    const visibleText = line.slice(0, charsToShowOnLine);

    ctx.save();
    ctx.shadowColor = palette.primary;
    ctx.shadowBlur = fontPx * 0.35;
    ctx.fillStyle = palette.text;
    ctx.fillText(visibleText, lineX, lineY);
    ctx.shadowBlur = 0;

    ctx.fillStyle = hexA(palette.text, 0.9);
    ctx.fillText(visibleText, lineX, lineY);
    ctx.restore();

    if (charsSoFar + charsToShowOnLine >= charsShown && charsSoFar <= charsShown) {
      cursorX = lineX + ctx.measureText(visibleText).width;
      cursorY = lineY;
    }

    charsSoFar += charsInLine;
  });

  // ── Draw cursor ──────────────────────────────────────────────────
  const cw = fontPx * 0.55;
  const ch = fontPx * 0.9;
  if (cursorOn && cursorAlpha > 0.05) {
    ctx.save();
    ctx.globalAlpha = globalAlpha * cursorAlpha;
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = fontPx * 0.4;
    ctx.fillStyle = palette.accent;
    ctx.fillRect(cursorX + 2, cursorY - ch / 2, cw, ch);
    ctx.restore();
  }

  // ── SparkDust at cursor on new character ─────────────────────────
  if (t01 <= typeEnd && charsShown < totalChars) {
    const newCharPulse = (t01 * totalChars) % 1;
    if (newCharPulse < 0.15) {
      const sparkAlpha = globalAlpha * (1 - newCharPulse / 0.15) * 0.7;
      drawSparkDust(ctx, cursorX + cw / 2, cursorY, fontPx * 1.8, sparkAlpha);
    }
  }

  // ── Sparkles icon near cursor (intensity 3, occasionally) ────────
  if (intensity === 3 && cursorOn && charsShown > 0 && charsShown < totalChars) {
    drawLucideIcon(ctx, 'sparkles', cursorX + cw * 2, cursorY - fontPx * 0.7, fontPx * 0.8, palette.accent, {
      fill: true, stroke: false, alpha: globalAlpha * 0.5,
      glowColor: palette.accent, glowBlur: fontPx * 0.25,
    });
  }

  // ── Horizontal scan beam ─────────────────────────────────────────
  if (intensity >= 2) {
    const scanY = blockTop - fontPx * 0.5 + (t01 % 0.25) / 0.25 * (totalH + fontPx);
    ctx.save();
    ctx.globalAlpha = globalAlpha * 0.08;
    ctx.fillStyle = palette.primary;
    ctx.fillRect(safe.x, scanY, safe.width, 2);
    ctx.restore();
  }

  // ── CRT vignette corners (intensity 3) ───────────────────────────
  if (intensity === 3) {
    ctx.save();
    ctx.globalAlpha = globalAlpha * 0.4;
    const vRadius = Math.min(width, height) * 0.7;
    const vGrad = ctx.createRadialGradient(width / 2, height / 2, vRadius * 0.4, width / 2, height / 2, vRadius);
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  setLetterSpacing(ctx, 0);
  ctx.restore();
};
