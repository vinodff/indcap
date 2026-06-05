/**
 * Procedural icon drawings — PURE canvas-drawing functions, no DOM/network deps.
 *
 * Each DrawFn receives (ctx, t) where t ∈ [0,1) is the loop progress, and paints
 * a 200×200 emotion icon. Because output is a pure function of `t`, the same
 * timestamp always renders identical pixels (reproducible video export).
 *
 * Separated from animatedIconService.ts so it can be unit-tested headlessly:
 * animatedIconService imports lottie-web, which touches `document` at module
 * load and crashes in a Node test environment. This module has no such deps.
 */

import type { SegmentEmotion } from './types';

export type DrawFn = (ctx: CanvasRenderingContext2D, t: number) => void;

/** Radial flame (anger) */
export const drawFire: DrawFn = (ctx, t) => {
  const cx = 100, cy = 120;
  const flicker = Math.sin(t * Math.PI * 8) * 8;
  ctx.clearRect(0, 0, 200, 200);
  const g = ctx.createRadialGradient(cx, cy, 10, cx, cy - 40 + flicker, 80);
  g.addColorStop(0, 'rgba(255,220,50,0.95)');
  g.addColorStop(0.5, 'rgba(255,100,20,0.85)');
  g.addColorStop(1, 'rgba(200,20,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  const wave = Math.sin(t * Math.PI * 6) * 14;
  ctx.ellipse(cx, cy - 20 + flicker, 40 + wave, 70, 0, 0, Math.PI * 2);
  ctx.fill();
};

/** Rocket with exhaust trail (inspiration) */
export const drawRocket: DrawFn = (ctx, t) => {
  ctx.clearRect(0, 0, 200, 200);
  const y = 100 - Math.sin(t * Math.PI * 2) * 12;
  ctx.save();
  ctx.translate(100, y);
  ctx.rotate(-0.4);
  ctx.fillStyle = '#e8e8e8';
  ctx.beginPath();
  ctx.roundRect(-14, -40, 28, 60, 8);
  ctx.fill();
  ctx.fillStyle = '#cc3333';
  ctx.beginPath();
  ctx.moveTo(0, -65);
  ctx.lineTo(-14, -38);
  ctx.lineTo(14, -38);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-14, 10);
  ctx.lineTo(-28, 30);
  ctx.lineTo(-14, 22);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(14, 10);
  ctx.lineTo(28, 30);
  ctx.lineTo(14, 22);
  ctx.closePath();
  ctx.fill();
  const exhaust = Math.sin(t * Math.PI * 10) * 6;
  const eg = ctx.createLinearGradient(0, 20, 0, 60 + exhaust);
  eg.addColorStop(0, 'rgba(255,200,50,0.9)');
  eg.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.fillStyle = eg;
  ctx.beginPath();
  ctx.ellipse(0, 34 + exhaust / 2, 10, 24 + exhaust, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/** Burst of radiating stars (joy / humor) */
export const drawConfetti: DrawFn = (ctx, t) => {
  ctx.clearRect(0, 0, 200, 200);
  const count = 8;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + t * Math.PI * 2;
    const r = 55 + Math.sin(t * Math.PI * 4 + i) * 14;
    const x = 100 + Math.cos(angle) * r;
    const y = 100 + Math.sin(angle) * r;
    const s = 10 + Math.sin(t * Math.PI * 3 + i * 1.3) * 4;
    const hue = (i / count) * 360;
    ctx.fillStyle = `hsl(${hue},90%,60%)`;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * Math.PI * 4 + i);
    ctx.beginPath();
    for (let p = 0; p < 5; p++) {
      const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
      const b = a + Math.PI / 5;
      if (p === 0) ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s);
      else ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
      ctx.lineTo(Math.cos(b) * (s * 0.4), Math.sin(b) * (s * 0.4));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

/** Lightning bolt pulse (shock) */
export const drawThunder: DrawFn = (ctx, t) => {
  ctx.clearRect(0, 0, 200, 200);
  const glow = 0.5 + Math.sin(t * Math.PI * 6) * 0.4;
  const scale = 0.85 + Math.sin(t * Math.PI * 4) * 0.1;
  ctx.save();
  ctx.translate(100, 100);
  ctx.scale(scale, scale);
  const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 70);
  g.addColorStop(0, `rgba(255,240,100,${glow * 0.6})`);
  g.addColorStop(1, 'rgba(255,200,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,240,50,${0.7 + glow * 0.3})`;
  ctx.beginPath();
  ctx.moveTo(10, -60);
  ctx.lineTo(-18, -5);
  ctx.lineTo(4, -5);
  ctx.lineTo(-12, 60);
  ctx.lineTo(22, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

/** Bobbing crown (authority) */
export const drawCrown: DrawFn = (ctx, t) => {
  ctx.clearRect(0, 0, 200, 200);
  const bob = Math.sin(t * Math.PI * 2) * 6;
  ctx.save();
  ctx.translate(100, 95 + bob);
  ctx.fillStyle = '#FFD600';
  ctx.strokeStyle = '#FF8F00';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.rect(-55, 0, 110, 35);
  ctx.fill();
  ctx.stroke();
  const pts: [number, number][] = [[-55, 0], [-30, -42], [0, -20], [30, -42], [55, 0]];
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const [px, py] of pts) ctx.lineTo(px, py);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const gems = [[-30, -28], [0, -8], [30, -28]];
  gems.forEach(([gx, gy], i) => {
    ctx.fillStyle = ['#FF4444', '#44FF88', '#4488FF'][i];
    ctx.beginPath();
    ctx.arc(gx, gy, 7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
};

/** Falling teardrops (sadness) */
export const drawSad: DrawFn = (ctx, t) => {
  ctx.clearRect(0, 0, 200, 200);
  ctx.fillStyle = '#5599dd';
  ctx.beginPath();
  ctx.arc(100, 90, 55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2244aa';
  ctx.beginPath();
  ctx.arc(82, 80, 8, 0, Math.PI * 2);
  ctx.arc(118, 80, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2244aa';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(100, 110, 20, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  [82, 118].forEach((x, i) => {
    const drop = ((t + i * 0.5) % 1);
    const ty = 88 + drop * 60;
    const alpha = 1 - drop;
    ctx.fillStyle = `rgba(180,220,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, ty, 5, 0, Math.PI * 2);
    ctx.fill();
  });
};

/** Pulsing spiral (tension) */
export const drawTension: DrawFn = (ctx, t) => {
  ctx.clearRect(0, 0, 200, 200);
  const angle = t * Math.PI * 8;
  ctx.strokeStyle = '#cc0044';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.save();
  ctx.translate(100, 100);
  ctx.rotate(angle * 0.3);
  const pulse = 0.7 + Math.sin(t * Math.PI * 6) * 0.15;
  ctx.scale(pulse, pulse);
  ctx.beginPath();
  for (let i = 0; i < 200; i++) {
    const a = (i / 200) * Math.PI * 8;
    const r = a * 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
};

/** Sparkling star burst (awe / neutral) */
export const drawSparkle: DrawFn = (ctx, t) => {
  ctx.clearRect(0, 0, 200, 200);
  const rays = 8;
  const spin = t * Math.PI;
  ctx.save();
  ctx.translate(100, 100);
  ctx.rotate(spin);
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const len = 55 + Math.sin(t * Math.PI * 6 + i) * 12;
    const width = 4 + Math.cos(t * Math.PI * 4 + i) * 2;
    ctx.save();
    ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, 'rgba(255,220,100,0.9)');
    g.addColorStop(1, 'rgba(255,255,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -len / 2, width, len / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const g2 = ctx.createRadialGradient(0, 0, 2, 0, 0, 18);
  g2.addColorStop(0, 'rgba(255,255,200,1)');
  g2.addColorStop(1, 'rgba(255,200,50,0)');
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/** Maps each emotion to its procedural draw function. */
export const EMOTION_DRAW: Record<SegmentEmotion, DrawFn> = {
  anger:       drawFire,
  inspiration: drawRocket,
  awe:         drawSparkle,
  joy:         drawConfetti,
  humor:       drawConfetti,
  shock:       drawThunder,
  authority:   drawCrown,
  sadness:     drawSad,
  tension:     drawTension,
  neutral:     drawSparkle,
};
