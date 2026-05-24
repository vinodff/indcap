/**
 * glass-panel — Premium Tech Aesthetic (Glassmorphism).
 * 
 * Phase 10 — High-Retention Creator Effects.
 * Simulates a frosted glass card floating over the background. 
 * Features sleek edge lighting, specular highlights, and clean modern typography.
 * Best used for revealing premium features, quotes, or app UI concepts.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, setLetterSpacing } from '../decorations';
import { clamp01, remap, easeInOutCubic } from '../easing';
import { getSafeArea, fitMultiline } from '../safeArea';

const FONT = `'Inter', 'SF Pro Display', 'Roboto', sans-serif`;

export const glassPanel = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = (p.text || 'PREMIUM').toUpperCase();
  const intensity = p.intensity ?? 2;

  const fadeIn = easeInOutCubic(clamp01(remap(t01, 0, 0.15)));
  const fadeOut = easeInOutCubic(clamp01(remap(t01, 0.85, 1.0)));
  const visible = fadeIn * (1 - fadeOut);
  if (visible < 0.01) return;

  const safe = getSafeArea(width, height, 0.15);
  
  // Panel dimensions
  const panelW = Math.min(width * 0.85, 900);
  const panelH = Math.min(height * 0.4, 300);
  const cx = width / 2;
  const cy = height / 2;
  
  // Floating animation
  const floatY = Math.sin(t01 * Math.PI * 4) * 15 * intensity;
  const scale = 0.95 + 0.05 * fadeIn;

  ctx.save();
  ctx.globalAlpha = visible;
  ctx.translate(cx, cy + floatY);
  ctx.scale(scale, scale);

  // 1. Drop shadow (Large, soft, tinted with primary color)
  ctx.shadowColor = hexA(palette.primary, 0.3);
  ctx.shadowBlur = 60;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 20;

  // Draw panel path
  const radius = 24;
  const hw = panelW / 2;
  const hh = panelH / 2;
  
  ctx.beginPath();
  ctx.moveTo(-hw + radius, -hh);
  ctx.lineTo(hw - radius, -hh);
  ctx.arcTo(hw, -hh, hw, -hh + radius, radius);
  ctx.lineTo(hw, hh - radius);
  ctx.arcTo(hw, hh, hw - radius, hh, radius);
  ctx.lineTo(-hw + radius, hh);
  ctx.arcTo(-hw, hh, -hw, hh - radius, radius);
  ctx.lineTo(-hw, -hh + radius);
  ctx.arcTo(-hw, -hh, -hw + radius, -hh, radius);
  ctx.closePath();

  // 2. Glass Fill (Translucent gradient)
  const isDarkBg = parseInt(palette.bg.slice(1,3),16) < 128; // rough brightness check
  const baseGlassColor = isDarkBg ? '#ffffff' : '#000000';
  const glassAlpha = isDarkBg ? 0.08 : 0.04;
  
  const fillGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  fillGrad.addColorStop(0, hexA(baseGlassColor, glassAlpha * 2));
  fillGrad.addColorStop(1, hexA(baseGlassColor, glassAlpha * 0.5));
  
  ctx.fillStyle = fillGrad;
  ctx.fill();
  
  ctx.shadowColor = 'transparent';

  // 3. Specular Highlight / Edge Lighting
  const edgeGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  edgeGrad.addColorStop(0, hexA('#ffffff', 0.6));
  edgeGrad.addColorStop(0.2, hexA('#ffffff', 0.1));
  edgeGrad.addColorStop(0.8, hexA(palette.primary, 0.1));
  edgeGrad.addColorStop(1, hexA(palette.accent, 0.4));
  
  ctx.strokeStyle = edgeGrad;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 4. Inner ambient glow (top edge)
  ctx.save();
  ctx.clip();
  const innerGlow = ctx.createLinearGradient(0, -hh, 0, 0);
  innerGlow.addColorStop(0, hexA('#ffffff', 0.15));
  innerGlow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = innerGlow;
  ctx.fillRect(-hw, -hh, panelW, panelH / 2);
  ctx.restore();

  // 5. Typography
  // Sleek, spaced out, modern font
  const desiredPx = panelH * 0.35;
  const { px: fontPx, lines } = fitMultiline(
    ctx, text, (px) => `800 ${px}px ${FONT}`, panelW * 0.9, panelH * 0.8, desiredPx, 2, 1.2, 16
  );

  ctx.font = `800 ${fontPx}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  setLetterSpacing(ctx, fontPx * 0.05); // wide tracking for premium feel
  
  const totalH = lines.length * fontPx * 1.2;
  const startY = -(totalH / 2) + (fontPx * 0.6);

  lines.forEach((line, i) => {
    const y = startY + i * fontPx * 1.2;
    
    // Subtle text shadow
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    
    // Text gradient
    const textGrad = ctx.createLinearGradient(0, y - fontPx/2, 0, y + fontPx/2);
    textGrad.addColorStop(0, '#ffffff');
    textGrad.addColorStop(1, '#e2e8f0');
    
    ctx.fillStyle = textGrad;
    ctx.fillText(line, 0, y);
    ctx.shadowColor = 'transparent';
  });

  setLetterSpacing(ctx, 0);

  // 6. Glowing accent dot / indicator
  if (intensity >= 2) {
    const dotR = 6;
    ctx.fillStyle = hexA(palette.accent, 0.9);
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, hh - 25, dotR, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.restore();
};
