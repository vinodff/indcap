/**
 * Text Validation and Quality Assurance
 *
 * Validates text rendering against professional standards:
 * - Contrast ratios (WCAG AAA)
 * - Font sizes (responsive, accessible)
 * - Spacing (letter spacing, line height)
 * - Readability metrics
 */

import type { PaletteColors } from './palettes';
import type { PremiumTextStyle } from './premiumTextStyle';

export interface TextValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  aspect: string; // 'contrast', 'size', 'spacing', 'font', 'readability'
}

export interface ValidationWarning {
  message: string;
  suggestion: string;
}

/**
 * Calculate WCAG contrast ratio between two colors.
 *
 * @param color1 - Hex color (e.g., '#FFFFFF')
 * @param color2 - Hex color (e.g., '#000000')
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Get the relative luminance of a color for contrast calculations.
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 *
 * @param hex - Hex color string (e.g., '#FFFFFF')
 * @returns Relative luminance (0-1)
 */
function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Convert hex color to RGB.
 *
 * @param hex - Hex color (e.g., '#FFFFFF' or 'FFFFFF')
 * @returns { r, g, b } or null if invalid
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return null;

  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

/**
 * Validate text rendering against professional standards.
 *
 * @param textColor - Text color (hex)
 * @param bgColor - Background color (hex)
 * @param fontSize - Font size in pixels
 * @param style - Optional PremiumTextStyle for additional checks
 * @returns Validation result with score and issues
 */
export function validateTextRendering(
  textColor: string,
  bgColor: string,
  fontSize: number,
  style?: PremiumTextStyle
): TextValidationResult {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationWarning[] = [];
  let score = 100;

  // Contrast validation
  const contrastRatio = getContrastRatio(textColor, bgColor);
  const minContrastWCAGAAA = 7;
  const minContrastWCAGAA = 4.5;

  if (contrastRatio < minContrastWCAGAA) {
    issues.push({
      severity: 'error',
      message: `Contrast ratio ${contrastRatio.toFixed(2)}:1 fails WCAG AA (minimum 4.5:1)`,
      aspect: 'contrast',
    });
    score -= 30;
  } else if (contrastRatio < minContrastWCAGAAA) {
    issues.push({
      severity: 'warning',
      message: `Contrast ratio ${contrastRatio.toFixed(2)}:1 fails WCAG AAA (minimum 7:1)`,
      aspect: 'contrast',
    });
    score -= 10;
  } else {
    // Bonus for excellent contrast
    if (contrastRatio >= 10) {
      score += 5;
    }
  }

  // Font size validation
  if (fontSize < 12) {
    issues.push({
      severity: 'error',
      message: `Font size ${fontSize}px is below 12px minimum for accessibility`,
      aspect: 'size',
    });
    score -= 20;
  } else if (fontSize < 16) {
    warnings.push({
      message: `Font size ${fontSize}px is small`,
      suggestion: `Consider using at least 16px for body text`,
    });
    score -= 5;
  }

  // Additional style validation
  if (style) {
    // Line height validation
    if (style.lineHeight < 1.2) {
      warnings.push({
        message: `Line height ${style.lineHeight}x is tight`,
        suggestion: `Use 1.2-1.6x for better readability`,
      });
      score -= 5;
    }

    // Font weight validation
    if (style.fontWeight < 400) {
      issues.push({
        severity: 'warning',
        message: `Font weight ${style.fontWeight} is very thin`,
        aspect: 'font',
      });
      score -= 10;
    }

    // Letter spacing validation
    if (Math.abs(style.letterSpacing) > 2) {
      warnings.push({
        message: `Letter spacing ${style.letterSpacing}px is very large`,
        suggestion: `Consider reducing to -0.5px to 1px for better readability`,
      });
      score -= 3;
    }
  }

  // Readability score
  if (fontSize >= 16 && fontSize <= 32) {
    score += 5; // Ideal size for body text
  }

  score = Math.max(0, Math.min(100, score));

  return {
    isValid: issues.filter((i) => i.severity === 'error').length === 0,
    score,
    issues,
    warnings,
  };
}

/**
 * Validate a palette's text contrast against professional standards.
 *
 * @param palette - The palette to validate
 * @param fontSize - Font size for testing
 * @returns Validation results for each color combination
 */
