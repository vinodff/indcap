// ─── Caption Style Labels ─────────────────────────────────────────────────
// Maps the 75 raw STYLES_CONFIG entries onto the 13 user-facing "reference"
// category labels (CapCut / Captions-app style rail):
//
//   Trending · Classic · New · Hits · Word · Glow · Basic ·
//   Aesthetic · Monoline · Multiline · Highlight · B&W · Boxed
//
// A single style can carry MANY labels (e.g. "Hormozi Classic" is Trending +
// Hits + Word + Classic). Labels are resolved two ways:
//   1. Curated sets — editorial picks that can't be derived from config alone
//      (Trending / Classic / New / Hits / B&W).
//   2. Attribute predicates — derived from the StyleConfig itself
//      (Word / Multiline / Monoline / Glow / Basic / Aesthetic / Highlight / Boxed).
//
// This file is the single source of truth. The picker UI reads from here.

import { CaptionStyle, StyleConfig } from '../types';
import { STYLES_CONFIG } from '../constants';

export type StyleLabel =
  | 'Trending' | 'Classic' | 'New' | 'Hits' | 'Word' | 'Glow' | 'Basic'
  | 'Aesthetic' | 'Monoline' | 'Multiline' | 'Highlight' | 'B&W' | 'Boxed';

// Ordered exactly as the reference screenshots present them.
export const STYLE_LABELS: StyleLabel[] = [
  'Trending', 'Classic', 'New', 'Hits', 'Word', 'Glow', 'Basic',
  'Aesthetic', 'Monoline', 'Multiline', 'Highlight', 'B&W', 'Boxed',
];

// Per-label accent colour + emoji for the filter rail.
export const LABEL_META: Record<StyleLabel, { icon: string; accent: string }> = {
  Trending:  { icon: '🔥', accent: '#f97316' },
  Classic:   { icon: '🎬', accent: '#94a3b8' },
  New:       { icon: '✨', accent: '#a855f7' },
  Hits:      { icon: '🏆', accent: '#eab308' },
  Word:      { icon: '🔤', accent: '#3b82f6' },
  Glow:      { icon: '💡', accent: '#22d3ee' },
  Basic:     { icon: '⚪', accent: '#71717a' },
  Aesthetic: { icon: '🎨', accent: '#ec4899' },
  Monoline:  { icon: '➖', accent: '#60a5fa' },
  Multiline: { icon: '☰',  accent: '#34d399' },
  Highlight: { icon: '🖍️', accent: '#22c55e' },
  'B&W':     { icon: '◐',  accent: '#e5e7eb' },
  Boxed:     { icon: '🔲', accent: '#f59e0b' },
};

// ─── 1. Curated editorial sets ─────────────────────────────────────────────

// Hot right now — the styles creators are using on TikTok/Reels/Shorts today.
const TRENDING = new Set<string>([
  CaptionStyle.HORMOZI, CaptionStyle.HYPER_IMPACT_BOLD, CaptionStyle.BEAST_MODE,
  CaptionStyle.CAPCUT_POP, CaptionStyle.WORD_POP, CaptionStyle.BOLD_SHADOW,
  CaptionStyle.AUTO_HIGHLIGHT, CaptionStyle.DUAL_COLOR, CaptionStyle.SHAKE_CAM,
  CaptionStyle.VIRAL_SLAM, CaptionStyle.FIRE_WORD,
]);

// Timeless, simple, always-works captions.
const CLASSIC = new Set<string>([
  CaptionStyle.CLEAN_WHITE, CaptionStyle.BOLD_IMPACT, CaptionStyle.HORMOZI,
  CaptionStyle.TYPEWRITER, CaptionStyle.CINEMATIC, CaptionStyle.CINEMATIC_TITLES,
  CaptionStyle.TIKTOK_NATIVE, CaptionStyle.INSTAGRAM_NATIVE,
]);

// Recently shipped styles (CapCut-Viral + Sprint 7 Creative batches).
const NEW = new Set<string>([
  CaptionStyle.BOLD_SHADOW, CaptionStyle.STORYTIME, CaptionStyle.CHROME_3D,
  CaptionStyle.AUTO_HIGHLIGHT, CaptionStyle.GLITCH_RGB, CaptionStyle.RETRO_WAVE,
  CaptionStyle.GHOST_FADE, CaptionStyle.CINEMATIC_TITLES, CaptionStyle.DUAL_COLOR,
  CaptionStyle.SHAKE_CAM, CaptionStyle.MINIMAL_BAR, CaptionStyle.LIQUID_CHROME,
  CaptionStyle.TYPO_SIZE_HIERARCHY, CaptionStyle.COMIC_BANG, CaptionStyle.PASTEL_DREAM,
  CaptionStyle.ELECTRIC_SLIDE, CaptionStyle.DRIP_TEXT, CaptionStyle.SUNSET_VIBES,
  CaptionStyle.ICE_COLD, CaptionStyle.STREET_GRAFFITI, CaptionStyle.ASMR_WHISPER,
  CaptionStyle.ANIME_IMPACT, CaptionStyle.DISCO_FEVER,
]);

