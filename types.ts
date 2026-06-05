export type CaptionPosition = 'TOP' | 'MIDDLE' | 'BOTTOM' | 'CUSTOM';
export type TextAlign = 'left' | 'center' | 'right';
/** Supports legacy modes + dynamic modes like NATIVE_ML, MIX_TE, NATIVE_BN etc. */
export type LanguageMode = string;

export interface WordTiming {
  text: string;
  start: number;
  end: number;
  iconEmoji?: string;
  iconUrl?: string;
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
  HYPER_IMPACT_BOLD = 'HYPER_IMPACT_BOLD', // Hormozi Gradient — white italic words, orange→yellow gradient on the emphasized word
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
  EMOJI_AUTO = 'EMOJI_AUTO',   // ← Auto-matched animated emoji per sentence


  // ─── TYPOGRAPHIC ───
  TYPOGRAPH = 'TYPOGRAPH',

  // ─── CAPCUT VIRAL (NEW) ───
  BOLD_SHADOW = 'BOLD_SHADOW',
  STORYTIME = 'STORYTIME',
  CHROME_3D = 'CHROME_3D',
  AUTO_HIGHLIGHT = 'AUTO_HIGHLIGHT',
  GLITCH_RGB = 'GLITCH_RGB',
  RETRO_WAVE = 'RETRO_WAVE',
  GHOST_FADE = 'GHOST_FADE',
  CINEMATIC_TITLES = 'CINEMATIC_TITLES',

  // ─── TYPOGRAPHIC VARIANTS ───
  DUAL_COLOR = 'DUAL_COLOR',
  SHAKE_CAM = 'SHAKE_CAM',
  MINIMAL_BAR = 'MINIMAL_BAR',
  LIQUID_CHROME = 'LIQUID_CHROME',

  // ─── PLATFORM NATIVE (SPRINT 1) ───
  TIKTOK_NATIVE = 'TIKTOK_NATIVE',
  INSTAGRAM_NATIVE = 'INSTAGRAM_NATIVE',

  // ─── SPRING PHYSICS (SPRINT 1) ───
  WORD_SPRING = 'WORD_SPRING',
  WORD_STAMP = 'WORD_STAMP',

  // ─── BADGE / PILL (SPRINT 1) ───
  PILL_BADGE = 'PILL_BADGE',

  // ─── SPEECH BUBBLE (SPRINT 2) ───
  SPEECH_BUBBLE = 'SPEECH_BUBBLE',

  // ─── REVEAL (SPRINT 2) ───
  BLUR_REVEAL = 'BLUR_REVEAL',
  SPLIT_REVEAL = 'SPLIT_REVEAL',

  // ─── ADVANCED (SPRINT 3) ───
  NEON_SIGN_FLICKER = 'NEON_SIGN_FLICKER',
  TICKER_SCROLL = 'TICKER_SCROLL',
  MAGNETIC_WORDS = 'MAGNETIC_WORDS',
  PERSPECTIVE_3D = 'PERSPECTIVE_3D',
  BRUSH_STROKE = 'BRUSH_STROKE',
  MATRIX_RAIN = 'MATRIX_RAIN',

  // ─── MOTION EFFECTS (SPRINT 4) ───
  APPLE_MINIMAL = 'APPLE_MINIMAL',
  BOUNCE_STAMP = 'BOUNCE_STAMP',
  FLOAT_RISE = 'FLOAT_RISE',
  SLIDE_REVEAL = 'SLIDE_REVEAL',
  BLUR_FADE = 'BLUR_FADE',
  POP_OUT = 'POP_OUT',
  SPRING_SLAM = 'SPRING_SLAM',
  FLIP_WORD = 'FLIP_WORD',
  ELASTIC_DROP = 'ELASTIC_DROP',
  SCATTER_GATHER = 'SCATTER_GATHER',

