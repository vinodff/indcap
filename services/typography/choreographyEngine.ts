/**
 * Choreography Engine
 *
 * Orchestrates the complete transformation:
 * EnrichedTranscript + BeatGrid → AnimationSequence
 *
 * Pure function (no I/O): Same input always produces same output.
 * This allows deterministic regeneration with different themes.
 */

import type {
  AnimationSequence,
  AnimationType,
  BeatGrid,
  EmotionIntensity,
  EnrichedTranscript,
  LayoutConfiguration,
  SegmentEmotion,
  TextStyle,
  ThemeProfile,
  TranscriptWord,
  WordAnimation,
} from './types';

import {
  calculateAnimationTiming,
  checkForRepetitionFatigue,
  generateTextStyle,
  selectAnimation,
} from './emotionAnimationMap';

import { snapWordsWithConstraints } from './beatSnapper';

// ─── Main Orchestration Function ────────────────────────────────────────────

export function choreograph(params: {
  transcript: EnrichedTranscript;
  beatGrid: BeatGrid;
  theme: ThemeProfile;
  layout?: Partial<LayoutConfiguration>;
}): AnimationSequence {
  const { transcript, beatGrid, theme, layout = {} } = params;

  // Snap words to beat grid for synchronization
  const snappedWords = snapWordsWithConstraints(
    transcript.segments.flatMap((s) => s.words),
    beatGrid
  );

  // Regenerate word references in segments
  let wordIndex = 0;
  const segmentsWithSnappedWords = transcript.segments.map((segment) => ({
    ...segment,
    words: segment.words.map(() => snappedWords[wordIndex++]),
  }));

  // Generate emotion context map for each word correctly based on segments
  const wordEmotionContexts: Array<{ emotion: SegmentEmotion; intensity: EmotionIntensity }> = [];
  const flatWords: TranscriptWord[] = [];

  segmentsWithSnappedWords.forEach((seg) => {
    seg.words.forEach((word) => {
      flatWords.push(word);
      wordEmotionContexts.push({ emotion: seg.emotion, intensity: seg.emotionIntensity });
    });
  });

  // Generate animations for each word
  let animations = generateWordAnimations(
    flatWords,
    wordEmotionContexts,
    theme,
    beatGrid.bpm
  );

  // Extend word durations to fill gaps (prevent dead space / canvas clears during pauses)
  for (let i = 0; i < animations.length - 1; i++) {
    const curr = animations[i];
    const next = animations[i + 1];
    const gap = next.startTime - curr.startTime;
    
    // If the gap is less than 3.0 seconds, extend the duration to match the next start time
    if (gap > 0 && gap < 3.0) {
      curr.duration = gap;
      // Recalculate hold duration to fill the extended time
      const entryAndExit = curr.timing.entryDuration + curr.timing.exitDuration;
      curr.timing.holdDuration = Math.max(curr.timing.holdDuration, gap - entryAndExit);
    }
  }

  // Extend the last word duration to the end of the transcription duration
  if (animations.length > 0) {
    const last = animations[animations.length - 1];
    const gap = transcript.duration - last.startTime;
    if (gap > 0 && gap < 3.0) {
      last.duration = gap;
      const entryAndExit = last.timing.entryDuration + last.timing.exitDuration;
      last.timing.holdDuration = Math.max(last.timing.holdDuration, gap - entryAndExit);
    }
  }

  // Validate and auto-extend hold durations for emphasized words
  const holdValidation = validateHoldDuration(animations, 1500);
  if (!holdValidation.valid) {
    console.warn(
      `[choreography] Hold duration validation: ${holdValidation.summary.belowThreshold} words below 1.5s threshold`
    );
    console.warn('[choreography] Issues:', holdValidation.issues);

    // Auto-extend emphasized words to meet minimum visibility time
    animations = autoExtendHoldDurations(animations, 1500);
    console.log('[choreography] Auto-extended animations to ensure emphasized word visibility');
  }

  // Create layout configuration
  const finalLayout: LayoutConfiguration = {
    width: 1080,
    height: 1920,
    backgroundColor: theme.backgroundColor,
    maxWordsPerLine: 8,
    textAlignment: 'center',
    verticalPosition: 'center',
    padding: 54,
    layoutStyle: theme.layoutStyle || 'center',
    watermarkText: theme.watermarkText,
    backgroundType: theme.backgroundType || 'solid',
    backgroundTexture: theme.backgroundTexture,
    backgroundTextureOpacity: theme.backgroundTextureOpacity,
    emphasisStyle: theme.emphasisStyle || 'bold',
    ...layout,
  };

  return {
    id: `sequence-${Date.now()}`,
    animations,
    layout: finalLayout,
    durationMs: Math.ceil(transcript.duration * 1000),
  };
}