// All-time greatest hits — the highest-performing crowd favourites.
const HITS = new Set<string>([
  CaptionStyle.HORMOZI, CaptionStyle.HYPER_IMPACT_BOLD, CaptionStyle.BEAST_MODE,
  CaptionStyle.CAPCUT_POP, CaptionStyle.WORD_POP, CaptionStyle.NEON_GLOW,
  CaptionStyle.GRADIENT_DREAM, CaptionStyle.HIGHLIGHT_BOX, CaptionStyle.LUXURY_GOLD,
  CaptionStyle.FIRE_WORD, CaptionStyle.EMOJI_FIRE,
]);

// True black-and-white styles — no colour accents (can't be inferred safely
// from hex strings, so curated).
const BW = new Set<string>([
  CaptionStyle.CLEAN_WHITE, CaptionStyle.BOLD_SHADOW, CaptionStyle.CINEMATIC_TITLES,
  CaptionStyle.TIKTOK_NATIVE, CaptionStyle.INSTAGRAM_NATIVE, CaptionStyle.GHOST_FADE,
  CaptionStyle.APPLE_MINIMAL, CaptionStyle.CINEMATIC, CaptionStyle.BLUR_REVEAL,
  CaptionStyle.MINIMAL_BAR, CaptionStyle.SPOTLIGHT,
]);

// Extra "pretty/artsy" picks beyond the ART category.
const AESTHETIC_EXTRA = new Set<string>([
  CaptionStyle.PASTEL_DREAM, CaptionStyle.LUXURY_GOLD, CaptionStyle.ASMR_WHISPER,
  CaptionStyle.ICE_COLD, CaptionStyle.SUNSET_VIBES, CaptionStyle.BLUR_REVEAL,
]);

// Extra glow picks beyond the GLOW/NEON categories.
const GLOW_EXTRA = new Set<string>([
  CaptionStyle.SPOTLIGHT, CaptionStyle.GHOST_FADE,
  CaptionStyle.BLUR_FADE, CaptionStyle.EMOJI_HYPE, CaptionStyle.EMOJI_SPARKLE,
]);

// ─── 2. Resolve every label for one style ──────────────────────────────────

export function getLabelsForStyle(key: string, config: StyleConfig): StyleLabel[] {
  const labels: StyleLabel[] = [];
  const cat = config.category;
  const blur = config.shadowBlur ?? 0;

  // Curated
  if (TRENDING.has(key)) labels.push('Trending');
  if (CLASSIC.has(key)) labels.push('Classic');
  if (NEW.has(key)) labels.push('New');
  if (HITS.has(key)) labels.push('Hits');

  // Word — word-by-word reveal
  if (config.displayMode === 'WORD') labels.push('Word');

  // Glow — luminous styles (neon/glow categories, or heavy blur halo)
  if (cat === 'GLOW' || cat === 'NEON' || blur >= 35 || GLOW_EXTRA.has(key)) {
    labels.push('Glow');
  }

  // Basic — clean/minimal/platform-native
  if (cat === 'MINIMAL' || cat === 'PLATFORM') labels.push('Basic');

  // Aesthetic — artsy / decorative
  if (cat === 'ART' || AESTHETIC_EXTRA.has(key)) labels.push('Aesthetic');

  // Monoline — full caption shown as a single clean line (BLOCK, no box)
  if (config.displayMode === 'BLOCK' && !config.backgroundColor) labels.push('Monoline');

  // Multiline — full caption shown as a block that can wrap to multiple lines
  if (config.displayMode === 'BLOCK') labels.push('Multiline');

  // Highlight — active word gets a highlight/background swatch
  if (cat === 'HIGHLIGHT' || !!config.activeBackgroundColor) labels.push('Highlight');

  // B&W
  if (BW.has(key)) labels.push('B&W');

  // Boxed — has a persistent background box behind the text
  if (!!config.backgroundColor) labels.push('Boxed');

  return labels;
}

// ─── 3. Precomputed indexes (built once at module load) ────────────────────

const STYLE_TO_LABELS = new Map<string, StyleLabel[]>();
const LABEL_TO_STYLES = new Map<StyleLabel, CaptionStyle[]>();
STYLE_LABELS.forEach(l => LABEL_TO_STYLES.set(l, []));

(Object.entries(STYLES_CONFIG) as [CaptionStyle, StyleConfig][]).forEach(([key, config]) => {
  const labels = getLabelsForStyle(key, config);
  STYLE_TO_LABELS.set(key, labels);
  labels.forEach(l => LABEL_TO_STYLES.get(l)!.push(key));
});

export function getStylesForLabel(label: StyleLabel): CaptionStyle[] {
  return LABEL_TO_STYLES.get(label) ?? [];
}

export function getLabels(key: string): StyleLabel[] {
  return STYLE_TO_LABELS.get(key) ?? [];
}

// Labels for a ThemePreset. A preset inherits the labels of its underlying
// caption style, but can override whether a background box is shown
// (preset.bgEnabled), so we correct the "Boxed" label accordingly. Returned in
// canonical STYLE_LABELS order.
export function getPresetLabels(captionStyle: string, bgEnabled?: boolean): StyleLabel[] {
  const set = new Set<StyleLabel>(getLabels(captionStyle));
  if (bgEnabled) set.add('Boxed');
  else set.delete('Boxed');
  return STYLE_LABELS.filter(l => set.has(l));
}

// Count per label — handy for badges / verifying none are empty.
export const LABEL_COUNTS: Record<StyleLabel, number> = STYLE_LABELS.reduce((acc, l) => {
  acc[l] = LABEL_TO_STYLES.get(l)!.length;
  return acc;
}, {} as Record<StyleLabel, number>);
