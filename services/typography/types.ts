/**
 * Core type definitions for kinetic typography reel system
 *
 * This is the heart of the data model. Each file in the pipeline
 * transforms one type to another:
 *
 * Audio File → EnrichedTranscript → BeatGrid → AnimationSequence → Canvas → MP4
 */

// ─── Emotions & Intensity ────────────────────────────────────────────────────

export type SegmentEmotion =
  | 'joy'
  | 'shock'
  | 'awe'
  | 'anger'
  | 'sadness'
  | 'tension'
  | 'inspiration'
  | 'humor'
  | 'authority'
  | 'neutral';

export type EmotionIntensity = 1 | 2 | 3;

// ─── Word Roles & Classification ─────────────────────────────────────────────

export type WordRole =
  | 'action'      // Verbs (run, buy, discover)
  | 'emotion'     // Adjectives/adverbs describing feeling
  | 'subject'     // Nouns, main focus
  | 'number'      // Statistics, metrics, counts
  | 'tech'        // Technical terms, jargon
  | 'cta'         // Call-to-action words
  | 'connector';  // Filler (the, and, but, is)

// ─── Script Analysis Output ──────────────────────────────────────────────────

export interface TranscriptWord {
  text: string;
  startTime: number;           // Seconds from audio start
  endTime: number;
  role: WordRole;
  emphasisScore: number;       // 0-100, AI-assigned importance
}

export interface TranscriptSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  emotion: SegmentEmotion;
  emotionIntensity: EmotionIntensity;
  words: TranscriptWord[];
}

export interface EnrichedTranscript {
  segments: TranscriptSegment[];
  language: 'en' | 'te' | 'hi' | 'ta' | 'ka' | string;
  duration: number;            // Total audio duration in seconds
  confidence: number;          // Gemini confidence 0-1
}

// ─── Audio Beat Analysis ─────────────────────────────────────────────────────

export interface BeatGrid {
  beats: number[];             // Array of beat times (seconds)
  bpm: number;
  energyCurve: number[];       // Energy envelope at 100 Hz
  syllabeTimings: number[];    // Syllable nuclei locations (speech emphasis)
  duration: number;
}

// ─── Animation Primitives ────────────────────────────────────────────────────

export type AnimationType =
  // Text Entry Animations
  | 'fade-in'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'scale-up'
  | 'typewriter'
  | 'bounce-in'
  | 'rotate-in'
  // Emphasis Animations
  | 'scale-pop'
  | 'color-flash'
  | 'glow-pulse'
  | 'shake'
  | 'spin'
  | 'blur-in'
  // Composite Effects
  | 'karaoke'          // Color override as word plays
  | 'glitch'           // RGB channel split
  | 'aurora'           // Ethereal glow
  | 'fire'             // Flame effect
  | 'shimmer'          // Dissolve/fade
  | 'wave'             // Wavy distortion
  | 'kinetic'          // Bouncy, alive motion;

export interface AnimationTiming {
  entryDuration: number;       // Seconds
  holdDuration: number;
  exitDuration: number;
  entryEasing: 'ease-out' | 'ease-in' | 'ease-in-out' | 'linear';
  exitEasing: 'ease-out' | 'ease-in' | 'ease-in-out' | 'linear';
}

export interface TextStyle {
  fontFamily: string;          // e.g. "Space Grotesk", "Playfair Display"
  fontSize: number;            // Pixels
  fontWeight: number;          // 400-900
  letterSpacing: number;       // Pixels, usually 0-2
  color: string;               // Hex color #RRGGBB
  strokeColor?: string;        // Outline color, optional
  strokeWidth?: number;        // Outline thickness
  shadowColor?: string;        // Drop shadow
  shadowBlur?: number;
}

export interface WordAnimation {
  wordId: string;
  text: string;
  startTime: number;
  duration: number;

  // Animation behavior
  type: AnimationType;
  intensity: EmotionIntensity;
  timing: AnimationTiming;

  // Visual styling
  style: TextStyle;