  // ─── CAPCUT CREATIVE (Sprint 7) ───
  COMIC_BANG = 'COMIC_BANG',              // Comic book POW/BANG explosion text
  PASTEL_DREAM = 'PASTEL_DREAM',          // Soft pastel gradient with rounded pill BG
  ELECTRIC_SLIDE = 'ELECTRIC_SLIDE',      // Electric blue wipe-in with spark trail
  DRIP_TEXT = 'DRIP_TEXT',                // Liquid drip effect with chrome gradient
  SUNSET_VIBES = 'SUNSET_VIBES',          // Warm sunset gradient (orange→pink→purple)
  ICE_COLD = 'ICE_COLD',                  // Frosted glass with ice-blue glow
  STREET_GRAFFITI = 'STREET_GRAFFITI',    // Spray paint graffiti style
  ASMR_WHISPER = 'ASMR_WHISPER',          // Ultra-soft minimal with breathing glow
  ANIME_IMPACT = 'ANIME_IMPACT',          // Anime-style speed lines + bold impact
  DISCO_FEVER = 'DISCO_FEVER',            // Rotating color palette party style

  // ─── CUSTOM ───
  CUSTOM = 'CUSTOM',

  // ─── TYPOGRAPHY CAPTION (SPRINT 5) ───
  TYPO_SIZE_HIERARCHY = 'TYPO_SIZE_HIERARCHY',    // Size hierarchy stack (Image 1 pattern)
  TYPO_MAGAZINE = 'TYPO_MAGAZINE',                // Magazine editorial style (Image 2 pattern)
  TYPO_MIXED_FAMILY = 'TYPO_MIXED_FAMILY',        // Mixed font families (Image 3 pattern)
  TYPO_EDITORIAL_GOLD = 'TYPO_EDITORIAL_GOLD',    // Gold accent editorial
  TYPO_STREET_POSTER = 'TYPO_STREET_POSTER',      // Bold street art style
  TYPO_MINIMAL_STACK = 'TYPO_MINIMAL_STACK',      // Clean minimal stacked
  TYPO_NEON_LAYERS = 'TYPO_NEON_LAYERS',          // Neon glow layered
  TYPO_CINEMATIC_TITLE = 'TYPO_CINEMATIC_TITLE',  // Movie title style

  // ─── CAPCUT MULTI-FLOAT KARAOKE (Sprint 6) ───
  CAPCUT_MULTI_FLOAT = 'CAPCUT_MULTI_FLOAT',      // 3-tier floating word karaoke engine

  // ─── HYPERCAPTIONS — HTML/CSS/GSAP overlay renderer (Phase H) ───
  HYPER_GLITCH = 'HYPER_GLITCH',           // RGB channel split + scan lines + jitter
  HYPER_NEON_TUBE = 'HYPER_NEON_TUBE',     // Stacked text-shadow neon bloom + flicker
  HYPER_3D_EXTRUDE = 'HYPER_3D_EXTRUDE',  // CSS perspective 3D rotation + depth extrusion
  HYPER_GLASS_FROST = 'HYPER_GLASS_FROST', // backdrop-filter glassmorphism
  HYPER_GRADIENT_WAVE = 'HYPER_GRADIENT_WAVE', // Animated iridescent gradient sweep
}

export type AnimationType =
  | 'NONE' | 'POP' | 'SCALE_UP' | 'KARAOKE' | 'TYPEWRITER' | 'FIRE_POP'
  | 'SPRING'      // elastic spring overshoot per word
  | 'STAMP'       // rubber stamp scale-crash per word
  | 'BLUR_IN'     // blur → sharp reveal (caption-level)
  | 'SPLIT_OPEN'  // top+bottom clip split apart
  | 'FLIP_Y'      // Y-axis 3D perspective flip per word
  | 'SCATTER_IN'; // words scatter from random positions → snap home