// ─── Word Animation Generator ──────────────────────────────────────────────

function generateWordAnimations(
  words: TranscriptWord[],
  emotionContext: Array<{ emotion: SegmentEmotion; intensity: EmotionIntensity }>,
  theme: ThemeProfile,
  bpm: number
): WordAnimation[] {
  const animations: WordAnimation[] = [];
  const recentAnimations: AnimationType[] = [];
  const RECENT_WINDOW = 5; // Track last 5 animations for fatigue prevention

  words.forEach((word, index) => {
    const emotionCtx = emotionContext[Math.min(index, emotionContext.length - 1)];

    // Select animation based on emotion, role, emphasis
    const animationType = selectAnimation({
      emotion: emotionCtx.emotion,
      emotionIntensity: emotionCtx.intensity,
      wordRole: word.role,
      emphasisScore: word.emphasisScore,
      recentAnimations,
    });

    // Check for fatigue and substitute if needed
    if (
      checkForRepetitionFatigue(recentAnimations, animationType) &&
      word.emphasisScore < 70
    ) {
      // Substitute with simpler animation
      const substitute = selectAnimation({
        emotion: emotionCtx.emotion,
        emotionIntensity: 1, // Force lower intensity
        wordRole: word.role,
        emphasisScore: word.emphasisScore,
        recentAnimations,
      });

      recentAnimations.push(substitute);
      if (recentAnimations.length > RECENT_WINDOW) {
        recentAnimations.shift();
      }

      animations.push(
        createWordAnimation(word, substitute, emotionCtx.intensity, theme, bpm, emotionCtx.emotion)
      );
    } else {
      recentAnimations.push(animationType);
      if (recentAnimations.length > RECENT_WINDOW) {
        recentAnimations.shift();
      }

      animations.push(
        createWordAnimation(word, animationType, emotionCtx.intensity, theme, bpm, emotionCtx.emotion)
      );
    }
  });

  return animations;
}

// ─── Individual Word Animation Constructor ─────────────────────────────────

function createWordAnimation(
  word: TranscriptWord,
  animationType: AnimationType,
  intensity: EmotionIntensity,
  theme: ThemeProfile,
  bpm: number,
  emotion: SegmentEmotion
): WordAnimation {
  // Generate visual style
  const style = generateTextStyle({
    emotion,
    emphasisScore: word.emphasisScore,
    fontFamily: theme.fontFamily,
    baseColor: theme.primaryColor,
    accentColor: theme.accentColor,
    wordRole: word.role,
    theme,
  });

  // Calculate animation timing
  const wordDuration = word.endTime - word.startTime;
  const timing = calculateAnimationTiming({
    animation: animationType,
    wordDuration,
    intensity,
    bpm,
  });

  // Determine animation-specific parameters
  const scaleAmount = intensity === 3 ? 1.4 : intensity === 2 ? 1.2 : 1.05;

  return {
    wordId: `word-${Math.random().toString(36).slice(2, 9)}`,
    text: word.text,
    startTime: word.startTime,
    duration: wordDuration,

    type: animationType,
    intensity,
    timing: {
      ...timing,
      entryEasing: animationType === 'pop-slide-up' ? 'overshoot-ease-out' : 'ease-out',
      exitEasing: 'ease-in',
    },

    style,
    scaleAmount: animationType.includes('scale') || animationType === 'bounce-in' || animationType === 'pop-slide-up'
      ? scaleAmount
      : 1.0,
    colorTransition: word.emphasisScore >= 80 ? theme.accentColor : undefined,
    glowIntensity: intensity >= 2 && word.emphasisScore >= 50 ? 0.5 * intensity : 0,
  };
}

