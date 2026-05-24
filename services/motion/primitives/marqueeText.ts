/**
 * marquee-text — Brutalist Kinetic Ribbons.
 * 
 * Phase 10 — High-Retention Creator Effects.
 * Infinite scrolling text ribbons moving diagonally in opposing directions.
 * Creates a massive, undeniable visual impact. Bold outline/fill contrasting typography.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex } from '../decorations';
import { clamp01, remap, easeInOutCubic } from '../easing';

const FONT = `'Space Grotesk', 'Inter', 'Helvetica Neue', sans-serif`;

export const marqueeText = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = (p.text || 'LOUD & CLEAR').toUpperCase();
  const intensity = p.intensity ?? 2;

  const fadeIn = clamp01(remap(t01, 0, 0.15));
  const fadeOut = clamp01(remap(t01, 0.85, 1.0));
  const visible = fadeIn * (1 - fadeOut);
  if (visible < 0.01) return;

  ctx.save();
  ctx.globalAlpha = visible;

  // Background tint to help text pop
  ctx.fillStyle = hexA(palette.bg, 0.8);
  ctx.fillRect(0, 0, width, height);

  // Calculate geometry
  const fontPx = Math.min(width, height) * (intensity === 3 ? 0.35 : 0.25);
  ctx.font = `900 ${fontPx}px ${FONT}`;
  ctx.textBaseline = 'middle';
  
  const textW = ctx.measureText(`${text} • `).width;
  
  // Create rotation
  const angle = -15 * Math.PI / 180;
  
  // Center origin
  ctx.translate(width/2, height/2);
  
  // Entrance animation: scale up and rotate slightly
  const entranceAnim = easeInOutCubic(fadeIn);
  ctx.scale(0.8 + 0.2 * entranceAnim, 0.8 + 0.2 * entranceAnim);
  ctx.rotate(angle * entranceAnim);

  const lines = intensity === 3 ? 5 : 3;
  const lineHeight = fontPx * 1.1;
  const startY = -(lines - 1) * lineHeight / 2;

  for (let i = 0; i < lines; i++) {
    const isOutline = i % 2 !== 0; // Alternate filled vs outline
    const direction = i % 2 === 0 ? 1 : -1; // Alternate scroll direction
    
    // Base scroll + continuous scroll
    const scrollOffset = (t01 * textW * 1.5 * direction);
    
    const y = startY + i * lineHeight;
    
    ctx.save();
    ctx.translate(scrollOffset, y);
    
    // Draw string repeated multiple times to ensure screen coverage
    const reps = Math.ceil((width * 2) / textW) + 2;
    const startX = -(reps * textW) / 2;

    if (isOutline) {
      ctx.strokeStyle = palette.primary;
      ctx.lineWidth = fontPx * 0.03;
      for (let j = 0; j < reps; j++) {
        ctx.strokeText(`${text} • `, startX + j * textW, 0);
      }
    } else {
      ctx.fillStyle = i === Math.floor(lines/2) ? palette.accent : palette.text;
      for (let j = 0; j < reps; j++) {
        ctx.fillText(`${text} • `, startX + j * textW, 0);
      }
    }
    
    ctx.restore();
  }

  ctx.restore();
};
