/**
 * Emotion-to-Animation Mapper
 *
 * Implements the intelligent decision tree:
 * emotion + role + emphasisScore → AnimationType + intensity + visual style
 *
 * This is the "creative AI" that makes animations feel cinematic and appropriate.
 */

import type {
  AnimationType,
  EmotionIntensity,
  SegmentEmotion,
  TextStyle,
  ThemeProfile,
  WordRole,
} from './types';

// ─── Default Emotion → Animation Mapping ─────────────────────────────────────

export const EMOTION_ANIMATION_MAP: Record<SegmentEmotion, AnimationType[]> = {
  // Intensity increases = more aggressive/active animations
  joy: ['bounce-in', 'scale-up', 'kinetic'],
  shock: ['shake', 'glitch', 'spin'],
  awe: ['fade-in', 'scale-up', 'aurora'],
  anger: ['shake', 'fire', 'scale-pop'],
  sadness: ['fade-in', 'slide-down', 'shimmer'],
  tension: ['typewriter', 'scale-pop', 'glitch'],
  inspiration: ['scale-up', 'fade-in', 'aurora'],
  humor: ['bounce-in', 'wave', 'kinetic'],
  authority: ['fade-in', 'scale-up', 'slide-left'],
  neutral: ['fade-in', 'slide-left', 'slide-up'],
};

// ─── Role-Based Animation Overrides ──────────────────────────────────────────

export const ROLE_ANIMATION_PREFERENCE: Record<WordRole, AnimationType[]> = {
  action: ['bounce-in', 'scale-pop', 'kinetic'],     // Verbs = energetic
  emotion: ['color-flash', 'glow-pulse', 'scale-pop'], // Feeling words = expressive
  subject: ['fade-in', 'slide-left', 'scale-up'],    // Nouns = reveal
  number: ['typewriter', 'scale-pop', 'glow-pulse'], // Stats = precise
  cta: ['bounce-in', 'scale-pop', 'color-flash'],   // CTA = attention-grabbing
  tech: ['glitch', 'typewriter', 'fade-in'],        // Tech = precise/digital
  connector: ['fade-in'],                            // Filler = minimal
};

// ─── Intensity-Based Timing Presets ──────────────────────────────────────────

export const INTENSITY_TIMING_PRESETS = {
  1: {
    // Subtle, gentle
    entryDuration: 0.4,
    holdDuration: 0.8,
    exitDuration: 0.3,
  },
  2: {
    // Normal, balanced
    entryDuration: 0.3,
    holdDuration: 0.6,
    exitDuration: 0.2,
  },
  3: {
    // Strong, punchy
    entryDuration: 0.2,
    holdDuration: 0.4,
    exitDuration: 0.15,
  },
} as const;

// ─── Animation Characteristics (for smart selection) ──────────────────────────

const ANIMATION_CHARACTERISTICS: Record<
  AnimationType,
  {
    intensity: number;        // 1-3 range
    energy: 'low' | 'medium' | 'high';
    duration: number;         // Suggested duration in seconds
    supportedIntensities: EmotionIntensity[];
  }
> = {
  'fade-in': {
    intensity: 1,
    energy: 'low',
    duration: 0.4,
    supportedIntensities: [1, 2, 3],
  },
  'slide-left': {
    intensity: 2,
    energy: 'medium',
    duration: 0.35,
    supportedIntensities: [1, 2, 3],
  },
  'slide-right': {
    intensity: 2,
    energy: 'medium',
    duration: 0.35,
    supportedIntensities: [1, 2, 3],
  },
  'slide-up': {
    intensity: 2,
    energy: 'medium',
    duration: 0.35,
    supportedIntensities: [1, 2, 3],
  },
  'slide-down': {
    intensity: 1,
    energy: 'low',
    duration: 0.4,
    supportedIntensities: [1, 2, 3],
  },
  'scale-up': {
    intensity: 2,
    energy: 'medium',
    duration: 0.35,
    supportedIntensities: [1, 2, 3],
  },
  'typewriter': {
    intensity: 2,
    energy: 'medium',
    duration: 0.5,
    supportedIntensities: [1, 2, 3],
  },
  'bounce-in': {
    intensity: 3,
    energy: 'high',
    duration: 0.4,
    supportedIntensities: [2, 3],
  },
  'rotate-in': {
    intensity: 2,
    energy: 'medium',
    duration: 0.35,
    supportedIntensities: [1, 2, 3],
  },
  'scale-pop': {
    intensity: 3,
    energy: 'high',
    duration: 0.3,
    supportedIntensities: [2, 3],
  },
  'color-flash': {
    intensity: 2,
    energy: 'medium',
    duration: 0.25,
    supportedIntensities: [1, 2, 3],
  },
  'glow-pulse': {
    intensity: 2,
    energy: 'medium',
    duration: 0.3,
    supportedIntensities: [1, 2, 3],
  },
  'shake': {
    intensity: 3,
    energy: 'high',
    duration: 0.25,
    supportedIntensities: [2, 3],
  },
  'spin': {
    intensity: 3,
    energy: 'high',
    duration: 0.4,
    supportedIntensities: [2, 3],
  },
  'blur-in': {
    intensity: 1,
    energy: 'low',
    duration: 0.35,
    supportedIntensities: [1, 2, 3],
  },
  'karaoke': {
    intensity: 2,
    energy: 'medium',
    duration: 0.2,
    supportedIntensities: [1, 2, 3],
  },
  'glitch': {
    intensity: 3,
    energy: 'high',
    duration: 0.25,
    supportedIntensities: [2, 3],
  },
  'aurora': {
    intensity: 2,
    energy: 'medium',
    duration: 0.5,
    supportedIntensities: [1, 2],
  },
  'fire': {
    intensity: 3,
    energy: 'high',
    duration: 0.35,
    supportedIntensities: [2, 3],
  },
  'shimmer': {
    intensity: 1,
    energy: 'low',
    duration: 0.45,
    supportedIntensities: [1, 2],
  },
  'wave': {
    intensity: 2,
    energy: 'medium',
    duration: 0.4,
    supportedIntensities: [1, 2, 3],
  },
  'kinetic': {
    intensity: 3,
    energy: 'high',
    duration: 0.35,
    supportedIntensities: [2, 3],
  },
  'pop-slide-up': {
    intensity: 3,
    energy: 'high',
    duration: 0.35,
    supportedIntensities: [2, 3],
  },
  'whip-pan': {
    intensity: 3,
    energy: 'high',
    duration: 0.3,
    supportedIntensities: [2, 3],
  },
  'mask-reveal': {
    intensity: 2,
    energy: 'medium',
    duration: 0.45,
    supportedIntensities: [1, 2, 3],
  },
};

