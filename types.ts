export type CaptionPosition = 'TOP' | 'MIDDLE' | 'BOTTOM' | 'CUSTOM';
export type TextAlign = 'left' | 'center' | 'right';
/** Supports legacy modes + dynamic modes like NATIVE_ML, MIX_TE, NATIVE_BN etc. */
export type LanguageMode = string;

export interface WordTiming {
  text: string;
  start: number;
  end: number;
}

export interface Caption {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  words?: WordTiming[]; // Exact word-level bounding
  language?: string;
  confidence?: number;
  highlightIndices?: number[];
  sentiment?: 'energetic' | 'calm' | 'serious' | 'joyful';
  position?: CaptionPosition;
  customScale?: number;
  customPosition?: CaptionPosition;
  customX?: number; // Normalized 0-1 offset horizontally
  customY?: number; // Normalized 0-1 offset vertically
  wordColors?: string[]; // Array of hex codes matching the word count

  // Multi-part text for TRENDING style
  secondaryText?: string;
  primaryText?: string;
  accentText?: string;
}

export enum CaptionStyle {
  // ─── MINIMAL ───
  CLEAN_WHITE = 'CLEAN_WHITE',
  CINEMATIC = 'CINEMATIC',
  TYPEWRITER = 'TYPEWRITER',

  // ─── BOLD ───
  BOLD_IMPACT = 'BOLD_IMPACT',
  HORMOZI = 'HORMOZI',
  BEAST_MODE = 'BEAST_MODE',
  VIRAL_SLAM = 'VIRAL_SLAM',

  // ─── WORD-BY-WORD ───
  WORD_POP = 'WORD_POP',
  KARAOKE_FLOW = 'KARAOKE_FLOW',
  SPOTLIGHT = 'SPOTLIGHT',
  FIRE_WORD = 'FIRE_WORD',
  RAINBOW_BURST = 'RAINBOW_BURST',
  CAPCUT_POP = 'CAPCUT_POP',

  // ─── NEON / GLOW ───
  NEON_GLOW = 'NEON_GLOW',
  GLITCH_CYBER = 'GLITCH_CYBER',
  GRADIENT_DREAM = 'GRADIENT_DREAM',

  // ─── HIGHLIGHT ───
  HIGHLIGHT_BOX = 'HIGHLIGHT_BOX',

  // ─── CULTURAL ───
  DESI_BOLD = 'DESI_BOLD',
  RETRO_PIXEL = 'RETRO_PIXEL',
  LUXURY_GOLD = 'LUXURY_GOLD',

  // ─── ANIMATED EMOJI ───
  EMOJI_FIRE = 'EMOJI_FIRE',
  EMOJI_SPARKLE = 'EMOJI_SPARKLE',
  EMOJI_HEART = 'EMOJI_HEART',
  EMOJI_PARTY = 'EMOJI_PARTY',
  EMOJI_HYPE = 'EMOJI_HYPE',

  // ─── TYPOGRAPHIC ───
  TYPOGRAPH = 'TYPOGRAPH',

  // ─── CUSTOM ───
  CUSTOM = 'CUSTOM'
}

export type AnimationType = 'NONE' | 'POP' | 'SCALE_UP' | 'KARAOKE' | 'TYPEWRITER' | 'FIRE_POP';
export type EntryAnimation = 'NONE' | 'SLIDE_UP' | 'SLIDE_DOWN' | 'FADE_IN' | 'ZOOM_IN' | 'BOUNCE' | 'FLIP' | 'ROTATE_IN' | 'BLUR_IN' | 'GLITCH' | 'ELASTIC' | 'KINETIC' | 'SHATTER' | 'WIPE_RIGHT' | 'SPOTLIGHT';
export type ExitAnimation = 'NONE' | 'SLIDE_DOWN' | 'SLIDE_UP' | 'FADE_OUT' | 'ZOOM_OUT' | 'DISSOLVE' | 'GLITCH_OUT' | 'SHRINK';
export type WordHighlightMode = 'NONE' | 'KARAOKE' | 'SPOTLIGHT' | 'COLOR_POP' | 'UNDERLINE' | 'BOX' | 'FIRE' | 'RAINBOW' | 'WAVE' | 'SPARKLE';
export type KineticMode = 'NONE' | 'WAVE' | 'BOUNCE_CHAIN' | 'SHAKE' | 'STOMP';
export type AspectRatio = 'ORIGINAL' | '9:16' | '16:9' | '1:1' | '4:5';
export type DisplayMode = 'BLOCK' | 'WORD';
export type StyleCategory = 'BOLD' | 'NEON' | 'MINIMAL' | 'ART' | 'GLOW' | 'HIGHLIGHT' | 'VIRAL' | 'KINETIC' | 'TRENDING' | 'INSTAGRAM' | 'EMOJI' | 'TYPOGRAPHIC' | 'CUSTOM';

// Per-caption animation overrides
export interface CaptionAnimationConfig {
  entryAnimation: EntryAnimation;
  exitAnimation: ExitAnimation;
  wordHighlight: WordHighlightMode;
  animationSpeed: 'FAST' | 'MEDIUM' | 'SLOW';
}

// Sticker/Emoji overlay item
export type StickerAnimation =
  | 'NONE'
  | 'BOUNCE'        // rhythmic up-down bounce
  | 'SPIN'          // continuous rotation
  | 'PULSE'         // heartbeat scale in/out
  | 'SHAKE'         // rapid horizontal shake
  | 'FLOAT'         // smooth sine-wave float
  | 'WOBBLE'        // side tilt wiggle like CapCut
  | 'POP_IN'        // pop-in entry scale burst
  | 'ORBIT'         // circular orbit path
  | 'JELLY'         // squash-and-stretch jelly
  | 'SWING';        // pendulum swing