export type EntryAnimation = 'NONE' | 'SLIDE_UP' | 'SLIDE_DOWN' | 'FADE_IN' | 'ZOOM_IN' | 'BOUNCE' | 'FLIP' | 'FLIP_Y' | 'ROTATE_IN' | 'BLUR_IN' | 'GLITCH' | 'ELASTIC' | 'KINETIC' | 'SHATTER' | 'WIPE_RIGHT' | 'SPOTLIGHT' | 'SPRING' | 'STAMP' | 'SPLIT_OPEN' | 'POP' | 'SCATTER_IN' | 'SCALE_UP';
export type ExitAnimation = 'NONE' | 'SLIDE_DOWN' | 'SLIDE_UP' | 'FADE_OUT' | 'ZOOM_OUT' | 'DISSOLVE' | 'GLITCH_OUT' | 'SHRINK' | 'FLIP';
export type WordHighlightMode = 'NONE' | 'KARAOKE' | 'SPOTLIGHT' | 'COLOR_POP' | 'UNDERLINE' | 'BOX' | 'FIRE' | 'RAINBOW' | 'WAVE' | 'SPARKLE';
export type KineticMode = 'NONE' | 'WAVE' | 'BOUNCE_CHAIN' | 'SHAKE' | 'STOMP';
export type AspectRatio = 'ORIGINAL' | '9:16' | '16:9' | '1:1' | '4:5';
export type DisplayMode = 'BLOCK' | 'WORD';
export type StyleCategory = 'BOLD' | 'NEON' | 'MINIMAL' | 'ART' | 'GLOW' | 'HIGHLIGHT' | 'VIRAL' | 'KINETIC' | 'TRENDING' | 'INSTAGRAM' | 'EMOJI' | 'TYPOGRAPHIC' | 'TYPOGRAPHY' | 'CUSTOM' | 'PLATFORM' | 'COMIC' | 'HYPER';

// ─── Typography Caption Types (Sprint 5) ───

// A single visual layer in a typography caption
export interface TypographyLayer {
  // Text source: how to determine which text this layer displays
  textSource: 'FIRST_LINE' | 'ACCENT_WORD' | 'LAST_LINE' | 'ALL' | 'WORD_N' | 'WORD_RANGE';
  wordIndex?: number;           // used when textSource='WORD_N'
  wordRangeStart?: number;       // used when textSource='WORD_RANGE'
  wordRangeEnd?: number;         // used when textSource='WORD_RANGE'

  // Typography properties
  fontFamily: string;
  fontSize: number;             // absolute px at 1000px canvas height
  fontWeight: string | number;
  color: string;                // hex or rgba
  gradientColors?: string[];    // if set, renders gradient fill
  uppercase?: boolean;
  italic?: boolean;
  letterSpacing?: number;       // extra tracking in px
  opacity?: number;

  // Stroke/outline
  strokeColor?: string;
  strokeWidth?: number;

  // Shadow/glow
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;

  // Animation
  entryDelay?: number;          // seconds delay before this layer appears
  entryDuration?: number;       // seconds for entry animation
  entryType?: 'FADE' | 'SLIDE_UP' | 'SCALE_POP' | 'WIPE_RIGHT' | 'WIPE_LEFT' | 'NONE';

  // Layout positioning
  yOffset?: number;             // px offset from center (negative = up)
  xOffset?: number;             // px offset from center
  textAlign?: 'left' | 'center' | 'right';

  // Background/highlight
  backgroundFill?: string;      // highlight box behind this layer
  backgroundPadding?: number;
  backgroundBorderRadius?: number;

  // Underline decoration
  underline?: boolean;
  underlineColor?: string;
  underlineThickness?: number;
  underlineOffset?: number;      // px below text baseline
}

export interface TypographyLayout {
  layers: TypographyLayer[];
  splitStrategy: 'BY_LINE' | 'BY_WORD' | 'FIXED';
  // BY_LINE: split caption.text on \n or sentence breaks
  // BY_WORD: assign words to layers by index
  // FIXED: layer 0=all text, layer 1=accent word (first emphasized word)
  verticalSpacing?: number;     // px gap between layers
  accentWordIndex?: number;     // which word is the "accent" word (0-based)
}

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
  /** Gradient applied to the ACTIVE/emphasized word only (inactive words use textColor). Used by Hyper-Impact Bold. */
  activeGradientColors?: string[];
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

  // ─── Extended specialRenderer union (Sprint 1-3) ───
  specialRenderer?:
  | 'DUAL_COLOR'
  | 'SHAKE_CAM'
  | 'LIQUID_CHROME'
  | 'SPEECH_BUBBLE'   // Comic-style bubble with tail
  | 'SPLIT_REVEAL'    // Top+bottom clip split apart
  | 'PERSPECTIVE_3D'  // Y-axis rotation illusion
  | 'NEON_FLICKER'    // Per-letter neon tube flicker
  | 'TICKER_SCROLL'   // Horizontal news ticker crawl
  | 'MATRIX_RAIN'     // Matrix rain → final text morph
  | 'BRUSH_STROKE'    // Animated paintbrush stroke behind text
  | 'MAGNETIC'        // Words scatter → spring snap home
  | 'PILL_BADGE'      // Per-word pill/badge background
  | 'MULTI_FLOAT';    // CapCut 3-tier floating word karaoke (Sprint 6)

  // ─── New style config fields (Sprint 1-3) ───
  bubbleTailPosition?: 'BOTTOM_LEFT' | 'BOTTOM_CENTER' | 'BOTTOM_RIGHT';
  pillColorPalette?: string[];   // Cycling pill BG colors per word
  neonFlickerRate?: number;      // ms between flicker events
  tickerSpeed?: number;          // Pixels-per-second for ticker crawl
  matrixCharSet?: string;        // Characters for matrix rain column
  perspectiveDegrees?: number;   // Max Y-rotation degrees (0-60)
  springStiffness?: number;      // Spring physics stiffness constant
  springDamping?: number;        // Spring physics damping ratio

  // ─── Typography Caption (Sprint 5) ───
  typographyLayout?: TypographyLayout;  // If set, routes to drawTypographyCaption()

  // ─── HyperCaption flag (Phase H) ───
  isHyperStyle?: boolean;  // Routes to HTML overlay renderer instead of canvas
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