// ─── Main Decision Engine ────────────────────────────────────────────────────

export function selectAnimation(params: {
  emotion: SegmentEmotion;
  emotionIntensity: EmotionIntensity;
  wordRole: WordRole;
  emphasisScore: number;
  previousAnimation?: AnimationType;
  recentAnimations?: AnimationType[];
}): AnimationType {
  const {
    emotion,
    emotionIntensity,
    wordRole,
    emphasisScore,
    previousAnimation,
    recentAnimations = [],
  } = params;

  // Priority 1: Emphasis score overrides for very high/low emphasis
  if (emphasisScore >= 85 && wordRole === 'cta') {
    return selectHighEmphasisAnimation(recentAnimations);
  }

  if (emphasisScore < 20 && wordRole === 'connector') {
    return 'fade-in'; // Connectors always fade in quietly
  }

  // Priority 2: Role-based selection (most important for semantic correctness)
  if (wordRole === 'action') {
    return selectAnimationFromList(
      ROLE_ANIMATION_PREFERENCE[wordRole],
      emotionIntensity,
      recentAnimations
    );
  }

  if (wordRole === 'cta') {
    return selectAnimationFromList(
      ROLE_ANIMATION_PREFERENCE[wordRole],
      emotionIntensity,
      recentAnimations
    );
  }

  // Priority 3: Emotion-based selection
  const emotionAnimations = EMOTION_ANIMATION_MAP[emotion];
  const selectedByEmotion = selectAnimationFromList(
    emotionAnimations,
    emotionIntensity,
    recentAnimations
  );

  // Priority 4: Fallback to default
  return selectedByEmotion || 'fade-in';
}

// ─── Selection Helpers ───────────────────────────────────────────────────────

/**
 * Choose highest-impact animation for emphasized words (≥85 score)
 */
function selectHighEmphasisAnimation(recent: AnimationType[]): AnimationType {
  const emphasisAnimations: AnimationType[] = [
    'bounce-in',
    'scale-pop',
    'glow-pulse',
    'shake',
    'spin',
    'pop-slide-up',
  ];

  // Avoid repetition
  const available = emphasisAnimations.filter((a) => !recent.includes(a));
  return available[0] || emphasisAnimations[0];
}

/**
 * Select from list of animations, respecting intensity and avoiding recent ones
 */
function selectAnimationFromList(
  animations: AnimationType[],
  intensity: EmotionIntensity,
  recentAnimations: AnimationType[] = []
): AnimationType {
  // Filter by supported intensity
  const supportedByIntensity = animations.filter((anim) => {
    const chars = ANIMATION_CHARACTERISTICS[anim];
    return chars.supportedIntensities.includes(intensity);
  });

  if (supportedByIntensity.length === 0) {
    return animations[0] || 'fade-in';
  }

  // Prefer animations not recently used (avoid fatigue)
  const unused = supportedByIntensity.filter((a) => !recentAnimations.includes(a));

  return unused[0] || supportedByIntensity[0];
}

// ─── Style Application Engine ───────────────────────────────────────────────

