/**
 * Phase-5 primitives ship as visible stubs in Phase 2 so the registry is
 * complete and Gemini's plans always have something to render.
 * Each stub draws a labeled placeholder card so a viewer immediately sees
 * "yes, a beat fired here, just not the fancy version yet."
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { clamp01, easeOutCubic, remap } from '../easing';

const FONT_STACK = `'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif`;

const drawStub = (pc: PrimitiveContext, p: PrimitiveParams, label: string) => {
  const { ctx, width, height, t01, palette } = pc;
  const inT = easeOutCubic(clamp01(remap(t01, 0, 0.2)));
  const out = 1 - clamp01(remap(t01, 0.85, 1));
  const alpha = inT * out;
  if (alpha < 0.01) return;

  const cardW = Math.min(width * 0.55, 720);
  const cardH = Math.max(120, Math.min(width, height) * 0.18);
  const x = (width - cardW) / 2;
  const y = (height - cardH) / 2;
  const r = cardH * 0.12;

  ctx.save();
  ctx.globalAlpha = alpha;

  // Dashed outline + tint
  ctx.fillStyle = hexA(palette.primary, 0.12);
  roundRect(ctx, x, y, cardW, cardH, r);
  ctx.fill();
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = palette.primary;
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, cardW, cardH, r);
  ctx.stroke();
  ctx.setLineDash([]);

  // Label
  ctx.fillStyle = palette.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titleSize = cardH * 0.22;
  ctx.font = `900 ${titleSize}px ${FONT_STACK}`;
  ctx.fillText(label.toUpperCase(), width / 2, y + cardH * 0.4);

  ctx.font = `700 ${titleSize * 0.55}px ${FONT_STACK}`;
  ctx.fillStyle = palette.secondary;
  ctx.fillText('phase 5 primitive', width / 2, y + cardH * 0.68);

  if (p.text) {
    ctx.font = `700 ${titleSize * 0.5}px ${FONT_STACK}`;
    ctx.fillStyle = palette.text;
    const trimmed = p.text.length > 50 ? p.text.slice(0, 47) + '...' : p.text;
    ctx.fillText(`"${trimmed}"`, width / 2, y + cardH * 0.9);
  }

  ctx.restore();
};


function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(255,255,255,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
