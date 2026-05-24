/**
 * cyber-hud — Sci-Fi Data Overlay.
 * 
 * Phase 10 — High-Retention Creator Effects.
 * Great for gaming, tech, and hacker themes.
 * Features rotating targeting rings, crosshairs, and scrolling data elements.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, setLetterSpacing } from '../decorations';
import { clamp01, remap, easeInOutCubic } from '../easing';

const FONT = `'Space Grotesk', 'Courier New', monospace`;

export const cyberHud = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = (p.text || 'SYSTEM ONLINE').toUpperCase();
  const intensity = p.intensity ?? 2;

  const fadeIn = clamp01(remap(t01, 0, 0.1));
  const fadeOut = clamp01(remap(t01, 0.9, 1.0));
  const visible = fadeIn * (1 - fadeOut);
  if (visible < 0.01) return;

  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.min(width, height) * 0.4;

  ctx.save();
  ctx.globalAlpha = visible;
  ctx.translate(cx, cy);

  // Additive blending for glow effect
  ctx.globalCompositeOperation = 'lighter';

  // 1. Rotating Rings
  const ringCount = intensity === 3 ? 4 : 2;
  
  for (let i = 0; i < ringCount; i++) {
    const radius = maxR * (0.5 + i * 0.15);
    const speed = (i % 2 === 0 ? 1 : -1) * (1 + i * 0.5) * t01 * Math.PI * 4;
    
    ctx.save();
    ctx.rotate(speed);
    
    ctx.strokeStyle = hexA(i % 2 === 0 ? palette.primary : palette.accent, 0.5);
    ctx.lineWidth = i === 0 ? 3 : 1;
    
    // Dash patterns
    if (i === 1) ctx.setLineDash([10, 20, 50, 10]);
    if (i === 2) ctx.setLineDash([2, 8]);
    if (i === 3) ctx.setLineDash([100, 50, 10, 50]);
    
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  }

  ctx.setLineDash([]); // Reset

  // 2. Crosshairs / Corner markers
  const chLen = maxR * 0.2;
  const chOff = maxR * 1.1;
  ctx.strokeStyle = hexA(palette.text, 0.6);
  ctx.lineWidth = 2;

  const drawCorner = (dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(dx * chOff, dy * (chOff - chLen));
    ctx.lineTo(dx * chOff, dy * chOff);
    ctx.lineTo(dx * (chOff - chLen), dy * chOff);
    ctx.stroke();
  };
  drawCorner(1, 1); drawCorner(1, -1); drawCorner(-1, 1); drawCorner(-1, -1);

  // 3. Central Target + Pulse
  const pulseR = maxR * 0.1 * (1 + Math.sin(t01 * Math.PI * 10) * 0.2);
  ctx.fillStyle = hexA(palette.primary, 0.8);
  ctx.shadowColor = palette.primary;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(0, 0, pulseR, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // 4. Typography (Data readouts)
  const fontPx = Math.max(16, maxR * 0.12);
  ctx.font = `600 ${fontPx}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setLetterSpacing(ctx, fontPx * 0.2);

  // Main text slightly offset
  ctx.fillStyle = hexA(palette.text, 0.9);
  ctx.fillText(text, 0, maxR * 0.6);

  // Scrolling hex data on sides
  if (intensity >= 2) {
      ctx.font = `400 ${fontPx*0.6}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = hexA(palette.accent, 0.6);
      
      const scrollY = (t01 * 500) % 50;
      for(let i=0; i<10; i++) {
          const hex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
          ctx.fillText(`0x${hex}`, -maxR * 1.2, -maxR * 0.8 + i*25 - scrollY);
          ctx.fillText(`0x${hex}`, maxR * 0.8, maxR * 0.8 - i*25 + scrollY);
      }
  }

  setLetterSpacing(ctx, 0);
  ctx.restore();
};