// --- BRAND KIT ---
export type BrandTone = 'FUNNY' | 'EDUCATIONAL' | 'FOMO' | 'INSPIRATIONAL' | 'PROFESSIONAL';

export interface BrandKit {
  name: string;
  niche: string;
  audience: string;
  tone: BrandTone;
  ctaLink?: string;
  about?: string;
}

// --- CONTENT REMIX ---
export interface RemixResult {
  instagram: string;
  twitter: string;
  linkedin: string;
  youtube: string;
  blog: string;
}

// --- VIRAL COACH ---
export interface ViralScore {
  hook: number;          // 0-100
  engagement: number;    // 0-100
  emotion: number;       // 0-100
  shareability: number;  // 0-100
  cta: number;           // 0-100
  overallScore: number;
  suggestions: string[];
  alternativeHooks: string[];
  verdict: string;
}

// --- TREND & INSPIRATION ---
export interface ContentIdea {
  title: string;
  hook: string;
  outline: string[];
  hashtags: string[];
  platform: SocialPlatform;
  estimatedViralScore: number;
}

// --- SCHEDULER ---
export interface ScheduleOptions {
  mode: 'NOW' | 'SCHEDULED' | 'AUTO_BEST';
  scheduledAt?: string; // ISO date string
  timezone?: string;
}

// ─── AI THUMBNAIL GENERATOR (v2) ─────────────────────────────────────────
export type ThumbnailTemplateId =
  | 'mrbeast'
  | 'gaming'
  | 'finance'
  | 'tech-review'
  | 'documentary'
  | 'anime'
  | 'dark-cinematic'
  | 'viral-reaction'
  | 'hyper-impact-bold';

export interface ThumbnailTemplate {
  id: ThumbnailTemplateId;
  name: string;
  description: string;
  niche: string;
  promptInstructions: string;
  colorPalette: string[];
  textPosition: 'top' | 'center' | 'bottom';
  textStyle: 'bold' | 'outlined' | 'gradient' | 'neon' | 'minimal';
  bgTreatment: string;
  composition: string;
  /** Premium templates render a badge and may use the deterministic text-overlay pipeline. */
  premium?: boolean;
  /**
   * Templates whose text is composited deterministically on the client (canvas/DOM)
   * for pixel-exact typography, instead of being baked into the AI-generated image.
   */
  deterministicText?: boolean;
}

/**
 * Three-line text structure for the "Hyper-Impact Bold" (Hormozi Gradient) template:
 * white italic hook → vibrant orange/yellow gradient keyword → white italic benefit.
 */
export interface HyperImpactLines {
  hook: string;     // Line 1 — punchy action verb / hook (white, italic)
  keyword: string;  // Line 2 — core subject / keyword (orange→yellow gradient focus)
  benefit: string;  // Line 3 — high-value benefit / outcome (white, italic)
}

export interface ThumbnailInput {
  imageDataUrl: string;
  titleText: string;
  hookText: string;
  templateId: ThumbnailTemplateId;
  customPrompt?: string;
  aspectRatio?: AspectRatio;
  /** Populated when templateId === 'hyper-impact-bold' to drive the 3-line layout. */
  hyperLines?: HyperImpactLines;
}

