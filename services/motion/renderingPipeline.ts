/**
 * Professional Rendering Pipeline
 *
 * Validates and filters templates through a comprehensive quality pipeline:
 * 1. Palette Selection - Choose professional palette based on content
 * 2. Quality Filtering - Only use templates with quality score >= 8
 * 3. Text Validation - Ensure all text meets professional standards
 * 4. Size Validation - Check all sizes meet responsive standards
 * 5. Contrast Validation - Verify 4.5:1+ contrast for all text
 */

import {
  selectPaletteForContent,
  getProfessionalPalette,
  validatePaletteContrast,
  PROFESSIONAL_PALETTES,
} from './professionalPalettes';
import {
  getTierSize,
  validateSizingTier,
  SIZING_STANDARDS,
  getLineHeightMultiplier,
  getLetterSpacing,
} from './sizingStandards';
import {
  validateTextRendering,
  getContrastRatio,
  getWCAGLevel,
  getReadabilityScore,
} from './textValidation';
import type { PaletteColors } from './palettes';
import type { PremiumTextStyle } from './premiumTextStyle';
import type { PrimitiveType, Palette } from '../motionGraphicsService';
import { QUALITY_SCORES } from './qualityScoring';

export interface RenderingPipelineConfig {
  contentType: string;
  aspectRatio: number; // width / height
  minQualityScore: number; // Minimum template quality (0-10)
  enforceContrast: boolean; // Require WCAG AAA (7:1)
  fontSize?: number;
}

export interface PipelineValidation {
  isValid: boolean;
  palette: string;
  paletteData: typeof PROFESSIONAL_PALETTES[keyof typeof PROFESSIONAL_PALETTES];
  issues: ValidationError[];
  warnings: ValidationWarning[];
  score: number; // 0-100
}

export interface ValidationError {
  severity: 'critical' | 'error' | 'warning';
  message: string;
  category: 'palette' | 'contrast' | 'size' | 'font' | 'text' | 'quality';
  affectedPrimitive?: PrimitiveType;
}

export interface ValidationWarning {
  message: string;
  suggestion: string;
  category: string;
}

/**
 * Run the full professional rendering pipeline.
 *
 * @param config - Pipeline configuration
 * @returns Validation result with palette and issues
 */
