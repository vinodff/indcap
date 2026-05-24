/**
 * search-rank-list — Google Search to Ranked List / Leaderboard Reveal.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 *
 * Renders:
 *   1. A modern glassmorphic search input bar centered on the screen.
 *   2. Types a query letter-by-letter with a blinking text cursor.
 *   3. Triggers a click pulse on a search button.
 *   4. Slides the search bar to the top.
 *   5. Staggers in a ranked list/leaderboard below.
 *   6. Highlights Rank #1 with a gold bezel, checkmark, and particle sparkle spray.
 *
 * params.text accepts:
 *   "search query | Rank 1 item | Rank 2 item | Rank 3 item"
 *   e.g. "best motion tool | Createrin #1 | Competitor B | Competitor C"
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

// ── Seeded PRNG for sparkles ────────────────────────────────────────────────
const mulberry32 = (seed: number) => {
  let a = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Draw Search Magnifying Glass ─────────────────────────────────────────────
function drawSearchIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // Lens
  ctx.arc(cx - size * 0.12, cy - size * 0.12, size * 0.28, 0, Math.PI * 2);
  ctx.stroke();
  // Handle
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.08, cy + size * 0.08);
  ctx.lineTo(cx + size * 0.35, cy + size * 0.35);
  ctx.stroke();
  ctx.restore();
}

// ── Draw Checkmark Icon ──────────────────────────────────────────────────────
function drawCheckmarkIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.3, cy + size * 0.05);
  ctx.lineTo(cx - size * 0.05, cy + size * 0.28);
  ctx.lineTo(cx + size * 0.35, cy - size * 0.25);
  ctx.stroke();
  ctx.restore();
}

// ── Draw Trophy Icon ─────────────────────────────────────────────────────────
function drawTrophyIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  // Cup body
  ctx.moveTo(cx - size * 0.25, cy - size * 0.3);
  ctx.lineTo(cx + size * 0.25, cy - size * 0.3);
  ctx.quadraticCurveTo(cx + size * 0.25, cy + size * 0.05, cx, cy + size * 0.15);
  ctx.quadraticCurveTo(cx - size * 0.25, cy + size * 0.05, cx - size * 0.25, cy - size * 0.3);
  ctx.stroke();
  ctx.fill();

  // Stem & Base
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.15);
  ctx.lineTo(cx, cy + size * 0.3);
  ctx.moveTo(cx - size * 0.18, cy + size * 0.3);
  ctx.lineTo(cx + size * 0.18, cy + size * 0.3);
  ctx.stroke();

  // Handles
  ctx.beginPath();
  ctx.arc(cx - size * 0.28, cy - size * 0.12, size * 0.12, -Math.PI / 2, Math.PI / 2, true);
  ctx.arc(cx + size * 0.28, cy - size * 0.12, size * 0.12, -Math.PI / 2, Math.PI / 2, false);
  ctx.stroke();

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
export const searchRankList = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;

  // Global fades
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.10)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.90, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // Parse text array: [0] is query, [1..] are rank items
  const parts = (p.text || '').split('|').map(s => s.trim()).filter(Boolean);
  const searchQuery = parts[0] || 'best motion tool';
  const rankItems = parts.slice(1);
  if (rankItems.length === 0) {
    rankItems.push('Createrin 🎉', 'Competitor B', 'Competitor C');
  }

  // ── Timelines ──────────────────────────────────────────────────────────────
  // 0.00 → 0.28: typing query
  // 0.28 → 0.36: click search button
  // 0.36 → 0.50: search bar moves to top
  // 0.50 → 0.75: staggered rank list reveals
  // 0.75 → 0.90: idle hover / float + sparkle loop
  const typingT = clamp01(remap(t01, 0.02, 0.28));
  const clickT  = clamp01(remap(t01, 0.28, 0.36));
  const moveT   = easeInOutCubic(clamp01(remap(t01, 0.36, 0.50)));
  const listT   = clamp01(remap(t01, 0.50, 0.75));

  // Typewriter string length calculation
  const charCount = Math.floor(searchQuery.length * typingT);
  const currentQuery = searchQuery.slice(0, charCount);
  const showCursor = typingT < 1.0 || Math.floor(t01 * 12) % 2 === 0;

  // ── Positions ──────────────────────────────────────────────────────────────
  const barW = Math.min(width * 0.85, 480);
  const barH = 54;
  const startY = height / 2 - barH / 2;
  const endY   = height * 0.15;
  const barY   = lerp(startY, endY, moveT);

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── Render Search Bar ──────────────────────────────────────────────────────
  ctx.save();
  // Draw glowing backing aura
  const barGlow = ctx.createRadialGradient(width / 2, barY + barH / 2, 0, width / 2, barY + barH / 2, barW * 0.55);
  barGlow.addColorStop(0, hexA(palette.primary, 0.12));
  barGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = barGlow;
  ctx.fillRect(0, 0, width, height);

  // Search input glass card
  roundRect(ctx, width / 2 - barW / 2, barY, barW, barH, 27);
  ctx.fillStyle = hexA('#ffffff', 0.08);
  ctx.fill();
  roundRect(ctx, width / 2 - barW / 2, barY, barW, barH, 27);
  ctx.strokeStyle = hexA('#ffffff', 0.16);
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Search Icon (left offset)
  drawSearchIcon(ctx, width / 2 - barW / 2 + 25, barY + barH / 2, 22, hexA('#ffffff', 0.4));

  // Render typing query text
  ctx.font = `500 17px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const textX = width / 2 - barW / 2 + 52;
  ctx.fillText(currentQuery, textX, barY + barH / 2);

  // Cursor
  if (showCursor && typingT < 1.0) {
    const queryW = ctx.measureText(currentQuery).width;
    ctx.fillStyle = palette.accent;
    ctx.fillRect(textX + queryW + 2, barY + barH / 2 - 9, 2, 18);
  }

  // Search Button (right offset)
  const btnW = 75;
  const btnH = 34;
  const btnX = width / 2 + barW / 2 - btnW - 10;
  const btnY = barY + (barH - btnH) / 2;

  // Click animation scale compression on button
  ctx.save();
  if (clickT > 0 && clickT < 1.0) {
    const scale = lerp(1.0, 0.90, Math.sin(clickT * Math.PI));
    ctx.translate(btnX + btnW / 2, btnY + btnH / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(btnX + btnW / 2), -(btnY + btnH / 2));

    // Draw click ripple circle expand
    if (clickT > 0.3) {
      const rippleR = lerp(0, 45, (clickT - 0.3) / 0.7);
      ctx.beginPath();
      ctx.arc(btnX + btnW / 2, btnY + btnH / 2, rippleR, 0, Math.PI * 2);
      ctx.strokeStyle = hexA(palette.accent, 0.6 * (1 - (clickT - 0.3) / 0.7));
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }
  }

  roundRect(ctx, btnX, btnY, btnW, btnH, btnH / 2);
  ctx.fillStyle = palette.accent;
  ctx.fill();

  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Search', btnX + btnW / 2, btnY + btnH / 2 + 0.5);
  ctx.restore(); // end button press transform
  ctx.restore(); // end search bar

  // ── Render Ranked List / Leaderboard (reveals after bar moves) ─────────────
  if (moveT > 0.9) {
    const listStartY = endY + barH + 24;
    const itemH = 64;
    const itemGap = 12;
    const itemW = barW;

    for (let i = 0; i < rankItems.length; i++) {
      // Staggered reveal entry calculation
      const itemDelay = i * 0.12;
      const itemProgress = easeOutBack(clamp01((listT - itemDelay) / (1 - itemDelay)), 1.15);
      if (itemProgress < 0.005) continue;

      const itemY = listStartY + i * (itemH + itemGap);
      const isRank1 = i === 0;

      ctx.save();
      ctx.globalAlpha = itemProgress;
      // Stagger slide in from bottom
      ctx.translate(0, lerp(35, 0, itemProgress));

      // 1. Backing glass structure
      roundRect(ctx, width / 2 - itemW / 2, itemY, itemW, itemH, 16);
      ctx.fillStyle = isRank1 ? hexA(palette.primary, 0.10) : hexA('#ffffff', 0.05);
      ctx.fill();

      // Specular highlight outline
      roundRect(ctx, width / 2 - itemW / 2, itemY, itemW, itemH, 16);
      ctx.strokeStyle = isRank1
        ? hexA(palette.accent, 0.4)
        : hexA('#ffffff', 0.12);
      ctx.lineWidth = isRank1 ? 1.8 : 1.0;
      ctx.stroke();

      // 2. Rank Number Badge / Trophy
      const badgeSize = 34;
      const bx = width / 2 - itemW / 2 + 30;
      const by = itemY + itemH / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, badgeSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = isRank1 ? palette.accent : hexA('#ffffff', 0.08);
      ctx.fill();

      if (isRank1) {
        drawTrophyIcon(ctx, bx, by, 16, '#ffffff');
      } else {
        ctx.font = `700 14px ${FONT}`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, bx, by + 0.5);
      }
      ctx.restore();

      // 3. Item Text Label
      ctx.font = `600 16px ${FONT}`;
      ctx.fillStyle = isRank1 ? '#ffffff' : hexA('#ffffff', 0.85);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const labelX = bx + 32;
      ctx.fillText(rankItems[i], labelX, itemY + itemH / 2);

      // 4. Checkmark / Highlight stars (Rank #1 exclusive)
      if (isRank1) {
        const cxRight = width / 2 + itemW / 2 - 30;
        drawCheckmarkIcon(ctx, cxRight, itemY + itemH / 2, 18, palette.accent);

        // Particle sparkles Spray Loop
        const rng = mulberry32(888);
        const sparkleCount = intensity >= 3 ? 12 : intensity === 2 ? 8 : 4;
        const particlePeriod = t01 * 4.5; // speed

        ctx.save();
        for (let sp = 0; sp < sparkleCount; sp++) {
          const angle = (sp / sparkleCount) * Math.PI * 2 + rng() * 0.4;
          const dist  = lerp(12, 45, (particlePeriod + rng()) % 1.0);
          const pAlpha = 1 - ((particlePeriod + rng()) % 1.0);
          const px = bx + Math.cos(angle) * dist;
          const py = by + Math.sin(angle) * dist;
          const pSize = lerp(1.5, 4, rng());

          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fillStyle = hexA(palette.accent, pAlpha * 0.7);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore(); // end item transform
    }
  }

  ctx.restore(); // globalAlpha
};
