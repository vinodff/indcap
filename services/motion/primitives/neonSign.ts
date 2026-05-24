/**
 * neon-sign — flickering neon tube sign with electric buzz effect.
 *
 * Multi-layer glow mimics gas tube lighting with seeded flicker. Hexagon
 * end-caps frame the sign edges. Zap icon sparks near the buzz line.
 * Star-shaped particles scatter along the tube during flicker events.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, lerp, remap } from '../easing';
import { getSafeArea, fitMultiline } from '../safeArea';
import { hexA, setLetterSpacing, drawHexagon, drawStar } from '../decorations';
import { drawLucideIcon } from '../iconRenderer';
import { drawSparkDust } from '../textures';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;
const fontTemplate = (px: number) => `700 ${px}px ${FONT_STACK}`;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NEON_COLORS: Record<string, { tube: string; glow: string; outer: string }> = {
  energetic:        { tube: '#FFEE00', glow: '#FFB800', outer: '#FF6600' },
  corporate:        { tube: '#00CFFF', glow: '#0088DD', outer: '#0044AA' },
  kids:             { tube: '#FF89CF', glow: '#FF4FBF', outer: '#AA0077' },
  cinematic:        { tube: '#FFD700', glow: '#FFA800', outer: '#884400' },
  'neon-bright':    { tube: '#FF2EC4', glow: '#BB00FF', outer: '#440088' },
  'pastel-pop':     { tube: '#A0E4FF', glow: '#55BBFF', outer: '#0077AA' },
  'gradient-blast': { tube: '#00FFAA', glow: '#00CC88', outer: '#007755' },
  custom:           { tube: '#00FFAA', glow: '#00CC88', outer: '#007755' },
};

export const neonSign = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, durationSec, palette } = pc;
  const text = (p.text || 'NEON').toUpperCase();
  const intensity = p.intensity || 2;

  const safe = getSafeArea(width, height, 0.1);
  const desiredPx = Math.min(width, height) * (intensity === 3 ? 0.13 : intensity === 1 ? 0.08 : 0.11);
  const maxLines = height > width ? 4 : 2;
  const { px: fontPx, lines } = fitMultiline(
    ctx,
    text,
    fontTemplate,
    safe.width,
    safe.height * 0.6,
    desiredPx,
    maxLines,
    1.2,
    Math.max(18, Math.min(width, height) * 0.036),
  );
  if (lines.length === 0) return;

  const nc = NEON_COLORS[p.palette] || NEON_COLORS['neon-bright'];

  const powerOn = easeOutCubic(clamp01(remap(t01, 0, 0.2)));
  const fadeOut = 1 - clamp01(remap(t01, 0.88, 1));
  const base = powerOn * fadeOut;
  if (base < 0.01) return;

  const sec = t01 * durationSec;

  const rand = rng(Math.round(durationSec * 100) + intensity * 31);
  const flickerEvents: { t: number; dur: number; drop: number }[] = [];
  const flickerCount = intensity === 3 ? 6 : intensity === 1 ? 2 : 4;
  for (let i = 0; i < flickerCount; i++) {
    flickerEvents.push({
      t: 0.2 + rand() * 0.6,
      dur: 0.02 + rand() * 0.08,
      drop: lerp(0.2, 0.75, rand()),
    });
  }

  let flicker = 1;
  for (const fe of flickerEvents) {
    if (t01 >= fe.t && t01 <= fe.t + fe.dur) {
      const ft = (t01 - fe.t) / fe.dur;
      const drop = ft < 0.3 ? lerp(1, 1 - fe.drop, ft / 0.3) : lerp(1 - fe.drop, 1, (ft - 0.3) / 0.7);
      flicker = Math.min(flicker, drop);
    }
  }

  const brightness = base * flicker;

  const lineHeight = fontPx * 1.2;
  const totalH = lines.length * lineHeight;
  const blockTop = (height - totalH) / 2 + lineHeight * 0.5;

  ctx.save();
  ctx.font = fontTemplate(fontPx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setLetterSpacing(ctx, fontPx * 0.03);

  let maxW = 0;
  for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);

  // Dark backing panel (intensity 2+)
  if (intensity >= 2) {
    const panelPad = fontPx * 0.4;
    ctx.save();
    ctx.globalAlpha = 0.45 * base;
    ctx.fillStyle = '#000000';
    const panelX = width / 2 - maxW / 2 - panelPad;
    const panelY = blockTop - lineHeight * 0.6;
    const panelW = maxW + panelPad * 2;
    const panelH = totalH + panelPad * 0.4;
    const r = fontPx * 0.15;
    ctx.beginPath();
    ctx.moveTo(panelX + r, panelY);
    ctx.arcTo(panelX + panelW, panelY, panelX + panelW, panelY + panelH, r);
    ctx.arcTo(panelX + panelW, panelY + panelH, panelX, panelY + panelH, r);
    ctx.arcTo(panelX, panelY + panelH, panelX, panelY, r);
    ctx.arcTo(panelX, panelY, panelX + panelW, panelY, r);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── Hexagon end-caps on panel edges ───────────────────────────────
  if (intensity >= 2) {
    const hexR = fontPx * 0.28;
    const panelPad = fontPx * 0.4;
    const panelX = width / 2 - maxW / 2 - panelPad;
    const panelXR = width / 2 + maxW / 2 + panelPad;
    const hexY = height / 2;
    const hexAlpha = brightness * 0.7;

    ctx.save();
    ctx.globalAlpha = hexAlpha;
    ctx.strokeStyle = nc.tube;
    ctx.lineWidth = 2;
    ctx.shadowColor = nc.glow;
    ctx.shadowBlur = hexR * 0.8;

    ctx.beginPath();
    drawHexagon(ctx, panelX, hexY, hexR, Math.PI / 6);
    ctx.stroke();

    ctx.beginPath();
    drawHexagon(ctx, panelXR, hexY, hexR, Math.PI / 6);
    ctx.stroke();
    ctx.restore();
  }

  // ── Neon text layers ──────────────────────────────────────────────
  lines.forEach((line, li) => {
    const lineY = blockTop + li * lineHeight;

    ctx.save();
    ctx.globalAlpha = brightness * 0.4;
    ctx.shadowColor = nc.outer;
    ctx.shadowBlur = fontPx * 1.8;
    ctx.fillStyle = hexA(nc.outer, 0.01);
    ctx.fillText(line, width / 2, lineY);

    ctx.globalAlpha = brightness * 0.7;
    ctx.shadowColor = nc.glow;
    ctx.shadowBlur = fontPx * 0.9;
    ctx.fillStyle = hexA(nc.glow, 0.8);
    ctx.fillText(line, width / 2, lineY);

    ctx.globalAlpha = brightness;
    ctx.shadowColor = nc.tube;
    ctx.shadowBlur = fontPx * 0.3;
    ctx.fillStyle = nc.tube;
    ctx.fillText(line, width / 2, lineY);

    ctx.globalAlpha = brightness * 0.55;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, width / 2, lineY);
    ctx.restore();
  });

  // ── Buzz line racing across text (intensity 3) ───────────────────
  if (intensity === 3) {
    const buzzSpeed = 2.5;
    const buzzT = (sec * buzzSpeed) % 1;
    const firstLineW = ctx.measureText(lines[0]).width;
    const buzzX = width / 2 - firstLineW / 2 + buzzT * firstLineW;
    ctx.save();
    ctx.globalAlpha = brightness * 0.6 * flicker;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = nc.tube;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(buzzX, blockTop - lineHeight * 0.1);
    ctx.lineTo(buzzX, blockTop + (lines.length - 1) * lineHeight + lineHeight * 0.6);
    ctx.stroke();
    ctx.restore();

    // Zap icon near the buzz line head
    const zapAlpha = brightness * 0.55 * flicker;
    if (zapAlpha > 0.05) {
      drawLucideIcon(ctx, 'zap', buzzX, blockTop - lineHeight * 0.5, fontPx * 0.7, nc.tube, {
        fill: true,
        stroke: false,
        alpha: zapAlpha,
        glowColor: nc.glow,
        glowBlur: fontPx * 0.3,
      });
    }

    // Star sparks along the buzz trail
    const sparkRand = rng(Math.floor(sec * 30) * 13 + 77);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let s = 0; s < 4; s++) {
      const sx = width / 2 - firstLineW / 2 + sparkRand() * firstLineW;
      const sy = blockTop + sparkRand() * (lines.length - 0.5) * lineHeight;
      const sr = fontPx * 0.05 * brightness;
      const sa = sparkRand() * brightness * 0.5;
      ctx.fillStyle = hexA(nc.tube, sa);
      ctx.shadowColor = nc.tube;
      ctx.shadowBlur = sr * 4;
      ctx.beginPath();
      drawStar(ctx, sx, sy, sr, sr * 0.4, 4);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // SparkDust at panel corners during power-on
  if (powerOn < 0.9) {
    const sparkA = (1 - powerOn) * base * 0.6;
    const panelPad = fontPx * 0.4;
    drawSparkDust(ctx, width / 2 - maxW / 2 - panelPad, blockTop - lineHeight * 0.6, fontPx * 1.5, sparkA);
    drawSparkDust(ctx, width / 2 + maxW / 2 + panelPad, blockTop - lineHeight * 0.6, fontPx * 1.5, sparkA);
  }

  setLetterSpacing(ctx, 0);
  ctx.restore();
};
