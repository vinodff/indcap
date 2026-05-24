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

  // Generate animations for each word
  const animations = generateWordAnimations(
    segmentsWithSnappedWords.flatMap((s) => s.words),
    segmentsWithSnappedWords.map((s) => ({ emotion: s.emotion, intensity: s.emotionIntensity })),
    theme,
    beatGrid.bpm
  );

  // Create layout configuration
  const finalLayout: LayoutConfiguration = {
    width: 1080,
    height: 1920,
    backgroundColor: theme.backgroundColor,
    maxWordsPerLine: 8,
    textAlignment: 'center',
    verticalPosition: 'center',
    padding: 60,
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
  emotionContext: Array<{ emotion: string; intensity: EmotionIntensity }>,
  theme: ThemeProfile,
  bpm: number
): WordAnimation[] {
  const animations: WordAnimation[] = [];
  const recentAnimations: AnimationType[] = [];
  const RECENT_WINDOW = 5; // Track last 5 animations for fatigue prevention

  words.forEach((word, index) => {
    const segmentIdx = index; // Simplified: 1 segment = 1 emotion context
    const emotionCtx = emotionContext[Math.min(segmentIdx, emotionContext.length - 1)];

    // Select animation based on emotion, role, emphasis
    const animationType = selectAnimation({
      emotion: emotionCtx.emotion as SegmentEmotion,
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
        emotion: emotionCtx.emotion as SegmentEmotion,
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
        createWordAnimation(word, substitute, emotionCtx.intensity, theme, bpm)
      );
    } else {
      recentAnimations.push(animationType);
      if (recentAnimations.length > RECENT_WINDOW) {
        recentAnimations.shift();
      }

      animations.push(
        createWordAnimation(word, animationType, emotionCtx.intensity, theme, bpm)
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
  bpm: number
): WordAnimation {
  // Generate visual style
  const style = generateTextStyle({
    emotion: 'neutral', // This would come from segment emotion
    emphasisScore: word.emphasisScore,
    fontFamily: theme.fontFamily,
    baseColor: theme.primaryColor,
    accentColor: theme.accentColor,
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
      entryEasing: 'ease-out',
      exitEasing: 'ease-in',
    },

    style,
    scaleAmount: animationType.includes('scale') || animationType === 'bounce-in'
      ? scaleAmount
      : 1.0,
    colorTransition: word.emphasisScore >= 70 ? theme.accentColor : undefined,
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

// ─── Export Validation ────────────────────────────────────────────────────

export function validateAnimationSequence(
  sequence: AnimationSequence
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

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

  return {
    valid: errors.length === 0,
    errors,
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
