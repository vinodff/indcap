/**
 * MotionGraphicsRenderer — canvas dispatch engine for MotionPlan beats.
 *
 * Layer order, drawn back-to-front:
 *   0. background primitives  (bg-gradient-pulse, transition-wipe, light-sweep, retro-grid, spotlight, liquid-bg)
 *   1. midground primitives   (icon-burst, particle-burst, shockwave, confetti, ripple, meteors, border-beam, etc.)
 *   2. text / icon            (big-text-reveal, glitch-text, aurora-text, typewriter, kinetic-text, wave-text, fire-text, countdown, neon-sign)
 *   3. foreground accents     (word-emphasis-flash, glitch-screen)
 *   4. camera / framing       (camera-zoom-3d — letterbox bars must overlay)
 *   5. POST processing        (subtle global vignette + film grain)
 *
 * Beats can overlap. Each frame is composed by iterating layer-by-layer.
 */

import { PRIMITIVES, getPalette } from './motion';
import type { PrimitiveContext } from './motion';
import type { MotionBeat, PrimitiveType } from './motionGraphicsService';

const LAYER: Record<PrimitiveType, number> = {
  // backgrounds
  'bg-gradient-pulse': 0,
  'transition-wipe': 0,
  'light-sweep': 0,
  'retro-grid': 0,
  'spotlight': 0,
  'liquid-bg': 0,
  // midground primitives
  'highlight-box': 1,
  'lower-third': 1,
  'icon-burst': 1,
  'particle-burst': 1,
  'animated-arrow': 1,
  'counter': 1,
  'bar-reveal': 1,
  'bullet-list-reveal': 1,
  'quote-card': 1,
  'callout-arrow': 1,
  'ripple': 1,
  'meteors': 1,
  'border-beam': 1,
  'shockwave': 1,
  'confetti': 1,
  // typography
  'big-text-reveal': 2,
  'glitch-text': 2,
  'aurora-text': 2,
  'shimmer-text': 2,
  'hyper-text': 2,
  'morph-text': 2,
  'typewriter': 2,
  'kinetic-text': 2,
  'wave-text': 2,
  'fire-text': 2,
  'countdown': 2,
  'neon-sign': 2,
  // foreground emphasis
  'word-emphasis-flash': 3,
  'glitch-screen': 3,
  // camera / framing — always overlays
  'camera-zoom-3d': 4,
  // Phase 9 — Hyper-Realistic 3D
  'scene-3d': 0,          // 3D world background
  'text-3d': 2,           // 3D block text (typography layer)
  'camera-cinematic': 4,  // multi-axis cinematic camera (overlay)
  // Phase 10 — High-Retention Creator Effects
  'paper-tear': 3,
  'glass-panel': 2,
  'cyber-hud': 3,
  'marquee-text': 1,
  'cursor-click-ui': 2,  // mid-foreground: appears above background but below full-screen overlays
  'bento-grid': 2,       // mid-foreground: glass panels sit above bg primitives
  'device-tilt-3d': 2,  // mid-foreground: device mockup above bg, below HUDs
  'liquid-morph': 2,    // mid-foreground: transition overlays background elements
  'card-carousel-3d': 2, // mid-foreground: 3D feature cards above bg, below full-screen overlays
  'search-rank-list': 2, // mid-foreground: search box and ranked items reveal above backgrounds
  'map-route-tracker': 2, // mid-foreground: map, travel lines, and locator pins reveal above backgrounds
  'dynamic-callout': 2,
  'versus-duel': 2,
  'notification-stack': 2,
  'code-terminal-ui': 2,
  // Phase 11 — Competitor-Grade Templates
  'animated-emoji-button': 2,
  'glass-toggle': 1,
  'circular-progress': 2,
  'pricing-table': 2,
  'testimonial-rotator': 2,
  'ai-chat-message': 2,
  'polaroid-stack': 2,
  'morphing-shapes': 0,
  'gradient-orbs': 0,
  'floating-product-card': 2,
  'before-after-reveal': 2,
  'globe-3d': 2,
  'device-mockup': 2,
  'holo-projection': 0,  // full-screen scene — draw as background layer so HUD overlays can stack above
  'liquid-loader': 2,
  'magnetic-button': 2,
  'spotlight-card': 2,
  'neon-command-menu': 2,
  'floating-dock': 2,
  'holographic-card': 2,
  // Phase 12 — AI & UX Motion Primitives
  'ai-search-bar': 2,
  'mesh-gradient-bg': 0,
  'scroll-reveal-stack': 2,
  'dynamic-island': 3,
  'floating-notification': 2,
  'particle-trail-cursor': 3,
  'infinite-logo-marquee': 2,
  'elastic-slider': 2,
  'ai-thinking-loader': 2,
  'text-scramble': 2,
  'split-text-reveal': 2,
  'metrics-dashboard': 2,
  'network-graph': 2,
  // Phase 13 — Creative Templates
  'stacked-notes': 2,
  'voice-waveform': 2,
  'shimmer-button': 2,
  'pixel-transition': 0,  // full-frame dissolve — background layer
  'flip-clock': 2,
  'neural-intelligence-core': 0,
  'cinematic-title-opener': 2,
  'quantum-card-explosion': 2,
  'showcase-reel': 2,
  'title-opener': 2,
  'trailer-title': 2,
};

