/**
 * paper-tear — Stop-motion collage aesthetic.
 * 
 * Phase 10 — High-Retention Creator Effects.
 * Popularized by documentary style creators (e.g. Ali Abdaal, Vox).
 * Simulates a ripped piece of paper appearing with a jittery 12fps stop-motion feel.
 * The paper reveals bold text and includes a heavy drop shadow for depth.
 */

import type { PrimitiveContext, PrimitiveParams } from '../types';
import { hexA, mixHex, setLetterSpacing } from '../decorations';
import { clamp01, remap, easeOutElastic } from '../easing';
import { getSafeArea, fitMultiline } from '../safeArea';

const FONT = `'Space Grotesk', 'Inter', 'Courier New', monospace`;

// Pseudo-random generator for jagged edges
const mulberry32 = (seed: number) => {
  let a = (seed ^ 0xbadf00d) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const paperTear = (pc: PrimitiveContext, p: PrimitiveParams): void => {
  const { ctx, width, height, t01, palette } = pc;
  const text = (p.text || 'PAPER TEAR').toUpperCase();
  const intensity = p.intensity ?? 2;

  // Stop-motion effect: snap time to 12 frames per second
  const fps = 12;
  const durationFrames = Math.max(1, pc.durationSec * fps);
  const currentFrame = Math.floor(t01 * durationFrames);
  const tSnapped = clamp01(currentFrame / durationFrames);

  const fadeIn = clamp01(remap(tSnapped, 0, 0.15));
  const fadeOut = clamp01(remap(tSnapped, 0.85, 1.0));
  const visible = fadeIn * (1 - fadeOut);
  if (visible < 0.01) return;

  // Jitter scale and rotation slightly every frame
  const rng = mulberry32(currentFrame); 
  const jitterRot = (rng() - 0.5) * 0.03 * intensity;
  const jitterScale = 1 + (rng() - 0.5) * 0.02;

  // Spring animation for entrance
  const scaleAnim = easeOutElastic(clamp01(remap(t01, 0, 0.3))); 
  
  const safe = getSafeArea(width, height, 0.15);
  const cx = width / 2;
  const cy = height / 2;

  ctx.save();
  ctx.globalAlpha = 1 - fadeOut;
  ctx.translate(cx, cy);
  ctx.rotate(jitterRot);
  ctx.scale(scaleAnim * jitterScale, scaleAnim * jitterScale);

  // 1. Draw torn paper background
  const paperW = Math.min(width * 0.8, 800);
  const paperH = Math.min(height * 0.6, 400);
  
  // Create jagged path for paper edge
  const edgeRng = mulberry32(12345); // Static seed so shape doesn't change wildly, just jitters
  ctx.beginPath();
  
  const segments = intensity === 3 ? 40 : 20;
  const drawJaggedEdge = (startX: number, startY: number, endX: number, endY: number) => {
    const dx = endX - startX;
    const dy = endY - startY;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const jx = (edgeRng() - 0.5) * 15 * intensity * (currentFrame % 2 === 0 ? 1 : 0.8); // slight morph
      const jy = (edgeRng() - 0.5) * 15 * intensity * (currentFrame % 2 === 0 ? 1 : 0.8);
      ctx.lineTo(startX + dx * t + (i === 0 || i === segments ? 0 : jx), startY + dy * t + (i === 0 || i === segments ? 0 : jy));
    }
  };

  const hw = paperW/2;
  const hh = paperH/2;
  ctx.moveTo(-hw, -hh);
  drawJaggedEdge(-hw, -hh, hw, -hh); // Top
  drawJaggedEdge(hw, -hh, hw, hh);   // Right
  drawJaggedEdge(hw, hh, -hw, hh);   // Bottom
  drawJaggedEdge(-hw, hh, -hw, -hh); // Left
  ctx.closePath();

  // Drop shadow
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 15;
  ctx.shadowOffsetY = 15;
  
  // Paper fill
  ctx.fillStyle = '#F4F4F5'; // Off-white paper color
  ctx.fill();
  
  // Remove shadow for inner details
  ctx.shadowColor = 'transparent';

  // Inner texture (halftone/grain)
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(0,0,0,${0.03 + rng() * 0.02})`;
  for(let i=0; i<200; i++) {
     const tx = (rng() - 0.5) * paperW;
     const ty = (rng() - 0.5) * paperH;
     const tr = rng() * 2;
     ctx.beginPath(); ctx.arc(tx, ty, tr, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  // 2. Draw Text (Stamped/Printed look)
  const fontPx = Math.min(paperW * 0.15, paperH * 0.3);
  ctx.font = `900 ${fontPx}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Slight misalignment for print offset effect (CMYK separation)
  if (intensity >= 2) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = hexA(palette.primary, 0.8);
    ctx.fillText(text, -2 + rng()*4, -2 + rng()*4);
    ctx.fillStyle = hexA(palette.accent, 0.8);
    ctx.fillText(text, 2 + rng()*4, 2 + rng()*4);
  }

  // Main text
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#18181B'; // Dark ink
  
  // Rough edges on text
  if (intensity === 3) {
      for(let i=0; i<3; i++) {
        ctx.fillText(text, (rng()-0.5)*3, (rng()-0.5)*3);
      }
  } else {
      ctx.fillText(text, 0, 0);
  }
  
  // Highlight tape (accent color)
  const tapeW = paperW * 0.3;
  const tapeH = paperH * 0.15;
  ctx.fillStyle = hexA(palette.secondary, 0.6);
  ctx.rotate(-0.1);
  ctx.fillRect(-paperW/2 - 20, -paperH/2 + 20, tapeW, tapeH);
  ctx.rotate(0.1);

  ctx.restore();
};
