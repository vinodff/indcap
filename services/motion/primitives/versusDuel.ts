/**
 * versus-duel — SOTA Split-Screen Versus Comparison Duel.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 *
 * Renders:
 *   1. An energetic neon separating slash down the center.
 *   2. Sliding glass cards from left and right edges with spring overshoot.
 *   3. Staggered reveal of comparison lists (split by commas).
 *   4. A stamped central neon circular "VS" badge with a shockwave ripple.
 *   5. Winner spotlight: Winner side gets scaled up, glowing gold border, checkmark, and sparkles.
 *      Loser side scales down and fades in opacity.
 *
 * params.text accepts:
 *   "Left Title | Right Title | Left Detail (comma-separated) | Right Detail (comma-separated) | Winner (left/right/none)"
 *   e.g. "CapCut | Createrin | Basic Templates, Local Export, Manual Beats | 3D Engine ⚡, Real-time Timeline, AI Smart Beats | right"
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

// ── Seeded PRNG for victory sparkles ─────────────────────────────────────────
const mulberry32 = (seed: number) => {
  let a = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// ── Draw Checkmark ───────────────────────────────────────────────────────────
function drawCheckmark(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.28, cy + size * 0.05);
  ctx.lineTo(cx - size * 0.05, cy + size * 0.28);
  ctx.lineTo(cx + size * 0.32, cy - size * 0.25);
  ctx.stroke();
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
export const versusDuel = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity ?? 2;

  // Global fades
  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.10)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.90, 1.0)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // Parse pipe-separated texts
  const parts = (p.text || '').split('|').map(s => s.trim());
  const leftTitle  = parts[0] || 'Before';
  const rightTitle = parts[1] || 'After';
  const leftDetail  = parts[2] || 'Unoptimized, Slow, Boring';
  const rightDetail = parts[3] || 'AI Automated ⚡, Ultra Fast, Retention Hooked';
  const winnerSide  = (parts[4] || 'none').toLowerCase().trim(); // 'left', 'right', or 'none'

  const leftStats  = leftDetail.split(',').map(s => s.trim()).filter(Boolean);
  const rightStats = rightDetail.split(',').map(s => s.trim()).filter(Boolean);

  // ── Timelines ──────────────────────────────────────────────────────────────
  // 0.02 → 0.20: Separating slash draws
  // 0.20 → 0.46: Glass panels slide in from left/right with back overshoot
  // 0.46 → 0.62: VS Stamp down at center
  // 0.58 → 0.78: Stats comparison reveal stagger
  // 0.78 → 0.90: Winner spotlight active (scale / border glow)
  const slashT  = clamp01(remap(t01, 0.02, 0.20));
  const panelsT = easeOutBack(clamp01(remap(t01, 0.20, 0.46)), 1.15);
  const vsStampT = easeOutBack(clamp01(remap(t01, 0.46, 0.62)), 1.3);
  const statsT  = clamp01(remap(t01, 0.58, 0.78));
  const winnerT = easeInOutCubic(clamp01(remap(t01, 0.78, 0.90)));

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── 1. RENDER BACKGROUND BLURS ─────────────────────────────────────────────
  // Dual-tone background ambient lighting matching the choices
  const ambientRad = Math.min(width, height) * 0.45;
  
  // Left side glow (Primary palette)
  const leftGlow = ctx.createRadialGradient(width * 0.25, height * 0.5, 0, width * 0.25, height * 0.5, ambientRad);
  leftGlow.addColorStop(0, hexA(palette.primary, 0.08));
  leftGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.fillStyle = leftGlow;
  ctx.fillRect(0, 0, width / 2, height);
  ctx.restore();

  // Right side glow (Secondary palette)
  const rightGlow = ctx.createRadialGradient(width * 0.75, height * 0.5, 0, width * 0.75, height * 0.5, ambientRad);
  rightGlow.addColorStop(0, hexA(palette.secondary, 0.08));
  rightGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.fillStyle = rightGlow;
  ctx.fillRect(width / 2, 0, width / 2, height);
  ctx.restore();

  // ── 2. RENDER THE DIAGONAL SEPARATOR SLASH ──────────────────────────────────
  if (slashT > 0) {
    const slashOffset = 40; // diagonal tilt
    const topX = width / 2 + slashOffset;
    const botX = width / 2 - slashOffset;

    const curTopX = lerp(width / 2, topX, slashT);
    const curBotX = lerp(width / 2, botX, slashT);

    ctx.save();
    // Glow behind the slash line
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 4;
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 12 * intensity;
    ctx.beginPath();
    ctx.moveTo(width / 2, height / 2);
    // Draw upward
    ctx.lineTo(lerp(width / 2, topX, slashT), lerp(height / 2, 0, slashT));
    // Draw downward
    ctx.moveTo(width / 2, height / 2);
    ctx.lineTo(lerp(width / 2, botX, slashT), lerp(height / 2, height, slashT));
    ctx.stroke();

    // Solid core line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;
    ctx.stroke();
    ctx.restore();

    // Sparks (particle streams moving away from slash center)
    if (t01 > 0.05 && t01 < 0.45) {
      const rng = mulberry32(111);
      const sparkCount = intensity >= 3 ? 12 : 6;
      ctx.save();
      for (let s = 0; s < sparkCount; s++) {
        const tNorm = ((t01 - 0.05) / 0.4) % 1.0;
        const side = s % 2 === 0 ? -1 : 1;
        const startY = height * 0.2 + rng() * height * 0.6;
        const startX = width / 2 + (startY / height - 0.5) * -2 * slashOffset;
        
        const px = startX + side * tNorm * 80 * (0.5 + rng() * 0.5);
        const py = startY + (rng() - 0.5) * 30;
        const size = lerp(1, 2.5, rng());
        ctx.fillStyle = hexA(palette.accent, 1 - tNorm);
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ── 3. RENDER SLIDING CHOICE CARDS ─────────────────────────────────────────
  const cardW = Math.min(width * 0.35, 230);
  const cardH = 210;
  const cardY = height / 2 - cardH / 2;

  // Stagger reveal states
  const showLeft = panelsT > 0.01;
  const showRight = panelsT > 0.01;

  // Left card: Slides in from left (-cardW to width*0.25)
  if (showLeft) {
    const startX = -cardW;
    const targetX = width * 0.24 - cardW / 2;
    let x = lerp(startX, targetX, panelsT);
    let scale = 1.0;
    let cardAlpha = 1.0;

    // Apply Winner Spotlight physics
    if (winnerSide === 'left' && winnerT > 0) {
      scale = lerp(1.0, 1.05, winnerT);
    } else if (winnerSide === 'right' && winnerT > 0) {
      scale = lerp(1.0, 0.92, winnerT);
      cardAlpha = lerp(1.0, 0.55, winnerT);
    }

    ctx.save();
    ctx.globalAlpha = globalAlpha * cardAlpha;
    ctx.translate(x + cardW / 2, cardY + cardH / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(x + cardW / 2), -(cardY + cardH / 2));

    // Glow border if winner is spotlighted
    if (winnerSide === 'left' && winnerT > 0.1) {
      ctx.shadowColor = palette.primary;
      ctx.shadowBlur = 15 * winnerT;
    }

    // Glass panel backing
    roundRect(ctx, x, cardY, cardW, cardH, 16);
    ctx.fillStyle = hexA('#ffffff', 0.06);
    ctx.fill();

    // Panel border
    roundRect(ctx, x, cardY, cardW, cardH, 16);
    ctx.strokeStyle = winnerSide === 'left'
      ? mixHex(hexA('#ffffff', 0.12), palette.accent, winnerT)
      : hexA('#ffffff', 0.12);
    ctx.lineWidth = winnerSide === 'left' ? lerp(1.0, 2.2, winnerT) : 1.0;
    ctx.stroke();

    // Top Brand Accent Strip (clipped to rounded card)
    ctx.save();
    roundRect(ctx, x, cardY, cardW, cardH, 16);
    ctx.clip();
    ctx.fillStyle = palette.primary;
    ctx.fillRect(x, cardY, cardW, 6);
    ctx.restore();

    // Card Title (Left Choice)
    ctx.shadowBlur = 0; // reset shadow
    ctx.font = `800 17px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(leftTitle, x + cardW / 2, cardY + 22);

    // Staggered Stats Reveal
    const maxLines = 3;
    for (let i = 0; i < Math.min(leftStats.length, maxLines); i++) {
      const lineDelay = i * 0.08;
      const lineT = clamp01((statsT - lineDelay) / (1 - lineDelay));
      if (lineT <= 0.001) continue;

      const lineY = cardY + 68 + i * 42;
      ctx.save();
      ctx.globalAlpha = globalAlpha * cardAlpha * lineT;
      ctx.translate(0, lerp(12, 0, lineT));

      // Bullet chip glass panel
      roundRect(ctx, x + 12, lineY, cardW - 24, 30, 8);
      ctx.fillStyle = hexA(palette.primary, 0.08);
      ctx.fill();

      ctx.font = `600 11px ${FONT}`;
      ctx.fillStyle = hexA('#ffffff', 0.75);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(leftStats[i], x + cardW / 2, lineY + 15);
      ctx.restore();
    }

    // Victory Checkmark and crown (Left win)
    if (winnerSide === 'left' && winnerT > 0.05) {
      ctx.save();
      ctx.globalAlpha = winnerT;
      const ringR = 14;
      const rx = x + cardW - 18;
      const ry = cardY + 20;

      // Circle base
      ctx.beginPath();
      ctx.arc(rx, ry, ringR, 0, Math.PI * 2);
      ctx.fillStyle = palette.accent;
      ctx.fill();

      drawCheckmark(ctx, rx, ry, ringR, '#ffffff');
      ctx.restore();
    }

    ctx.restore(); // Left transform
  }

  // Right card: Slides in from right (width+cardW to width*0.75)
  if (showRight) {
    const startX = width + cardW;
    const targetX = width * 0.76 - cardW / 2;
    let x = lerp(startX, targetX, panelsT);
    let scale = 1.0;
    let cardAlpha = 1.0;

    // Apply Winner Spotlight physics
    if (winnerSide === 'right' && winnerT > 0) {
      scale = lerp(1.0, 1.05, winnerT);
    } else if (winnerSide === 'left' && winnerT > 0) {
      scale = lerp(1.0, 0.92, winnerT);
      cardAlpha = lerp(1.0, 0.55, winnerT);
    }

    ctx.save();
    ctx.globalAlpha = globalAlpha * cardAlpha;
    ctx.translate(x + cardW / 2, cardY + cardH / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(x + cardW / 2), -(cardY + cardH / 2));

    // Glow border if winner is spotlighted
    if (winnerSide === 'right' && winnerT > 0.1) {
      ctx.shadowColor = palette.secondary;
      ctx.shadowBlur = 15 * winnerT;
    }

    // Glass panel backing
    roundRect(ctx, x, cardY, cardW, cardH, 16);
    ctx.fillStyle = hexA('#ffffff', 0.06);
    ctx.fill();

    // Panel border
    roundRect(ctx, x, cardY, cardW, cardH, 16);
    ctx.strokeStyle = winnerSide === 'right'
      ? mixHex(hexA('#ffffff', 0.12), palette.accent, winnerT)
      : hexA('#ffffff', 0.12);
    ctx.lineWidth = winnerSide === 'right' ? lerp(1.0, 2.2, winnerT) : 1.0;
    ctx.stroke();

    // Top Brand Accent Strip (clipped to rounded card)
    ctx.save();
    roundRect(ctx, x, cardY, cardW, cardH, 16);
    ctx.clip();
    ctx.fillStyle = palette.secondary;
    ctx.fillRect(x, cardY, cardW, 6);
    ctx.restore();

    // Card Title (Right Choice)
    ctx.shadowBlur = 0; // reset shadow
    ctx.font = `800 17px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(rightTitle, x + cardW / 2, cardY + 22);

    // Staggered Stats Reveal
    const maxLines = 3;
    for (let i = 0; i < Math.min(rightStats.length, maxLines); i++) {
      const lineDelay = i * 0.08;
      const lineT = clamp01((statsT - lineDelay) / (1 - lineDelay));
      if (lineT <= 0.001) continue;

      const lineY = cardY + 68 + i * 42;
      ctx.save();
      ctx.globalAlpha = globalAlpha * cardAlpha * lineT;
      ctx.translate(0, lerp(12, 0, lineT));

      // Bullet chip glass panel
      roundRect(ctx, x + 12, lineY, cardW - 24, 30, 8);
      ctx.fillStyle = hexA(palette.secondary, 0.08);
      ctx.fill();

      ctx.font = `600 11px ${FONT}`;
      ctx.fillStyle = hexA('#ffffff', 0.75);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rightStats[i], x + cardW / 2, lineY + 15);
      ctx.restore();
    }

    // Victory Checkmark (Right win)
    if (winnerSide === 'right' && winnerT > 0.05) {
      ctx.save();
      ctx.globalAlpha = winnerT;
      const ringR = 14;
      const rx = x + cardW - 18;
      const ry = cardY + 20;

      // Circle base
      ctx.beginPath();
      ctx.arc(rx, ry, ringR, 0, Math.PI * 2);
      ctx.fillStyle = palette.accent;
      ctx.fill();

      drawCheckmark(ctx, rx, ry, ringR, '#ffffff');
      ctx.restore();
    }

    ctx.restore(); // Right transform
  }

  // ── 4. RENDER NEON "VS" STAMP BADGE ────────────────────────────────────────
  if (vsStampT > 0.01) {
    const badgeR = 25;
    const bx = width / 2;
    const by = height / 2;

    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(vsStampT, vsStampT);

    // Shockwave ripple expands on impact
    if (vsStampT > 0.6) {
      const ripNorm = (vsStampT - 0.6) / 0.4;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, badgeR + ripNorm * 40, 0, Math.PI * 2);
      ctx.strokeStyle = hexA(palette.accent, 0.5 * (1 - ripNorm));
      ctx.lineWidth = 2.0;
      ctx.stroke();
      ctx.restore();
    }

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(0, 0, badgeR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 10 * intensity;
    ctx.fill();

    // Accent line stroke
    ctx.beginPath();
    ctx.arc(0, 0, badgeR - 3, 0, Math.PI * 2);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.stroke();

    // "VS" Bold Typography
    ctx.font = `800 13px ${FONT}`;
    ctx.fillStyle = palette.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', 0, 0.5);

    ctx.restore();
  }

  // ── 5. VICTORY SPARKLE PARTICLES SPRAY (WINNER EXCLUSIVE) ───────────────────
  if (winnerSide !== 'none' && winnerT > 0.2) {
    const isLeftWin = winnerSide === 'left';
    const rx = isLeftWin ? (width * 0.24) : (width * 0.76);
    const ry = cardY + 20;

    const rng = mulberry32(777);
    const sparkleCount = intensity >= 3 ? 12 : intensity === 2 ? 8 : 4;
    const cycleT = (t01 * 4) % 1.0; // sparkle speed loop

    ctx.save();
    for (let sp = 0; sp < sparkleCount; sp++) {
      const angle = (sp / sparkleCount) * Math.PI * 2 + rng() * 0.5;
      const dist  = lerp(15, 50, (cycleT + rng()) % 1.0);
      const alpha = 1 - ((cycleT + rng()) % 1.0);
      const px = rx + Math.cos(angle) * dist;
      const py = ry + Math.sin(angle) * dist;
      const size = lerp(1, 3, rng());

      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fillStyle = hexA(palette.accent, alpha * winnerT);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore(); // Global alpha
};
