export type CaptionPosition = 'TOP' | 'MIDDLE' | 'BOTTOM' | 'CUSTOM';
export type TextAlign = 'left' | 'center' | 'right';
export type LanguageMode = 'PURE_TELUGU' | 'TELGLISH' | 'ENGLISH' | 'AUTO' | 'HINDI' | 'TAMIL' | 'KANNADA' | 'MARATHI' | 'HINGLISH';

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
  DEFAULT = 'DEFAULT',
  HORMOZI_VAR1 = 'HORMOZI_VAR1',
  HORMOZI_VAR2 = 'HORMOZI_VAR2',
  BEAST_MODE = 'BEAST_MODE',
  KARAOKE_NEON = 'KARAOKE_NEON',
  GLITCH_CYBER = 'GLITCH_CYBER',
  MINIMAL_BOX = 'MINIMAL_BOX',
  TYPEWRITER = 'TYPEWRITER',
  DESI_VLOG = 'DESI_VLOG',
  TAMIL_THALAIVA = 'TAMIL_THALAIVA',
  RAPID_SPRINT = 'RAPID_SPRINT',

  // Existing Word Styles
  WORD_HORMOZI_FOCUS = 'WORD_HORMOZI_FOCUS',
  WORD_FUTURE_NEON = 'WORD_FUTURE_NEON',
  WORD_GLITCH_CHAOS = 'WORD_GLITCH_CHAOS',
  WORD_RETRO_PIXEL = 'WORD_RETRO_PIXEL',
  WORD_LUXURY_SERIF = 'WORD_LUXURY_SERIF',
  WORD_COMIC_IMPACT = 'WORD_COMIC_IMPACT',
  WORD_VLOG_AESTHETIC = 'WORD_VLOG_AESTHETIC',
  WORD_BOLD_SPORTS = 'WORD_BOLD_SPORTS',
  WORD_GAME_STREAMER = 'WORD_GAME_STREAMER',
  WORD_NOIR_CRIME = 'WORD_NOIR_CRIME',
  WORD_INSTA_POP = 'WORD_INSTA_POP',
  WORD_GRADIENT_DREAM = 'WORD_GRADIENT_DREAM',
  WORD_TAPE_HIGHLIGHT = 'WORD_TAPE_HIGHLIGHT',
  WORD_NEON_STORM = 'WORD_NEON_STORM',
  WORD_SUPER_3D = 'WORD_SUPER_3D',
  WORD_LYRICIST_OUTLINE = 'WORD_LYRICIST_OUTLINE',
  BLOCK_CLEAN_FOCUS = 'BLOCK_CLEAN_FOCUS',
  BLOCK_CINEMATIC_FADE = 'BLOCK_CINEMATIC_FADE',
  WORD_SOFT_GLOW = 'WORD_SOFT_GLOW',
  WORD_ACTIVE_BOX = 'WORD_ACTIVE_BOX',

  // Viral Styles
  COLOR_POP_VIRAL = 'COLOR_POP_VIRAL',
  VIRAL_COMIC = 'VIRAL_COMIC',
  VIRAL_PRO_CLEAN = 'VIRAL_PRO_CLEAN',
  VIRAL_LOUD_NEON = 'VIRAL_LOUD_NEON',
  VIRAL_HYPER_BOLD = 'VIRAL_HYPER_BOLD',

  // --- NEW GLOW STYLES ---
  GLOW_DREAMY = 'GLOW_DREAMY',
  GLOW_RADIOACTIVE = 'GLOW_RADIOACTIVE',
  GLOW_CYBER_BLUE = 'GLOW_CYBER_BLUE',
  GLOW_GOLDEN_HOUR = 'GLOW_GOLDEN_HOUR',
  GLOW_DEEP_SPACE = 'GLOW_DEEP_SPACE',

  // --- NEW HIGHLIGHT STYLES ---
  HIGHLIGHT_MARKER = 'HIGHLIGHT_MARKER',
  HIGHLIGHT_RED_TAPE = 'HIGHLIGHT_RED_TAPE',
  HIGHLIGHT_BLACK_BOX = 'HIGHLIGHT_BLACK_BOX',
  HIGHLIGHT_PAPER_CUT = 'HIGHLIGHT_PAPER_CUT',
  HIGHLIGHT_SKETCH = 'HIGHLIGHT_SKETCH',

  // --- NEW KINETIC STYLES ---
  KINETIC_IMPACT = 'KINETIC_IMPACT',
  KINETIC_RAPID = 'KINETIC_RAPID',
  KINETIC_STOMP = 'KINETIC_STOMP',
  KINETIC_TILT = 'KINETIC_TILT',
  KINETIC_ZOOMER = 'KINETIC_ZOOMER',
  TRENDING = 'TRENDING',
  NEON_IMPACT = 'NEON_IMPACT',
  VIRAL_CREATOR = 'VIRAL_CREATOR',
  INSTAGRAM_TEMPLATE = 'INSTAGRAM_TEMPLATE',

  // --- CAPCUT-LEVEL WORD-BY-WORD STYLES ---
  CAPCUT_CLASSIC = 'CAPCUT_CLASSIC',
  CAPCUT_BOLD_YELLOW = 'CAPCUT_BOLD_YELLOW',
  WORD_FIRE_POP = 'WORD_FIRE_POP',
  BOUNCE_WAVE = 'BOUNCE_WAVE',
  RAINBOW_BURST = 'RAINBOW_BURST',
  VIRAL_WORD_SLAM = 'VIRAL_WORD_SLAM',
  KARAOKE_FIRE = 'KARAOKE_FIRE',
  WORD_CINEMATIC = 'WORD_CINEMATIC',
  MINIMAL_WORD_FADE = 'MINIMAL_WORD_FADE',
  GRADIENT_SHIFT = 'GRADIENT_SHIFT',
  WORD_GLITTER = 'WORD_GLITTER',
  NEON_WORD_WAVE = 'NEON_WORD_WAVE',
  WORD_SPOTLIGHT_REVEAL = 'WORD_SPOTLIGHT_REVEAL',
  WORD_SHAKE_IMPACT = 'WORD_SHAKE_IMPACT',
  WORD_OUTLINED_POP = 'WORD_OUTLINED_POP',

  CUSTOM = 'CUSTOM'
}