export function validatePaletteForText(palette: PaletteColors, fontSize: number = 24): {
  primary: TextValidationResult;
  secondary: TextValidationResult;
  accent: TextValidationResult;
  allValid: boolean;
  score: number;
} {
  const primary = validateTextRendering(palette.primary, palette.bg, fontSize);
  const secondary = validateTextRendering(palette.secondary, palette.bg, fontSize);
  const accent = validateTextRendering(palette.accent, palette.bg, fontSize);

  const avgScore = (primary.score + secondary.score + accent.score) / 3;

  return {
    primary,
    secondary,
    accent,
    allValid: primary.isValid && secondary.isValid && accent.isValid,
    score: avgScore,
  };
}

/**
 * Get WCAG level achieved by a contrast ratio.
 *
 * @param contrastRatio - The contrast ratio (e.g., 7.5)
 * @returns 'AAA', 'AA', or 'FAIL'
 */
export function getWCAGLevel(contrastRatio: number): 'AAA' | 'AA' | 'FAIL' {
  if (contrastRatio >= 7) return 'AAA';
  if (contrastRatio >= 4.5) return 'AA';
  return 'FAIL';
}

/**
 * Check if text size is appropriate for the given context.
 *
 * @param fontSize - Font size in pixels
 * @param context - Context type ('title', 'body', 'caption')
 * @returns { isValid, issues, suggestions }
 */
export function validateFontSizeForContext(
  fontSize: number,
  context: 'title' | 'body' | 'caption'
): {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];

  const ranges: Record<string, { min: number; recommended: number; max: number }> = {
    title: { min: 32, recommended: 48, max: 96 },
    body: { min: 12, recommended: 16, max: 32 },
    caption: { min: 10, recommended: 12, max: 20 },
  };

  const range = ranges[context];

  if (fontSize < range.min) {
    issues.push(`Font size ${fontSize}px is below minimum ${range.min}px for ${context}`);
  } else if (fontSize < range.recommended) {
    suggestions.push(
      `Consider increasing to ${range.recommended}px (recommended) from ${fontSize}px`
    );
  } else if (fontSize > range.max) {
    issues.push(`Font size ${fontSize}px exceeds maximum ${range.max}px for ${context}`);
  } else if (fontSize > range.recommended) {
    suggestions.push(
      `Consider reducing to ${range.recommended}px (recommended) from ${fontSize}px`
    );
  }

  return {
    isValid: issues.length === 0,
    issues,
    suggestions,
  };
}

/**
 * Get a readability score for text (0-100).
 *
 * Scores based on:
 * - Contrast (30%)
 * - Font size (20%)
 * - Line height (15%)
 * - Letter spacing (10%)
 * - Font weight (15%)
 * - Font family (10%)
 *
 * @param style - The text style to evaluate
 * @param bgColor - Background color
 * @returns Readability score (0-100)
 */
export function getReadabilityScore(style: PremiumTextStyle, bgColor: string): number {
  let score = 0;

  // Contrast (30%)
  const contrast = getContrastRatio(style.color, bgColor);
  if (contrast >= 7) score += 30;
  else if (contrast >= 4.5) score += 25;
  else score += Math.max(0, (contrast / 4.5) * 20);

  // Font size (20%)
  if (style.fontSize >= 16 && style.fontSize <= 32) {
    score += 20;
  } else if (style.fontSize >= 12 && style.fontSize <= 40) {
    score += 15;
  } else {
    score += Math.max(0, 10);
  }

  // Line height (15%)
  if (style.lineHeight >= 1.4 && style.lineHeight <= 1.6) {
    score += 15;
  } else if (style.lineHeight >= 1.2 && style.lineHeight <= 1.8) {
    score += 12;
  } else {
    score += 8;
  }

  // Letter spacing (10%)
  if (style.letterSpacing >= -0.5 && style.letterSpacing <= 1) {
    score += 10;
  } else {
    score += Math.max(0, 5);
  }

  // Font weight (15%)
  if (style.fontWeight >= 400 && style.fontWeight <= 700) {
    score += 15;
  } else {
    score += 10;
  }

  // Font family (10%)
  const goodFamilies = ['Inter', 'Space Grotesk', 'Playfair', 'Arial', 'sans-serif'];
  if (goodFamilies.some((f) => style.fontFamily.includes(f))) {
    score += 10;
  } else {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}