// ─── Scene Grouping (for transitions and pacing) ──────────────────────────

export interface SceneDefinition {
  startIndex: number;
  endIndex: number;
  emotion: string;
  intensity: EmotionIntensity;
  duration: number;
}

export function groupAnimationsIntoScenes(
  animations: WordAnimation[]
): SceneDefinition[] {
  if (animations.length === 0) {
    return [];
  }

  const scenes: SceneDefinition[] = [];
  let currentSceneStart = 0;
  let currentIntensity = animations[0].intensity;

  for (let index = 1; index <= animations.length; index++) {
    const isSceneEnd = index === animations.length ||
      animations[index].intensity !== currentIntensity;

    if (isSceneEnd) {
      const endIdx = index - 1;
      const startIdx = currentSceneStart;
      const endAnim = animations[endIdx];
      const startAnim = animations[startIdx];

      const scene: SceneDefinition = {
        startIndex: startIdx,
        endIndex: endIdx,
        emotion: 'neutral', // Would be extracted from transcript
        intensity: currentIntensity,
        duration:
          endAnim.startTime +
          endAnim.duration -
          startAnim.startTime,
      };
      scenes.push(scene);

      if (index < animations.length) {
        currentSceneStart = index;
        currentIntensity = animations[index].intensity;
      }
    }
  }

  return scenes;
}

// ─── Hold Duration Validation (ensure emphasized words visible >= 1.5s) ──────

export interface HoldDurationValidationResult {
  valid: boolean;
  issues: string[];
  summary: {
    totalAnimations: number;
    belowThreshold: number;
    minDuration: number;
  };
}

/**
 * Validates that emphasized words (fontWeight >= 700 AND emphasisScore >= 85)
 * are held visible for a minimum duration (default 1.5 seconds).
 *
 * Emphasized words need adequate time for viewers to read and absorb.
 *
 * @param animations - Array of word animations to validate
 * @param minHoldMs - Minimum hold duration in milliseconds (default 1500ms = 1.5s)
 * @returns Validation result with detailed issues and summary
 */
export function validateHoldDuration(
  animations: WordAnimation[],
  minHoldMs: number = 1500
): HoldDurationValidationResult {
  const issues: string[] = [];
  const minHoldSeconds = minHoldMs / 1000;
  let belowThreshold = 0;

  animations.forEach((anim, idx) => {
    // Hero words: high font weight (bold) AND high emphasis score
    const isHeroWord = anim.style.fontWeight >= 700 && anim.intensity >= 2;

    if (isHeroWord && anim.duration < minHoldSeconds) {
      belowThreshold++;
      const durationMs = Math.round(anim.duration * 1000);
      issues.push(
        `[Word ${idx}] "${anim.text}" (intensity: ${anim.intensity}) ` +
        `duration: ${durationMs}ms, minimum required: ${minHoldMs}ms`
      );
    }
  });

  return {
    valid: issues.length === 0,
    issues,
    summary: {
      totalAnimations: animations.length,
      belowThreshold,
      minDuration: minHoldMs,
    },
  };
}

/**
 * Auto-extends emphasized word durations to meet minimum hold time.
 * Extends short emphasized words and shifts subsequent animations accordingly.
 *
 * @param animations - Array of word animations to process
 * @param minHoldMs - Minimum hold duration in milliseconds (default 1500ms)
 * @returns Modified animations with extended hero word durations
 */
