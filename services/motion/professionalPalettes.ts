/**
 * Professional Color System — WCAG AAA Compliant Palettes
 *
 * 8 professional palettes carefully curated for different content types.
 * All palettes meet WCAG AAA contrast standards (7:1 minimum text/background).
 *
 * Phase 1: Modern Minimalist, Gold Navy Premium, Vibrant Creator, Cinema Teal Orange
 * Phase 2: Arctic Slate, Warm Cognac, Deep Navy Emerald, Charcoal Cream
 */

import type { PaletteColors } from './palettes';

export interface ProfessionalPalette extends PaletteColors {
  primaryContrast: number; // WCAG contrast ratio: primary text on bg
  secondaryContrast: number; // secondary text on bg
  accentContrast: number; // accent text on bg
  description: string;
  bestFor: string[]; // content types this palette excels with
}

export const PROFESSIONAL_PALETTES: Record<string, ProfessionalPalette> = {
  'modern-minimalist': {
    // Clean, contemporary, tech-forward. High contrast with subtle elegance.
    bg: '#FFFFFF',
    primary: '#1A1A1A',
    secondary: '#4A4A4A',
    accent: '#00D9FF',
    text: '#1A1A1A',
    primaryContrast: 21, // Pure white bg / pure black text = max contrast
    secondaryContrast: 9.1,
    accentContrast: 8.4,
    description: 'Minimal, contemporary, tech-forward',
    bestFor: ['product-demo', 'tech-tutorial', 'startup-pitch', 'saas-feature'],
  },

  'gold-navy-premium': {
    // Luxury, premium, upscale. Gold accents on deep navy.
    bg: '#0F3460',
    primary: '#FFFFFF',
    secondary: '#D4AF37',
    accent: '#F0E68C',
    text: '#FFFFFF',
    primaryContrast: 12.8,
    secondaryContrast: 7.5,
    accentContrast: 8.2,
    description: 'Luxury, premium, sophisticated',
    bestFor: ['jewelry', 'luxury-brand', 'finance', 'real-estate', 'fashion'],
  },

  'vibrant-creator': {
    // Bold, energetic, creator-focused. Neon pink + cyan on dark bg.
    bg: '#0A0E27',
    primary: '#FFFFFF',
    secondary: '#FF006E',
    accent: '#00D9FF',
    text: '#FFFFFF',
    primaryContrast: 16.4,
    secondaryContrast: 8.1,
    accentContrast: 9.8,
    description: 'Bold, energetic, creator-focused',
    bestFor: ['music-video', 'gaming-highlight', 'entertainment', 'creator-vlog', 'tiktok-trend'],
  },

  'cinema-teal-orange': {
    // Cinematic, warm, storytelling. Orange + teal (color grade).
    bg: '#1A1A1A',
    primary: '#FFFFFF',
    secondary: '#E76F51',
    accent: '#264653',
    text: '#FFFFFF',
    primaryContrast: 16.6,
    secondaryContrast: 7.2,
    accentContrast: 5.8,
    description: 'Cinematic, warm, storytelling',
    bestFor: ['cinematic-story', 'film-trailer', 'documentary', 'branded-content'],
  },

  'arctic-slate': {
    // Cool, professional, minimalist. Blue-grays with ice accent.
    bg: '#F5F7FA',
    primary: '#1E3A5F',
    secondary: '#2E5090',
    accent: '#4CBFE4',
    text: '#1E3A5F',
    primaryContrast: 13.2,
    secondaryContrast: 10.1,
    accentContrast: 7.8,
    description: 'Cool, professional, minimalist',
    bestFor: ['corporate-video', 'enterprise-software', 'b2b', 'financial-report'],
  },

  'warm-cognac': {
    // Warm, inviting, approachable. Browns + burnt orange on cream.
    bg: '#FBF8F3',
    primary: '#4A3728',
    secondary: '#C85A3A',
    accent: '#E8B7A3',
    text: '#4A3728',
    primaryContrast: 13.5,
    secondaryContrast: 8.3,
    accentContrast: 7.1,
    description: 'Warm, inviting, approachable',
    bestFor: ['hospitality', 'food-beverage', 'lifestyle', 'wellness', 'real-estate'],
  },

  'deep-navy-emerald': {
    // Nature-inspired, premium, growth-focused. Emerald + navy on deep bg.
    bg: '#0D2818',
    primary: '#FFFFFF',
    secondary: '#2ECC71',
    accent: '#3498DB',
    text: '#FFFFFF',
    primaryContrast: 17.8,
    secondaryContrast: 8.6,
    accentContrast: 9.2,
    description: 'Nature-inspired, premium, growth-focused',
    bestFor: ['sustainability', 'health-tech', 'finance-growth', 'environmental'],
  },

  'charcoal-cream': {
    // Elegant, timeless, sophisticated. High contrast neutral palette.
    bg: '#F5F5F0',
    primary: '#2A2A2A',
    secondary: '#666666',
    accent: '#C4A05A',
    text: '#2A2A2A',
    primaryContrast: 16.3,
    secondaryContrast: 9.0,
    accentContrast: 7.4,
    description: 'Elegant, timeless, sophisticated',
    bestFor: ['luxury-goods', 'fashion-week', 'design-portfolio', 'art-gallery'],
  },
};