export type AnimationType = 'NONE' | 'POP' | 'SCALE_UP' | 'KARAOKE' | 'TYPEWRITER';
export type EntryAnimation = 'NONE' | 'SLIDE_UP' | 'SLIDE_DOWN' | 'FADE_IN' | 'ZOOM_IN' | 'BOUNCE' | 'FLIP' | 'ROTATE_IN' | 'BLUR_IN' | 'GLITCH' | 'ELASTIC' | 'KINETIC' | 'SHATTER' | 'WIPE_RIGHT' | 'SPOTLIGHT';
export type ExitAnimation = 'NONE' | 'SLIDE_DOWN' | 'SLIDE_UP' | 'FADE_OUT' | 'ZOOM_OUT' | 'DISSOLVE' | 'GLITCH_OUT' | 'SHRINK';
export type WordHighlightMode = 'NONE' | 'KARAOKE' | 'SPOTLIGHT' | 'COLOR_POP' | 'UNDERLINE' | 'BOX' | 'FIRE' | 'RAINBOW' | 'WAVE' | 'SPARKLE';
export type KineticMode = 'NONE' | 'WAVE' | 'BOUNCE_CHAIN' | 'SHAKE' | 'STOMP';
export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5';
export type DisplayMode = 'BLOCK' | 'WORD';
export type StyleCategory = 'BOLD' | 'NEON' | 'MINIMAL' | 'ART' | 'GLOW' | 'HIGHLIGHT' | 'VIRAL' | 'KINETIC' | 'TRENDING' | 'INSTAGRAM' | 'CUSTOM';

// Per-caption animation overrides
export interface CaptionAnimationConfig {
  entryAnimation: EntryAnimation;
  exitAnimation: ExitAnimation;
  wordHighlight: WordHighlightMode;
  animationSpeed: 'FAST' | 'MEDIUM' | 'SLOW';
}

// Sticker/Emoji overlay item
export interface StickerItem {
  id: string;
  emoji: string;
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  scale: number;
  rotation: number;
  startTime: number;
  endTime: number;
  animation: 'NONE' | 'BOUNCE' | 'SPIN' | 'PULSE' | 'SHAKE';
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