/**
 * before-after-reveal — Dramatic Split-Screen Before / After Reveal.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 *
 * A full-canvas split screen that:
 *   1. Opens on the dark BEFORE state (full screen)
 *   2. A glowing accent divider line springs in from the right edge
 *      and sweeps across to the centre with elastic overshoot
 *   3. As the divider crosses each pixel, the vibrant AFTER panel
 *      is revealed in its wake — creating a physical "wipe" sensation
 *   4. Both panels contain staggered stats: ❌ muted rows (BEFORE)
 *      vs ✅ glowing rows with green delta chips (AFTER)
 *   5. Mini bar charts at the bottom — short/red (before) vs tall/glowing (after)
 *   6. Divider handle with ◀ ▶ arrows sits at the intersection point
 *
 * params.text  → optional topic headline shown at the top centre
 * params.icon  → stat preset: "revenue" | "speed" | "social" (default "revenue")
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

interface StatRow { label: string; before: string; after: string; delta: string; }

const STAT_PRESETS: Record<string, StatRow[]> = {
  revenue: [
    { label: 'Revenue',    before: '$4.2k',  after: '$48k',   delta: '+1,043%' },
    { label: 'Conversion', before: '1.2%',   after: '11.4%',  delta: '+850%'   },
    { label: 'Load Time',  before: '8.2s',   after: '0.8s',   delta: '10× faster' },
  ],
  speed: [
    { label: 'Load Time',  before: '6.8s',   after: '0.6s',   delta: '11× faster' },
    { label: 'LCP',        before: '4.2s',   after: '0.9s',   delta: '+78 score'  },
    { label: 'Conversions',before: '0.9%',   after: '8.7%',   delta: '+867%'      },
  ],
  social: [
    { label: 'Followers',  before: '2,100',  after: '94,000', delta: '+4,376%' },
    { label: 'Engagement', before: '0.8%',   after: '12.4%',  delta: '+1,450%' },
    { label: 'Views/Post', before: '420',    after: '184k',   delta: '438× more'  },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
export const beforeAfterReveal = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity   = p.intensity ?? 2;
  const presetKey   = (['revenue', 'speed', 'social'].includes(p.icon ?? ''))
    ? (p.icon as string) : 'revenue';
  const stats       = STAT_PRESETS[presetKey];
  const topicLabel  = (p.text || '').toUpperCase();

  // ── Fade envelope ─────────────────────────────────────────────────────────
  const fadeIn  = easeInOutCubic(clamp01(remap(t01, 0.00, 0.10)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.00)));
  const globalA = fadeIn * (1 - fadeOut);
  if (globalA < 0.005) return;

  // ── Divider X: sweeps from right edge → width/2 with spring ──────────────
  const entryP  = clamp01(remap(t01, 0.08, 0.56));
  const divBase = lerp(width, width / 2, easeOutBack(entryP, 1.32));
  const holdP   = clamp01(remap(t01, 0.56, 1.00));
  // Decaying oscillation after spring settles
  const holdOsc = Math.sin(holdP * Math.PI * 5.5) * 6 * Math.max(0, 1 - holdP * 1.5) * intensity;
  const divX    = divBase + holdOsc;

  // ── Content timing ─────────────────────────────────────────────────────────
  const beforeReveal = easeOutCubic(clamp01(remap(t01, 0.04, 0.28)));
  const afterReveal  = easeOutCubic(clamp01(remap(t01, 0.38, 0.64)));
  const statsReveal  = easeOutCubic(clamp01(remap(t01, 0.48, 0.78)));
  const chartReveal  = easeOutCubic(clamp01(remap(t01, 0.56, 0.82)));

  ctx.save();
  ctx.globalAlpha = globalA;

  // ══════════════════════════════════════════════════════════════════════════
  // BEFORE PANEL — dark, desaturated, full-canvas base layer
  // ══════════════════════════════════════════════════════════════════════════
  {
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#131318');
    bg.addColorStop(1, '#09090d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Subtle dot-grid texture
    ctx.save();
    ctx.globalAlpha = 0.055;
    const gs = Math.round(Math.min(width, height) / 28);
    for (let gx = gs; gx < width; gx += gs) {
      for (let gy = gs; gy < height; gy += gs) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = '#9999bb';
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── BEFORE content (staggered rows slide in from left) ────────────────────
  {
    ctx.save();
    ctx.globalAlpha = beforeReveal;

    const pCx     = width * 0.25;
    const fs      = Math.min(width * 0.5, height) * 0.040;
    const rowH    = fs * 2.95;
    const rowW    = width * 0.41;
    const baseY   = height * 0.30;

    // ── "BEFORE" badge chip ───────────────────────────────────────────────
    const badgeFontPx = Math.min(width, height) * 0.029;
    ctx.font = `700 ${badgeFontPx}px ${FONT}`;
    const bLabel = '● BEFORE';
    const bW = ctx.measureText(bLabel).width + badgeFontPx * 1.9;
    const bH = badgeFontPx * 1.95;
    const bY = height * 0.09;
    roundRect(ctx, pCx - bW / 2, bY - bH / 2, bW, bH, bH / 2);
    ctx.fillStyle = hexA('#ff4455', 0.14);
    ctx.fill();
    roundRect(ctx, pCx - bW / 2, bY - bH / 2, bW, bH, bH / 2);
    ctx.strokeStyle = hexA('#ff4455', 0.52);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ff6677';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bLabel, pCx, bY);

    // ── Topic label (if provided) ─────────────────────────────────────────
    if (topicLabel) {
      ctx.font = `800 ${fs * 1.1}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = hexA('#ffffff', 0.18);
      ctx.fillText(topicLabel, pCx, height * 0.195);
    }

    // ── Stat rows ─────────────────────────────────────────────────────────
    stats.forEach((stat, si) => {
      const rowReveal = easeOutCubic(clamp01((beforeReveal - si * 0.14) / 0.72));
      const sy = baseY + si * rowH;

      ctx.save();
      ctx.globalAlpha = rowReveal;
      ctx.translate(lerp(-width * 0.08, 0, rowReveal), 0);

      // Row background chip
      roundRect(ctx, pCx - rowW / 2, sy, rowW, fs * 2.1, fs * 0.28);
      ctx.fillStyle = hexA('#ffffff', 0.04);
      ctx.fill();

      // Left red accent bar
      roundRect(ctx, pCx - rowW / 2, sy, 3, fs * 2.1, 2);
      ctx.fillStyle = hexA('#ff4455', 0.65);
      ctx.fill();

      // Label
      ctx.font = `500 ${fs * 0.82}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = hexA('#ffffff', 0.32);
      ctx.fillText(`❌  ${stat.label}`, pCx - rowW / 2 + fs * 0.8, sy + fs * 0.82);

      // Value (muted red)
      ctx.font = `700 ${fs * 1.08}px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ff6677';
      ctx.fillText(stat.before, pCx + rowW / 2 - fs * 0.4, sy + fs * 1.55);

      ctx.restore();
    });

    // ── Before bar chart (short, desaturated) ─────────────────────────────
    {
      const cY  = height * 0.74;
      const cH  = height * 0.125;
      const cW  = width  * 0.35;
      const bWi = cW / 6;
      const bHs = [0.28, 0.20, 0.34, 0.22, 0.18, 0.26];

      ctx.save();
      ctx.globalAlpha = beforeReveal * 0.7;
      bHs.forEach((bh, bi) => {
        const bx  = pCx - cW / 2 + bi * bWi + bWi * 0.12;
        const bw2 = bWi * 0.72;
        const bh2 = cH * bh;
        const by2 = cY + cH - bh2;
        roundRect(ctx, bx, by2, bw2, bh2, 3);
        ctx.fillStyle = hexA('#ff5566', 0.22 + bi * 0.02);
        ctx.fill();
      });
      // Baseline
      ctx.strokeStyle = hexA('#ffffff', 0.07);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pCx - cW / 2, cY + cH);
      ctx.lineTo(pCx + cW / 2, cY + cH);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // beforeReveal alpha
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AFTER PANEL — clipped to [divX, width], vibrant and glowing
  // ══════════════════════════════════════════════════════════════════════════
  ctx.save();
  ctx.beginPath();
  ctx.rect(divX, 0, width - divX, height);
  ctx.clip();

  // Vibrant gradient background
  {
    const bg = ctx.createLinearGradient(width / 2, 0, width, height);
    bg.addColorStop(0, mixHex(palette.primary, '#000', 0.10));
    bg.addColorStop(0.55, palette.primary);
    bg.addColorStop(1, mixHex(palette.primary, palette.accent, 0.42));
    ctx.fillStyle = bg;
    ctx.fillRect(divX, 0, width - divX, height);

    // Radial accent bloom (top-right quadrant)
    const bloom = ctx.createRadialGradient(
      width * 0.76, height * 0.36, 0,
      width * 0.76, height * 0.36, height * 0.60,
    );
    bloom.addColorStop(0, hexA(palette.accent, 0.26 * intensity));
    bloom.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(divX, 0, width - divX, height);

    // Diagonal shine lines
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    for (let lx = -height; lx < width * 2; lx += 34) {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx + height, height);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── AFTER content ─────────────────────────────────────────────────────────
  {
    ctx.save();
    ctx.globalAlpha = afterReveal;

    const pCx  = width * 0.75;
    const fs   = Math.min(width * 0.5, height) * 0.040;
    const rowH = fs * 2.95;
    const rowW = width * 0.41;
    const baseY = height * 0.30;

    // ── "AFTER" badge chip ────────────────────────────────────────────────
    const badgeFontPx = Math.min(width, height) * 0.029;
    ctx.font = `700 ${badgeFontPx}px ${FONT}`;
    const aLabel = '✨ AFTER';
    const aW = ctx.measureText(aLabel).width + badgeFontPx * 1.9;
    const aH = badgeFontPx * 1.95;
    const aY = height * 0.09;
    roundRect(ctx, pCx - aW / 2, aY - aH / 2, aW, aH, aH / 2);
    ctx.fillStyle = hexA('#22cc77', 0.18);
    ctx.fill();
    roundRect(ctx, pCx - aW / 2, aY - aH / 2, aW, aH, aH / 2);
    ctx.strokeStyle = hexA('#22cc77', 0.62);
    ctx.lineWidth = 1.5;
    ctx.shadowColor = hexA('#22cc77', 0.40);
    ctx.shadowBlur = 9;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#44ee99';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(aLabel, pCx, aY);

    // ── Topic label ───────────────────────────────────────────────────────
    if (topicLabel) {
      ctx.font = `800 ${fs * 1.1}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = hexA('#ffffff', 0.20);
      ctx.fillText(topicLabel, pCx, height * 0.195);
    }

    // ── Stat rows ─────────────────────────────────────────────────────────
    stats.forEach((stat, si) => {
      const rowReveal = easeOutCubic(clamp01((statsReveal - si * 0.14) / 0.72));
      const sy = baseY + si * rowH;

      ctx.save();
      ctx.globalAlpha = rowReveal;
      // Slide in from right as divider crosses
      ctx.translate(lerp(width * 0.07, 0, rowReveal), 0);

      // Row background chip
      roundRect(ctx, pCx - rowW / 2, sy, rowW, fs * 2.1, fs * 0.28);
      ctx.fillStyle = hexA('#ffffff', 0.08);
      ctx.fill();
      roundRect(ctx, pCx - rowW / 2, sy, rowW, fs * 2.1, fs * 0.28);
      ctx.strokeStyle = hexA('#22cc77', 0.22);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Left green accent bar
      roundRect(ctx, pCx - rowW / 2, sy, 3, fs * 2.1, 2);
      ctx.fillStyle = hexA('#22cc77', 0.80);
      ctx.fill();

      // Label
      ctx.font = `500 ${fs * 0.82}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = hexA('#ffffff', 0.60);
      ctx.fillText(`✅  ${stat.label}`, pCx - rowW / 2 + fs * 0.8, sy + fs * 0.82);

      // After value (bright white)
      ctx.font = `700 ${fs * 1.08}px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(stat.after, pCx + rowW / 2 - fs * 0.4, sy + fs * 1.55);

      // Delta pill (green, bottom-left of row)
      const dTxt = stat.delta;
      ctx.font = `600 ${fs * 0.62}px ${FONT}`;
      const dW = ctx.measureText(dTxt).width + fs * 0.72;
      const dH2 = fs * 0.85;
      const dX = pCx - rowW / 2 + fs * 0.8;
      const dY2 = sy + fs * 2.1 - dH2 - fs * 0.22; // anchored to bottom of chip
      roundRect(ctx, dX, dY2, dW, dH2, dH2 / 2);
      ctx.fillStyle = hexA('#22cc77', 0.22);
      ctx.fill();
      ctx.fillStyle = '#44ee99';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(dTxt, dX + fs * 0.36, dY2 + dH2 / 2);

      ctx.restore();
    });

    ctx.restore(); // afterReveal alpha

    // ── After bar chart (tall, glowing, grows upward) ─────────────────────
    {
      ctx.save();
      ctx.globalAlpha = chartReveal;

      const cY  = height * 0.74;
      const cH  = height * 0.125;
      const cW  = width  * 0.35;
      const bWi = cW / 6;
      const bHs = [0.68, 0.88, 0.76, 0.94, 0.82, 0.72];

      bHs.forEach((bh, bi) => {
        const bx   = pCx - cW / 2 + bi * bWi + bWi * 0.12;
        const bw2  = bWi * 0.72;
        const bh2  = cH * bh * chartReveal; // bars grow with chartReveal
        const by2  = cY + cH - bh2;

        roundRect(ctx, bx, by2, bw2, bh2, 3);
        const barGrad = ctx.createLinearGradient(bx, by2, bx, by2 + bh2);
        barGrad.addColorStop(0, hexA(palette.accent, 0.95));
        barGrad.addColorStop(1, hexA(palette.accent, 0.40));
        ctx.fillStyle = barGrad;
        ctx.shadowColor = hexA(palette.accent, 0.55);
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Baseline
      ctx.strokeStyle = hexA('#ffffff', 0.14);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pCx - cW / 2, cY + cH);
      ctx.lineTo(pCx + cW / 2, cY + cH);
      ctx.stroke();

      ctx.restore();
    }
  }

  ctx.restore(); // AFTER panel clip

  // ══════════════════════════════════════════════════════════════════════════
  // DIVIDER — line + edge shadows + handle with arrows
  // ══════════════════════════════════════════════════════════════════════════

  // Left shadow (darkens BEFORE edge)
  {
    const sw = 55;
    const sg = ctx.createLinearGradient(divX - sw, 0, divX, 0);
    sg.addColorStop(0, 'rgba(0,0,0,0)');
    sg.addColorStop(1, 'rgba(0,0,0,0.48)');
    ctx.fillStyle = sg;
    ctx.fillRect(divX - sw, 0, sw, height);
  }

  // Right glow (illuminates AFTER edge)
  {
    const gw = 38;
    const gg = ctx.createLinearGradient(divX, 0, divX + gw, 0);
    gg.addColorStop(0, hexA(palette.accent, 0.30 * intensity));
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(divX, 0, gw, height);
  }

  // Divider line with accent glow
  ctx.save();
  ctx.shadowColor = hexA(palette.accent, 0.95);
  ctx.shadowBlur  = 20;
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth   = 2.5;
  ctx.beginPath();
  ctx.moveTo(divX, 0);
  ctx.lineTo(divX, height);
  ctx.stroke();
  ctx.restore();

  // Handle circle
  {
    const hY = height * 0.5;
    const hR = Math.max(Math.min(width, height) * 0.038, 20);

    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur    = 24;
    ctx.shadowOffsetY = 7;

    ctx.beginPath();
    ctx.arc(divX, hY, hR, 0, Math.PI * 2);
    const hGrad = ctx.createRadialGradient(
      divX - hR * 0.25, hY - hR * 0.30, 0,
      divX, hY, hR,
    );
    hGrad.addColorStop(0, mixHex(palette.accent, '#ffffff', 0.35));
    hGrad.addColorStop(1, palette.accent);
    ctx.fillStyle = hGrad;
    ctx.fill();
    ctx.shadowBlur    = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = hexA('#ffffff', 0.60);
    ctx.lineWidth   = 1.8;
    ctx.stroke();

    ctx.font         = `700 ${hR * 0.68}px ${FONT}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ffffff';
    ctx.fillText('◀ ▶', divX, hY);

    ctx.restore();
  }

  ctx.restore(); // globalAlpha
};