  // Animation-specific params
  scaleAmount?: number;        // For scale-pop: 1.3 = 30% larger
  colorTransition?: string;    // For color-flash: target color
  glowIntensity?: number;      // For glow-pulse: 0-1
}

export interface LayoutConfiguration {
  width: number;               // Pixels (1080 for mobile)
  height: number;              // Pixels (1920 for vertical)
  backgroundColor: string;     // Hex color
  maxWordsPerLine: number;
  textAlignment: 'center' | 'left' | 'right';
  verticalPosition: 'top' | 'center' | 'bottom';
  padding: number;
}

export interface AnimationSequence {
  id: string;
  animations: WordAnimation[];
  layout: LayoutConfiguration;
  durationMs: number;
}

// ─── Theme/Style Profile ────────────────────────────────────────────────────

export interface ThemeProfile {
  id: string;
  name: string;
  description: string;         // Theme description for UI
  previewGradient: string;      // Tailwind gradient class for preview chip

  // Font configuration
  fontFamily: string;
  fontWeightBold: number;      // Usually 700-900
  fontWeightRegular: number;   // Usually 400-600

  // Color palette
  primaryColor: string;        // Main text color
  accentColor: string;         // For emphasis
  backgroundColor: string;
  gradients?: string[];        // Multiple gradient options

  // Animation preferences
  defaultAnimationType: AnimationType;
  animationSpeed: 'slow' | 'normal' | 'fast';
  emphasisStyle: 'bold' | 'color' | 'scale' | 'glow' | 'composite';

  // Emotion-specific overrides
  emotionMappings: Record<SegmentEmotion, {
    animationType: AnimationType;
    color: string;
    intensity: EmotionIntensity;
  }>;
}

// ─── Preset Theme Library ───────────────────────────────────────────────────