export function generateTextStyle(params: {
  emotion: SegmentEmotion;
  emphasisScore: number;
  fontFamily: string;
  baseColor: string;
  accentColor: string;
  wordRole?: WordRole;
  theme?: ThemeProfile;
}): TextStyle {
  const { emotion, emphasisScore, fontFamily, baseColor, accentColor, wordRole, theme } = params;

  const isConnector = wordRole === 'connector';
  const isHeroWord = emphasisScore >= 80 || wordRole === 'cta';
  const isExpressive = wordRole === 'emotion' || wordRole === 'action';

  // Determine correct font family
  let selectedFontFamily = fontFamily;
  if (theme) {
    if (isHeroWord && theme.headlineFontFamily) {
      selectedFontFamily = theme.headlineFontFamily;
    } else if (isConnector && theme.connectiveFontFamily) {
      selectedFontFamily = theme.connectiveFontFamily;
    } else if (isExpressive && theme.expressiveFontFamily) {
      selectedFontFamily = theme.expressiveFontFamily;
    }
  }

  // Determine size & weight hierarchy
  let fontSize = 52;
  let fontWeight = 700;
  let textCase: TextStyle['textCase'] = 'normal';
  let opacity = 1.0;

  if (isHeroWord) {
    fontSize = 145;
    fontWeight = 900;
    textCase = 'uppercase';
  } else if (isConnector) {
    fontSize = 65; // Much larger connector font size (was 36) for legibility
    fontWeight = 500;
    textCase = 'lowercase';
    opacity = 0.85; // Raised opacity (was 0.7) to prevent blending with background
  } else if (isExpressive) {
    fontSize = 95;
    fontWeight = 700;
    textCase = 'capitalize';
  } else {
    fontSize = 115;
    fontWeight = 800;
  }

  // Accent color rules (Apply accent colors exclusively to keywords)
  let color = baseColor;
  let gradientColors: string[] | undefined = undefined;

  if (isHeroWord) {
    color = accentColor;
    if (theme) {
      if (theme.gradients && theme.gradients.length > 0) {
        gradientColors = theme.gradients;
      } else {
        // Fallback premium gradients
        if (emotion === 'shock' || emotion === 'anger') {
          gradientColors = ['#FF3366', '#FF0055', '#FF8C00']; // Electric coral/red-orange
        } else if (emotion === 'joy' || emotion === 'humor') {
          gradientColors = ['#FFE000', '#FF9F0A', '#FFCC00']; // Vibrant gold
        } else if (emotion === 'inspiration' || emotion === 'awe') {
          gradientColors = ['#00F5D4', '#67E8F9', '#A78BFA']; // Neon cyan/purple
        } else if (emotion === 'tension') {
          gradientColors = ['#FFFFFF', '#D1D5DB', '#9CA3AF']; // High-contrast silver/gray
        } else {
          gradientColors = [accentColor, baseColor];
        }
      }

      if (emotion === 'shock' || emotion === 'anger') {
        color = theme.accentColorUrgent || accentColor;
      } else if (emotion === 'joy' || emotion === 'humor') {
        color = theme.accentColorTrendy || accentColor;
      } else if (theme.accentColorInfo) {
        color = theme.accentColorInfo;
      }
    }
  }

  const style: TextStyle = {
    fontFamily: selectedFontFamily,
    fontSize,
    fontWeight,
    letterSpacing: isHeroWord ? 2 : 0,
    color,
    gradientColors,
    opacity,
    textCase,
  };

  // Add contrasting outline stroke border to ensure readability on any background
  if (isHeroWord) {
    style.strokeColor = theme && theme.backgroundColor === '#F5F2EB' ? '#FFFFFF' : '#000000';
    style.strokeWidth = 6; // 6px thick stroke for high readability

    if (emotion === 'awe' || emotion === 'inspiration') {
      style.shadowColor = color;
      style.shadowBlur = 15;
    }
  }

  return style;
}

// ─── Animation Timing Calculation ──────────────────────────────────────────

export function calculateAnimationTiming(params: {
  animation: AnimationType;
  wordDuration: number; // Actual word duration from transcript
  intensity: EmotionIntensity;
  bpm: number;
}): { entryDuration: number; holdDuration: number; exitDuration: number } {
  const { animation, wordDuration, intensity, bpm } = params;

  // Base timing from intensity preset
  let basePreset = INTENSITY_TIMING_PRESETS[intensity];

  // Override if animation has specific requirements
  const animChars = ANIMATION_CHARACTERISTICS[animation];
  if (animChars) {
    const timingScale = Math.max(0.5, Math.min(2, 120 / bpm)); // Slower music = longer animations
    return {
      entryDuration: animChars.duration * 0.6 * timingScale,
      holdDuration: Math.max(0.2, wordDuration * 0.6),
      exitDuration: animChars.duration * 0.2 * timingScale,
    };
  }

  return basePreset;
}

// ─── Fatigue Prevention Helper ──────────────────────────────────────────────

export function checkForRepetitionFatigue(
  recentAnimations: AnimationType[],
  suggestedAnimation: AnimationType
): boolean {
  // If same animation used 2+ times in last 5 words, it's fatiguing
  const recentCount = recentAnimations.filter((a) => a === suggestedAnimation).length;
  return recentCount >= 2;
}
