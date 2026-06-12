/**
 * Typography Reel — type definitions for the AI cinematic editor pipeline.
 *
 * The pipeline has 4 stages:
 *   Stage 1 — AI Script Analyzer:  audio → EnrichedCaption[]   (Gemini)
 *   Stage 2 — Audio Beat Analyzer: audio → BeatGrid             (Web Audio FFT)
 *   Stage 3 — Choreography Engine: captions + beats → MotionBeat[] (pure local logic)
 *   Stage 4 — Render:              MotionBeat[] → MP4           (existing renderer)
 *
 * Stage 3 outputs the existing `MotionBeat` schema from motionGraphicsService,
 * so the heavy renderer work is reused as-is.
 */

// ─── Typography-Specific Primitives & Palettes (NOT from motion graphics) ──────

/** Typography animation effect type. Pure text effects only. */
export type TypographyPrimitive =
  | 'big-text-reveal'
  | 'aurora-text'
  | 'shimmer-text'
  | 'morph-text'
  | 'glitch-text'
  | 'fire-text'
  | 'wave-text'
  | 'neon-sign'
  | 'kinetic-text'
  | 'hyper-text'
  | 'typewriter'
  | 'text-scramble'
  | 'split-text-reveal'
  | 'cinematic-title-opener'
  | 'trailer-title'
  | 'word-emphasis-flash';

/** Typography color palette (text-specific). */
export type TypographyPalette =
  | 'gradient-blast'
  | 'cinematic'
  | 'energetic'
  | 'neon-bright'
  | 'pastel-pop';

/** Parameters for a single typography animation beat. */
export interface TypographyBeatParams {
  text?: string;
  palette: TypographyPalette;
  intensity: 1 | 2 | 3;
  anchor?: 'top' | 'center' | 'bottom';
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
}

/** A single typography animation. Independent from MotionBeat. */
export interface TypographyBeat {
  id: string;
  startTime: number;
  endTime: number;
  primitive: TypographyPrimitive;
  params: TypographyBeatParams;
  rationale?: string;
}

// ─── Aspect ratio (shared with motion graphics) ──────────────────────────────

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5';

// ─── Stage 1 output: enriched captions ───────────────────────────────────────

/** Semantic role of a single word in the script. Drives primitive selection. */
export type WordRole =
  | 'action'    // verbs: run, click, buy, launch
  | 'emotion'   // emotional adjectives: amazing, heartbreaking, terrifying
  | 'subject'   // key nouns: AI, money, success, the future
  | 'number'    // statistics, dates, counts: 90%, 2025, three
  | 'connector' // articles, prepositions, fillers: the, and, of, is
  | 'cta'       // call-to-action: subscribe, follow, link below, click
  | 'tech';     // technical/digital terms: API, code, algorithm

/** Emotion class for a caption segment. Drives palette + animation style. */
export type SegmentEmotion =
  | 'awe'        // wonder, amazement → aurora-text, shimmer
  | 'shock'      // surprise, disbelief → glitch-text, flash
  | 'joy'        // happy, celebratory → confetti, kinetic-text
  | 'anger'      // intense, dramatic → fire-text, shake
  | 'sadness'    // melancholy, reflective → soft fade, slow reveal
  | 'tension'    // suspense, building → typewriter, slow zoom
  | 'inspiration'// motivational → big-text-reveal, gradient swell
  | 'humor'      // funny, light → bounce, wave-text
  | 'authority'  // serious, factual → clean reveal, neon-sign
  | 'neutral';   // default / informational

/** Visual layout style for a scene. Inspired by the YT tutorial taxonomies. */
export type ReelLayoutKind =
  | 'one-on-one'   // one line at a time, centered (default for narrative)
  | 'straight'     // single line, large center text (impact moments)
  | 'cluster'      // multi-line, varied sizes, scattered (busy / list moments)
  | 'diagrammatic' // text + icons arranged in a layout (data / steps)
  | 'auto';        // let the choreography engine decide per scene

/** A single word with timing + AI-tagged metadata. Extends WordTiming. */
export interface EnrichedWord {
  text: string;
  start: number;          // seconds
  end: number;
  role: WordRole;
  emphasisScore: number;  // 0..100 — how much visual weight this word deserves
}

/** A caption segment with the AI's structural intent attached. */
export interface EnrichedCaption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  words: EnrichedWord[];
  emotion: SegmentEmotion;
  emotionIntensity: 1 | 2 | 3;   // mild | strong | extreme
  layoutHint: ReelLayoutKind;
  /** True iff this segment is the start of a new scene (topic shift / hook). */
  sceneBoundary: boolean;
  /** Optional one-emoji that visually represents the segment (auto-matched). */
  emoji?: string;
}

// ─── Stage 2 output: audio beat grid ─────────────────────────────────────────

export interface BeatGrid {
  /** Timestamps (seconds) of detected onsets — beat candidates. */
  beats: number[];
  /** Estimated tempo. NaN if no clear tempo detected. */
  bpm: number;
  /** Per-frame energy curve (RMS over short windows). Used for intensity hints. */
  energy: number[];
  /** Sample rate of the energy curve in Hz (typically 100). */
  energyHz: number;
  /** Total audio duration in seconds. */
  duration: number;
  /**
   * Downsampled waveform for timeline display. 1000 points, each in [0, 1].
   * Index maps linearly to time: index / 1000 * duration = seconds.
   */
  waveform: number[];
}

// ─── Stage 3 output: full reel timeline ──────────────────────────────────────

export interface SceneSpec {
  index: number;
  startTime: number;
  endTime: number;
  emotion: SegmentEmotion;
  layout: ReelLayoutKind;
  captions: EnrichedCaption[];
}

export interface ReelTimeline {
  beats: TypographyBeat[];    // ← Typography animations (NOT motion graphics)
  scenes: SceneSpec[];        // ← for the timeline visualisation
  duration: number;
  palette: TypographyPalette;
  aspectRatio: AspectRatio;
  profileId: string;
}

// ─── Theme profile ───────────────────────────────────────────────────────────

/**
 * A theme profile is the user-facing "look" preset. It overrides the default
 * primitive selection rules + locks the palette/font. Six profiles ship in v1.
 */
export interface ThemeProfile {
  id: string;
  name: string;
  description: string;
  palette: TypographyPalette;
  fontFamily: string;
  fontWeight: number | string;
  /** Hand-tuned primitive choices per emotion. Falls back to default rules. */
  primitiveByEmotion: Partial<Record<SegmentEmotion, TypographyPrimitive>>;
  /** Default primitive for emphasis words (emphasisScore ≥ 75). */
  emphasisPrimitive: TypographyPrimitive;
  /** Color of the gradient/preview chip. */
  previewGradient: string;
  /** Default intensity bias 1..3. */
  intensityBias: 1 | 2 | 3;
}

// ─── Pipeline progress reporting ─────────────────────────────────────────────

export type ReelPipelineStage =
  | 'idle'
  | 'analyzing'      // Gemini call
  | 'detecting-beats'// FFT
  | 'choreographing' // local composition
  | 'ready'
  | 'exporting'
  | 'error';

export interface ReelPipelineState {
  stage: ReelPipelineStage;
  progress: number;     // 0..1 if known, else 0
  message: string;
  error?: string;
}