export const THEME_PRESETS: Record<string, ThemeProfile> = {
  'cinematic-poet': {
    id: 'cinematic-poet',
    name: 'Cinematic Poet',
    description: 'Elegant serif with golden accents',
    previewGradient: 'from-amber-900 to-yellow-700',
    fontFamily: 'Cinzel',
    fontWeightBold: 700,
    fontWeightRegular: 400,
    primaryColor: '#FFFFFF',
    accentColor: '#FFD700',
    backgroundColor: '#0A0E27',
    animationSpeed: 'slow',
    defaultAnimationType: 'fade-in',
    emphasisStyle: 'composite',
    emotionMappings: {
      joy: { animationType: 'bounce-in', color: '#FFD700', intensity: 3 },
      shock: { animationType: 'shake', color: '#FF6B6B', intensity: 3 },
      awe: { animationType: 'fade-in', color: '#87CEEB', intensity: 2 },
      anger: { animationType: 'shake', color: '#FF4444', intensity: 3 },
      sadness: { animationType: 'slide-down', color: '#B0C4DE', intensity: 1 },
      tension: { animationType: 'typewriter', color: '#FFFFFF', intensity: 2 },
      inspiration: { animationType: 'scale-up', color: '#FFD700', intensity: 3 },
      humor: { animationType: 'bounce-in', color: '#FFEB3B', intensity: 2 },
      authority: { animationType: 'fade-in', color: '#FFFFFF', intensity: 2 },
      neutral: { animationType: 'fade-in', color: '#FFFFFF', intensity: 1 },
    },
  },
  'viral-hook': {
    id: 'viral-hook',
    name: 'Viral Hook',
    description: 'Bold sans-serif with neon vibes',
    previewGradient: 'from-pink-600 to-purple-600',
    fontFamily: 'Space Grotesk',
    fontWeightBold: 900,
    fontWeightRegular: 600,
    primaryColor: '#FFFFFF',
    accentColor: '#FF006E',
    backgroundColor: '#0D0221',
    animationSpeed: 'fast',
    defaultAnimationType: 'scale-pop',
    emphasisStyle: 'composite',
    emotionMappings: {
      joy: { animationType: 'scale-pop', color: '#FF006E', intensity: 3 },
      shock: { animationType: 'shake', color: '#FF006E', intensity: 3 },
      awe: { animationType: 'scale-up', color: '#00D9FF', intensity: 2 },
      anger: { animationType: 'bounce-in', color: '#FF006E', intensity: 3 },
      sadness: { animationType: 'fade-in', color: '#B0B0B0', intensity: 1 },
      tension: { animationType: 'typewriter', color: '#FF006E', intensity: 3 },
      inspiration: { animationType: 'scale-pop', color: '#FFD700', intensity: 3 },
      humor: { animationType: 'scale-pop', color: '#FFEB3B', intensity: 3 },
      authority: { animationType: 'scale-up', color: '#FF006E', intensity: 2 },
      neutral: { animationType: 'fade-in', color: '#FFFFFF', intensity: 1 },
    },
  },
  'tech-bold': {
    id: 'tech-bold',
    name: 'Tech Bold',
    description: 'Monospace with cyan accents',
    previewGradient: 'from-cyan-600 to-blue-700',
    fontFamily: 'Courier New',
    fontWeightBold: 700,
    fontWeightRegular: 400,
    primaryColor: '#00D9FF',
    accentColor: '#00FF88',
    backgroundColor: '#001A33',
    animationSpeed: 'normal',
    defaultAnimationType: 'typewriter',
    emphasisStyle: 'composite',
    emotionMappings: {
      joy: { animationType: 'scale-pop', color: '#00FF88', intensity: 3 },
      shock: { animationType: 'glitch', color: '#FF0055', intensity: 3 },
      awe: { animationType: 'fade-in', color: '#00D9FF', intensity: 2 },
      anger: { animationType: 'glitch', color: '#FF0055', intensity: 3 },
      sadness: { animationType: 'fade-in', color: '#666666', intensity: 1 },
      tension: { animationType: 'typewriter', color: '#FF0055', intensity: 2 },
      inspiration: { animationType: 'scale-up', color: '#00FF88', intensity: 3 },
      humor: { animationType: 'bounce-in', color: '#00FF88', intensity: 2 },
      authority: { animationType: 'typewriter', color: '#00D9FF', intensity: 2 },
      neutral: { animationType: 'fade-in', color: '#00D9FF', intensity: 1 },
    },
  },
  'soft-aesthetic': {
    id: 'soft-aesthetic',
    name: 'Soft Aesthetic',
    description: 'Rounded font with pastel colors',
    previewGradient: 'from-pink-300 to-purple-200',
    fontFamily: 'Poppins',
    fontWeightBold: 700,
    fontWeightRegular: 400,
    primaryColor: '#F0E6FF',
    accentColor: '#E4AAFF',
    backgroundColor: '#2D1B50',
    animationSpeed: 'slow',
    defaultAnimationType: 'fade-in',
    emphasisStyle: 'glow',
    emotionMappings: {
      joy: { animationType: 'bounce-in', color: '#E4AAFF', intensity: 2 },
      shock: { animationType: 'scale-up', color: '#FF6B9D', intensity: 2 },
      awe: { animationType: 'fade-in', color: '#C4A7FF', intensity: 2 },
      anger: { animationType: 'shake', color: '#FF6B9D', intensity: 2 },
      sadness: { animationType: 'fade-in', color: '#A0A0A0', intensity: 1 },
      tension: { animationType: 'slide-up', color: '#FF6B9D', intensity: 2 },
      inspiration: { animationType: 'scale-up', color: '#E4AAFF', intensity: 2 },
      humor: { animationType: 'bounce-in', color: '#FFDFD3', intensity: 2 },
      authority: { animationType: 'fade-in', color: '#F0E6FF', intensity: 2 },
      neutral: { animationType: 'fade-in', color: '#F0E6FF', intensity: 1 },
    },
  },
  'retro-neon': {
    id: 'retro-neon',
    name: 'Retro Neon',
    description: 'Vintage font with electric neon',
    previewGradient: 'from-yellow-400 to-red-600',
    fontFamily: 'Orbitron',
    fontWeightBold: 700,
    fontWeightRegular: 400,
    primaryColor: '#FFFF00',
    accentColor: '#FF00FF',
    backgroundColor: '#0B0B1E',
    animationSpeed: 'fast',
    defaultAnimationType: 'bounce-in',
    emphasisStyle: 'composite',
    emotionMappings: {
      joy: { animationType: 'bounce-in', color: '#FFFF00', intensity: 3 },
      shock: { animationType: 'shake', color: '#FF00FF', intensity: 3 },
      awe: { animationType: 'scale-up', color: '#00FFFF', intensity: 2 },
      anger: { animationType: 'bounce-in', color: '#FF0000', intensity: 3 },
      sadness: { animationType: 'fade-in', color: '#808080', intensity: 1 },
      tension: { animationType: 'typewriter', color: '#FF00FF', intensity: 3 },
      inspiration: { animationType: 'scale-pop', color: '#FFFF00', intensity: 3 },
      humor: { animationType: 'bounce-in', color: '#00FFFF', intensity: 3 },
      authority: { animationType: 'scale-up', color: '#FFFF00', intensity: 2 },
      neutral: { animationType: 'fade-in', color: '#FFFF00', intensity: 1 },
    },
  },
  'minimalist-clean': {
    id: 'minimalist-clean',
    name: 'Minimalist Clean',
    description: 'Simple sans-serif with subtle elegance',
    previewGradient: 'from-gray-700 to-gray-900',
    fontFamily: 'Inter',
    fontWeightBold: 700,
    fontWeightRegular: 400,
    primaryColor: '#F5F5F5',
    accentColor: '#000000',
    backgroundColor: '#FAFAFA',
    animationSpeed: 'normal',
    defaultAnimationType: 'fade-in',
    emphasisStyle: 'bold',
    emotionMappings: {
      joy: { animationType: 'scale-up', color: '#000000', intensity: 2 },
      shock: { animationType: 'shake', color: '#FF0000', intensity: 2 },
      awe: { animationType: 'fade-in', color: '#333333', intensity: 2 },
      anger: { animationType: 'bounce-in', color: '#FF0000', intensity: 2 },
      sadness: { animationType: 'fade-in', color: '#999999', intensity: 1 },
      tension: { animationType: 'typewriter', color: '#000000', intensity: 2 },
      inspiration: { animationType: 'scale-up', color: '#000000', intensity: 2 },
      humor: { animationType: 'bounce-in', color: '#333333', intensity: 2 },
      authority: { animationType: 'fade-in', color: '#000000', intensity: 2 },
      neutral: { animationType: 'fade-in', color: '#333333', intensity: 1 },
    },
  },
};