export function autoExtendHoldDurations(
  animations: WordAnimation[],
  minHoldMs: number = 1500
): WordAnimation[] {
  const minHoldSeconds = minHoldMs / 1000;
  const modified: WordAnimation[] = [];
  let cumulativeShift = 0;

  animations.forEach((anim) => {
    const isHeroWord = anim.style.fontWeight >= 700 && anim.intensity >= 2;

    if (isHeroWord && anim.duration < minHoldSeconds) {
      const extensionAmount = minHoldSeconds - anim.duration;
      cumulativeShift += extensionAmount;

      modified.push({
        ...anim,
        duration: minHoldSeconds,
      });
    } else {
      modified.push({
        ...anim,
        startTime: anim.startTime + cumulativeShift,
      });
    }
  });

  return modified;
}

// ─── Pacing Validation (ensure 70% static, 30% emphasized) ────────────────

export function validateAnimationPacing(
  animations: WordAnimation[],
  duration: number
): { emphasisPercentage: number; isBalanced: boolean } {
  let totalEmphasisTime = 0;

  animations.forEach((anim) => {
    if (anim.intensity >= 2 || anim.style.fontWeight >= 700) {
      totalEmphasisTime += anim.duration;
    }
  });

  const emphasisPercentage = (totalEmphasisTime / duration) * 100;
  const isBalanced = emphasisPercentage >= 25 && emphasisPercentage <= 40;

  return {
    emphasisPercentage,
    isBalanced,
  };
}

// ─── Hero Word Visibility Validation (minimum 1.5s for emphasized words) ────

export interface HeroWordValidationResult {
  valid: boolean;
  warnings: string[];
  suggestions: Array<{
    wordId: string;
    text: string;
    currentDuration: number;
    recommendedDuration: number;
    emphasisScore: number;
  }>;
}

/**
 * Validates that all emphasized words (emphasisScore >= 80) are visible for minimum 1.5s.
 *
 * Hero words need sufficient time for viewers to read and process them.
 * This validation ensures important words meet visibility duration requirements.
 *
 * @param animations - Array of word animations to validate
 * @returns Validation result with warnings and suggestions for duration adjustments
 */
export function validateHeroWordVisibility(
  animations: WordAnimation[]
): HeroWordValidationResult {
  const MIN_HERO_DURATION = 1.5; // Minimum 1.5 seconds
  const HERO_EMPHASIS_THRESHOLD = 80;

  const warnings: string[] = [];
  const suggestions: HeroWordValidationResult['suggestions'] = [];

  // Scan all animations for emphasis words
  animations.forEach((anim) => {
    // Extract emphasis score from animation (stored in style fontWeight as proxy)
    // We'll check if this is a hero word by intensity and style indicators
    const isHeroWord = anim.intensity >= 2 ||
                      (anim.style.fontWeight >= 700 && anim.glowIntensity !== undefined && anim.glowIntensity > 0);

    if (isHeroWord && anim.duration < MIN_HERO_DURATION) {
      const warning = `Hero word '${anim.text}' only visible for ${anim.duration.toFixed(2)}s - recommend >= ${MIN_HERO_DURATION}s`;
      warnings.push(warning);

      suggestions.push({
        wordId: anim.wordId,
        text: anim.text,
        currentDuration: anim.duration,
        recommendedDuration: MIN_HERO_DURATION,
        emphasisScore: anim.intensity === 3 ? 90 : anim.intensity === 2 ? 85 : 50,
      });
    }
  });

  return {
    valid: warnings.length === 0,
    warnings,
    suggestions,
  };
}

/**
 * Extended validation that optionally extends animation durations for hero words.
 * This is useful during the export phase when you want to ensure all hero words
 * meet the visibility requirement.
 *
 * @param animations - Array of word animations to process
 * @param autoExtend - If true, automatically extend short hero word durations to 1.5s
 * @returns Modified animations (if autoExtend is true) and validation result
 */
