/**
 * Palette presets for motion graphics.
 *
 * Phase 6 adds three vibrant palettes to address the "too flat / not bright"
 * feedback: neon-bright (vaporwave), pastel-pop (premium kids), gradient-blast
 * (multi-stop saturated). Color values picked for high perceptual contrast
 * against the bg role so primaries pop.
 */

import type { Palette } from '../motionGraphicsService';

export interface PaletteColors {
  bg: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
}

export const PALETTES: Record<Palette, PaletteColors> = {
  energetic: {
    bg: '#0F172A',
    primary: '#FBBF24',
    secondary: '#F472B6',
    accent: '#22D3EE',
    text: '#FFFFFF',
  },
  corporate: {
    bg: '#0B1220',
    primary: '#3B82F6',
    secondary: '#60A5FA',
    accent: '#A5B4FC',
    text: '#F8FAFC',
  },
  kids: {
    bg: '#FEF3C7',
    primary: '#F472B6',
    secondary: '#34D399',
    accent: '#A78BFA',
    text: '#111827',
  },
  cinematic: {
    bg: '#0A0A0A',
    primary: '#E5E7EB',
    secondary: '#9CA3AF',
    accent: '#F59E0B',
    text: '#FFFFFF',
  },
  // ── Phase 6 additions ─────────────────────────────────────────────────
  'neon-bright': {
    // Vaporwave / cyberpunk — hot pink + electric cyan + lime on black
    bg: '#050010',
    primary: '#FF2EC4',
    secondary: '#00F0FF',
    accent: '#9DFF00',
    text: '#FFFFFF',
  },
  'pastel-pop': {
    // Soft but saturated — mint + peach + lavender + light cream bg
    bg: '#FFF7ED',
    primary: '#F472B6',
    secondary: '#60D394',
    accent: '#A78BFA',
    text: '#1F2937',
  },
  'gradient-blast': {
    // Multi-stop hero palette — bg is a deep purple, primaries form a
    // bright triad that pairs well with the additive glow blends our
    // primitives use.
    bg: '#1E0438',
    primary: '#FF4E50',
    secondary: '#FCB045',
    accent: '#22D3EE',
    text: '#FFFFFF',
  },
  custom: {
    bg: '#0F172A',
    primary: '#FBBF24',
    secondary: '#F472B6',
    accent: '#22D3EE',
    text: '#FFFFFF',
  },
};

export const getPalette = (name: Palette, custom?: string[]): PaletteColors => {
  const base = PALETTES[name] || PALETTES.energetic;
  if (name === 'custom' && custom && custom.length >= 4) {
    return {
      bg: custom[0] || base.bg,
      primary: custom[1] || base.primary,
      secondary: custom[2] || base.secondary,
      accent: custom[3] || base.accent,
      text: custom[4] || base.text,
    };
  }
  return base;
};