// ─── Rendering Canvas Context ───────────────────────────────────────────────

export interface CanvasRenderState {
  currentTime: number;         // Current playback position (seconds)
  isPlaying: boolean;
  activeAnimations: WordAnimation[];  // Words currently animating
  upcomingAnimations: WordAnimation[]; // Words about to animate
}

export interface RenderMetrics {
  fps: number;
  frameTime: number;           // Milliseconds per frame
  droppedFrames: number;
  memoryUsageMB: number;
}

// ─── Export Configuration ───────────────────────────────────────────────────

export interface ExportOptions {
  format: 'mp4' | 'webm' | 'gif';
  width: number;
  height: number;
  fps: number;
  bitrate: string;             // e.g. "8Mbps"
  audioMix: 'replace' | 'overlay' | 'original';
}

// ─── Pipeline State ─────────────────────────────────────────────────────────

export type PipelineStage =
  | 'idle'
  | 'analyzing'       // Gemini transcript analysis
  | 'beats'           // Audio beat detection
  | 'choreographing'  // Animation sequence generation
  | 'rendering'       // Canvas animation rendering
  | 'exporting'       // MP4 encoding
  | 'error';

export interface PipelineState {
  stage: PipelineStage;
  progress: number;    // 0-1
  message: string;
  error?: string;
}