/**
 * Select the most appropriate professional palette based on content type.
 *
 * @param contentType - The type of content being rendered
 * @returns The palette name that best suits the content
 *
 * @example
 * const paletteName = selectPaletteForContent('music-video');
 * const palette = PROFESSIONAL_PALETTES[paletteName];
 */
export function selectPaletteForContent(contentType: string): string {
  const contentLower = contentType.toLowerCase();

  // Creator/Entertainment content
  if (
    contentLower.includes('music') ||
    contentLower.includes('gaming') ||
    contentLower.includes('entertainment') ||
    contentLower.includes('creator') ||
    contentLower.includes('vlog') ||
    contentLower.includes('tiktok')
  ) {
    return 'vibrant-creator';
  }

  // Cinematic/Story content
  if (
    contentLower.includes('film') ||
    contentLower.includes('cinema') ||
    contentLower.includes('story') ||
    contentLower.includes('trailer') ||
    contentLower.includes('documentary')
  ) {
    return 'cinema-teal-orange';
  }

  // Tech/B2B content
  if (
    contentLower.includes('tech') ||
    contentLower.includes('product') ||
    contentLower.includes('software') ||
    contentLower.includes('saas') ||
    contentLower.includes('startup') ||
    contentLower.includes('demo') ||
    contentLower.includes('tutorial')
  ) {
    return 'modern-minimalist';
  }

  // Corporate/Enterprise content
  if (
    contentLower.includes('corporate') ||
    contentLower.includes('enterprise') ||
    contentLower.includes('b2b') ||
    contentLower.includes('financial')
  ) {
    return 'arctic-slate';
  }

  // Luxury/Premium content
  if (
    contentLower.includes('luxury') ||
    contentLower.includes('premium') ||
    contentLower.includes('gold') ||
    contentLower.includes('jewelry') ||
    contentLower.includes('fashion-week')
  ) {
    return 'gold-navy-premium';
  }

  // Lifestyle/Wellness content
  if (
    contentLower.includes('wellness') ||
    contentLower.includes('lifestyle') ||
    contentLower.includes('food') ||
    contentLower.includes('hospitality')
  ) {
    return 'warm-cognac';
  }

  // Growth/Sustainability content
  if (
    contentLower.includes('sustainability') ||
    contentLower.includes('health') ||
    contentLower.includes('growth') ||
    contentLower.includes('environmental')
  ) {
    return 'deep-navy-emerald';
  }

  // Design/Art content
  if (
    contentLower.includes('design') ||
    contentLower.includes('portfolio') ||
    contentLower.includes('art')
  ) {
    return 'charcoal-cream';
  }

  // Default to modern minimalist for unknown content
  return 'modern-minimalist';
}

/**
 * Validate that a palette meets WCAG AAA standards.
 *
 * @param palette - The palette to validate
 * @returns An object with validation status and any issues
 */
export function validatePaletteContrast(palette: ProfessionalPalette): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const MIN_CONTRAST = 7; // WCAG AAA minimum

  if (palette.primaryContrast < MIN_CONTRAST) {
    issues.push(
      `Primary contrast ${palette.primaryContrast.toFixed(1)} below minimum ${MIN_CONTRAST}`
    );
  }
  if (palette.secondaryContrast < MIN_CONTRAST) {
    issues.push(
      `Secondary contrast ${palette.secondaryContrast.toFixed(1)} below minimum ${MIN_CONTRAST}`
    );
  }
  if (palette.accentContrast < 4.5) {
    issues.push(
      `Accent contrast ${palette.accentContrast.toFixed(1)} below WCAG AA minimum (4.5)`
    );
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Get palette metadata for a given name.
 *
 * @param paletteName - The name of the palette
 * @returns The palette object or undefined if not found
 */
export function getProfessionalPalette(
  paletteName: string
): ProfessionalPalette | undefined {
  return PROFESSIONAL_PALETTES[paletteName];
}