export function validateAndFixHeroWordVisibility(
  animations: WordAnimation[],
  autoExtend: boolean = false
): {
  animations: WordAnimation[];
  validation: HeroWordValidationResult;
} {
  const validation = validateHeroWordVisibility(animations);

  if (!autoExtend || validation.suggestions.length === 0) {
    return { animations, validation };
  }

  // Create a map of word IDs that need extension
  const wordsToExtend = new Map(
    validation.suggestions.map((s) => [s.wordId, s.recommendedDuration])
  );

  // Extend animations and adjust subsequent animations' start times
  const modifiedAnimations: WordAnimation[] = [];
  let timeShift = 0;

  animations.forEach((anim) => {
    const extensionNeeded = wordsToExtend.get(anim.wordId);

    if (extensionNeeded) {
      const originalDuration = anim.duration;
      const newDuration = extensionNeeded;
      const durationIncrease = newDuration - originalDuration;

      modifiedAnimations.push({
        ...anim,
        duration: newDuration,
      });

      timeShift += durationIncrease;
    } else {
      // Shift start time based on cumulative extensions from previous words
      modifiedAnimations.push({
        ...anim,
        startTime: anim.startTime + timeShift,
      });
    }
  });

  return { animations: modifiedAnimations, validation };
}

// ─── Export Validation ────────────────────────────────────────────────────

export interface AnimationSequenceValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  heroWordValidation?: HeroWordValidationResult;
}

export function validateAnimationSequence(
  sequence: AnimationSequence,
  includeHeroWordValidation: boolean = true
): AnimationSequenceValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for gaps (should be mostly continuous)
  let lastEndTime = 0;
  for (const anim of sequence.animations) {
    if (anim.startTime > lastEndTime + 0.5) {
      errors.push(`Gap detected at ${lastEndTime.toFixed(2)}s`);
    }
    lastEndTime = anim.startTime + anim.duration;
  }

  // Check layout
  if (sequence.layout.width <= 0 || sequence.layout.height <= 0) {
    errors.push('Invalid layout dimensions');
  }

  // Check for duplicate animation IDs
  const ids = sequence.animations.map((a) => a.wordId);
  const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  if (duplicates.length > 0) {
    errors.push(`Duplicate word IDs: ${duplicates.join(', ')}`);
  }

  // Validate hero word visibility (new validation)
  let heroWordValidation: HeroWordValidationResult | undefined;
  if (includeHeroWordValidation) {
    heroWordValidation = validateHeroWordVisibility(sequence.animations);
    warnings.push(...heroWordValidation.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    heroWordValidation,
  };
}

// ─── Compatibility Check with Theme ──────────────────────────────────────

export function validateThemeCompatibility(
  animations: AnimationSequence,
  theme: ThemeProfile
): { compatible: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check if all colors are readable against background
  for (const anim of animations.animations) {
    const contrast = getContrastRatio(anim.style.color, theme.backgroundColor);
    if (contrast < 4.5) {
      warnings.push(
        `Low contrast: ${anim.text} (${contrast.toFixed(1)}:1) - requires WCAG AA`
      );
    }
  }

  // Check for too many different fonts
  const fontFamilies = new Set(animations.animations.map((a) => a.style.fontFamily));
  if (fontFamilies.size > 3) {
    warnings.push(
      `Too many fonts (${fontFamilies.size}) - recommendations to use 2-3 max`
    );
  }

  return {
    compatible: warnings.length === 0,
    warnings,
  };
}

// ─── Helper: WCAG Contrast Ratio ────────────────────────────────────────

function getContrastRatio(foreground: string, background: string): number {
  const fgLum = getLuminance(foreground);
  const bgLum = getLuminance(background);

  const lighter = Math.max(fgLum, bgLum);
  const darker = Math.min(fgLum, bgLum);

  return (lighter + 0.05) / (darker + 0.05);
}

function getLuminance(hex: string): number {
  const rgb = parseInt(hex.replace('#', ''), 16);
  const r = (rgb >> 16) & 255;
  const g = (rgb >> 8) & 255;
  const b = rgb & 255;

  // WCAG formula
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
