/**
 * bento-grid — Apple-style Bento Grid Layout Reveal.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 *
 * Renders 3–4 staggered, elastic-spring animated glass panels arranged
 * in an asymmetric bento grid layout. Each panel has its own content
 * type and micro-animation:
 *
 *   Slot 0 (large left)  — Hero metric / counter tick-up
 *   Slot 1 (top right)   — Kinetic label with gradient shimmer
 *   Slot 2 (mid right)   — Icon + short descriptor
 *   Slot 3 (bottom right)— Animated progress bar reveal
 *
 * params.text accepts pipe-separated labels:
 *   "3M Views | Creator Tool | Powered by AI | Try Free"
 *
 * Design reference: Apple WWDC bento slides, Linear.app feature grids,
 * Vercel/Stripe marketing landing pages.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';
import { fitSingleLine, fitMultiline } from '../safeArea';
import { drawLucideIcon } from '../iconRenderer';

const FONT_DISPLAY = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;
const FONT_MONO = `'JetBrains Mono', 'Fira Code', 'Courier New', monospace`;

// ── Seeded RNG (for stable shimmer offsets across frames) ─────────────────────
const seededRng = (seed: number) => {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 0xffffffff;
  };
};

// ── Rounded rect helper with shadow ──────────────────────────────────────────
function fillPanel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number,
  fillStyle: string | CanvasGradient,
  shadowColor: string,
  shadowBlur: number,
  shadowOffY: number,
): void {
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetY = shadowOffY;
  ctx.shadowOffsetX = 0;
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
}

// ── Glass border stroke helper ─────────────────────────────────────────────────
function strokeGlass(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number,
  alpha: number,
): void {
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.8})`);
  grad.addColorStop(0.4, `rgba(255,255,255,${alpha * 0.15})`);
  grad.addColorStop(1, `rgba(0,0,0,${alpha * 0.2})`);
  roundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ── Sheen overlay inside panel ─────────────────────────────────────────────────
function drawSheen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();
  const sheen = ctx.createLinearGradient(x, y, x + w * 0.6, y + h * 0.4);
  sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
  sheen.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = sheen;
  ctx.fill();
  ctx.restore();
}

// ── Spring scale: entry pop with overshoot ────────────────────────────────────
const springIn = (t: number, delay: number, duration: number): number =>
  easeOutBack(clamp01(remap(t, delay, delay + duration)), 1.4);

// ── Number tick-up formatter ──────────────────────────────────────────────────
function formatMetric(raw: string, progress: number): string {
  // If the label is purely numeric (possibly with M/K suffix), tick it up.
  const match = raw.match(/^([\d.]+)([MKmk%+]*)(.*)$/);
  if (!match) return raw;
  const base = parseFloat(match[1]);
  const suffix = match[2] + match[3];
  const val = Math.floor(base * easeOutCubic(progress));
  return `${val.toLocaleString()}${suffix}`;
}

// ─────────────────────────────────────────────────────────────────────────────
export const bentoGrid = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;

  // Fade envelope
  const fadeIn  = easeInOutCubic(clamp01(remap(t01, 0, 0.08)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // Parse pipe-separated labels
  const rawLabels = (p.text || '').split('|').map(s => s.trim()).filter(Boolean);
  const labels = [
    rawLabels[0] || '3M',
    rawLabels[1] || 'Creator Tool',
    rawLabels[2] || 'AI-Powered',
    rawLabels[3] || 'Try Free',
  ];

  // ── Grid layout geometry ───────────────────────────────────────────────────
  // Overall bento container fits within a safe area
  const safeW = width  * 0.90;
  const safeH = height * 0.80;
  const gx = (width  - safeW) / 2;
  const gy = (height - safeH) / 2;

  const gap = Math.min(safeW, safeH) * 0.035;
  const r   = Math.min(safeW, safeH) * 0.055; // corner radius

  // Layout: 2-column asymmetric
  //   Left column:  60% width, full height  (slot 0 — hero)
  //   Right column: 40% width, 3 rows       (slots 1, 2, 3)
  const colL = safeW * 0.57 - gap / 2;
  const colR = safeW * 0.43 - gap / 2;
  const row1 = safeH * 0.40 - gap / 2;
  const row2 = safeH * 0.32 - gap / 2;
  const row3 = safeH * 0.28 - gap / 2;

  interface Slot {
    x: number; y: number; w: number; h: number;
    label: string;
    type: 'hero' | 'label' | 'icon' | 'bar';
    delay: number;
    accentIdx: number;
    entryDir: 'up' | 'down' | 'left' | 'right';
  }

  const slots: Slot[] = [
    {
      x: gx, y: gy, w: colL, h: safeH,
      label: labels[0], type: 'hero',
      delay: 0.05, accentIdx: 0, entryDir: 'left',
    },
    {
      x: gx + colL + gap, y: gy,
      w: colR, h: row1,
      label: labels[1], type: 'label',
      delay: 0.12, accentIdx: 1, entryDir: 'up',
    },
    {
      x: gx + colL + gap, y: gy + row1 + gap,
      w: colR, h: row2,
      label: labels[2], type: 'icon',
      delay: 0.19, accentIdx: 2, entryDir: 'right',
    },
    {
      x: gx + colL + gap, y: gy + row1 + row2 + gap * 2,
      w: colR, h: row3,
      label: labels[3], type: 'bar',
      delay: 0.26, accentIdx: 3, entryDir: 'down',
    },
  ];

  const accentColors = [
    palette.primary,
    palette.accent,
    palette.secondary,
    palette.text,
  ];

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── Ambient glow behind the whole grid ────────────────────────────────────
  {
    const bg = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.hypot(safeW, safeH) * 0.55,
    );
    bg.addColorStop(0, hexA(palette.primary, 0.08 * intensity));
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
  }

  for (let si = 0; si < slots.length; si++) {
    const slot = slots[si];
    const { x, y, w, h, label, type, delay, accentIdx, entryDir } = slot;
    const accent = accentColors[accentIdx % accentColors.length];

    // Per-slot spring entry (elastic overshoot)
    const entryT  = springIn(t01, delay, 0.30);
    const holdT   = clamp01(remap(t01, delay + 0.28, delay + 0.45)); // content reveal after entry

    // Translate offset: slides in from its direction
    const slideAmt = Math.min(w, h) * 0.5 * (1 - entryT);
    let tx = 0, ty = 0;
    if (entryDir === 'left')  tx = -slideAmt;
    if (entryDir === 'right') tx =  slideAmt;
    if (entryDir === 'up')    ty = -slideAmt;
    if (entryDir === 'down')  ty =  slideAmt;

    ctx.save();
    ctx.translate(tx, ty);
    ctx.globalAlpha = entryT;

    // ── Panel background fill ────────────────────────────────────────────────
    const isDark = parseInt(palette.bg.replace('#','').slice(0, 2), 16) < 128;
    const glassFill = ctx.createLinearGradient(x, y, x + w, y + h);
    if (isDark) {
      glassFill.addColorStop(0, hexA('#ffffff', 0.07));
      glassFill.addColorStop(1, hexA('#ffffff', 0.03));
    } else {
      glassFill.addColorStop(0, hexA('#000000', 0.05));
      glassFill.addColorStop(1, hexA('#000000', 0.02));
    }

    // Accent tint for hero slot
    const panelFill = type === 'hero'
      ? (() => {
          const g = ctx.createLinearGradient(x, y, x + w, y + h);
          g.addColorStop(0, hexA(accent, 0.15));
          g.addColorStop(0.6, hexA(mixHex(accent, '#000000', 0.5), 0.08));
          g.addColorStop(1, hexA('#000000', 0.0));
          return g;
        })()
      : glassFill;

    fillPanel(
      ctx, x, y, w, h, r,
      panelFill,
      hexA(accent, 0.25 * intensity),
      40,
      12,
    );

    drawSheen(ctx, x, y, w, h, r);
    strokeGlass(ctx, x, y, w, h, r, 0.6 * entryT);

    // ── Accent line on left/top edge of panel ─────────────────────────────
    ctx.save();
    roundRect(ctx, x, y, w, h, r);
    ctx.clip();
    if (type === 'hero') {
      // Left vertical accent bar
      const barGrad = ctx.createLinearGradient(x, y, x, y + h);
      barGrad.addColorStop(0, hexA(accent, 0));
      barGrad.addColorStop(0.3, hexA(accent, 0.9));
      barGrad.addColorStop(0.7, hexA(accent, 0.9));
      barGrad.addColorStop(1, hexA(accent, 0));
      ctx.fillStyle = barGrad;
      ctx.fillRect(x, y, 3, h);
    } else {
      // Top horizontal accent bar
      const barGrad = ctx.createLinearGradient(x, y, x + w, y);
      barGrad.addColorStop(0, hexA(accent, 0.9));
      barGrad.addColorStop(1, hexA(accent, 0));
      ctx.fillStyle = barGrad;
      ctx.fillRect(x, y, w, 2.5);
    }
    ctx.restore();

    // ── Content rendering ─────────────────────────────────────────────────
    ctx.globalAlpha = holdT * entryT;

    const cx = x + w / 2;
    const cy = y + h / 2;
    const pad = w * 0.10;

    if (type === 'hero') {
      // ── Large metric with tick-up animation ────────────────────────────
      const tickProgress = easeOutCubic(clamp01(remap(t01, delay + 0.28, delay + 0.75)));
      const displayText = formatMetric(label, tickProgress);

      const desiredPx = h * 0.28;
      const fontPx = fitSingleLine(ctx, displayText, px => `800 ${px}px ${FONT_DISPLAY}`, w - pad * 2, desiredPx, 18);
      ctx.font = `800 ${fontPx}px ${FONT_DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Gradient text fill
      const textGrad = ctx.createLinearGradient(x, cy - fontPx, x + w, cy + fontPx * 0.5);
      textGrad.addColorStop(0, '#ffffff');
      textGrad.addColorStop(0.5, hexA(accent, 0.9));
      textGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = textGrad;
      ctx.shadowColor = hexA(accent, 0.5);
      ctx.shadowBlur = 30;
      ctx.fillText(displayText, cx, cy - h * 0.05);
      ctx.shadowBlur = 0;

      // Subtitle label
      const subPx = fontPx * 0.22;
      ctx.font = `500 ${subPx}px ${FONT_DISPLAY}`;
      ctx.fillStyle = hexA('#ffffff', 0.5);
      ctx.fillText('Total Views', cx, cy + fontPx * 0.62);

      // Subtle shimmer scanline across hero panel
      const shimmerX = x + (t01 * 2.4 % 1.4 - 0.2) * (w + 40) - 20;
      ctx.save();
      roundRect(ctx, x, y, w, h, r);
      ctx.clip();
      const shimmer = ctx.createLinearGradient(shimmerX - 30, y, shimmerX + 30, y);
      shimmer.addColorStop(0, 'rgba(255,255,255,0)');
      shimmer.addColorStop(0.5, 'rgba(255,255,255,0.07)');
      shimmer.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = shimmer;
      ctx.fillRect(x, y, w, h);
      ctx.restore();

    } else if (type === 'label') {
      // ── Gradient text label with shimmer ──────────────────────────────
      const { px: fontPx, lines } = fitMultiline(
        ctx, label, px => `700 ${px}px ${FONT_DISPLAY}`,
        w - pad * 2, h * 0.7, h * 0.25, 2, 1.2, 12,
      );
      ctx.font = `700 ${fontPx}px ${FONT_DISPLAY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const totalTH = lines.length * fontPx * 1.2;
      const startY = cy - totalTH / 2 + fontPx * 0.6;

      lines.forEach((line, li) => {
        const ly = startY + li * fontPx * 1.2;
        const lg = ctx.createLinearGradient(x + pad, ly, x + w - pad, ly);
        lg.addColorStop(0, '#ffffff');
        lg.addColorStop(0.5, hexA(accent, 0.9));
        lg.addColorStop(1, '#ffffff');
        ctx.fillStyle = lg;
        ctx.fillText(line, cx, ly);
      });

      // Small category chip
      const chipPx = fontPx * 0.32;
      const chipLabel = 'FEATURE';
      ctx.font = `600 ${chipPx}px ${FONT_DISPLAY}`;
      ctx.letterSpacing = '0.08em';
      const chipW = ctx.measureText(chipLabel).width + chipPx * 1.6;
      const chipH = chipPx * 1.8;
      const chipX = cx - chipW / 2;
      const chipY = y + pad * 0.7;
      roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
      ctx.fillStyle = hexA(accent, 0.2);
      ctx.fill();
      ctx.fillStyle = hexA(accent, 0.9);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(chipLabel, cx, chipY + chipH / 2);
      ctx.letterSpacing = '0';

    } else if (type === 'icon') {
      // ── Icon + label row ──────────────────────────────────────────────
      const iconName = 'sparkles';
      const iconSize = Math.min(w, h) * 0.34;
      const iconX = cx - iconSize * 1.0;
      const iconY = cy;

      // Glow behind icon
      ctx.save();
      const iconGlow = ctx.createRadialGradient(iconX, iconY, 0, iconX, iconY, iconSize * 1.2);
      iconGlow.addColorStop(0, hexA(accent, 0.25));
      iconGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = iconGlow;
      ctx.fillRect(x, y, w, h);
      ctx.restore();

      drawLucideIcon(ctx, iconName, iconX, iconY, iconSize, accent, {
        stroke: true,
        strokeWidth: 1.8,
        glowColor: hexA(accent, 0.8),
        glowBlur: 15,
      });

      // Label to right of icon
      const textPx = fitSingleLine(ctx, label, px => `600 ${px}px ${FONT_DISPLAY}`, w - pad * 2 - iconSize * 1.0, h * 0.3, 10);
      ctx.font = `600 ${textPx}px ${FONT_DISPLAY}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, iconX + iconSize * 0.7, cy);

    } else if (type === 'bar') {
      // ── Animated progress bar ─────────────────────────────────────────
      const barProgress = easeOutCubic(clamp01(remap(t01, delay + 0.30, delay + 0.75)));

      const barH = h * 0.18;
      const barY = cy - barH / 2 + h * 0.06;
      const barX = x + pad;
      const barW = w - pad * 2;
      const barR = barH / 2;

      // Label above bar
      const labelPx = fitSingleLine(ctx, label, px => `600 ${px}px ${FONT_DISPLAY}`, barW, h * 0.22, 8);
      ctx.font = `600 ${labelPx}px ${FONT_DISPLAY}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText(label, barX, barY - barH * 1.1);

      // Percentage label right
      ctx.textAlign = 'right';
      ctx.fillStyle = hexA(accent, 0.9);
      ctx.fillText(`${Math.round(barProgress * 100)}%`, barX + barW, barY - barH * 1.1);
      ctx.textAlign = 'left';

      // Track
      roundRect(ctx, barX, barY, barW, barH, barR);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fill();

      // Filled bar
      if (barProgress > 0) {
        const filledW = barW * barProgress;
        roundRect(ctx, barX, barY, filledW, barH, barR);
        const barGrad = ctx.createLinearGradient(barX, barY, barX + filledW, barY);
        barGrad.addColorStop(0, accent);
        barGrad.addColorStop(1, mixHex(accent, '#ffffff', 0.3));
        ctx.fillStyle = barGrad;
        ctx.shadowColor = hexA(accent, 0.6);
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Glowing leading edge dot
        ctx.beginPath();
        ctx.arc(barX + filledW, barY + barH / 2, barH * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = hexA(accent, 0.9);
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore(); // slot translate
  }

  ctx.restore(); // globalAlpha
};
