/**
 * camera-zoom-3d — cinematic 3D push-in. After Effects "punch in" feel.
 *
 * Composition:
 *   - Cinematic 2.39:1 letterbox bars top/bottom (slide in from offscreen)
 *   - 60 radial speed lines with bright white core + colored outer glow
 *   - Pinpoint star burst at center with crossing rays (not a blob)
 *   - Color-fringed vignette (cyan top-left, magenta bottom-right)
 *   - REC ● timecode chip in top-right
 *   - Corner framing brackets stronger than before
 *   - Center label inside top letterbox bar (uppercase, tracked-out)
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeInOutCubic, easeOutCubic, lerp, remap } from '../easing';
import { drawCornerBrackets, hexA, setLetterSpacing } from '../decorations';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;

const pseudo = (n: number): number => {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

export const cameraZoom3d = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, durationSec, palette } = pc;
  const intensity = p.intensity || 2;

  // Letterbox bars slide in over 18%, hold, slide out final 15%.
  const inT = easeOutCubic(clamp01(remap(t01, 0, 0.18)));
  const outT = easeInOutCubic(clamp01(remap(t01, 0.85, 1)));
  const visible = inT * (1 - outT);
  if (visible < 0.001) return;

  // True cinematic ratio: black bars at 2.39:1. Compute bar height to letterbox
  // the visible frame to 2.39 aspect (clamped if the canvas is already wider).
  const targetVisibleH = Math.min(height, width / 2.39);
  const baseBarH = Math.max(0, (height - targetVisibleH) / 2);
  const barH = baseBarH * (intensity === 3 ? 1.1 : intensity === 1 ? 0.7 : 1.0) * inT;

  ctx.save();

  // ── Edge color-fringed vignette (cyan / magenta) ───────────────────
  const vMax = Math.hypot(width, height) * 0.65;
  const cyanGrad = ctx.createRadialGradient(width * 0.18, height * 0.18, vMax * 0.3, width * 0.18, height * 0.18, vMax);
  cyanGrad.addColorStop(0, 'rgba(0,0,0,0)');
  cyanGrad.addColorStop(1, `rgba(0,180,220,${0.22 * visible})`);
  ctx.fillStyle = cyanGrad;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillRect(0, 0, width, height);
  const magGrad = ctx.createRadialGradient(width * 0.85, height * 0.85, vMax * 0.3, width * 0.85, height * 0.85, vMax);
  magGrad.addColorStop(0, 'rgba(0,0,0,0)');
  magGrad.addColorStop(1, `rgba(220,40,180,${0.2 * visible})`);
  ctx.fillStyle = magGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';

  // Dark radial vignette to pull focus to center
  const dvGrad = ctx.createRadialGradient(width / 2, height / 2, vMax * 0.4, width / 2, height / 2, vMax);
  dvGrad.addColorStop(0, 'rgba(0,0,0,0)');
  dvGrad.addColorStop(1, `rgba(0,0,0,${0.55 * visible})`);
  ctx.fillStyle = dvGrad;
  ctx.fillRect(0, 0, width, height);

  // ── 60 radial speed lines ───────────────────────────────────────
  const speedT = clamp01(remap(t01, 0.05, 0.7));
  const lineCount = intensity === 3 ? 80 : intensity === 1 ? 36 : 60;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < lineCount; i++) {
    const a = (i / lineCount) * Math.PI * 2 + t01 * 0.4 + pseudo(i) * 0.05;
    const innerR = Math.min(width, height) * lerp(0.22, 0.4, easeOutCubic(speedT));
    const lenJitter = 0.6 + pseudo(i * 7) * 0.7;
    const outerR = innerR + Math.min(width, height) * 0.4 * lenJitter * (1 - speedT * 0.4);
    const alpha = (0.4 + 0.6 * pseudo(i * 3)) * (1 - speedT * 0.7) * visible;
    if (alpha < 0.04) continue;
    const ix = width / 2 + Math.cos(a) * innerR;
    const iy = height / 2 + Math.sin(a) * innerR;
    const ox = width / 2 + Math.cos(a) * outerR;
    const oy = height / 2 + Math.sin(a) * outerR;
    // Two-tone stroke: bright white core + colored outer
    ctx.strokeStyle = hexA(palette.primary, alpha);
    ctx.lineWidth = 3 + pseudo(i * 11) * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(ox, oy);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.85})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(ix, iy);
    ctx.lineTo(ox, oy);
    ctx.stroke();
  }
  ctx.restore();

  // ── Star burst at center (replaces blobby bloom) ────────────────
  const burstT = easeOutCubic(clamp01(remap(t01, 0, 0.35)));
  const burstR = Math.min(width, height) * 0.085 * burstT;
  if (burstR > 1) {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.globalCompositeOperation = 'lighter';

    // Outer halo
    const halo = ctx.createRadialGradient(0, 0, 0, 0, 0, burstR * 4);
    halo.addColorStop(0, hexA(palette.accent, 0.55 * visible));
    halo.addColorStop(0.4, hexA(palette.primary, 0.25 * visible));
    halo.addColorStop(1, hexA(palette.primary, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, burstR * 4, 0, Math.PI * 2);
    ctx.fill();

    // 4-pointed star with crossing rays
    const breath = 0.85 + 0.15 * Math.sin(t01 * Math.PI * 6);
    const rayLen = burstR * 6 * breath;
    const rayThickness = burstR * 0.45;
    const grad = ctx.createLinearGradient(-rayLen, 0, rayLen, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.5, `rgba(255,255,255,${0.95 * visible})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    // Horizontal ray
    ctx.fillRect(-rayLen, -rayThickness / 2, rayLen * 2, rayThickness);
    // Vertical ray
    ctx.save();
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(-rayLen, -rayThickness / 2, rayLen * 2, rayThickness);
    ctx.restore();
    // 45° rays (shorter)
    ctx.save();
    ctx.rotate(Math.PI / 4);
    const grad2 = ctx.createLinearGradient(-rayLen * 0.6, 0, rayLen * 0.6, 0);
    grad2.addColorStop(0, 'rgba(255,255,255,0)');
    grad2.addColorStop(0.5, `rgba(255,255,255,${0.55 * visible})`);
    grad2.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad2;
    ctx.fillRect(-rayLen * 0.6, -rayThickness * 0.5, rayLen * 1.2, rayThickness);
    ctx.rotate(Math.PI / 2);
    ctx.fillRect(-rayLen * 0.6, -rayThickness * 0.5, rayLen * 1.2, rayThickness);
    ctx.restore();

    // Tiny bright core
    ctx.fillStyle = `rgba(255,255,255,${visible})`;
    ctx.beginPath();
    ctx.arc(0, 0, burstR * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ── Letterbox bars with inner accent line ──────────────────────
  if (barH > 1) {
    // Top bar
    ctx.fillStyle = `rgba(0,0,0,${0.95 * visible})`;
    ctx.fillRect(0, 0, width, barH);
    ctx.fillRect(0, height - barH, width, barH);
    // Thin accent line at the inner edge of each bar
    const accH = Math.max(1, barH * 0.04);
    ctx.fillStyle = hexA(palette.accent, 0.6 * visible);
    ctx.fillRect(0, barH - accH, width, accH);
    ctx.fillRect(0, height - barH, width, accH);
  }

  // ── Corner framing brackets ─────────────────────────────────────
  if (intensity >= 2 && barH > 0) {
    const margin = Math.min(width, height) * 0.035;
    drawCornerBrackets(
      ctx,
      margin,
      barH + margin,
      width - margin * 2,
      height - barH * 2 - margin * 2,
      `rgba(255,255,255,${0.85 * visible})`,
      2,
      0.025,
      1,
    );
  }

  // ── REC ● timecode chip (top right, just below letterbox bar) ──
  if (barH > 1 && intensity >= 1) {
    const tcSize = Math.max(11, Math.min(width, height) * 0.018);
    const tcMargin = Math.min(width, height) * 0.025;
    const tcPad = tcSize * 0.7;
    const tcY = barH + tcMargin;
    const tcText = `REC  ${formatTimecode(t01 * durationSec)}`;
    ctx.save();
    ctx.font = `900 ${tcSize}px ${FONT_STACK}`;
    setLetterSpacing(ctx, tcSize * 0.05);
    const tcW = ctx.measureText(tcText).width + tcPad * 2 + tcSize * 1.2;
    const tcH = tcSize * 1.9;
    const tcX = width - tcW - tcMargin;
    // Chip plate
    ctx.fillStyle = `rgba(0,0,0,${0.75 * visible})`;
    ctx.strokeStyle = hexA(palette.accent, 0.7 * visible);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(tcX, tcY, tcW, tcH);
    ctx.fill();
    ctx.stroke();
    // Pulsing red dot
    const dotPulse = 0.5 + 0.5 * Math.sin(t01 * Math.PI * 8);
    ctx.fillStyle = `rgba(255,40,40,${dotPulse * visible})`;
    ctx.shadowColor = `rgba(255,40,40,${visible})`;
    ctx.shadowBlur = tcSize * 0.6;
    ctx.beginPath();
    ctx.arc(tcX + tcPad + tcSize * 0.4, tcY + tcH / 2, tcSize * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    // Text
    ctx.fillStyle = `rgba(255,255,255,${visible})`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(tcText, tcX + tcPad + tcSize * 1.0, tcY + tcH / 2);
    setLetterSpacing(ctx, 0);
    ctx.restore();
  }

  // ── Center label inside top letterbox bar ─────────────────────
  if (p.text && barH > 12) {
    const labelSize = Math.min(barH * 0.42, Math.min(width, height) * 0.045);
    if (labelSize > 9) {
      ctx.save();
      ctx.font = `900 ${labelSize}px ${FONT_STACK}`;
      setLetterSpacing(ctx, labelSize * 0.08);
      ctx.fillStyle = `rgba(255,255,255,${0.92 * visible})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text.toUpperCase(), width / 2, barH / 2);
      setLetterSpacing(ctx, 0);
      ctx.restore();
    }
  }

  ctx.restore();
};

const formatTimecode = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const f = Math.floor((sec - Math.floor(sec)) * 30);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
};