export interface StickerItem {
  id: string;
  emoji: string;        // unicode emoji (fallback)
  gifUrl?: string;      // Noto animated GIF CDN URL
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  scale: number;
  rotation: number;
  startTime: number;
  endTime: number;
  animation: StickerAnimation;
  opacity: number; // 0-1
}

// Export quality options
export interface ExportOptions {
  resolution: '720p' | '1080p' | '4K';
  fps: 24 | 30 | 60;
  bitrate: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
  format: 'webm' | 'mp4';
  audioEnabled: boolean;
}

// Controls how each template handles word colors independently
export type ColorBehavior =
  | 'FIXED'         // Single color always (Minimal, Clean styles)
  | 'ACTIVE_ONLY'   // Only active word gets accent color (Karaoke, Cinematic)
  | 'WORD_POP'      // Active word pops with scale+color animation (Mr. Beast, Hormozi)
  | 'CONTEXTUAL';   // Uses AI-assigned wordColors from transcript (Color Pop)

export interface StyleConfig {
  name: string;
  category: StyleCategory;
  fontFamily: string;
  fontSize: number;
  fontWeight: string | number;
  textColor: string;
  textAlign?: TextAlign;
  gradientColors?: string[];
  activeTextColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  backgroundColor?: string;
  backgroundPadding?: number;
  backgroundBorderRadius?: number;
  activeBackgroundColor?: string;
  rotationVariance?: number;
  useOutlineForInactive?: boolean;
  opacityInactive?: number;
  animation: AnimationType;
  displayMode: DisplayMode;
  uppercase?: boolean;
  colorBehavior?: ColorBehavior; // Per-template color logic
  emojiPrefix?: string;   // Emoji char(s) prepended to caption text (rendered as animated GIF)
  emojiSuffix?: string;   // Emoji char(s) appended to caption text (rendered as animated GIF)
}

export interface ProcessingStats {
  transcriptionTime: number;
  wordCount: number;
  confidenceScore: number;
  languageDetected: string;
}

export type ProcessingStatus = 'IDLE' | 'UPLOADING' | 'TRANSCRIBING' | 'READY' | 'EXPORTING';

export interface ViralHookResponse {
  hooks: string[];
}

// --- SEO TYPES ---
export type SocialPlatform = 'YOUTUBE' | 'SHORTS' | 'INSTAGRAM' | 'TIKTOK' | 'FACEBOOK';

export interface SeoResult {
  title: string;
  description: string;
  keywords: string[];
  hashtags: string[];
  audienceTargeting: string;
  algorithmNotes: string;
}

// --- PUBLISHING TYPES ---
export type IntegrationStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

export interface SocialAccount {
  id: SocialPlatform;
  name: string;
  status: IntegrationStatus;
  username?: string;
  avatar?: string;
}

export type UploadStage = 'QUEUED' | 'UPLOADING' | 'PROCESSING' | 'DONE' | 'FAILED';

export interface UploadProgress {
  platformId: SocialPlatform;
  stage: UploadStage;
  progress: number; // 0-100
  url?: string;
  error?: string;
}

// --- AUTOMATION TYPES ---
export type AutomationTrigger = 'COMMENT' | 'STORY_REPLY' | 'WELCOME';
export type DmMode = 'MANUAL' | 'AI_SMART';
export type AutomationTriggerType = 'ANY' | 'KEYWORDS' | 'AI_INTENT';
export type AutomationDelay = 'INSTANT' | '10S' | '30S' | '1MIN' | 'RANDOM';
export type IGAccountType = 'BUSINESS' | 'CREATOR' | 'PERSONAL';
export type HealthStatus = 'HEALTHY' | 'WARNING' | 'COOLDOWN' | 'PAUSED';

export interface InstagramAutomationConfig {
  enabled: boolean;
  accountType: IGAccountType;

  comment: {
    enabled: boolean;
    triggerType: AutomationTriggerType;
    keywords: string[];
    dmMode: DmMode;
    messageTemplate: string;
    delay: AutomationDelay;
  };

  story: {
    enabled: boolean;
    dmMode: DmMode;
    messageTemplate: string;
  };

  welcome: {
    enabled: boolean;
    trigger: 'FOLLOW' | 'LIKE_SAVE';
    dmMode: DmMode;
    messageTemplate: string;
  };

  safety: {
    maxDmsPerHour: number;
    maxDmsPerDay: number;
    stopOnReply: boolean;
    avoidDuplicates: boolean;
    autoPause: boolean;
  };
}

// --- AUTOMATION SIMULATION TYPES ---
export type LogStatus = 'RECEIVED' | 'PROCESSING' | 'SENT' | 'SKIPPED' | 'ERROR';
export type LogType = 'COMMENT' | 'STORY_REPLY' | 'WELCOME' | 'SYSTEM' | 'HEALTH';

export interface AutomationLog {
  id: string;
  timestamp: number;
  type: LogType;
  user: string;
  content?: string;
  status: LogStatus;
  details?: string;
  actionTaken?: string;
}

export interface DailyMetric {
  date: string;
  dmsSent: number;
  replies: number;
}

export interface TriggerPerformance {
  type: AutomationTriggerType;
  count: number;
  conversionRate: number;
}

export interface AnalyticsData {
  replyRate: number;
  funnel: {
    comments: number;
    dmsSent: number;
    replies: number;
    clicks: number;
  };
  dailyHistory: DailyMetric[];
  triggerPerformance: TriggerPerformance[];
}

export interface SimulationStats {
  commentsDetected: number;
  dmsSent: number;
  repliesReceived: number;
  spamBlocked: number;
  healthStatus: HealthStatus;
  hourlyUsage: number;
  dailyUsage: number;
  analytics: AnalyticsData; // Added rich analytics data
}