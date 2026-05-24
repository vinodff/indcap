/**
 * floating-product-card — 3D Glassmorphic Product Card.
 *
 * Phase 11 — Competitor-Grade Templates (Jitter / Hera level).
 *
 * A premium e-commerce / product showcase card that:
 *   1. Flips in from edge-on (simulated Y-axis rotation via X-scale spring)
 *   2. Holds with a gentle 3D perspective tilt + float bob
 *   3. Reveals product details staggered: brand → title → stars → price → CTA
 *   4. Two floating badges orbit at slightly different depths / bob phases
 *      giving genuine Z-layer separation
 *   5. Glass sheen reflects tilt direction (opposite shift = physical realism)
 *
 * params.text  → product name (e.g. "Air Zoom Pro Sneaker")
 * params.icon  → shape variant: "watch" | "shoe" | "bag" (default "bag")
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeOutBack, easeInOutCubic, easeOutCubic, lerp } from '../easing';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', sans-serif`;

// ── 5-point star path centred at current transform origin ────────────────────
function drawStar(ctx: CanvasRenderingContext2D, outerR: number, innerR: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else         ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

// ─────────────────────────────────────────────────────────────────────────────
export const floatingProductCard = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const label    = p.text  || 'Premium Sneaker';
  const category = p.icon  || 'bag';
  const intensity = p.intensity ?? 2;

  // ── Global fade ───────────────────────────────────────────────────────────
  const fadeIn  = easeInOutCubic(clamp01(remap(t01, 0.00, 0.12)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.88, 1.00)));
  const globalAlpha = fadeIn * (1 - fadeOut);
  if (globalAlpha < 0.005) return;

  // ── Entry: edge-on → face-forward (Y-axis flip simulated via scaleX) ─────
  const entryProgress = clamp01(remap(t01, 0.05, 0.50));
  const entryScaleX   = easeOutBack(entryProgress, 1.28);

  // ── Hold: gentle oscillation ──────────────────────────────────────────────
  const holdProgress = clamp01(remap(t01, 0.50, 1.00));
  const tiltX  = Math.sin(holdProgress * Math.PI * 3.5) * 0.11 * intensity; // left-right
  const tiltY  = Math.cos(holdProgress * Math.PI * 2.8) * 0.06 * intensity; // up-down
  const bobY   = Math.sin(holdProgress * Math.PI * 2.5) * 9 * intensity;

  // ── Content reveal stagger ────────────────────────────────────────────────
  const contentReveal = easeOutCubic(clamp01(remap(t01, 0.40, 0.68)));
  const shapeReveal   = easeOutCubic(clamp01(remap(t01, 0.22, 0.48)));

  // ── Card dimensions ───────────────────────────────────────────────────────
  const cardW = Math.min(width * 0.52, 320);
  const cardH = cardW * 1.34;
  const imgH  = cardH * 0.46; // product image zone

  // ── Canvas anchor ─────────────────────────────────────────────────────────
  const cx = width  / 2;
  const cy = height / 2;

  ctx.save();
  ctx.globalAlpha = globalAlpha;

  // ── 1. Ambient bloom ──────────────────────────────────────────────────────
  {
    const glowR = Math.max(cardW, cardH) * 1.1;
    const glow  = ctx.createRadialGradient(cx, cy + bobY, 0, cx, cy + bobY, glowR);
    glow.addColorStop(0, hexA(palette.primary, 0.20 * intensity));
    glow.addColorStop(0.5, hexA(palette.accent, 0.08 * intensity));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  // ── 2. Card main transform ────────────────────────────────────────────────
  ctx.save();
  ctx.translate(cx, cy + bobY);

  // Composite entry (X-scale flip) + hold tilt (perspective skew)
  const finalScaleX = entryScaleX * (1 - tiltX * tiltX * 0.04);
  const skewY = tiltY * 0.065;
  const skewX = tiltX * 0.055;
  ctx.transform(finalScaleX, skewY, skewX, 1, 0, 0);

  // Card drop shadow
  ctx.save();
  ctx.shadowColor    = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur     = 55;
  ctx.shadowOffsetY  = 22 + tiltY * 35;
  ctx.shadowOffsetX  = tiltX * 25;
  roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 22);
  ctx.fillStyle = 'rgba(0,0,0,0.01)';
  ctx.fill();
  ctx.restore();

  // ── 3. Card face (clipped) ────────────────────────────────────────────────
  ctx.save();
  roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 22);
  ctx.clip();

  // ─ Product image area ──────────────────────────────────────────────────────
  const imgTop = -cardH / 2;
  const imgGrad = ctx.createLinearGradient(-cardW / 2, imgTop, cardW / 2, imgTop + imgH);
  imgGrad.addColorStop(0,   mixHex(palette.primary, '#000000', 0.18));
  imgGrad.addColorStop(0.5, palette.primary);
  imgGrad.addColorStop(1,   mixHex(palette.primary, palette.accent, 0.38));
  ctx.fillStyle = imgGrad;
  ctx.fillRect(-cardW / 2, imgTop, cardW, imgH);

  // Abstract product shape
  const shapeCx = 0;
  const shapeCy = imgTop + imgH / 2;
  const shapeSize = cardW * 0.20;

  // Outer aura
  ctx.save();
  ctx.globalAlpha = shapeReveal;
  const aura = ctx.createRadialGradient(shapeCx, shapeCy, 0, shapeCx, shapeCy, cardW * 0.34);
  aura.addColorStop(0,   hexA(palette.accent, 0.32));
  aura.addColorStop(0.5, hexA(palette.accent, 0.10));
  aura.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(shapeCx, shapeCy, cardW * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Product silhouette (slow rotation in hold phase)
  ctx.save();
  ctx.globalAlpha = shapeReveal;
  ctx.translate(shapeCx, shapeCy);
  ctx.rotate(holdProgress * Math.PI * 0.45);

  if (category === 'watch') {
    // Watch face
    ctx.beginPath();
    ctx.arc(0, 0, shapeSize, 0, Math.PI * 2);
    ctx.strokeStyle = hexA('#ffffff', 0.55);
    ctx.lineWidth = 3.5;
    ctx.stroke();
    // Hour hand
    ctx.strokeStyle = hexA('#ffffff', 0.9);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -shapeSize * 0.54);
    ctx.stroke();
    // Minute hand
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(shapeSize * 0.4, 0);
    ctx.stroke();
    // Centre dot
    ctx.beginPath();
    ctx.arc(0, 0, shapeSize * 0.07, 0, Math.PI * 2);
    ctx.fillStyle = palette.accent;
    ctx.fill();
  } else if (category === 'shoe') {
    // Shoe sole silhouette
    ctx.beginPath();
    ctx.moveTo(-shapeSize * 1.0, shapeSize * 0.3);
    ctx.bezierCurveTo(-shapeSize * 0.8, -shapeSize * 0.55, shapeSize * 0.2, -shapeSize * 0.65, shapeSize * 1.0, -shapeSize * 0.1);
    ctx.bezierCurveTo(shapeSize * 1.1, shapeSize * 0.1, shapeSize * 0.85, shapeSize * 0.5, shapeSize * 0.2, shapeSize * 0.6);
    ctx.bezierCurveTo(-shapeSize * 0.3, shapeSize * 0.7, -shapeSize * 1.0, shapeSize * 0.52, -shapeSize * 1.0, shapeSize * 0.3);
    ctx.closePath();
    ctx.fillStyle = hexA('#ffffff', 0.14);
    ctx.fill();
    ctx.strokeStyle = hexA('#ffffff', 0.55);
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    // Default: hexagonal gem / bag shape
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const r = shapeSize * (i % 2 === 0 ? 1.0 : 0.70);
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else         ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = hexA('#ffffff', 0.11);
    ctx.fill();
    ctx.strokeStyle = hexA('#ffffff', 0.50);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore(); // shape

  // Category chip in image area (top-left)
  ctx.save();
  ctx.globalAlpha = shapeReveal;
  const chipTxt = category === 'watch' ? '⌚ LIMITED' : category === 'shoe' ? '👟 EXCLUSIVE' : '✨ PREMIUM';
  const chipFontPx = cardW * 0.055;
  ctx.font = `600 ${chipFontPx}px ${FONT}`;
  const chipW = ctx.measureText(chipTxt).width + chipFontPx * 1.8;
  const chipH = chipFontPx * 1.85;
  const chipX = -cardW / 2 + cardW * 0.06;
  const chipY = imgTop + cardH * 0.04;
  roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
  ctx.fillStyle = hexA('#000000', 0.35);
  ctx.fill();
  roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
  ctx.strokeStyle = hexA('#ffffff', 0.22);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(chipTxt, chipX + chipFontPx * 0.9, chipY + chipH / 2);
  ctx.restore();

  // ─ Content area background ─────────────────────────────────────────────────
  const contentTop = imgTop + imgH;
  roundRect(ctx, -cardW / 2, contentTop, cardW, cardH - imgH, 0);
  const bgGrad = ctx.createLinearGradient(-cardW / 2, contentTop, cardW / 2, cardH / 2);
  bgGrad.addColorStop(0, '#1c1c26');
  bgGrad.addColorStop(1, '#0e0e18');
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // ─ Content items (staggered reveal) ────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = contentReveal;

  const pad  = cardW * 0.08;
  const cX   = -cardW / 2 + pad;
  const cW   = cardW - pad * 2;

  // Brand label
  const brandY = contentTop + cardH * 0.038;
  ctx.font = `500 ${cardH * 0.030}px ${FONT}`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle    = hexA(palette.accent, 0.78);
  ctx.fillText('PREMIUM COLLECTION', cX, brandY);

  // Product title (word-wrap)
  const titleFontPx = cardH * 0.073;
  ctx.font      = `700 ${titleFontPx}px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  const words = label.split(' ');
  let line  = '';
  let lineY = brandY + cardH * 0.058;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + ' ';
    if (ctx.measureText(test).width > cW && i > 0) {
      ctx.fillText(line.trim(), cX, lineY);
      line  = words[i] + ' ';
      lineY += titleFontPx * 1.18;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), cX, lineY);
  lineY += titleFontPx * 1.18;

  // Star rating
  const starY    = lineY + cardH * 0.022;
  const starOuter = cardH * 0.036;
  const starInner = starOuter * 0.42;
  const RATING   = 4.8;

  for (let s = 0; s < 5; s++) {
    ctx.save();
    ctx.translate(cX + s * (starOuter * 2.4) + starOuter, starY + starOuter);
    drawStar(ctx, starOuter, starInner);
    ctx.fillStyle = s < Math.floor(RATING) ? '#fbbf24' : hexA('#ffffff', 0.18);
    ctx.fill();
    ctx.restore();
  }

  ctx.font = `400 ${cardH * 0.030}px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = hexA('#ffffff', 0.42);
  ctx.fillText(`${RATING} (2.4k reviews)`, cX + 5 * starOuter * 2.4 + starOuter * 0.5, starY + starOuter);

  // Price row
  const priceY = starY + starOuter * 2 + cardH * 0.035;
  ctx.font      = `800 ${cardH * 0.093}px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('$149', cX, priceY);

  const origPriceX = cX + ctx.measureText('$149').width + 12;
  ctx.font      = `400 ${cardH * 0.042}px ${FONT}`;
  ctx.fillStyle = hexA('#ffffff', 0.33);
  const origText = '$220';
  ctx.fillText(origText, origPriceX, priceY + cardH * 0.026);

  // Strikethrough on original price
  const origW = ctx.measureText(origText).width;
  ctx.save();
  ctx.strokeStyle = hexA('#ffffff', 0.33);
  ctx.lineWidth   = 1.2;
  ctx.beginPath();
  ctx.moveTo(origPriceX, priceY + cardH * 0.047);
  ctx.lineTo(origPriceX + origW, priceY + cardH * 0.047);
  ctx.stroke();
  ctx.restore();

  // Add to Cart CTA button
  const btnY = cardH / 2 - cardH * 0.175;
  const btnH = cardH * 0.127;
  roundRect(ctx, cX, btnY, cW, btnH, btnH / 2);
  const btnGrad = ctx.createLinearGradient(cX, btnY, cX + cW, btnY + btnH);
  btnGrad.addColorStop(0, palette.accent);
  btnGrad.addColorStop(1, mixHex(palette.accent, palette.primary, 0.28));
  ctx.fillStyle    = btnGrad;
  ctx.shadowColor  = hexA(palette.accent, 0.45);
  ctx.shadowBlur   = 18;
  ctx.fill();
  ctx.shadowBlur   = 0;

  ctx.font         = `700 ${btnH * 0.37}px ${FONT}`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = '#ffffff';
  ctx.fillText('Add to Cart  →', cX + cW / 2, btnY + btnH / 2);

  ctx.restore(); // contentReveal

  ctx.restore(); // card clip

  // ── 4. Glass sheen + card border ─────────────────────────────────────────
  ctx.save();
  roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 22);
  ctx.clip();

  // Sheen shifts opposite to tilt (makes gloss feel physically tied to light)
  const sheenOffset = tiltX * cardW * 0.25;
  const sheenGrad = ctx.createLinearGradient(-cardW / 2 + sheenOffset, -cardH / 2, cardW * 0.1 + sheenOffset, cardH * 0.28);
  sheenGrad.addColorStop(0, 'rgba(255,255,255,0.13)');
  sheenGrad.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = sheenGrad;
  ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);

  roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, 22);
  ctx.strokeStyle = hexA('#ffffff', 0.11);
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.restore();

  ctx.restore(); // card transform

  // ── 5. Floating "−32% OFF" price badge (top-right of card) ───────────────
  if (intensity >= 2) {
    const pBadgeReveal = easeOutBack(clamp01(remap(t01, 0.54, 0.72)), 1.5);
    const pBobX = Math.sin(holdProgress * Math.PI * 4.0 + 0.5) * 8;
    const pBobY = Math.cos(holdProgress * Math.PI * 3.2) * 6;

    const pbX = cx + cardW * 0.43 + pBobX;
    const pbY = cy - cardH * 0.28 + bobY * 0.65 + pBobY;

    ctx.save();
    ctx.globalAlpha = pBadgeReveal;
    ctx.translate(pbX, pbY);

    const pbW = cardW * 0.38;
    const pbH = pbW * 0.56;

    ctx.shadowColor   = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur    = 18;
    ctx.shadowOffsetY = 7;
    roundRect(ctx, -pbW / 2, -pbH / 2, pbW, pbH, pbH * 0.28);
    const pbGrad = ctx.createLinearGradient(-pbW / 2, -pbH / 2, pbW / 2, pbH / 2);
    pbGrad.addColorStop(0, palette.accent);
    pbGrad.addColorStop(1, mixHex(palette.accent, '#000000', 0.28));
    ctx.fillStyle = pbGrad;
    ctx.fill();
    ctx.shadowBlur    = 0;
    ctx.shadowOffsetY = 0;

    ctx.font         = `800 ${pbH * 0.40}px ${FONT}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ffffff';
    ctx.fillText('−32% OFF', 0, 0);
    ctx.restore();
  }

  // ── 6. Floating "✨ NEW" frosted chip (top-left of card) ─────────────────
  if (intensity >= 2) {
    const nBadgeReveal = easeOutBack(clamp01(remap(t01, 0.48, 0.65)), 1.4);
    const nBobX = Math.sin(holdProgress * Math.PI * 3.5 + 1.1) * 7;
    const nBobY = Math.cos(holdProgress * Math.PI * 4.2 + 0.6) * 5;

    const nbX = cx - cardW * 0.43 + nBobX;
    const nbY = cy - cardH * 0.33 + bobY * 0.55 + nBobY;

    ctx.save();
    ctx.globalAlpha = nBadgeReveal;
    ctx.translate(nbX, nbY);

    const nbW = cardW * 0.28;
    const nbH = nbW * 0.52;

    ctx.shadowColor   = 'rgba(0,0,0,0.38)';
    ctx.shadowBlur    = 14;
    ctx.shadowOffsetY = 5;
    roundRect(ctx, -nbW / 2, -nbH / 2, nbW, nbH, nbH * 0.36);
    ctx.fillStyle = hexA('#ffffff', 0.14);
    ctx.fill();
    ctx.shadowBlur    = 0;
    ctx.shadowOffsetY = 0;

    roundRect(ctx, -nbW / 2, -nbH / 2, nbW, nbH, nbH * 0.36);
    ctx.strokeStyle = hexA('#ffffff', 0.28);
    ctx.lineWidth   = 1;
    ctx.stroke();

    ctx.font         = `700 ${nbH * 0.40}px ${FONT}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = '#ffffff';
    ctx.fillText('✨ NEW', 0, 0);
    ctx.restore();
  }

  ctx.restore(); // globalAlpha
};
