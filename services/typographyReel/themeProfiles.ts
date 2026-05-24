/**
 * Theme Profiles — hand-tuned "looks" for the typography reel.
 *
 * Each profile locks the palette + font + emphasis primitive, and provides
 * emotion → primitive overrides. The choreography engine consults the active
 * profile first, then falls back to its default rules.
 */

import type { ThemeProfile } from './types';

export const THEME_PROFILES: ThemeProfile[] = [
  {
    id: 'devon-jatho',
    name: 'Devon Jatho',
    description: 'Premium viral style — gradient text, deep glow, word-pop choreography.',
    palette: 'gradient-blast',
    fontFamily: '"Space Grotesk", "Montserrat", sans-serif',
    fontWeight: 700,
    primitiveByEmotion: {
      awe:         'aurora-text',
      shock:       'glitch-text',
      joy:         'kinetic-text',
      anger:       'fire-text',
      sadness:     'shimmer-text',
      tension:     'shimmer-text',
      inspiration: 'aurora-text',
      humor:       'wave-text',
      authority:   'big-text-reveal',
      neutral:     'big-text-reveal',
    },
    emphasisPrimitive: 'aurora-text',
    previewGradient: 'from-violet-600 via-indigo-500 to-cyan-400',
    intensityBias: 3,
  },

  {
    id: 'cinematic-poet',
    name: 'Cinematic Poet',
    description: 'Slow, restrained, film-title elegance. Big serif type and gold accents.',
    palette: 'cinematic',
    fontFamily: '"Cinzel", "Playfair Display", serif',
    fontWeight: 700,
    primitiveByEmotion: {
      awe:         'cinematic-title-opener',
      shock:       'split-text-reveal',
      joy:         'shimmer-text',
      anger:       'big-text-reveal',
      sadness:     'typewriter',
      tension:     'typewriter',
      inspiration: 'cinematic-title-opener',
      humor:       'morph-text',
      authority:   'big-text-reveal',
      neutral:     'big-text-reveal',
    },
    emphasisPrimitive: 'cinematic-title-opener',
    previewGradient: 'from-yellow-600 via-amber-400 to-yellow-300',
    intensityBias: 1,
  },

  {
    id: 'viral-hook',
    name: 'Viral Hook',
    description: 'CapCut-style bold impact. Bold Montserrat black + yellow accents, stamp-bounce.',
    palette: 'energetic',
    fontFamily: '"Montserrat", "Arial Black", sans-serif',
    fontWeight: 900,
    primitiveByEmotion: {
      awe:         'aurora-text',
      shock:       'word-emphasis-flash',
      joy:         'kinetic-text',
      anger:       'fire-text',
      sadness:     'big-text-reveal',
      tension:     'glitch-text',
      inspiration: 'big-text-reveal',
      humor:       'kinetic-text',
      authority:   'big-text-reveal',
      neutral:     'big-text-reveal',
    },
    emphasisPrimitive: 'word-emphasis-flash',
    previewGradient: 'from-yellow-400 via-orange-500 to-red-500',
    intensityBias: 3,
  },

  {
    id: 'soft-aesthetic',
    name: 'Soft Aesthetic',
    description: 'Pastel mood — Outfit + soft pinks, slow shimmer, gentle motion.',
    palette: 'pastel-pop',
    fontFamily: '"Outfit", "Inter", sans-serif',
    fontWeight: 700,
    primitiveByEmotion: {
      awe:         'shimmer-text',
      shock:       'morph-text',
      joy:         'wave-text',
      anger:       'big-text-reveal',
      sadness:     'shimmer-text',
      tension:     'typewriter',
      inspiration: 'shimmer-text',
      humor:       'wave-text',
      authority:   'big-text-reveal',
      neutral:     'shimmer-text',
    },
    emphasisPrimitive: 'shimmer-text',
    previewGradient: 'from-pink-300 via-purple-300 to-indigo-300',
    intensityBias: 1,
  },

  {
    id: 'tech-bold',
    name: 'Tech Bold',
    description: 'Cyber-futurist. Orbitron + neon cyan, glitch, scramble, hyper text.',
    palette: 'neon-bright',
    fontFamily: '"Orbitron", "Courier New", monospace',
    fontWeight: 700,
    primitiveByEmotion: {
      awe:         'hyper-text',
      shock:       'glitch-text',
      joy:         'neon-sign',
      anger:       'glitch-text',
      sadness:     'text-scramble',
      tension:     'text-scramble',
      inspiration: 'hyper-text',
      humor:       'neon-sign',
      authority:   'neon-sign',
      neutral:     'hyper-text',
    },
    emphasisPrimitive: 'glitch-text',
    previewGradient: 'from-cyan-400 via-teal-300 to-purple-500',
    intensityBias: 3,
  },

  {
    id: 'anime-impact',
    name: 'Anime Impact',
    description: 'Bangers + speed lines + slam zooms. High-energy anime-style hits.',
    palette: 'energetic',
    fontFamily: '"Bangers", "Impact", sans-serif',
    fontWeight: 700,
    primitiveByEmotion: {
      awe:         'kinetic-text',
      shock:       'glitch-text',
      joy:         'kinetic-text',
      anger:       'fire-text',
      sadness:     'big-text-reveal',
      tension:     'glitch-text',
      inspiration: 'kinetic-text',
      humor:       'wave-text',
      authority:   'big-text-reveal',
      neutral:     'kinetic-text',
    },
    emphasisPrimitive: 'kinetic-text',
    previewGradient: 'from-red-500 via-orange-500 to-yellow-400',
    intensityBias: 3,
  },
];

export function getThemeProfile(id: string): ThemeProfile {
  return THEME_PROFILES.find(p => p.id === id) ?? THEME_PROFILES[0];
}
