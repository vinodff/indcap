/**
 * cursor-click-ui — Professional Cursor Click & UI Reveal.
 *
 * Phase 10 — High-Retention Creator Effects (Competitor Level).
 *
 * Ultra-premium upgrades:
 *   — Live subscriber counter chip (99,998 → 100,000 on click impact)
 *   — Glassmorphic "Welcome Perks" modal that expands below button on click
 *   — Haptic confetti: gravity-influenced paper pieces flutter downward
 *   — Cursor transitions from arrow pointer to pointing hand on hover
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, roundRect } from '../decorations';
import { clamp01, remap, easeInOutCubic, easeOutBack, easeOutCubic, lerp } from '../easing';
import { drawLucideIcon } from '../iconRenderer';

const FONT = `'Outfit', 'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

export const cursorClickUi = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const rawText = p.text || 'SUBSCRIBE';
  const intensity = p.intensity ?? 2;

  // ── Animation Timing Timelines ──────────────────────────────────────────
  const entranceT        = easeOutBack(clamp01(remap(t01, 0, 0.15)));
  const cursorProgress   = easeInOutCubic(clamp01(remap(t01, 0.15, 0.42)));
  const hoverProgress    = easeInOutCubic(clamp01(remap(t01, 0.40, 0.45)));
  const clickDownProgress = easeInOutCubic(clamp01(remap(t01, 0.45, 0.48)));
  const clickUpProgress  = easeOutCubic(clamp01(remap(t01, 0.48, 0.54)));
  const clicked          = t01 >= 0.48;
  const successRevealProgress = easeOutCubic(clamp01(remap(t01, 0.48, 0.62)));
  const rippleProgress   = clamp01(remap(t01, 0.48, 0.78));
  const confettiProgress = clamp01(remap(t01, 0.48, 0.88));
  const exitT            = easeInOutCubic(clamp01(remap(t01, 0.88, 1.0)));

  const visible = entranceT * (1 - exitT);
  if (visible < 0.005) return;

  // ── Layout ───────────────────────────────────────────────────────────────
  const buttonW = Math.min(width * 0.75, 420);
  const buttonH = Math.min(height * 0.12, 75);
  const cx = width / 2;
  let cy = height * 0.5;
  if (p.anchor === 'top')    cy = height * 0.28;
  else if (p.anchor === 'bottom') cy = height * 0.72;

  const baseScale   = lerp(0, 1, entranceT);
  const hoverScale  = lerp(1, 1.08, hoverProgress);
  const clickScale  = clicked
    ? lerp(0.92, 1, clickUpProgress)
    : lerp(1, 0.92, clickDownProgress);
  const finalButtonScale = baseScale * hoverScale * clickScale * (1 - exitT * 0.15);

  const clickX = cx + buttonW * 0.15;
  const clickY = cy + buttonH * 0.2;

  ctx.save();
  ctx.globalAlpha = visible;

  // ── Ripple wave ───────────────────────────────────────────────────────────
  if (clicked && rippleProgress > 0 && rippleProgress < 1) {
    ctx.save();
    ctx.strokeStyle = hexA(palette.accent, 0.8 * (1 - rippleProgress));
    ctx.lineWidth = 4 * (1 - rippleProgress) * intensity;
    ctx.beginPath();
    ctx.arc(clickX, clickY, rippleProgress * 150 * intensity, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ── Confetti celebration ──────────────────────────────────────────────────
  if (clicked && confettiProgress > 0 && confettiProgress < 1) {
    ctx.save();
    const count = 24;
    const gravity = 260;
    for (let i = 0; i < count; i++) {
      const seed = i * 2.618;
      const angle = (i / count) * Math.PI * 2 + Math.sin(seed) * 0.9;
      const speed = 65 + Math.abs(Math.sin(seed * 1.7)) * 115;
      const wob   = Math.sin(seed * 3.1);
      const hue   = (i * 360 / count + 20) % 360;
      const t     = confettiProgress;

      const px2 = clickX + Math.cos(angle) * speed * t + wob * Math.sin(t * 9) * 14;
      const py2 = clickY + Math.sin(angle) * speed * t * 0.55 + 0.5 * gravity * t * t;

      const alpha = Math.max(0, 1 - t * 1.15);
      const rotation = seed + t * (2.2 + Math.abs(wob) * 4.5);
      const w = 6 + Math.abs(Math.sin(seed * 2.3)) * 5;
      const h = w * (0.35 + Math.abs(Math.cos(seed * 1.9)) * 0.45);

      ctx.save();
      ctx.translate(px2, py2);
      ctx.rotate(rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${hue}, 88%, 62%)`;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
    ctx.restore();
  }

  // ── Subscriber counter chip ───────────────────────────────────────────────
  {
    const counterReveal = easeOutCubic(clamp01(remap(t01, 0.08, 0.22)));
    const countProgress = easeOutCubic(clamp01(remap(t01, 0.48, 0.64)));
    const currentCount  = Math.floor(lerp(99998, 100000, clicked ? countProgress : 0));
    const isMaxed       = currentCount >= 100000;

    const chipFontPx = Math.min(height * 0.028, 14);
    ctx.save();
    ctx.globalAlpha = visible * counterReveal;
    ctx.font = `600 ${chipFontPx}px ${FONT}`;

    const countText = `${currentCount.toLocaleString()} Subscribers`;
    const chipW = ctx.measureText(countText).width + chipFontPx * 2.6;
    const chipH = chipFontPx * 2.1;
    const chipY = cy - (buttonH / 2) * finalButtonScale - chipH / 2 - 10;

    roundRect(ctx, cx - chipW / 2, chipY - chipH / 2, chipW, chipH, chipH / 2);
    ctx.fillStyle = hexA('#ffffff', isMaxed ? 0.16 : 0.09);
    ctx.fill();

    roundRect(ctx, cx - chipW / 2, chipY - chipH / 2, chipW, chipH, chipH / 2);
    ctx.strokeStyle = isMaxed ? hexA(palette.accent, 0.65) : hexA('#ffffff', 0.18);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isMaxed) {
      ctx.shadowColor = hexA(palette.accent, 0.5);
      ctx.shadowBlur = 8;
      ctx.fillStyle = palette.accent;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
    }
    ctx.fillText(countText, cx, chipY);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Button ────────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(finalButtonScale, finalButtonScale);

  const baseColor = clicked
    ? mixHex(palette.secondary, '#1e293b', 0.5)
    : palette.primary;

  ctx.shadowColor = hexA(baseColor, 0.4);
  ctx.shadowBlur = lerp(30, 45, hoverProgress);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = lerp(10, 18, hoverProgress) * (clicked ? 0.4 : 1.0);

  const r = 16;
  const hw = buttonW / 2;
  const hh = buttonH / 2;

  ctx.beginPath();
  ctx.moveTo(-hw + r, -hh);
  ctx.lineTo(hw - r, -hh);
  ctx.arcTo(hw, -hh, hw, -hh + r, r);
  ctx.lineTo(hw, hh - r);
  ctx.arcTo(hw, hh, hw - r, hh, r);
  ctx.lineTo(-hw + r, hh);
  ctx.arcTo(-hw, hh, -hw, hh - r, r);
  ctx.lineTo(-hw, -hh + r);
  ctx.arcTo(-hw, -hh, -hw + r, -hh, r);
  ctx.closePath();

  const btnGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  btnGrad.addColorStop(0, baseColor);
  btnGrad.addColorStop(1, mixHex(baseColor, '#000000', 0.25));
  ctx.fillStyle = btnGrad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  const borderGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  borderGrad.addColorStop(0,   hexA('#ffffff', 0.4));
  borderGrad.addColorStop(0.5, hexA(palette.accent, 0.2));
  borderGrad.addColorStop(1,   hexA('#000000', 0.3));
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner gloss sheen
  ctx.save();
  ctx.beginPath();
  ctx.rect(-hw, -hh, buttonW, buttonH);
  ctx.clip();
  const sheenGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  sheenGrad.addColorStop(0,   'rgba(255,255,255,0.15)');
  sheenGrad.addColorStop(0.4, 'rgba(255,255,255,0.0)');
  sheenGrad.addColorStop(0.6, 'rgba(0,0,0,0.0)');
  sheenGrad.addColorStop(1,   'rgba(0,0,0,0.2)');
  ctx.fillStyle = sheenGrad;
  ctx.fill();
  ctx.restore();

  // Button text + icon
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let text = rawText.toUpperCase();
  if (clicked) {
    if (text.includes('SUBSCRIBE'))    text = 'SUBSCRIBED';
    else if (text.includes('JOIN'))    text = 'JOINED';
    else if (text.includes('CLICK'))   text = 'CLICKED!';
    else                               text = 'DONE ✓';
  }

  const fontSize = buttonH * 0.35;
  ctx.font = `800 ${fontSize}px ${FONT}`;

  const wordW    = ctx.measureText(text).width;
  const iconSize = fontSize * 1.1;
  const gap      = 12;
  const totalW   = iconSize + gap + wordW;
  const startX   = -totalW / 2 + iconSize / 2;
  const textX    = startX + iconSize / 2 + gap + wordW / 2;

  ctx.save();
  const iconColor = clicked ? palette.accent : '#ffffff';
  const iconName  = clicked ? 'star' : 'sparkles';
  const iconRot   = clicked ? lerp(0, Math.PI * 2, successRevealProgress) : 0;
  ctx.translate(startX, 0);
  ctx.rotate(iconRot);
  drawLucideIcon(ctx, iconName, 0, 0, iconSize, iconColor, { fill: clicked });
  ctx.restore();

  ctx.save();
  const textColorGrad = ctx.createLinearGradient(0, -fontSize / 2, 0, fontSize / 2);
  if (clicked) {
    textColorGrad.addColorStop(0, '#ffffff');
    textColorGrad.addColorStop(1, '#cbd5e1');
  } else {
    textColorGrad.addColorStop(0, '#ffffff');
    textColorGrad.addColorStop(1, '#f1f5f9');
  }
  ctx.fillStyle = textColorGrad;
  ctx.fillText(text, textX, 0);
  ctx.restore();

  ctx.restore(); // end button transform

  // ── Welcome Perks modal (expands below button after click) ────────────────
  if (clicked) {
    const modalReveal = easeOutBack(clamp01(remap(t01, 0.52, 0.72)), 1.15);
    const modalW = buttonW * 0.94;
    const modalH = buttonH * 2.85;
    const modalX = cx - modalW / 2;
    const modalY = cy + (buttonH / 2) * finalButtonScale + 10;

    ctx.save();
    ctx.globalAlpha = visible * clamp01(modalReveal * 1.4);
    ctx.translate(0, (1 - modalReveal) * 18);

    // Frosted glass background
    roundRect(ctx, modalX, modalY, modalW, modalH, 16);
    const modalGrad = ctx.createLinearGradient(modalX, modalY, modalX, modalY + modalH);
    modalGrad.addColorStop(0, hexA('#ffffff', 0.11));
    modalGrad.addColorStop(1, hexA('#ffffff', 0.04));
    ctx.fillStyle = modalGrad;
    ctx.fill();

    // Glass border
    roundRect(ctx, modalX, modalY, modalW, modalH, 16);
    ctx.strokeStyle = hexA('#ffffff', 0.16);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Title
    const titleFontPx = modalH * 0.13;
    ctx.font = `700 ${titleFontPx}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Welcome Perks', modalX + modalW * 0.08, modalY + modalH * 0.08);

    // Perk item chips
    const perks = ['⚡ 3D Engine', '🎨 Premium Assets', '🎥 Unlimited Export'];
    const perkFontPx = modalH * 0.105;
    const perkChipH  = modalH * 0.215;
    const perkY0     = modalY + modalH * 0.30;

    perks.forEach((perk, pi) => {
      const perkReveal = easeOutCubic(clamp01((modalReveal - 0.25 - pi * 0.12) / 0.63));
      const py = perkY0 + pi * (perkChipH + modalH * 0.018);

      ctx.save();
      ctx.globalAlpha = perkReveal;

      // Chip background
      const chipW2 = modalW * 0.84;
      roundRect(ctx, modalX + modalW * 0.08, py, chipW2, perkChipH * 0.8, perkChipH * 0.18);
      ctx.fillStyle = hexA('#ffffff', 0.06);
      ctx.fill();

      // Left accent stripe
      roundRect(ctx, modalX + modalW * 0.08, py, 2.5, perkChipH * 0.8, 2);
      ctx.fillStyle = hexA(palette.accent, 0.75);
      ctx.fill();

      // Perk label
      ctx.font = `500 ${perkFontPx}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.fillText(perk, modalX + modalW * 0.145, py + perkChipH * 0.4);

      ctx.restore();
    });

    ctx.restore();
  }

  // ── Cursor (arrow → hand on hover) ───────────────────────────────────────
  const hoverOffsetX = clicked ? 0 : hoverProgress * 5;
  const hoverOffsetY = clicked ? 0 : hoverProgress * 5;
  const cursorStartX = width * 0.95;
  const cursorStartY = height * 0.95;
  const curX = lerp(cursorStartX, clickX + hoverOffsetX, cursorProgress);
  const curY = lerp(cursorStartY, clickY + hoverOffsetY, cursorProgress);

  const cursorClickScale = clicked
    ? lerp(0.85, 1, clickUpProgress)
    : lerp(1, 0.85, clickDownProgress);
  const cursorScale = (1.2 - exitT * 0.5) * cursorClickScale;

  // Transition from arrow to hand when hover starts
  const showHand = hoverProgress > 0.5;

  if (cursorProgress > 0.02) {
    ctx.save();
    ctx.translate(curX, curY);
    ctx.scale(cursorScale, cursorScale);

    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 6;

    if (showHand) {
      // Pointing-finger hand cursor (tip at origin)
      const fw = 3.5;  // finger half-width
      const fh = 14;   // finger body height below tip
      const pr = 3;    // palm corner radius
      const pw = 12;   // palm half-width
      const ph = 14;   // palm height

      ctx.beginPath();
      // Fingertip rounded cap
      ctx.arc(0, -fh - fw, fw, Math.PI, 0);
      // Right side of finger down to palm
      ctx.lineTo(fw, 0);
      ctx.lineTo(pw, 0);
      // Palm right side with rounded corners
      ctx.arcTo(pw + pr, 0, pw + pr, pr, pr);
      ctx.lineTo(pw + pr, ph - pr);
      ctx.arcTo(pw + pr, ph, pw, ph, pr);
      ctx.lineTo(-pw, ph);
      ctx.arcTo(-pw - pr, ph, -pw - pr, ph - pr, pr);
      ctx.lineTo(-pw - pr, pr);
      ctx.arcTo(-pw - pr, 0, -pw, 0, pr);
      ctx.lineTo(-fw, 0);
      ctx.lineTo(-fw, -fh - fw);
      ctx.closePath();
    } else {
      // Standard arrow pointer
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 24);
      ctx.lineTo(6, 18);
      ctx.lineTo(11, 29);
      ctx.lineTo(15, 27);
      ctx.lineTo(10, 16);
      ctx.lineTo(17, 16);
      ctx.closePath();
    }

    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore(); // global visible
};