export function runRenderingPipeline(
  config: RenderingPipelineConfig
): PipelineValidation {
  const issues: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let score = 100;

  // Step 1: Select professional palette based on content type
  const paletteName = selectPaletteForContent(config.contentType);
  const paletteData = getProfessionalPalette(paletteName);

  if (!paletteData) {
    issues.push({
      severity: 'critical',
      message: `Could not find professional palette for content type: ${config.contentType}`,
      category: 'palette',
    });
    return {
      isValid: false,
      palette: 'modern-minimalist',
      paletteData: PROFESSIONAL_PALETTES['modern-minimalist'],
      issues,
      warnings,
      score: 0,
    };
  }

  // Step 2: Validate palette meets contrast standards
  const paletteValidation = validatePaletteContrast(paletteData);
  if (!paletteValidation.isValid) {
    issues.push({
      severity: 'warning',
      message: `Palette "${paletteName}" has contrast issues: ${paletteValidation.issues.join('; ')}`,
      category: 'contrast',
    });
    score -= 15;
  } else {
    // Bonus for excellent palette
    if (paletteData.primaryContrast >= 10) {
      score += 5;
    }
  }

  // Step 3: Validate text rendering
  const testFontSize = config.fontSize || SIZING_STANDARDS.body.recommended;
  const textValidation = validateTextRendering(
    paletteData.primary,
    paletteData.bg,
    testFontSize
  );

  if (!textValidation.isValid) {
    issues.push({
      severity: 'error',
      message: `Text rendering fails minimum accessibility: ${textValidation.issues.map((i) => i.message).join('; ')}`,
      category: 'text',
    });
    score -= 20;
  } else {
    score += textValidation.score / 100 * 10;
  }

  // Step 4: Validate sizing standards
  for (const [tierName, tier] of Object.entries(SIZING_STANDARDS)) {
    const tierValidation = validateSizingTier(tier);
    if (!tierValidation.isValid) {
      warnings.push({
        message: `Sizing tier "${tierName}" has issues`,
        suggestion: `Review and fix: ${tierValidation.issues.join('; ')}`,
        category: 'size',
      });
      score -= 2;
    }
  }

  // Step 5: Filter templates by quality score
  const filteredTemplates = filterTemplatesByQuality(config.minQualityScore);
  if (filteredTemplates.length === 0) {
    issues.push({
      severity: 'warning',
      message: `No templates available with quality score >= ${config.minQualityScore}`,
      category: 'quality',
    });
    score -= 30;
  }

  // Step 6: Validate contrast for all text colors in palette
  const primaryContrast = getContrastRatio(paletteData.primary, paletteData.bg);
  const secondaryContrast = getContrastRatio(paletteData.secondary, paletteData.bg);
  const accentContrast = getContrastRatio(paletteData.accent, paletteData.bg);

  const minRequiredContrast = config.enforceContrast ? 7 : 4.5;

  if (primaryContrast < minRequiredContrast) {
    issues.push({
      severity: 'error',
      message: `Primary text contrast ${primaryContrast.toFixed(2)}:1 below required ${minRequiredContrast}:1 (${getWCAGLevel(primaryContrast)})`,
      category: 'contrast',
    });
    score -= 25;
  }

  if (secondaryContrast < minRequiredContrast) {
    warnings.push({
      message: `Secondary text contrast ${secondaryContrast.toFixed(2)}:1 is weak`,
      suggestion: `Increase contrast to at least ${minRequiredContrast}:1 for better readability`,
      category: 'contrast',
    });
    score -= 10;
  }

  if (accentContrast < 4.5) {
    warnings.push({
      message: `Accent color contrast ${accentContrast.toFixed(2)}:1 is below WCAG AA`,
      suggestion: `Use accent colors primarily for highlights, not body text`,
      category: 'contrast',
    });
    score -= 5;
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  return {
    isValid: issues.filter((i) => i.severity === 'critical').length === 0,
    palette: paletteName,
    paletteData,
    issues,
    warnings,
    score,
  };
}

/**
 * Filter templates by minimum quality score.
 *
 * @param minScore - Minimum quality score (0-10)
 * @returns Array of primitive types that meet the minimum score
 */
export function filterTemplatesByQuality(minScore: number): PrimitiveType[] {
  return Object.entries(QUALITY_SCORES)
    .filter(([, scoreData]) => scoreData.overallScore >= minScore)
    .map(([type]) => type as PrimitiveType);
}

/**
 * Get quality-filtered templates by content category.
 *
 * @param contentType - Type of content
 * @param minScore - Minimum quality score
 * @returns Filtered templates best for this content type
 */
export function getRecommendedTemplates(
  contentType: string,
  minScore: number = 8
): PrimitiveType[] {
  const filtered = filterTemplatesByQuality(minScore);

  // Content-specific filtering
  const contentLower = contentType.toLowerCase();

  // Creator content prefers high-energy, modern templates
  if (contentLower.includes('creator') || contentLower.includes('music')) {
    return filtered.filter((t) =>
      [
        'aurora-text',
        'shimmer-text',
        'kinetic-text',
        'confetti',
        'wave-text',
        'neon-sign',
        'animated-emoji-button',
        'bento-grid',
        'device-tilt-3d',
        'cursor-click-ui',
      ].includes(t)
    );
  }

  // Corporate/B2B prefers clean, professional templates
  if (contentLower.includes('corporate') || contentLower.includes('enterprise')) {
    return filtered.filter((t) =>
      [
        'big-text-reveal',
        'lower-third',
        'bar-reveal',
        'bullet-list-reveal',
        'code-terminal-ui',
        'pricing-table',
        'metrics-dashboard',
        'ai-search-bar',
      ].includes(t)
    );
  }

  // Cinematic prefers 3D and premium effects
  if (contentLower.includes('cinema') || contentLower.includes('film')) {
    return filtered.filter((t) =>
      [
        'camera-cinematic',
        'text-3d',
        'scene-3d',
        'camera-zoom-3d',
        'before-after-reveal',
        'cinematic-title-opener',
        'glass-panel',
      ].includes(t)
    );
  }

  return filtered;
}

/**
 * Generate recommended text style for palette and context.
 *
 * @param palette - The professional palette
 * @param context - Text context ('title', 'body', 'caption')
 * @returns Recommended PremiumTextStyle
 */
export function getRecommendedTextStyle(
  palette: typeof PROFESSIONAL_PALETTES[keyof typeof PROFESSIONAL_PALETTES],
  context: 'title' | 'body' | 'caption' = 'body'
): PremiumTextStyle {
  const fontSizeMap = {
    title: SIZING_STANDARDS.title.recommended,
    body: SIZING_STANDARDS.body.recommended,
    caption: SIZING_STANDARDS.caption.recommended,
  };

  const fontSize = fontSizeMap[context];
  const lineHeight = getLineHeightMultiplier(fontSize);
  const letterSpacing = getLetterSpacing(fontSize, 600);

  const style: PremiumTextStyle = {
    fontFamily: "'Space Grotesk', 'Inter', 'Segoe UI', Arial, sans-serif",
    fontSize,
    fontWeight: context === 'title' ? 900 : context === 'body' ? 400 : 400,
    letterSpacing,
    lineHeight,
    color: palette.primary,
    shadowColor: `rgba(0, 0, 0, 0.2)`,
    shadowBlur: context === 'title' ? 3 : 2,
    shadowOffsetX: 1,
    shadowOffsetY: 2,
    glowColor: palette.accent,
    glowBlur: 8,
    glowOpacity: 0.3,
  };

  return style;
}

/**
 * Generate a comprehensive quality report for the rendering pipeline.
 *
 * @param validation - The validation result from runRenderingPipeline
 * @returns Human-readable report
 */
export function generateQualityReport(validation: PipelineValidation): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('PROFESSIONAL RENDERING PIPELINE REPORT');
  lines.push('='.repeat(60));
  lines.push('');

  // Overall status
  lines.push(`Status: ${validation.isValid ? 'VALID' : 'INVALID'}`);
  lines.push(`Quality Score: ${validation.score}/100`);
  lines.push('');

  // Palette info
  lines.push('PALETTE SELECTION');
  lines.push(`Selected: "${validation.palette}"`);
  lines.push(`Description: ${validation.paletteData.description}`);
  lines.push(`Best for: ${validation.paletteData.bestFor.join(', ')}`);
  lines.push(`Primary Contrast: ${validation.paletteData.primaryContrast.toFixed(1)}:1`);
  lines.push(`Secondary Contrast: ${validation.paletteData.secondaryContrast.toFixed(1)}:1`);
  lines.push('');

  // Issues
  if (validation.issues.length > 0) {
    lines.push('ISSUES');
    validation.issues.forEach((issue) => {
      lines.push(
        `[${issue.severity.toUpperCase()}] ${issue.message}`
      );
    });
    lines.push('');
  }

  // Warnings
  if (validation.warnings.length > 0) {
    lines.push('WARNINGS');
    validation.warnings.forEach((warning) => {
      lines.push(`• ${warning.message}`);
      lines.push(`  Suggestion: ${warning.suggestion}`);
    });
    lines.push('');
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}
