import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, remap, lerp, easeOutCubic, easeInCubic, easeInOutCubic } from '../easing';
import { hexA } from '../decorations';

// ── Digit flip helper ────────────────────────────────────────────────────────
// Draws one flip-clock digit panel (dark card, white number, fold crease).
// flipAngle: 0 = fully showing topDigit, 0.5 = half-flip, 1 = showing bottomDigit
function drawDigitCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  topDigit: string,
  bottomDigit: string,
  flipAngle: number,   // 0..1 (0 = resting on topDigit, 1 = resting on bottomDigit)
  alpha: number,
): void {
  const r = w * 0.055;           // card corner radius
  const hH = h / 2;              // half height (split crease)

  ctx.save();
  ctx.globalAlpha = alpha;

  // Card shadow
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = w * 0.08;
  ctx.shadowOffsetY = w * 0.04;

  // ── Static bottom half (shows bottomDigit if flip > 0.5) ─────────────────
  // Bottom half always shows bottomDigit (visible from below crease)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y + hH);
  ctx.lineTo(x + w - r, y + hH);
  ctx.lineTo(x + w - r, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + hH);
  ctx.closePath();
  ctx.fillStyle = '#1a1a2e';
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Bottom digit — only shows bottom half of the glyph (clip to lower card)
  ctx.save();
  ctx.clip();
  const fs = h * 0.68;
  ctx.font = `900 ${fs}px 'Courier New', 'Segoe UI', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f0f0f0';
  ctx.fillText(bottomDigit, x + w / 2, y + h / 2);
  ctx.restore();

  ctx.restore();

  // ── Static top half (always shows topDigit, occluded by flap during flip) ──
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x, y, x, y + r, r);
  ctx.lineTo(x, y + hH);
  ctx.lineTo(x + w, y + hH);
  ctx.lineTo(x + w, y + r);
  ctx.arcTo(x + w, y, x + w - r, y, r);
  ctx.closePath();
  ctx.fillStyle = '#16213e';
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.save();
  ctx.clip();
  ctx.font = `900 ${fs}px 'Courier New', 'Segoe UI', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f0f0f0';
  ctx.fillText(topDigit, x + w / 2, y + h / 2);
  ctx.restore();

  ctx.restore();

  // ── Animated flip flap ───────────────────────────────────────────────────────
  // Flap starts as the top half of topDigit, rotates down to reveal bottomDigit
  if (flipAngle > 0 && flipAngle < 1) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = w * 0.06;
    ctx.shadowOffsetY = w * 0.02;

    // Fold transform: scaleY from 1 (flat) to 0 (horizontal) to -1 (folded back)
    const angle = flipAngle * Math.PI;   // 0 → π
    const scaleY = Math.cos(angle);      // 1 → -1

    // Clip to top card region
    ctx.beginPath();
    ctx.rect(x, y, w, hH);
    ctx.clip();

    // Flap card
    ctx.save();
    ctx.translate(x + w / 2, y + hH);    // pivot at crease
    ctx.scale(1, scaleY);
    ctx.translate(-(x + w / 2), -(y + hH));

    ctx.fillStyle = scaleY >= 0 ? '#16213e' : '#1a1a2e';
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x, y, x, y + r, r);
    ctx.lineTo(x, y + hH);
    ctx.lineTo(x + w, y + hH);
    ctx.lineTo(x + w, y + r);
    ctx.arcTo(x + w, y, x + w - r, y, r);
    ctx.closePath();
    ctx.fill();

    // Digit on flap
    ctx.save();
    ctx.clip();
    ctx.font = `900 ${fs}px 'Courier New', 'Segoe UI', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f0f0f0';
    // First half shows top digit, second half shows bottom digit (mirrored)
    if (scaleY >= 0) {
      ctx.fillText(topDigit, x + w / 2, y + h / 2);
    } else {
      ctx.scale(1, -1);
      ctx.fillText(bottomDigit, x + w / 2, -(y + h / 2));
    }
    ctx.restore();

    ctx.restore();

    // Shadow strip at fold crease (darkens as it approaches horizontal)
    const foldShadowAlpha = Math.sin(angle) * 0.55;
    const shadowGrad = ctx.createLinearGradient(x, y + hH - hH * 0.4, x, y + hH);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
    shadowGrad.addColorStop(1, `rgba(0,0,0,${foldShadowAlpha})`);
    ctx.fillStyle = shadowGrad;
    ctx.fillRect(x, y, w, hH);

    ctx.restore();
  }

  // ── Crease line ──────────────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = 'transparent';
  ctx.beginPath();
  ctx.moveTo(x, y + hH);
  ctx.lineTo(x + w, y + hH);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ── Colon separator ──────────────────────────────────────────────────────────
function drawColon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#e0e0e0';
  ctx.shadowColor = 'rgba(255,255,255,0.3)';
  ctx.shadowBlur = r * 1.5;
  for (const dy of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(cx, cy + dy * r * 1.6, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export const flipClock = (
  { ctx, width: W, height: H, t01, palette }: PrimitiveContext,
  params: PrimitiveParams,
): void => {
  // ── Phases ────────────────────────────────────────────────────────────────
  const entryP = clamp01(remap(t01, 0.00, 0.22));
  const holdP  = clamp01(remap(t01, 0.22, 0.82));
  const exitP  = clamp01(remap(t01, 0.84, 1.00));

  const globalAlpha = easeOutCubic(entryP) * (1 - easeInCubic(exitP));
  if (globalAlpha < 0.01) return;

  // ── Time display ──────────────────────────────────────────────────────────
  // Count from a start time, flipping ~3 seconds apart during hold
  // params.text: "12:34" or "" (auto)
  const parts   = (params.text ?? '').match(/^(\d{1,2}):(\d{2})$/);
  const startH  = parts ? parseInt(parts[1]) : 10;
  const startM  = parts ? parseInt(parts[2]) : 29;

  // During hold, advance minutes as animation progresses
  const totalFlips = 3;
  const flipIdx = Math.floor(holdP * totalFlips);   // 0, 1, 2
  const flipFrac = (holdP * totalFlips) % 1;          // 0..1 within each flip

  const displayMin = (startM + flipIdx) % 60;
  const nextMin    = (startM + flipIdx + 1) % 60;
  const displayH   = startH + Math.floor((startM + flipIdx) / 60);
  const nextH      = startH + Math.floor((startM + flipIdx + 1) / 60);

  const hStr   = String(displayH % 12 || 12).padStart(2, '0');
  const mStr   = String(displayMin).padStart(2, '0');
  const nhStr  = String(nextH % 12 || 12).padStart(2, '0');
  const nmStr  = String(nextMin).padStart(2, '0');

  // ── Layout ────────────────────────────────────────────────────────────────
  const cardW   = Math.min(W * 0.145, H * 0.22, 108);
  const cardH   = cardW * 1.35;
  const gap     = cardW * 0.08;
  const colonW  = cardW * 0.28;
  const totalW  = cardW * 4 + gap * 3 + colonW;
  const startX  = (W - totalW) / 2;
  const cardY   = H / 2 - cardH / 2;

  // ── Background panel behind clock ─────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = globalAlpha * 0.70;
  const panelPad = cardH * 0.3;
  const panelX = startX - panelPad;
  const panelY = cardY - panelPad * 0.55;
  const panelW = totalW + panelPad * 2;
  const panelH = cardH + panelPad * 1.1;
  const panelR = panelH * 0.1;

  ctx.fillStyle = '#0a0a18';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = panelH * 0.15;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, panelR);
  ctx.fill();

  // Subtle accent top strip
  const stripH = panelH * 0.018;
  const stripGrad = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY);
  stripGrad.addColorStop(0, 'rgba(0,0,0,0)');
  stripGrad.addColorStop(0.5, hexA(palette.primary, 0.7));
  stripGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = stripGrad;
  ctx.shadowColor = 'transparent';
  ctx.fillRect(panelX + panelR, panelY, panelW - panelR * 2, stripH);
  ctx.restore();

  // ── Digits ────────────────────────────────────────────────────────────────
  // Flip speed: each flip lasts 0.25 of holdP per flip slot
  const FLIP_DUR = 0.3;   // fraction of each flip interval used for animation
  const localFlipT = flipFrac < FLIP_DUR
    ? easeInOutCubic(flipFrac / FLIP_DUR)
    : 1;

  const positions = [
    { x: startX + 0 * (cardW + gap),                     dCur: hStr[0], dNxt: nhStr[0], flip: false },
    { x: startX + 1 * (cardW + gap),                     dCur: hStr[1], dNxt: nhStr[1], flip: false },
    { x: startX + 2 * (cardW + gap) + colonW,            dCur: mStr[0], dNxt: nmStr[0], flip: true  },
    { x: startX + 3 * (cardW + gap) + colonW,            dCur: mStr[1], dNxt: nmStr[1], flip: true  },
  ];

  for (const p of positions) {
    drawDigitCard(
      ctx,
      p.x,
      cardY,
      cardW,
      cardH,
      p.dCur,
      p.dNxt,
      p.flip ? localFlipT : (p.dCur !== p.dNxt ? localFlipT : 0),
      globalAlpha,
    );
  }

  // ── Colon ─────────────────────────────────────────────────────────────────
  const colonX = startX + 2 * (cardW + gap) - gap / 2 + colonW / 2;
  // Pulse colon on each second
  const colonPulse = 0.5 + 0.5 * Math.abs(Math.sin(holdP * Math.PI * totalFlips * 2));
  drawColon(ctx, colonX, H / 2, cardW * 0.06, globalAlpha * colonPulse);

  // ── Label below ───────────────────────────────────────────────────────────
  const labelText = params.icon ?? 'TIME REMAINING';
  const labelFS = cardW * 0.28;
  const labelY  = cardY + cardH + cardH * 0.20;

  ctx.save();
  ctx.globalAlpha = globalAlpha * easeOutCubic(clamp01(remap(t01, 0.15, 0.35)));
  ctx.font = `500 ${labelFS}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = hexA(palette.primary, 0.70);
  ctx.letterSpacing = `${labelFS * 0.25}px`;
  ctx.fillText(labelText.toUpperCase(), W / 2, labelY);
  ctx.restore();
};
