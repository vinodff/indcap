/**
 * Theme Color Roles
 *
 * Single source of truth for the per-phrase color trio (hero / secondary /
 * connective). Colors are DERIVED FROM THE ACTIVE THEME PALETTE — never
 * hardcoded — so a red "Cinematic Poet" theme can never render a stray teal
 * word. Each role is contrast-checked against the theme background so no word
 * is ever illegible.
 *
 * Pure module: no DOM, no I/O. Deterministic for a given ThemeProfile.
 */

import type { SegmentEmotion, ThemeProfile } from './types';

// ─── Public types ────────────────────────────────────────────────────────────

export interface ThemeColorRoles {
  /** The phrase keyword — the theme's emphasis (accent) color. */
  hero: string;
  /** The next-most-important word — the theme's primary text color. */
  secondary: string;
  /** Glue words — a recessive tint between primary and background. */
  connective: string;
  /** Multi-stop gradient for the hero on dark themes that define one. */
  heroGradient?: string[];
  /** Legibility outline — only on dark backgrounds. */
  strokeColor?: string;
  strokeWidth?: number;
}

// ─── Hex / luminance / contrast helpers ───────────────────────────────────────

interface RGB { r: number; g: number; b: number; }

function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const int = parseInt(h, 16);
  if (Number.isNaN(int) || h.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex({ r, g, b }: RGB): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** WCAG relative luminance (0 = black, 1 = white). */
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colors (1:1 … 21:1). */
function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** True when the background is light enough that text should be darkened. */
export function isLightBg(bgColor: string): boolean {
  return relativeLuminance(bgColor) > 0.4;
}

/** Linear blend between two hex colors. t=0 → a, t=1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const k = Math.max(0, Math.min(1, t));
  return rgbToHex({
    r: ca.r + (cb.r - ca.r) * k,
    g: ca.g + (cb.g - ca.g) * k,
    b: ca.b + (cb.b - ca.b) * k,
  });
}

/**
 * Nudge `fg` toward black or white (away from the background) just enough to
 * reach `minRatio` contrast against `bg`. Preserves hue/saturation as much as
 * possible by blending toward the legible extreme rather than recoloring.
 */
function ensureContrast(fg: string, bg: string, minRatio: number): string {
  if (contrastRatio(fg, bg) >= minRatio) return fg;
  // Blend toward the extreme that increases contrast with the background.
  const target = relativeLuminance(bg) > 0.5 ? '#000000' : '#FFFFFF';
  let lo = 0;
  let hi = 1;
  let best = mixHex(fg, target, 1);
  // Binary search for the smallest blend that satisfies the ratio (keeps as
  // much of the original hue as possible).
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const candidate = mixHex(fg, target, mid);
    if (contrastRatio(candidate, bg) >= minRatio) {
      best = candidate;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return best;
}

// ─── Emotion accent table (inlined to keep this module dependency-free) ────────

function emotionHue(emotion: SegmentEmotion, light: boolean): string {
  if (light) {
    switch (emotion) {
      case 'shock': case 'anger':     return '#B71C1C';
      case 'inspiration': case 'awe': return '#004D40';
      case 'joy': case 'humor':       return '#BF360C';
      case 'authority':               return '#1A237E';
      case 'tension':                 return '#263238';
      default:                        return '#8B0000';
    }
  }
  switch (emotion) {
    case 'shock': case 'anger':     return '#FF1744';
    case 'joy': case 'humor':       return '#FFE000';
    case 'inspiration': case 'awe': return '#00E5FF';
    case 'authority':               return '#FFD600';
    case 'sadness':                 return '#CE93D8';
    case 'tension':                 return '#ECEFF1';
    default:                        return '#FFFFFF';
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Derive the legible, theme-consistent color trio for a theme.
 *
 * - hero      → the theme's accent color (the "emphasis" color)
 * - secondary → the theme's primary text color
 * - connective→ primary blended toward the background (recessive but legible)
 *
 * All three are contrast-checked against the background. On dark themes that
 * define gradients, the hero also carries `heroGradient` and a black stroke.
 */
export function deriveThemeColorRoles(theme: ThemeProfile): ThemeColorRoles {
  const bg = theme.backgroundColor || '#000000';
  const light = isLightBg(bg);

  // Hero = accent (emphasis). Fall back to primary if accent is invisible on bg.
  let hero = theme.accentColor || theme.primaryColor;
  if (contrastRatio(hero, bg) < 1.6) {
    hero = theme.primaryColor;
  }
  hero = ensureContrast(hero, bg, 3.0); // WCAG AA large text

  const secondary = ensureContrast(theme.primaryColor || hero, bg, 3.0);
  const connective = ensureContrast(mixHex(theme.primaryColor || hero, bg, 0.4), bg, 2.2);

  const roles: ThemeColorRoles = { hero, secondary, connective };

  // Dark backgrounds: hero gradient (if the theme ships one) + legibility stroke.
  if (!light) {
    if (theme.gradients && theme.gradients.length > 0) {
      roles.heroGradient = theme.gradients;
    }
    roles.strokeColor = '#000000';
    roles.strokeWidth = 6;
  }

  return roles;
}

/**
 * Blend a role color a BOUNDED amount toward an emotion hue. Used for the hero
 * word ONLY so emotion can color the keyword without breaking theme coherence —
 * secondary/connective stay pure theme colors. `amount` is clamped to ≤ 0.25.
 */
export function tintWithinTheme(
  roleColor: string,
  emotion: SegmentEmotion,
  light: boolean,
  amount: number
): string {
  if (emotion === 'neutral') return roleColor;
  const a = Math.max(0, Math.min(0.25, amount));
  return mixHex(roleColor, emotionHue(emotion, light), a);
}
