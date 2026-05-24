/**
 * Asset Registry — single source of truth for what fonts, palettes, primitives,
 * and icons the choreography engine is allowed to reference.
 *
 * If a primitive isn't on `SUPPORTED_PRIMITIVES`, it won't be selected — even
 * if it exists in motionGraphicsService. This prevents the engine from
 * generating beats that fail to render.
 */

import type { TypographyPalette, TypographyPrimitive } from './types';

// ─── Fonts (must match the families pre-loaded in index.html) ────────────────

export const FONTS = {
  spaceGrotesk: '"Space Grotesk", "Montserrat", sans-serif',
  montserrat:   '"Montserrat", "Arial Black", sans-serif',
  inter:        '"Inter", "Helvetica Neue", sans-serif',
  orbitron:     '"Orbitron", "Courier New", monospace',
  cinzel:       '"Cinzel", "Playfair Display", serif',
  bangers:      '"Bangers", "Impact", sans-serif',
  bebasNeue:    '"Bebas Neue", "Impact", sans-serif',
  anton:        '"Anton", "Impact", sans-serif',
  archivoBlack: '"Archivo Black", "Impact", sans-serif',
  raleway:      '"Raleway", "Helvetica Neue", sans-serif',
  outfit:       '"Outfit", "Inter", sans-serif',
  poppins:      '"Poppins", "Helvetica", sans-serif',
  oswald:       '"Oswald", "Impact", sans-serif',
  permanentMarker: '"Permanent Marker", "Comic Sans MS", cursive',
  playfair:     '"Playfair Display", "Times New Roman", serif',
} as const;

export type FontKey = keyof typeof FONTS;

// ─── Palettes (typography-specific) ──────────────────────────────────────────

export const ALL_PALETTES: TypographyPalette[] = [
  'gradient-blast',
  'cinematic',
  'energetic',
  'neon-bright',
  'pastel-pop',
];

// ─── Primitives the choreography engine is allowed to use ────────────────────

/**
 * Only primitives that:
 *   1. accept a `text` param
 *   2. render reliably at 1080×1920 vertical
 *   3. are TYPOGRAPHY-focused (text animations only)
 *
 * This is INDEPENDENT from motion graphics primitives.
 */
export const TYPOGRAPHY_PRIMITIVES: TypographyPrimitive[] = [
  // Hero / emphasis
  'big-text-reveal',
  'aurora-text',
  'shimmer-text',
  'morph-text',
  'glitch-text',
  'fire-text',
  'wave-text',
  'neon-sign',
  'kinetic-text',
  'hyper-text',
  'typewriter',
  'text-scramble',
  'split-text-reveal',
  'cinematic-title-opener',
  'trailer-title',
  // Word emphasis flash (single-beat accent)
  'word-emphasis-flash',
];

/**
 * Typography reel uses ONLY text animations.
 * No background effects, UI chrome, or transitions (text-only focus).
 */
export const ALL_TYPOGRAPHY_PRIMITIVES: Set<TypographyPrimitive> = new Set(
  TYPOGRAPHY_PRIMITIVES
);

/** Defensive: is this primitive ok for the choreography engine to emit? */
export function isPrimitiveSupported(p: string): p is TypographyPrimitive {
  return ALL_TYPOGRAPHY_PRIMITIVES.has(p as TypographyPrimitive);
}

// ─── Lucide icon names supported by the canvas icon renderer ─────────────────
// Must match the keys in services/motion/iconRenderer.ts
export const SUPPORTED_ICONS = [
  'zap', 'star', 'flame', 'sparkles', 'rocket', 'terminal', 'music',
  'activity', 'hexagon', 'zap-off', 'diamond', 'radio', 'wifi-off',
  'tv', 'triangle-alert',
] as const;

// ─── Reel limits ─────────────────────────────────────────────────────────────

export const REEL_LIMITS = {
  /** Audio length cap in seconds (per approved Phase 1 scope). */
  maxAudioSeconds: 60,
  /** Maximum file size for the upload dropzone (bytes). 50 MB. */
  maxFileBytes: 50 * 1024 * 1024,
  /** Target output canvas dimensions. */
  width: 1080,
  height: 1920,
  fps: 30,
  videoBitsPerSecond: 8_000_000,
} as const;