export interface MotionRendererState {
  beats: MotionBeat[];
  beatsByLayer: MotionBeat[][];
  enablePostProcessing: boolean;
}

export const createMotionRendererState = (beats: MotionBeat[], enablePostProcessing = true): MotionRendererState => {
  const sorted = [...beats].sort((a, b) => a.startTime - b.startTime);
  const layers: MotionBeat[][] = [[], [], [], [], [], []];
  sorted.forEach((b) => {
    const layer = LAYER[b.primitive] ?? 1;
    layers[layer].push(b);
  });
  return { beats: sorted, beatsByLayer: layers, enablePostProcessing };
};

export const findActiveBeats = (state: MotionRendererState, t: number): MotionBeat[] => {
  return state.beats.filter((b) => t >= b.startTime && t < b.endTime);
};

/** Subtle vignette + film grain over the whole frame. */
const drawPostProcessing = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
  // Radial vignette
  const vMax = Math.hypot(w, h) * 0.55;
  const grad = ctx.createRadialGradient(w / 2, h / 2, vMax * 0.45, w / 2, h / 2, vMax);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Cheap film grain — sparse dots, deterministic per-frame (changes each frame).
  // Sparsity keeps cost low; visually adds analog texture.
  const grainCount = Math.floor((w * h) / 4500);
  const seed = Math.floor(t * 60) * 9301 + 49297;
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < grainCount; i++) {
    const r = ((seed + i * 7) * 233280 + 1) % 233280;
    const x = (r * 37) % w;
    const y = ((r * 73) >> 1) % h;
    const a = ((r * 11) % 100) / 1000;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
};

export const renderMotion = (
  state: MotionRendererState,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
): void => {
  for (let layer = 0; layer < state.beatsByLayer.length; layer++) {
    const candidates = state.beatsByLayer[layer];
    for (let i = 0; i < candidates.length; i++) {
      const beat = candidates[i];
      if (t < beat.startTime || t >= beat.endTime) continue;
      const duration = Math.max(0.01, beat.endTime - beat.startTime);
      const t01 = (t - beat.startTime) / duration;
      const renderer = PRIMITIVES[beat.primitive];
      if (!renderer) continue;
      const palette = getPalette(beat.params.palette, beat.params.customColors);
      const pc: PrimitiveContext = {
        ctx,
        width,
        height,
        t01,
        durationSec: duration,
        palette,
      };
      try {
        renderer(pc, beat.params);
      } catch (e) {
        console.warn('[motion] primitive threw', beat.primitive, e);
      }
    }
  }

  // Post-process pass — only if anything was active to avoid darkening empty frames.
  if (state.enablePostProcessing) {
    const anyActive = state.beats.some((b) => t >= b.startTime && t < b.endTime);
    if (anyActive) drawPostProcessing(ctx, width, height, t);
  }
};