export interface ThumbnailOutput {
  imageDataUrl: string;
  promptUsed: string;
  templateId: ThumbnailTemplateId;
  createdAt: string;
}

export interface ThumbnailGenerationStatus {
  stage: 'analyzing' | 'generating' | 'enhancing' | 'done' | 'error';
  progress: number;
  message?: string;
  error?: string;
}

export interface AIPromptPackage {
  fullPrompt: string;
  template: ThumbnailTemplateId;
  textOverlay: string;
  positivePrompt: string;
  negativePrompt?: string;
  aspectRatio: AspectRatio;
  /** 3-line text for the Hyper-Impact Bold template (forwarded to the server fallback). */
  hyperLines?: HyperImpactLines;
}

// ─── VIRAL TYPOGRAPHY CAPTIONS ─────────────────────────────────────────────
// Output format produced by the generateViralTypographyCaptions() service
// function, driven by the VIRAL_TYPOGRAPHY_INSTRUCTION prompt.

export type ViralTypographyTemplate = 'viral' | 'cinematic' | 'emotional' | 'motivational' | 'funny';
export type ViralTypographyPosition = 'center' | 'bottom_center' | 'top';
export type ViralTypographyBackground = 'none' | 'blur box' | 'gradient highlight' | 'text outline (stroke)';
export type ViralAnimationSpeed = 'fast' | 'medium' | 'slow';

export interface ViralTypographyCaption {
  /** Display text for this caption segment */
  text: string;
  /** Segment start time in seconds */
  start: number;
  /** Segment end time in seconds */
  end: number;
  style: {
    /** Emotion-based template name */
    template: ViralTypographyTemplate;
    /** Word(s) inside `text` that should be highlighted */
    highlight: string[];
    /** Font weight descriptor */
    font: 'extra-bold' | 'serif / thin' | 'handwritten' | 'bold uppercase' | string;
    /** Mixed = some UPPER, some lower; upper = all caps; lower = all lowercase */
    text_case: 'mixed' | 'upper' | 'lower';
    color: {
      /** Base text colour (usually "white") */
      primary: string;
      /** Highlight word colour: yellow / red / green / blue */
      highlight: string;
    };
    animation: {
      /** Entry animation: pop / slide / fade / zoom */
      entry: string;
      /** Per-word emphasis: bounce / shake / scale / flash */
      emphasis: string;
      /** Exit animation: fade / blur / slide out */
      exit: string;
      /** Timing bucket */
      speed: ViralAnimationSpeed;
    };
    /** Vertical / horizontal position on screen */
    position: ViralTypographyPosition;
    /** Background effect behind the text block */
    background: ViralTypographyBackground;
    /** Whether a stroke/outline should be drawn around the text */
    stroke: boolean;
    /** Detected emotional tone of this segment */
    emotion: string;
    /** Optional emoji to display alongside the text (empty string = none) */
    emoji: string;
  };
}

export interface RendererState {
  currentTime?: number;
  captions: Caption[];
  activeConfig: StyleConfig;
  currentStyle: CaptionStyle;
  fontScale: number;
  verticalPos: number;
  horizontalPos: number;
  autoAdjustEnabled: boolean;
  autoMotionEnabled: boolean;
  autoSfxEnabled: boolean;
  isPlaying: boolean;
  // Phase 3: Animation Engine
  entryAnimation?: EntryAnimation;
  exitAnimation?: ExitAnimation;
  wordHighlight?: WordHighlightMode;
  animationSpeed?: 'FAST' | 'MEDIUM' | 'SLOW';
  // Phase 4: Kinetic Typography
  kineticMode?: KineticMode;
  // Phase 5: Sticker & Emoji Overlay
  stickers?: StickerItem[];
  // Phase 12: Aspect Ratio
  aspectRatio?: AspectRatio;
  // Phase H: HyperCaption — skip canvas caption draw when HTML overlay is active
  skipCaptionDraw?: boolean;
  // AI Enhancements
  iconCaptionsEnabled?: boolean;
  smartBrevityEnabled?: boolean;
  autoFramingEnabled?: boolean;
  autoFrameSafeY?: { min: number; max: number };
}

export interface RendererCallbacks {
  onNewCaption?: (caption: Caption) => void; // For SFX triggers
}