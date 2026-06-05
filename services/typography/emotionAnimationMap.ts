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

// ─── Background Luminance Helpers ───────────────────────────────────────────

/**
 * Returns true if the hex background color is perceptually "light" (luminance > 0.45).
 * Used to switch between dark-bg neon gradients and light-bg flat solid colors.
 */
function isLightBackground(bgColor: string): boolean {
  const hex = bgColor.replace('#', '');
  if (hex.length !== 6) return false;
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  // WCAG perceptual luminance formula
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45;
}

/**
 * Single source of truth for a sentence's accent color, keyed by emotion + bg.
 * Used by the hero text color AND the icon glow so they always agree — the
 * "best color to tell the sentence" the way a colorist would grade a scene.
 */
export function emotionAccent(emotion: SegmentEmotion, isLightBg: boolean): string {
  if (isLightBg) {
    switch (emotion) {
      case 'shock': case 'anger':       return '#B71C1C'; // deep crimson
      case 'inspiration': case 'awe':   return '#004D40'; // dark teal
      case 'joy': case 'humor':         return '#BF360C'; // burnt orange
      case 'authority':                 return '#1A237E'; // deep indigo
      case 'tension':                   return '#263238'; // charcoal
      default:                          return '#8B0000'; // dark red
    }
  }
  // Dark backgrounds — vivid neon accents
  switch (emotion) {
    case 'shock': case 'anger':       return '#FF1744';
    case 'joy': case 'humor':         return '#FFE000';
    case 'inspiration': case 'awe':   return '#00E5FF';
    case 'authority':                 return '#FFD600';
    case 'sadness':                   return '#CE93D8';
    case 'tension':                   return '#ECEFF1';
    default:                          return '#FFFFFF';
  }
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

  // Strict font dictionary — heavy sans for highlight words, elegant SCRIPT
  // ITALIC for everything else. The "poetic vs. bold" contrast: keywords are
  // blocky Montserrat Black; connectives flow in Playfair Display italic.
  let selectedFontFamily: string;
  let fontStyle: 'normal' | 'italic' = 'normal';
  if (isHeroWord) {
    selectedFontFamily = theme?.headlineFontFamily || 'Montserrat';
    fontStyle = 'normal'; // keywords stay upright and bold
  } else if (isConnector) {
    selectedFontFamily = theme?.connectiveFontFamily || 'Playfair Display';
    fontStyle = 'italic';
  } else if (isExpressive) {
    selectedFontFamily = theme?.expressiveFontFamily || 'Playfair Display';
    fontStyle = 'italic';
  } else {
    // Subject/general words: keep the theme's base font but in italic
    selectedFontFamily = theme?.expressiveFontFamily || fontFamily || 'Playfair Display';
    fontStyle = 'italic';
  }

  // Determine size & weight hierarchy
  let fontSize = 52;
  let fontWeight = 700;
  let textCase: TextStyle['textCase'] = 'normal';
  let opacity = 1.0;

  // ── Controlled scale hierarchy (max ratio ~2.5×) ────────────────────
  // Hero = exactly 150px. Connectors stay ≥60px so they remain readable on
  // a phone. A tight 2.5× ratio gives clear hierarchy without microscopic
  // glue words or billboard-sized keywords.
  // Large, dynamic size hierarchy (1080×1920 base; scales with scaleFactor).
  // Hero 180 / connector 76 ≈ 2.37× contrast. Short hero words get auto-boosted
  // in the renderer (renderText) up to ~230px so punchy words command the frame.
  if (isHeroWord) {
    fontSize = 180;  // Hero base — commands the screen
    fontWeight = 900;
    textCase = 'uppercase';
  } else if (isConnector) {
    fontSize = 96;   // Connector — bumped up; small words were too tiny
    fontWeight = 400;
    textCase = 'lowercase';
    opacity = 0.9;
  } else if (isExpressive) {
    fontSize = 128;  // Action/emotion mid-tier
    fontWeight = 700;
    textCase = 'capitalize';
  } else {
    fontSize = 120;  // Subject/noun
    fontWeight = 800;
  }

  // Strict color dictionary:
  // Non-hero words → #333333 soft dark gray on light backgrounds (poetic, recedes)
  // Hero words → accent / neon gradients (handled below)
  const isLightBg = theme ? isLightBackground(theme.backgroundColor) : false;
  let color = (!isHeroWord && isLightBg) ? '#333333' : baseColor;
  let gradientColors: string[] | undefined = undefined;

  if (isHeroWord) {
    color = accentColor;
    if (theme) {
      if (isLightBg) {
        // ── LIGHT BACKGROUND IDENTITY (cream/white/beige themes) ────────────
        // On light backgrounds, gradients look garish and out-of-place.
        // Use flat, solid, bold colors — high contrast without the neon clashing.
        // This matches the editorial/minimal style the user's reference videos use.
        gradientColors = undefined; // NO gradients on light backgrounds
        if (emotion === 'shock' || emotion === 'anger') {
          color = '#B71C1C'; // Deep crimson — urgency without garish neon
        } else if (emotion === 'inspiration' || emotion === 'awe') {
          color = '#004D40'; // Dark teal — wonder without cyan overkill
        } else if (emotion === 'joy' || emotion === 'humor') {
          color = '#BF360C'; // Burnt orange — warmth without yellowing
        } else if (emotion === 'authority') {
          color = '#1A237E'; // Deep indigo — gravitas
        } else if (emotion === 'tension') {
          color = '#263238'; // Charcoal — suspense in the shadows
        } else {
          color = '#8B0000'; // Strict default: Dark Red — clean authority on light bg
        }
      } else {
        // ── DARK BACKGROUND IDENTITY (neon themes) ─────────────────────
        // Dark backgrounds: vibrant neon gradients for maximum visual impact
        if (theme.gradients && theme.gradients.length > 0) {
          gradientColors = theme.gradients;
        } else {
          if (emotion === 'shock' || emotion === 'anger') {
            gradientColors = ['#FF1744', '#FF6D00', '#FFAB00'];
          } else if (emotion === 'joy' || emotion === 'humor') {
            gradientColors = ['#FFE000', '#FFA726', '#FF6F00'];
          } else if (emotion === 'inspiration' || emotion === 'awe') {
            gradientColors = ['#00E5FF', '#40C4FF', '#CE93D8'];
          } else if (emotion === 'tension') {
            gradientColors = ['#ECEFF1', '#B0BEC5', '#78909C'];
          } else if (emotion === 'authority') {
            gradientColors = ['#FFD600', '#FFA000', '#FF6F00'];
          } else if (emotion === 'sadness') {
            gradientColors = ['#E1BEE7', '#CE93D8', '#BA68C8'];
          } else {
            gradientColors = ['#FFFFFF', '#F0F0F0', accentColor];
          }
        }

        if (emotion === 'shock' || emotion === 'anger') {
          color = theme.accentColorUrgent || '#FF1744';
        } else if (emotion === 'joy' || emotion === 'humor') {
          color = theme.accentColorTrendy || '#FFE000';
        } else if (theme.accentColorInfo) {
          color = theme.accentColorInfo;
        }
      }
    }
  }

  const style: TextStyle = {
    fontFamily: selectedFontFamily,
    fontStyle,
    fontSize,
    fontWeight,
    letterSpacing: isHeroWord ? 2 : 0,
    color,
    gradientColors,
    opacity,
    textCase,
  };

  // ── Stroke and glow ──────────────────────────────────────────────
  // Light backgrounds: no stroke needed (dark text on light bg = natural contrast)
  // Dark backgrounds: thick black outline for maximum legibility
  if (isHeroWord && !isLightBg) {
    // Dark bg: solid black outline for legibility — no drop shadow
    style.strokeColor = '#000000';
    style.strokeWidth = 7;
  }
  // Light bg: no stroke — flat dark color on light bg has natural contrast

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
    // ── Snap & Pop entry: ~8 frames @30fps (0.18–0.28s) ───────────────────
    // The overshoot spring rockets to 120% by ~frame 3, then eases back to
    // 100% over frames 4–8. This window gives the spring room to read as a
    // bouncy pop rather than a slow scale or an imperceptible flash.
    const rawEntry = animChars.duration * 0.6 * timingScale;
    const entryDuration = Math.max(0.18, Math.min(0.28, rawEntry));
    return {
      entryDuration,
      holdDuration: Math.max(0.2, wordDuration * 0.6),
      // Minimum 5 frames (0.17s) so the slide-down exit is always visible
      exitDuration: Math.max(0.17, Math.min(0.25, animChars.duration * 0.3 * timingScale)),
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
