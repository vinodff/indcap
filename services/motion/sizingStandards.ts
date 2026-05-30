/**
 * Professional Sizing Standards
 *
 * Responsive sizing scales for different content types.
 * All sizes respect mobile-first principles (minimum 16px for text).
 *
 * Sizing tiers:
 * - min: Minimum readable size (mobile/16:9 landscape)
 * - recommended: Sweet spot for most content (9:16 portrait)
 * - max: Maximum size before breaking (ultrawide, very large displays)
 */

export interface SizingTier {
  min: number;
  recommended: number;
  max: number;
}

export const SIZING_STANDARDS: Record<string, SizingTier> = {
  // Headlines and main titles
  'title': {
    min: 48,
    recommended: 64,
    max: 96,
  },

  // Secondary headings and section titles
  'subtitle': {
    min: 32,
    recommended: 44,
    max: 64,
  },

  // Body text, primary content
  'body': {
    min: 16,
    recommended: 24,
    max: 36,
  },

  // Fine print, captions, metadata
  'caption': {
    min: 12,
    recommended: 16,
    max: 24,
  },

  // Icon sizes
  'icon': {
    min: 24,
    recommended: 40,
    max: 80,
  },

  // Small icon (secondary icons, bullets)
  'icon-small': {
    min: 16,
    recommended: 24,
    max: 40,
  },

  // Large icon (decorative, background)
  'icon-large': {
    min: 80,
    recommended: 120,
    max: 200,
  },
};

/**
 * Get a responsive size based on aspect ratio and constraints.
 *
 * Scales font sizes proportionally for different aspect ratios.
 * 9:16 (0.5625) is the reference point for mobile portrait.
 * 16:9 (1.778) scales up, other ratios scale proportionally.
 *
 * @param aspectRatio - width / height (e.g., 0.5625 for 9:16, 1.778 for 16:9)
 * @param baseSize - Base size to scale from (typically from SIZING_STANDARDS)
 * @param minSize - Minimum allowed size
 * @param maxSize - Maximum allowed size
 * @returns The responsive size, clamped to min/max
 *
 * @example
 * // For a 16:9 title (base 64px, min 48, max 96)
 * const size = getResponsiveSize(16/9, 64, 48, 96); // ~76px
 *
 * @example
 * // For a 9:16 body text (base 24px, min 16, max 36)
 * const size = getResponsiveSize(9/16, 24, 16, 36); // 24px (reference)
 */
export function getResponsiveSize(
  aspectRatio: number,
  baseSize: number,
  minSize: number,
  maxSize: number
): number {
  // Reference aspect ratio: 9:16 portrait (0.5625)
  const REFERENCE_ASPECT = 9 / 16;

  // Aspect ratio scale factor (constrained to a reasonable range)
  const scale = Math.min(2, Math.max(0.5, aspectRatio / REFERENCE_ASPECT));

  // Apply scaling with easing curve (logarithmic for smoother progression)
  const scaledSize = baseSize * Math.pow(scale, 0.45);

  // Clamp to min/max
  return Math.max(minSize, Math.min(maxSize, scaledSize));
}

/**
 * Get the recommended size tier for a given aspect ratio.
 *
 * @param aspectRatio - width / height
 * @returns 'min', 'recommended', or 'max'
 */
export function getSizeCategory(aspectRatio: number): 'min' | 'recommended' | 'max' {
  const REFERENCE_ASPECT = 9 / 16; // 0.5625
  const LANDSCAPE_THRESHOLD = 1.2; // 6:5 or wider
  const PORTRAIT_THRESHOLD = 0.85; // 5:6 or taller

  if (aspectRatio > LANDSCAPE_THRESHOLD) {
    // Wide landscape: use max sizes
    return 'max';
  } else if (aspectRatio < PORTRAIT_THRESHOLD) {
    // Tall portrait: use min sizes
    return 'min';
  }
  // Standard 9:16 or close: use recommended
  return 'recommended';
}

/**
 * Get a size from a tier, scaled for the current aspect ratio.
 *
 * @param tier - The sizing tier (e.g., 'title', 'body')
 * @param aspectRatio - width / height
 * @returns The size to use
 *
 * @example
 * const titleSize = getTierSize('title', 1.778); // 16:9 wide
 */
export function getTierSize(tier: string, aspectRatio: number): number {
  const sizing = SIZING_STANDARDS[tier];
  if (!sizing) {
    console.warn(`Unknown sizing tier: ${tier}`);
    return 24; // fallback
  }

  const category = getSizeCategory(aspectRatio);
  const baseSize = sizing[category];

  return getResponsiveSize(aspectRatio, baseSize, sizing.min, sizing.max);
}

/**
 * Validate that all sizes in a sizing tier meet minimum standards.
 *
 * @param tier - The sizing tier to validate
 * @returns { isValid, issues }
 */
export function validateSizingTier(tier: SizingTier): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (tier.min < 12) {
    issues.push(`Minimum size ${tier.min}px is below 12px accessibility minimum`);
  }
  if (tier.recommended < tier.min) {
    issues.push(`Recommended size ${tier.recommended}px is less than minimum ${tier.min}px`);
  }
  if (tier.max < tier.recommended) {
    issues.push(`Maximum size ${tier.max}px is less than recommended ${tier.recommended}px`);
  }
  if (tier.max > 200) {
    issues.push(`Maximum size ${tier.max}px seems excessive`);
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Calculate line height multiplier based on font size.
 *
 * Larger text typically needs proportionally less line height.
 * Small text benefits from more breathing room.
 *
 * @param fontSize - Font size in pixels
 * @returns Line height multiplier (e.g., 1.5)
 *
 * @example
 * const lineHeight = getLineHeightMultiplier(24); // 1.4
 * ctx.lineHeight = fontSize * lineHeight; // 33.6px
 */
export function getLineHeightMultiplier(fontSize: number): number {
  // For sizes < 24px, use 1.6; scale down to 1.2 for large sizes
  if (fontSize < 24) return 1.6;
  if (fontSize > 64) return 1.2;
  // Linear interpolation between 24 and 64px
  return 1.6 - ((fontSize - 24) / (64 - 24)) * 0.4;
}

/**
 * Calculate letter spacing based on font size and weight.
 *
 * Larger and heavier text can handle tighter letter spacing.
 * Smaller and lighter text needs more breathing room.
 *
 * @param fontSize - Font size in pixels
 * @param fontWeight - Font weight (400, 600, 700, 900)
 * @returns Letter spacing in pixels (can be negative)
 *
 * @example
 * const spacing = getLetterSpacing(64, 700); // -0.5px
 * const spacing = getLetterSpacing(16, 400); // 0.2px
 */
export function getLetterSpacing(fontSize: number, fontWeight: number): number {
  // Base letter spacing is inversely proportional to size
  let spacing = Math.max(-1, -fontSize * 0.01);

  // Adjust based on weight (heavier = tighter)
  const weightFactor = (fontWeight - 400) / 500; // 0 for 400, 1 for 900
  spacing -= weightFactor * 0.3;

  return spacing;
}
