/**
 * highlight-box — animated corner brackets drawing onto a region,
 * with pulsing fill tint and a soft outer glow. Looks like a HUD
 * tracking reticle on a piece of footage.
 *
 * Phase A (0 → 0.3): each L-bracket strokes on at its corner.
 * Phase B (0.3 → 0.85): pulse fill alpha + occasional flash.
 * Phase C (0.85 → 1): fade out.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, easeOutBack, remap } from '../easing';
import { hexA, roundRect } from '../decorations';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;

export const highlightBox = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const intensity = p.intensity || 2;

  const anchor = p.anchor || 'center';
  const w = width * (intensity === 3 ? 0.58 : 0.44);
  const h = height * (intensity === 3 ? 0.38 : 0.3);
  let cx = width / 2;
  let cy = height / 2;
  if (anchor === 'top') cy = height * 0.32;
  if (anchor === 'bottom') cy = height * 0.7;
  if (anchor === 'left') cx = width * 0.32;
  if (anchor === 'right') cx = width * 0.68;
  const x = cx - w / 2;
  const y = cy - h / 2;

  const drawT = easeOutBack(clamp01(remap(t01, 0, 0.3)), 1.5);
  const fadeOut = 1 - clamp01(remap(t01, 0.92, 1));
  if (fadeOut <= 0.001) return;

  const pulseT = clamp01(remap(t01, 0.3, 0.85));
  const pulse = 0.55 + 0.45 * Math.sin(pulseT * Math.PI * 4 - Math.PI / 2);

  const lineW = Math.max(3, Math.min(width, height) * 0.0055);
  const bracketLen = Math.min(w, h) * 0.22;

  ctx.save();
  ctx.globalAlpha = fadeOut;

  // Apply perspective for 3D effect
  ctx.save();
  const perspective = 1000;
  const scaleZ = 1 + (drawT - 0.5) * 0.15;
  // Simulate perspective by slightly scaling based on depth
  const depthScale = 0.95 + scaleZ * 0.05;
  ctx.translate(cx + w / 2, cy + h / 2);
  ctx.scale(depthScale, depthScale * 0.98);
  ctx.translate(-(cx + w / 2), -(cy + h / 2));

  // Soft tint fill
  const fillT = clamp01(remap(t01, 0.1, 0.45));
  ctx.fillStyle = hexA(palette.primary, 0.1 * fillT * pulse);
  ctx.fillRect(x, y, w, h);

  // Outer glow with enhanced effect during entry
  ctx.save();
  ctx.shadowColor = palette.primary;
  ctx.shadowBlur = 18 * pulse + 12 * drawT;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = hexA(palette.primary, 0.1 * drawT);
  ctx.lineWidth = 2 * drawT;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
  ctx.restore();

  // Four L-shaped corner brackets drawn proportional to drawT
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = lineW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const len = bracketLen * drawT;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(x, y + len);
  ctx.lineTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.stroke();
  // Top-right
  ctx.beginPath();
  ctx.moveTo(x + w - len, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + len);
  ctx.stroke();
  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(x, y + h - len);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + len, y + h);
  ctx.stroke();
  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(x + w - len, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - len);
  ctx.stroke();

  // Optional label - improved sizing for portrait mode
  if (p.text && drawT > 0.7) {
    const labelAlpha = clamp01(remap(t01, 0.25, 0.45)) * fadeOut;
    // Responsive label size: 1.5x larger, scales based on aspect ratio
    const aspectRatio = width / height;
    const baseSize = Math.min(width, height) * 0.052; // Increased from 0.035
    const labelSize = aspectRatio < 0.7 ? baseSize * 1.1 : baseSize; // Extra 10% for portrait
    ctx.font = `900 ${labelSize}px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Background plate
    const text = p.text.toUpperCase();
    const tw = ctx.measureText(text).width;
    const plateX = x + labelSize * 0.4;
    const plateY = y - labelSize * 1.8;
    const plateW = tw + labelSize * 1.2; // Extra padding
    const plateH = labelSize * 1.5;
    ctx.fillStyle = palette.primary;
    ctx.globalAlpha = labelAlpha * fadeOut;
    roundRect(ctx, plateX - labelSize * 0.3, plateY - labelSize * 0.25, plateW, plateH, 8);
    ctx.fill();
    ctx.fillStyle = palette.text;
    ctx.fillText(text, plateX + labelSize * 0.3, plateY + labelSize * 0.95);
  }

  ctx.restore();
};
