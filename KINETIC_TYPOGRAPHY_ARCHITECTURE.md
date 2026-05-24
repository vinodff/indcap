# Kinetic Typography Reel System — Technical Architecture Document

**Version:** 1.0  
**Date:** 2026-05-24  
**Scope:** Desktop web application (1080×1920 portrait canvas)  
**Team Size:** Assume 2-3 engineers, 1 designer, 1 QA  
**Delivery:** Phase 1: 6 weeks, Phase 2: 8 weeks, Phase 3: 4 weeks  

---

## 1. EXECUTIVE SUMMARY

This document specifies the complete architecture for a **kinetic typography reel system** — an AI-powered video editor that transforms audio into animated text sequences. The system is *not* a general motion graphics tool; it specializes exclusively in **word-by-word animation** synchronized to audio beats, emotion, and emphasis.

**Design Principles:**
- **CapCut-grade simplicity:** 3 clicks to reel (upload audio → pick theme → export MP4)
- **Canvas-only rendering:** No Three.js, no complex 3D; 2D kinetic typography is the core
- **Emotion-driven animation:** Gemini analyzes speech/music → selects animation primitives
- **Beat-snapped timing:** Web Audio FFT → rhythm alignment for impact
- **Offline-capable:** All processing (except initial Gemini call) happens in-browser
- **Real-time preview:** 30 FPS canvas + audio sync before export

**Key Technologies:**
- **Audio:** Web Audio API (FFT, onset detection, BPM estimation)
- **AI:** Google Gemini (transcription, emotion analysis, word importance scoring)
- **Rendering:** Canvas 2D API + requestAnimationFrame
- **Export:** MediaRecorder → MP4 (with audio baked in)
- **State:** TypeScript + React hooks + undo/redo via immer

---

## 2. FILE STRUCTURE & ORGANIZATION

### 2.1 Existing Files to Keep

```
PROJECT_ROOT/
├── components/
│   ├── TypographyReelStudio.tsx          ← Main entry point (already exists)
│   ├── motion/
│   │   ├── MotionStage.tsx              ← Canvas renderer (reused)
│   │   ├── MotionTimeline.tsx           ← Beat visualization (reused)
│   │   └── MotionExportDialog.tsx       ← Export UI (reused)
│   └── VideoPreviewArea.tsx             ← Preview canvas (reused)
├── services/
│   ├── motionGraphicsService.ts         ← Beat type defs (reused)
│   ├── motionGraphicsExport.ts          ← Export logic (reused)
│   ├── captionRenderer.ts               ← Canvas rendering (reused for fallback)
│   └── typographyReel/                  ← NEW: core pipeline
│       ├── types.ts                     ✓ (exists)
│       ├── scriptAnalyzer.ts            ✓ (exists)
│       ├── beatAnalyzer.ts              ✓ (exists)
│       ├── choreographyEngine.ts        ✓ (exists)
│       ├── themeProfiles.ts             ✓ (exists)
│       ├── assetRegistry.ts             ✓ (exists)
│       ├── emotionAnimationMap.ts       ← NEW: emotion→animation LUT
│       ├── wordEmphasisScorer.ts        ← NEW: word importance
│       ├── beatSnapper.ts               ← NEW: timing quantization
│       ├── fatiguePreventionEngine.ts   ← NEW: animation variety
│       └── typographyPrimitives/        ← NEW: animation definition library
│           ├── animationRegistry.ts     ← LUT of all animation types
│           ├── kinetic-text.ts          ← Bounce-in kinetic letter animation
│           ├── aurora-text.ts           ← Shimmer gradient reveal
│           ├── glitch-text.ts           ← Distortion flicker
│           ├── fire-text.ts             ← Red/orange glow burst
│           ├── wave-text.ts             ← Sine-wave letter undulation
│           ├── typewriter.ts            ← Sequential character reveal
│           ├── morph-text.ts            ← Shape transition
│           └── [more primitives...]
├── hooks/
│   ├── useTypographyReel.ts            ← NEW: pipeline orchestration hook
│   └── useCanvasRenderer.ts            ← NEW: frame rendering + sync
├── constants.ts                         ← Update: add Gemini prompts for reel
└── index.html                           ← Update: preload reel fonts
```

### 2.2 Files to Remove (Motion Graphics Cruft)

- `components/MotionGraphicsPanel.tsx` — not needed for typography reel
- `components/motion/MotionBeatEditor.tsx` — no per-beat editing in v1
- `services/motionGraphicsService.ts` — reuse type defs, not the full service
- `services/motionGraphicsRenderer.ts` — too generic; use canvas primitives instead

### 2.3 Directory Structure Rationale

```
services/typographyReel/
├── types.ts                    │ Type definitions (read-only)
├── pipeline/                   ├─ PIPELINE STAGE (4 stages)
│   ├── scriptAnalyzer.ts       │  Stage 1: Transcription + AI enrichment
│   ├── beatAnalyzer.ts         │  Stage 2: Audio onset detection
│   ├── choreographyEngine.ts   │  Stage 3: Beat composition
│   └── renderScheduler.ts      │  Stage 4: Frame scheduling (NEW)
├── algorithms/                 ├─ CORE ALGORITHMS
│   ├── emotionAnimationMap.ts  │  Emotion → Animation decision tree
│   ├── wordEmphasisScorer.ts   │  Word importance scoring
│   ├── beatSnapper.ts          │  Timing quantization
│   └── fatiguePreventionEngine.ts │ Animation variety enforcement
├── themes/                     ├─ THEMING
│   ├── themeProfiles.ts        │  (already exists)
│   └── assetRegistry.ts        │  (already exists)
└── primitives/                 └─ ANIMATION LIBRARY
    ├── animationRegistry.ts
    ├── [6+ animation types]
    └── README.md (developer guide)
```

---

## 3. CORE COMPONENTS & SERVICES

### 3.1 React Component Hierarchy

```
App.tsx (or TypographyReelStudio.tsx)
│
├─ TypographyReelStudio (main studio)
│  │
│  ├─ InputPanel (left sidebar)
│  │  ├─ AudioDropZone
│  │  ├─ ThemeSelector
│  │  ├─ LayoutSelector
│  │  └─ GenerateButton
│  │
│  ├─ PreviewArea (center canvas)
│  │  ├─ MotionStage (Canvas)
│  │  │  └─ renderFrame() [RAF loop]
│  │  ├─ PlaybackControls (play/pause/scrub)
│  │  └─ ProgressIndicator
│  │
│  └─ TimelinePanel (bottom)
│     ├─ MotionTimeline (beat visualization)
│     ├─ SceneMarkers (section boundaries)
│     └─ ExportButton
│
└─ MotionExportDialog (modal)
   └─ ExportOptions (quality, format, aspect ratio)
```

### 3.2 Service Modules

#### **3.2.1 Pipeline Orchestration: `useTypographyReel.ts` Hook**

```typescript
/**
 * Main orchestration hook — coordinates the 4-stage pipeline.
 * Called once per "Generate" button click.
 */

interface ReelGenerationInput {
  audioFile: File;
  themeId: string;
  layoutOverride?: ReelLayoutKind | 'auto';
  aspectRatio?: AspectRatio;
}

interface ReelGenerationState {
  stage: ReelPipelineStage;
  progress: number;           // 0..1
  captions: EnrichedCaption[] | null;
  beatGrid: BeatGrid | null;
  timeline: ReelTimeline | null;
  error: string | null;
  audioUrl: string | null;
  audioDuration: number;
}

export function useTypographyReel() {
  const [state, setState] = useState<ReelGenerationState>({ /* ... */ });
  
  const generate = async (input: ReelGenerationInput) => {
    try {
      // Stage 1: Analyze script (Gemini)
      setState(s => ({ ...s, stage: 'analyzing' }));
      const captions = await analyzeAudioForReel(input.audioFile);
      setState(s => ({ ...s, captions, progress: 0.25 }));
      
      // Stage 2: Detect beats (Web Audio FFT)
      setState(s => ({ ...s, stage: 'detecting-beats' }));
      const beatGrid = await analyzeBeats(input.audioFile);
      setState(s => ({ ...s, beatGrid, progress: 0.5 }));
      
      // Stage 3: Choreograph (local composition)
      setState(s => ({ ...s, stage: 'choreographing' }));
      const theme = getThemeProfile(input.themeId);
      const timeline = compose(captions, beatGrid, theme, {
        layoutOverride: input.layoutOverride,
        aspectRatio: input.aspectRatio,
      });
      setState(s => ({
        ...s,
        timeline,
        stage: 'ready',
        progress: 1.0,
      }));
      
    } catch (err) {
      setState(s => ({
        ...s,
        error: err instanceof Error ? err.message : String(err),
        stage: 'error',
      }));
    }
  };
  
  return { state, generate };
}
```

#### **3.2.2 Canvas Renderer: `useCanvasRenderer.ts` Hook**

```typescript
/**
 * Real-time frame rendering with audio sync.
 * Draws the current timeline at the requested time.
 */

interface RendererConfig {
  canvas: HTMLCanvasElement;
  timeline: ReelTimeline;
  audioContext: AudioContext;
  audioSource: AudioBufferSource;
  fps: number;
}

export function useCanvasRenderer(config: RendererConfig) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const rafIdRef = useRef<number>();
  
  const renderFrame = (ctx: CanvasRenderingContext2D, time: number) => {
    // 1. Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Find active beats at this time
    const activeBeat = config.timeline.beats.find(
      b => time >= b.startTime && time < b.endTime
    );
    
    // 3. Compute animation progress (0..1 within beat duration)
    const progress = activeBeat
      ? (time - activeBeat.startTime) / (activeBeat.endTime - activeBeat.startTime)
      : 0;
    
    // 4. Get primitive renderer for this beat
    const primitive = getPrimitiveRenderer(activeBeat.primitive);
    
    // 5. Render the primitive with current progress
    primitive.render(ctx, {
      text: activeBeat.params.text,
      progress,
      palette: activeBeat.params.palette,
      intensity: activeBeat.params.intensity,
      // ... more params
    });
  };
  
  const play = () => {
    setIsPlaying(true);
    const startTime = performance.now();
    const startAudioTime = currentTime;
    
    const loop = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const newTime = startAudioTime + elapsed;
      
      // 1. Keep canvas in sync with audio
      setCurrentTime(newTime);
      
      // 2. Render this frame
      const ctx = config.canvas.getContext('2d')!;
      renderFrame(ctx, newTime);
      
      // 3. Continue until end
      if (newTime < config.timeline.duration) {
        rafIdRef.current = requestAnimationFrame(loop);
      } else {
        setIsPlaying(false);
      }
    };
    
    rafIdRef.current = requestAnimationFrame(loop);
  };
  
  return {
    play,
    pause: () => setIsPlaying(false),
    seek: (time: number) => setCurrentTime(time),
    currentTime,
    isPlaying,
  };
}
```

#### **3.2.3 Emotion-to-Animation Map: `emotionAnimationMap.ts`**

```typescript
/**
 * Core decision tree: emotion + intensity → animation primitive + style.
 * Completely deterministic — same inputs always produce same output.
 */

export type EmotionAnimationRule = {
  emotion: SegmentEmotion;
  intensity: 1 | 2 | 3;
  primitive: PrimitiveType;
  animationDuration: number;     // in seconds
  easeFunction: EaseCurve;
  colorStrategy: 'gradient' | 'pulse' | 'glow' | 'static';
};

const EMOTION_ANIMATION_MAP: Record<SegmentEmotion, EmotionAnimationRule[]> = {
  'awe': [
    {
      intensity: 1,
      primitive: 'big-text-reveal',
      animationDuration: 1.2,
      easeFunction: 'ease-out',
      colorStrategy: 'gradient',
    },
    {
      intensity: 2,
      primitive: 'aurora-text',
      animationDuration: 1.5,
      easeFunction: 'ease-out-quad',
      colorStrategy: 'gradient',
    },
    {
      intensity: 3,
      primitive: 'aurora-text',
      animationDuration: 0.8,
      easeFunction: 'ease-in-out',
      colorStrategy: 'pulse',
    },
  ],
  
  'shock': [
    {
      intensity: 1,
      primitive: 'kinetic-text',
      animationDuration: 0.6,
      easeFunction: 'ease-out-bounce',
      colorStrategy: 'static',
    },
    {
      intensity: 2,
      primitive: 'glitch-text',
      animationDuration: 0.4,
      easeFunction: 'ease-in-out',
      colorStrategy: 'pulse',
    },
    {
      intensity: 3,
      primitive: 'glitch-text',
      animationDuration: 0.25,
      easeFunction: 'ease-in',
      colorStrategy: 'pulse',
    },
  ],
  
  'joy': [
    {
      intensity: 1,
      primitive: 'wave-text',
      animationDuration: 1.0,
      easeFunction: 'ease-out',
      colorStrategy: 'gradient',
    },
    {
      intensity: 2,
      primitive: 'kinetic-text',
      animationDuration: 0.7,
      easeFunction: 'ease-out-bounce',
      colorStrategy: 'gradient',
    },
    {
      intensity: 3,
      primitive: 'kinetic-text',
      animationDuration: 0.5,
      easeFunction: 'ease-out-back',
      colorStrategy: 'pulse',
    },
  ],
  
  // ... more emotions ...
};

export function getAnimationRule(
  emotion: SegmentEmotion,
  intensity: 1 | 2 | 3,
): EmotionAnimationRule {
  const rules = EMOTION_ANIMATION_MAP[emotion];
  return rules[intensity - 1];
}
```

#### **3.2.4 Word Emphasis Scorer: `wordEmphasisScorer.ts`**

```typescript
/**
 * Analyzes each word's importance based on:
 *   - Linguistic role (subject > action > connector)
 *   - Frequency in the script (rare words score higher)
 *   - Position in sentence (first words score higher)
 *   - Phonetic stress (if available from Gemini)
 *
 * Returns a 0..100 score for each word.
 * Threshold 85+ = visual emphasis (larger glow, longer duration)
 */

export function scoreWordEmphasis(
  word: EnrichedWord,
  context: {
    position: number;           // 0 = first word in caption
    totalWords: number;
    sentenceStart: boolean;
    wordFrequency: Map<string, number>;  // word → count
  },
): number {
  let score = 50;  // baseline
  
  // 1. Role-based weight
  const roleWeights: Record<WordRole, number> = {
    'subject': 30,      // nouns, key concepts
    'action': 25,       // verbs
    'emotion': 25,      // adjectives
    'number': 20,       // stats (less often emphasized)
    'cta': 35,          // "subscribe", "click" — HERO words
    'tech': 20,         // technical terms (context-dependent)
    'connector': -10,   // articles, prepositions (de-emphasize)
  };
  score += roleWeights[word.role] ?? 0;
  
  // 2. Frequency-based (rare words = higher emphasis)
  const freq = context.wordFrequency.get(word.text.toLowerCase()) ?? 0;
  if (freq === 1) score += 15;
  if (freq <= 2) score += 10;
  // frequent words don't get bonus
  
  // 3. Position-based
  if (context.position === 0) score += 15;      // first word
  if (context.sentenceStart) score += 10;
  if (context.position === context.totalWords - 1) score += 8; // last word
  
  // 4. Clamp to 0..100
  return Math.max(0, Math.min(100, score));
}
```

#### **3.2.5 Beat Snapper: `beatSnapper.ts`**

```typescript
/**
 * Quantizes word/caption start times to the nearest audio beat,
 * within a tolerance window. This creates the "snappy" feel where
 * text impacts align with kick drums, snares, etc.
 *
 * Algorithm:
 *   1. Find nearest beat within ±80 ms
 *   2. If found and score is high, snap
 *   3. Otherwise keep original time
 *
 * Decision tree:
 *   - Word duration < 150ms?     Snap to nearest beat (must land within it)
 *   - Caption spans multiple beats? Snap start to beat, end to natural time
 *   - No beats within tolerance?   Keep original time (speech fallback)
 */

export interface SnapResult {
  originalTime: number;
  snappedTime: number;
  snapped: boolean;
  reason: string;
}

export function snapWordToBeat(
  word: EnrichedWord,
  grid: BeatGrid,
  options: {
    toleranceSec?: number;
    emphasisScore?: number;  // Hero words snap more aggressively
  } = {},
): SnapResult {
  const tolerance = options.toleranceSec ?? 0.08;
  const isHeroWord = (options.emphasisScore ?? 0) >= 85;
  
  // Find nearest beat
  const nearestBeat = findNearestBeat(word.start, grid.beats);
  if (!nearestBeat || nearestBeat.distance > tolerance) {
    return {
      originalTime: word.start,
      snappedTime: word.start,
      snapped: false,
      reason: 'no beat within tolerance',
    };
  }
  
  // Hero words snap more eagerly (tolerance *= 1.25)
  const effectiveTolerance = isHeroWord ? tolerance * 1.25 : tolerance;
  if (nearestBeat.distance <= effectiveTolerance) {
    return {
      originalTime: word.start,
      snappedTime: nearestBeat.time,
      snapped: true,
      reason: `snapped to beat ${nearestBeat.index} (${isHeroWord ? 'hero' : 'normal'})`,
    };
  }
  
  return {
    originalTime: word.start,
    snappedTime: word.start,
    snapped: false,
    reason: 'distance exceeds tolerance',
  };
}

function findNearestBeat(
  time: number,
  beats: number[],
): { time: number; distance: number; index: number } | null {
  if (beats.length === 0) return null;
  
  let bestIdx = 0;
  let bestDist = Math.abs(beats[0] - time);
  
  for (let i = 1; i < beats.length; i++) {
    const dist = Math.abs(beats[i] - time);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  
  return { time: beats[bestIdx], distance: bestDist, index: bestIdx };
}
```

#### **3.2.6 Fatigue Prevention Engine: `fatiguePreventionEngine.ts`**

```typescript
/**
 * Ensures that the same animation primitive is not used too frequently.
 * Viewer fatigue happens when the eye sees the same motion pattern repeating.
 *
 * Rules:
 *   - No primitive used more than 3 times consecutively
 *   - At least 1 different primitive between repeats
 *   - High-energy primitives (kinetic-text, glitch) capped at 2 per 10s
 *   - High-intensity scenes vary primitives more (1 per beat)
 *
 * Strategy: When fatigue is detected, consult the fallback chain:
 *   emotion-rule → layout-rule → emotion-default → big-text-reveal
 */

export interface FatigueAnalysis {
  primitiveHistory: PrimitiveType[];
  isFatigued: boolean;
  recommendation: PrimitiveType;
  reason: string;
}

export function checkFatigue(
  timeline: MotionBeat[],
  nextBeatIndex: number,
  nextEmotion: SegmentEmotion,
  layout: ReelLayoutKind,
): FatigueAnalysis {
  const history = timeline
    .slice(Math.max(0, nextBeatIndex - 5), nextBeatIndex)
    .map(b => b.primitive);
  
  const currentPrimitive = timeline[nextBeatIndex - 1]?.primitive;
  
  // Check repetition (no more than 3 in a row)
  const consecutiveCount = currentPrimitive
    ? history.filter(p => p === currentPrimitive).length
    : 0;
  
  const isFatigued =
    consecutiveCount >= 3 ||
    (currentPrimitive && history[history.length - 1] === currentPrimitive);
  
  if (!isFatigued) {
    return {
      primitiveHistory: history,
      isFatigued: false,
      recommendation: currentPrimitive ?? 'big-text-reveal',
      reason: 'no fatigue detected',
    };
  }
  
  // Recommend alternative
  const rule = getAnimationRule(nextEmotion, 2);
  const fallbacks = [
    rule.primitive,
    LAYOUT_PRIMITIVE_OVERRIDE[layout],
    DEFAULT_EMOTION_PRIMITIVE[nextEmotion],
    'big-text-reveal',
  ].filter(Boolean) as PrimitiveType[];
  
  const recommendation = fallbacks.find(p => !history.includes(p))
    ?? fallbacks[0];
  
  return {
    primitiveHistory: history,
    isFatigued: true,
    recommendation,
    reason: `fatigue detected: ${consecutiveCount} consecutive uses of ${currentPrimitive}`,
  };
}
```

---

## 4. DATA FLOW DIAGRAMS

### 4.1 Full Pipeline: Audio → Export

```
┌─────────────────────────────────────────────────────────────────────┐
│                     KINETIC TYPOGRAPHY REEL PIPELINE                 │
└─────────────────────────────────────────────────────────────────────┘

INPUT
  │
  ├─ Audio File (≤ 60s MP3/WAV/OGG)
  ├─ Theme ID (string)
  └─ Layout Override ('auto' | 'one-on-one' | 'straight' | 'cluster' | 'diagrammatic')
  │
  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 1: AI SCRIPT ANALYSIS (Gemini)                                │
│ ─────────────────────────────────────────────────────────────────── │
│ Input:  Audio File                                                   │
│ Output: EnrichedCaption[]                                            │
│                                                                       │
│ Process:                                                              │
│  1. Convert audio to base64                                          │
│  2. Call Gemini with system instruction + schema                     │
│  3. Gemini returns:                                                  │
│     - Transcription (verbatim)                                       │
│     - Per-word: role, emphasisScore (0..100)                         │
│     - Per-segment: emotion, emotionIntensity (1-3), layoutHint       │
│     - Scene boundaries (topic shifts)                                │
│  4. Normalize & validate (clamp values, safe enums)                  │
│                                                                       │
│ Output example:                                                       │
│ [                                                                     │
│   {                                                                   │
│     id: "seg-0-abc",                                                 │
│     text: "The future of AI is here",                                │
│     startTime: 0.5,                                                  │
│     endTime: 2.5,                                                    │
│     emotion: "awe",                                                  │
│     emotionIntensity: 2,                                             │
│     layoutHint: "straight",                                          │
│     sceneBoundary: true,                                             │
│     words: [                                                          │
│       { text: "The", role: "connector", emphasisScore: 20, ... },    │
│       { text: "future", role: "subject", emphasisScore: 85, ... },   │
│       { text: "of", role: "connector", emphasisScore: 15, ... },     │
│       { text: "AI", role: "tech", emphasisScore: 90, ... },         │
│       { text: "is", role: "connector", emphasisScore: 10, ... },     │
│       { text: "here", role: "emotion", emphasisScore: 75, ... },     │
│     ],                                                                │
│   },                                                                  │
│   ...                                                                 │
│ ]                                                                     │
│                                                                       │
│ Key Decision Points:                                                 │
│  ✓ Which words to emphasize? (Gemini decides via emphasisScore)      │
│  ✓ Where do scenes change? (sceneBoundary flag)                      │
│  ✓ What emotion drives the animation? (emotion enum)                 │
│  ✓ How intense? (emotionIntensity 1-3)                               │
│  ✓ What layout style? (layoutHint)                                   │
│                                                                       │
│ Error Handling:                                                       │
│  ✗ Network error → retry with exponential backoff                    │
│  ✗ Malformed JSON → throw "AI analyzer returned malformed JSON"      │
│  ✗ Invalid enum → normalize to default (neutral, 'one-on-one')       │
└─────────────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 2: AUDIO BEAT DETECTION (Web Audio FFT)                       │
│ ─────────────────────────────────────────────────────────────────── │
│ Input:  Audio File                                                   │
│ Output: BeatGrid { beats: number[], bpm: number, energy: number[] }  │
│                                                                       │
│ Process:                                                              │
│  1. Decode audio to PCM (Web Audio API)                              │
│  2. Mix to mono (if stereo)                                          │
│  3. Compute short-term energy (RMS over 1024-sample windows)         │
│     ▸ Output: energy array @ 100 Hz (one value per 10ms)             │
│  4. Compute spectral flux (high-freq energy difference)              │
│     ▸ Detects transients: consonants, kick drums, snares             │
│  5. Peak picking with adaptive threshold                             │
│     ▸ Find local maxima in flux                                      │
│     ▸ Must exceed 1.4× local moving average                          │
│     ▸ Minimum 120ms gap between onsets (refractory period)           │
│  6. Estimate BPM from inter-beat-interval histogram                  │
│     ▸ Bins intervals into 5-BPM buckets                              │
│     ▸ Return mode (most common tempo)                                │
│                                                                       │
│ Output example:                                                       │
│ {                                                                     │
│   beats: [0.12, 0.65, 1.22, 1.80, 2.45, ...],  // onset times (s)   │
│   bpm: 120,                                                           │
│   energy: [0.05, 0.12, 0.08, ..., 0.03],       // 100 Hz frame rate  │
│   energyHz: 100,                                                      │
│   duration: 60.0,                                                     │
│ }                                                                     │
│                                                                       │
│ Key Decision Points:                                                 │
│  ✓ Are there clear beats? (bpm != NaN)                               │
│  ✓ What's the audio's texture? (energy[] shows energy curve)         │
│  ✓ Will snapping help this audio? (beats.length > threshold)         │
│                                                                       │
│ Error Handling:                                                       │
│  ✗ Decode fails → throw "Failed to decode audio"                     │
│  ✗ < 4 detected onsets → bpm = NaN (no strong rhythm)                │
│  ✗ Very short audio (< 0.5s) → return empty beats array              │
└─────────────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 3: CHOREOGRAPHY (Emotion + Beats → MotionBeat[])              │
│ ─────────────────────────────────────────────────────────────────── │
│ Input:  captions: EnrichedCaption[]                                  │
│         beatGrid: BeatGrid                                           │
│         theme: ThemeProfile                                          │
│         options: { layoutOverride?, aspectRatio? }                   │
│ Output: ReelTimeline { beats: MotionBeat[], scenes: SceneSpec[] }    │
│                                                                       │
│ Process:                                                              │
│  1. Group captions into scenes (via sceneBoundary flag)              │
│                                                                       │
│  2. For each scene:                                                  │
│     a. Decide scene intensity (max emotionIntensity)                 │
│     b. Emit background pulse beat (if intensity ≥ 2)                 │
│     c. Emit transition beat (if not first scene)                     │
│                                                                       │
│  3. For each caption:                                                │
│     a. Select animation primitive:                                   │
│        ├─ 1st choice: theme.primitiveByEmotion[emotion]              │
│        ├─ 2nd choice: LAYOUT_PRIMITIVE_OVERRIDE[layout]              │
│        ├─ 3rd choice: DEFAULT_EMOTION_PRIMITIVE[emotion]             │
│        └─ 4th choice: 'big-text-reveal' (safe default)               │
│     b. Check fatigue (is this primitive overused?)                   │
│        └─ If fatigued: use recommendation from fallback chain        │
│     c. Snap start time to nearest beat (±80ms tolerance)             │
│     d. Emit text beat (start, end, primitive, text, palette, ...)    │
│                                                                       │
│  4. For each hero word (emphasisScore ≥ 85):                         │
│     a. Snap start time to beat                                       │
│     b. Emit emphasis-flash beat (0.45s duration)                     │
│     c. Use theme.emphasisPrimitive                                   │
│                                                                       │
│  5. Sort all beats by startTime (renderer expects this)              │
│                                                                       │
│ Output example:                                                       │
│ {                                                                     │
│   beats: [                                                            │
│     {                                                                 │
│       id: "beat-abc123",                                             │
│       startTime: 0.5,                                                │
│       endTime: 2.5,                                                  │
│       primitive: "aurora-text",                                      │
│       params: {                                                       │
│         text: "The future of AI is here",                            │
│         palette: "neon-bright",                                      │
│         intensity: 2,                                                │
│         anchor: "center",                                            │
│       },                                                              │
│       rationale: "awe / straight",                                   │
│     },                                                                │
│     { // hero word emphasis                                          │
│       id: "beat-def456",                                             │
│       startTime: 1.12,      // snapped to nearest beat                │
│       endTime: 1.57,                                                 │
│       primitive: "word-emphasis-flash",                              │
│       params: {                                                       │
│         text: "future",                                              │
│         palette: "neon-bright",                                      │
│         intensity: 3,                                                │
│       },                                                              │
│       rationale: "emphasis \"future\" (score 85)",                   │
│     },                                                                │
│     ...                                                               │
│   ],                                                                  │
│   scenes: [                                                           │
│     {                                                                 │
│       index: 0,                                                       │
│       startTime: 0.5,                                                │
│       endTime: 10.0,                                                 │
│       emotion: "awe",                                                │
│       layout: "straight",                                            │
│       captions: [/* ... */],                                         │
│     },                                                                │
│     ...                                                               │
│   ],                                                                  │
│   duration: 60.0,                                                    │
│   palette: "neon-bright",                                            │
│   aspectRatio: "9:16",                                               │
│   profileId: "devon-jatho",                                          │
│ }                                                                     │
│                                                                       │
│ Key Decision Points:                                                 │
│  ✓ Which animation primitive? (emotion → map → primitive)            │
│  ✓ When does it start/end? (snap to beat? keep original time?)       │
│  ✓ How intense? (emotionIntensity vs theme.intensityBias)            │
│  ✓ Is the primitive overused? (fatigue check)                        │
│                                                                       │
│ Error Handling:                                                       │
│  ✗ Unsupported primitive → fallback to big-text-reveal               │
│  ✗ Empty captions list → return empty timeline                       │
│  ✗ Theme not found → use default theme                               │
└─────────────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STAGE 4: RENDER & EXPORT (Canvas + MediaRecorder)                   │
│ ─────────────────────────────────────────────────────────────────── │
│ Input:  timeline: ReelTimeline                                       │
│         audioContext & audioBuffer (for sync)                        │
│ Output: MP4 file (video + audio, 30 FPS, 1080×1920)                 │
│                                                                       │
│ Process:                                                              │
│  1. Create Canvas (1080×1920)                                        │
│  2. Start recording via MediaRecorder (video + audio track)          │
│  3. Start RAF loop (30 FPS):                                         │
│     ├─ Get current playback time (from audio context)                │
│     ├─ Find active beat at this time                                 │
│     ├─ Compute animation progress (0..1)                             │
│     ├─ Call primitive.render(ctx, params, progress)                  │
│     └─ Continue until timeline.duration                              │
│  4. Stop recording → triggers MediaRecorder's ondataavailable        │
│  5. Create Blob from recorded chunks                                 │
│  6. Trigger download as .mp4 file                                    │
│                                                                       │
│ Key Rendering Steps:                                                 │
│  ✓ Clear canvas black                                                │
│  ✓ Find active beat (binary search in timeline.beats)                │
│  ✓ Calculate animation progress (0..1 within beat duration)          │
│  ✓ Look up primitive renderer (canvas-based, no Three.js)            │
│  ✓ Render primitive with palette + intensity                         │
│  ✓ Sync playback head with audio (via audioContext.currentTime)      │
│                                                                       │
│ Error Handling:                                                       │
│  ✗ Recording not supported → throw "MediaRecorder not supported"     │
│  ✗ Codec issues → browser auto-selects VP8 or H264                   │
│  ✗ Memory limit → chunk the render process (if > 2GB timeline)       │
│                                                                       │
│ Output: MP4 file ready to download                                   │
└─────────────────────────────────────────────────────────────────────┘
  │
  ▼
OUTPUT
  └─ MP4 file (audio + video baked in, ready to upload to TikTok/IG/YT)
```

### 4.2 Emotion-to-Animation Decision Tree

```
GIVEN:  segment.emotion (string)
        segment.emotionIntensity (1 | 2 | 3)
        segment.layoutHint (ReelLayoutKind)
        theme.primitiveByEmotion (overrides)

DECISION TREE:

┌─ emotion is "awe"?
│  ├─ intensity 1?  → aurora-text (1.2s ease-out)
│  ├─ intensity 2?  → aurora-text (1.5s ease-out-quad) [preferred]
│  └─ intensity 3?  → aurora-text (0.8s ease-in-out pulsing glow)
│
├─ emotion is "shock"?
│  ├─ intensity 1?  → kinetic-text (0.6s bounce)
│  ├─ intensity 2?  → glitch-text (0.4s flicker) [preferred]
│  └─ intensity 3?  → glitch-text (0.25s rapid distortion)
│
├─ emotion is "joy"?
│  ├─ intensity 1?  → wave-text (1.0s sine undulation)
│  ├─ intensity 2?  → kinetic-text (0.7s bounce) [preferred]
│  └─ intensity 3?  → kinetic-text (0.5s aggressive bounce)
│
├─ emotion is "anger"?
│  ├─ intensity 1?  → fire-text (0.8s red glow)
│  ├─ intensity 2?  → fire-text (0.6s pulsing flame) [preferred]
│  └─ intensity 3?  → fire-text (0.4s rapid pulse + shake)
│
├─ emotion is "sadness"?
│  ├─ intensity 1?  → shimmer-text (1.2s soft fade)
│  ├─ intensity 2?  → shimmer-text (1.0s slower fade) [preferred]
│  └─ intensity 3?  → shimmer-text (0.8s fade)
│
├─ emotion is "tension"?
│  ├─ intensity 1?  → typewriter (1.5s character-by-character)
│  ├─ intensity 2?  → typewriter (1.0s faster reveal) [preferred]
│  └─ intensity 3?  → typewriter (0.6s rapid reveal)
│
├─ emotion is "inspiration"?
│  ├─ intensity 1?  → big-text-reveal (1.0s fade-in scale)
│  ├─ intensity 2?  → big-text-reveal (0.8s snappier) [preferred]
│  └─ intensity 3?  → big-text-reveal (0.5s aggressive scale)
│
├─ emotion is "humor"?
│  ├─ intensity 1?  → wave-text (1.2s playful undulation)
│  ├─ intensity 2?  → kinetic-text (0.8s bounce) [preferred]
│  └─ intensity 3?  → kinetic-text (0.5s bouncy)
│
├─ emotion is "authority"?
│  ├─ intensity 1?  → big-text-reveal (1.0s solid fade)
│  ├─ intensity 2?  → cinematic-title-opener (0.8s letterbox) [preferred]
│  └─ intensity 3?  → cinematic-title-opener (0.6s dramatic)
│
└─ emotion is "neutral" / unknown?
   ├─ intensity 1?  → big-text-reveal (1.0s standard)
   ├─ intensity 2?  → big-text-reveal (0.8s) [preferred]
   └─ intensity 3?  → big-text-reveal (0.6s)

LAYOUT OVERRIDES (applied if layout ≠ 'auto'):
  layout = "straight"?     → force cinematic-title-opener (punchline feel)
  layout = "diagrammatic"? → force typewriter (data / steps readability)
  layout = "cluster"?      → force split-text-reveal (multi-line reveal)
  layout = "one-on-one"?   → no override, use emotion rule

THEME OVERRIDES (if theme.primitiveByEmotion[emotion] is set):
  Use theme choice → (layout override) → emotion default

FATIGUE CHECK:
  if same primitive used 3+ times in last 10 beats?
    → Consult fallback chain: theme → layout → emotion → big-text-reveal
    → Pick first alternative not in recent history

FINAL DECISION:
  1. Try theme override (if exists)
  2. Try layout override (if not 'auto')
  3. Try emotion default
  4. Fall back to big-text-reveal (always safe)
  5. Check against fatigue rules
  6. Return selected primitive + duration + easing
```

### 4.3 Word Emphasis Scoring Algorithm

```
INPUT: word (EnrichedWord), context (caption index, position in caption, full script)

SCORING (baseline 50, range 0..100):

  +30  if word.role == 'subject'      (key nouns, concepts)
  +25  if word.role == 'action'       (verbs, actions)
  +25  if word.role == 'emotion'      (adjectives, emotional words)
  +35  if word.role == 'cta'          (call-to-action) ← HIGHEST
  +20  if word.role == 'number'       (statistics, dates)
  +20  if word.role == 'tech'         (technical terms)
  -10  if word.role == 'connector'    (articles, prepositions)

  +15  if frequency(word) == 1        (rare word in script)
  +10  if frequency(word) == 2        (uncommon)
   +0  if frequency(word) >= 3        (common, no bonus)

  +15  if position == 0               (first word in caption)
  +10  if start of sentence
   +8  if position == last            (last word in caption)

THRESHOLD INTERPRETATION:
  score >= 85?  → HERO WORD (gets emphasis flash, longer glow, larger size)
  score 60-84?  → ACCENT WORD (gets subtle glow, standard timing)
  score 30-59?  → NORMAL WORD (no special emphasis, standard animation)
  score < 30?   → FILLER WORD (render quickly, no glow)

EXAMPLE:
  Caption: "Subscribe to our channel now"
  
  "Subscribe" → role: 'cta' (+35) + first word (+15) + rare (+15) = 65 → ACCENT
  "to"        → role: 'connector' (-10) = 40 → NORMAL
  "our"       → role: 'connector' (-10) = 40 → NORMAL
  "channel"   → role: 'subject' (+30) + rare (+15) = 95 → HERO ⭐
  "now"       → role: 'emotion' (+25) + last word (+8) + rare (+15) = 98 → HERO ⭐

IMPLEMENTATION:
  const score = computeBaseScore(word.role)
               + frequencyBonus(word, script)
               + positionBonus(position, totalWords, isSentenceStart)
               + clamp(0, 100);
  
  return score;
```

### 4.4 Beat Snapping Algorithm

```
INPUT: word (with start/end time), beatGrid (array of beat times), options

PURPOSE:
  Align word onset to the nearest kick drum / snare / speech emphasis,
  creating the "snappy" feel where text impacts sync with rhythm.

ALGORITHM:

  1. FIND NEAREST BEAT:
     ├─ Binary search for beats within ±80ms of word.start
     ├─ Candidates: beat[i-1] and beat[i]
     └─ Pick the closer one

  2. TOLERANCE CHECK:
     ├─ Standard tolerance: 80ms
     ├─ Hero words (emphasisScore ≥ 85): 100ms (more eager)
     └─ If distance > tolerance: SKIP SNAP (keep original time)

  3. DECISION:
     ├─ distance <= tolerance? → SNAP (move word.start to beat time)
     └─ distance > tolerance?  → KEEP (use original time)

  4. APPLY SNAP:
     ├─ Update word.start = beat.time
     └─ Log reason: "snapped to beat #42 (dist: 45ms)"

EXAMPLE:

  Beats detected:     [0.12, 0.65, 1.22, 1.80, ...]
  
  Word "future":
    original start: 1.15s
    nearest beat:   1.22s
    distance:       70ms (< 80ms) ✓
    emphasisScore:  85 (hero word)
    → SNAP to 1.22s
    → reason: "snapped to beat (hero word, 70ms)"
  
  Word "the":
    original start: 0.3s
    nearest beat:   0.12s
    distance:       180ms (> 80ms) ✗
    emphasisScore:  20 (normal)
    → KEEP 0.3s
    → reason: "no beat within tolerance (180ms)"

EDGE CASES:
  ✓ No beats detected (speech only)?        → skip snapping, use original time
  ✓ Word duration < 120ms?                  → snap more eagerly (tolerance *= 1.5)
  ✓ Caption spans 5+ beats?                 → snap first beat, let rest follow naturally
  ✓ Beat right at word boundary?            → snap (0ms distance, always match)

IMPLEMENTATION:
  function snapWordToBeat(word, beats, tolerance = 0.08) {
    const nearest = findNearestBeat(word.start, beats);
    if (!nearest || nearest.distance > tolerance) return word;
    return { ...word, start: nearest.time };
  }
```

### 4.5 Fatigue Prevention Algorithm

```
INPUT: timeline (array of MotionBeat[]), nextBeatIndex, nextEmotion, layout

PURPOSE:
  Prevent the same animation primitive from repeating too often.
  Viewer fatigue occurs when the eye sees the same motion pattern repeatedly.

DETECTION RULES:

  Rule 1: No primitive used more than 3 times consecutively
    ├─ If last 3 beats all use "kinetic-text" → FATIGUED
    └─ Recommend alternative

  Rule 2: High-energy primitives capped at 2 per 10 seconds
    ├─ High-energy: 'kinetic-text', 'glitch-text', 'fire-text', 'wave-text'
    ├─ Count occurrences in past 10s
    ├─ If count >= 2 → consider fatigue
    └─ Lower intensity variant instead

  Rule 3: At least 1 different primitive between repeats
    ├─ If beat[i] and beat[i-2] have same primitive
    ├─ And beat[i-1] also has same primitive
    └─ → FATIGUED (3 of last 3)

RECOMMENDATION CHAIN (fallback):
  1. Try theme.primitiveByEmotion[emotion]
  2. Try LAYOUT_PRIMITIVE_OVERRIDE[layout]
  3. Try DEFAULT_EMOTION_PRIMITIVE[emotion]
  4. Fall back to 'big-text-reveal'
  
  → Pick first in chain not found in recent primitive history

EXAMPLE:

  Timeline beats (last 5):
    [0] "big-text-reveal"     (2.0s ago)
    [1] "big-text-reveal"     (1.8s ago)  ← same as [0]
    [2] "aurora-text"         (1.5s ago)  ← different
    [3] "big-text-reveal"     (0.8s ago)  ← same as [0] and [1] again!
    [4] NEXT BEAT ???

  Fatigue check:
    consecutiveCount("big-text-reveal") = 2 (beats [2] and [3])
    → Not yet 3, but trending toward fatigue
    
    history = ["big-text-reveal", "big-text-reveal", "aurora-text", "big-text-reveal"]
    If we pick "big-text-reveal" again:
    → Last 2 are both "big-text-reveal"
    → Next might also be "big-text-reveal"
    → WARN: consider alternative
  
  → Use recommendation chain:
     1. theme.primitiveByEmotion['awe']? → "shimmer-text" (if set)
     2. LAYOUT_OVERRIDE['one-on-one']? → undefined
     3. DEFAULT_EMOTION_PRIMITIVE['awe']? → "aurora-text"
     4. "big-text-reveal" (fallback)
  
  → Pick "shimmer-text" (first not in history)
  → Reason: "fatigue detected: 2 consecutive uses of big-text-reveal"

IMPLEMENTATION:

  function checkFatigue(timeline, nextIdx, emotion, layout) {
    const recent = timeline.slice(max(0, nextIdx - 5), nextIdx);
    const last = recent[recent.length - 1]?.primitive;
    
    // Count consecutive
    let count = 0;
    for (let i = recent.length - 1; i >= 0; i--) {
      if (recent[i].primitive === last) count++;
      else break;
    }
    
    if (count >= 3) {
      return {
        isFatigued: true,
        primitiveHistory: recent.map(b => b.primitive),
        recommendation: findAltInChain(emotion, layout, recent),
        reason: `3+ consecutive uses of ${last}`,
      };
    }
    
    return { isFatigued: false, primitiveHistory: recent };
  }
```

---

## 5. TECHNOLOGY STACK

### 5.1 Audio Processing

| Component | Tech | Why | Alternatives |
|-----------|------|-----|--------------|
| **Transcription** | Gemini Audio API | Native support for speech recognition in 100+ languages | Whisper, AWS Transcribe |
| **Beat Detection** | Web Audio API (FFT) | Zero latency, works offline, spectral flux algorithm | Essentia.js, librosa.py (overkill) |
| **Tempo Estimation** | Hand-rolled histogram matching | Lightweight (50 lines), accurate for 40-240 BPM | music-tempo library (adds 200KB) |

### 5.2 Rendering

| Component | Tech | Why | Alternatives |
|-----------|------|-----|--------------|
| **Canvas 2D** | HTML5 Canvas API | Native, hardware-accelerated, perfect for 2D typography | WebGL, Three.js (overkill) |
| **Text Effects** | Canvas API + custom math | Gradients, shadows, glows all available natively | PIXI.js (overkill for text) |
| **Primitives** | Class-based renderers | Each primitive is a class with `.render(ctx, params, progress)` | Predefined SVG filters (static) |

### 5.3 AI/ML

| Component | Tech | Why | Alternatives |
|-----------|------|-----|--------------|
| **Script Analysis** | Gemini API (structured output) | JSON schemas ensure consistent response format | GPT-4, Claude API |
| **Emotion Classification** | Gemini (built into prompt) | No separate model needed; part of transcription | Hugging Face transformers (ML overhead) |
| **Word Importance** | Gemini-provided emphasisScore | Client-side scoring in choreography engine | TFIDF, TextRank (too complex for v1) |

### 5.4 Export

| Component | Tech | Why | Alternatives |
|-----------|------|-----|--------------|
| **Video Encoding** | MediaRecorder API | Native browser support, VP8/H264 codec selection | FFmpeg.wasm (50MB WASM binary) |
| **Audio Sync** | AudioContext.currentTime | Precise timing, syncs canvas RAF to playback | Manual frame counting (error-prone) |
| **MP4 Container** | Browser default | H264 in MP4 wrapper; VP8 fallback | WebCodecs API (newer, less support) |

### 5.5 State Management

| Component | Tech | Why | Alternatives |
|-----------|------|-----|--------------|
| **UI State** | React hooks (useState) | Simple, synchronous, no extra overhead | Redux (overkill for this scope) |
| **Undo/Redo** | Immer + history stack | Copy-on-write semantics make this easy | Manual deep-clone management |
| **Persistence** | localStorage (optional) | Save drafts locally; no server dependency | IndexedDB (overkill for text metadata) |

---

## 6. UI/UX FLOW

### 6.1 Step-by-Step User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│ KINETIC TYPOGRAPHY REEL STUDIO — CapCut-STYLE SIMPLICITY           │
└─────────────────────────────────────────────────────────────────────┘

SCREEN 1: AUDIO UPLOAD
──────────────────────────────────────────────────────────────────────

┌──────────────────────────────────────┐
│ 🎬 Kinetic Typography Reel           │
│                                      │
│ Drop audio here or click to upload   │
│ ┌──────────────────────────────────┐ │
│ │                                  │ │
│ │        📁 Choose Audio File       │ │
│ │       (MP3, WAV, OGG ≤ 60s)       │ │
│ │                                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ Max 60 seconds • All processing      │
│ happens in your browser              │
└──────────────────────────────────────┘

USER ACTION: Drops file or clicks "Choose File"
VALIDATION:
  ✓ File size < 50 MB? → Continue
  ✓ Duration < 60s? → Continue
  ✗ File size > 50 MB? → Show error "File too large"
  ✗ Duration > 60s? → Show error "Audio too long"
  ✗ Invalid format? → Show error "Unsupported format"

TRANSITION: → SCREEN 2 (once audio validated)
```

```
SCREEN 2: THEME & LAYOUT SELECTION
──────────────────────────────────────────────────────────────────────

┌──────────────────────────────────────┐
│ Audio loaded (8.5 seconds)           │
│                                      │
│ 🎨 THEME                            │
│ ┌─────────────────────────────────┐ │
│ │ ✓ Devon Jatho (Premium)         │ │ ← selected
│ │   Gradient text + deep glow     │ │
│ │                                  │ │
│ │   Minimal Clean                 │ │
│ │   Aurora shimmer glow           │ │
│ │                                  │ │
│ │   Neon Electric                 │ │
│ │   Cyber cyan-purple glow        │ │
│ │                                  │ │
│ │   Cinematic Gold                │ │
│ │   Movie-title elegance          │ │
│ │                                  │ │
│ │   CapCut Bold (New)             │ │
│ │   White + yellow accent         │ │
│ └─────────────────────────────────┘ │
│                                      │
│ 📐 LAYOUT (Optional)                │
│ ┌─────────────────────────────────┐ │
│ │ ◎ Auto (AI picks per scene)      │ │ ← selected
│ │ ◯ One-on-One (Narrative)         │ │
│ │ ◯ Straight (Large, impact)       │ │
│ │ ◯ Cluster (Multi-line)           │ │
│ │ ◯ Diagrammatic (Data + icons)    │ │
│ └─────────────────────────────────┘ │
│                                      │
│          [← Back] [Generate Reel →] │
└──────────────────────────────────────┘

USER ACTION: Selects theme + layout, clicks "Generate Reel"
NEXT: → SCREEN 3 (loading)
```

```
SCREEN 3: GENERATION IN PROGRESS
──────────────────────────────────────────────────────────────────────

┌──────────────────────────────────────┐
│ 🔄 Generating Reel                   │
│                                      │
│ Step 1/4: Analyzing script…          │
│ ████░░░░░░░░░░░░░░░░ 25%            │
│                                      │
│ (Using Gemini to extract emotion,   │
│  importance, and scene boundaries)  │
│                                      │
└──────────────────────────────────────┘

  ↓ (after ~3 seconds)

┌──────────────────────────────────────┐
│ 🔄 Generating Reel                   │
│                                      │
│ Step 2/4: Detecting beats…           │
│ ████████░░░░░░░░░░░░░░░░ 50%        │
│                                      │
│ (Analyzing audio rhythm with FFT)   │
│                                      │
└──────────────────────────────────────┘

  ↓ (after ~1 second)

┌──────────────────────────────────────┐
│ 🔄 Generating Reel                   │
│                                      │
│ Step 3/4: Choreographing scenes…     │
│ ████████████░░░░░░░░░░░░░░░░░░ 75% │
│                                      │
│ (Mapping emotions to animations)    │
│                                      │
└──────────────────────────────────────┘

  ↓ (after ~0.5 seconds)

✓ Ready! → SCREEN 4 (preview + export)
```

```
SCREEN 4: PREVIEW & EXPORT
──────────────────────────────────────────────────────────────────────

┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │                                                              │ │
│ │                     CANVAS PREVIEW                          │ │
│ │                    (1080×1920, 30 FPS)                      │ │
│ │                                                              │ │
│ │              [Live animation plays here                     │ │
│ │               with audio synchronized]                     │ │
│ │                                                              │ │
│ │                                                              │ │
│ │              ▶ Play    ⏸ Pause    ⏹ Stop                   │ │
│ │              ─────────────────────────────────             │ │
│ │              0:00                    8:34                   │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ TIMELINE (Beat visualization + scrubber)                          │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 🎬 Scene 1           🎬 Scene 2           🎬 Scene 3        │ │
│ │ ▯▯▯▯▯▯▯ ▯▯▯▯▯ ▯▯▯▯▯ ▯▯▯▯ ▯▯▯▯▯▯ ▯▯ ▯▯▯▯▯▯▯ ▯▯▯ ▯▯▯▯ │ │
│ │ 0s                    3s                  6s                │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│ 📊 STATS                                                           │
│ • Duration: 8.5 seconds                                           │
│ • Beats detected: 12                                              │
│ • Scenes: 3                                                       │
│ • Theme: Devon Jatho                                              │
│ • Layout: Auto (AI-selected per scene)                            │
│                                                                    │
│ EXPORT OPTIONS                                                    │
│ Aspect Ratio:  [9:16 ▼] (TikTok / Instagram Reels)              │
│ Format:        [MP4]                                              │
│ Quality:       [High (8 Mbps)]                                    │
│                                                                    │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ [← Back to Edit]  [📥 Download MP4]  [Share ↗]            │ │
│ └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘

USER ACTION: Clicks "Download MP4"
PROCESS:
  1. Start MediaRecorder on canvas
  2. Run RAF loop at 30 FPS for 8.5 seconds
  3. Render each frame (find active beat, compute progress, draw primitive)
  4. Sync with audio via audioContext.currentTime
  5. Chunk recording → create Blob → trigger download
  6. Show "Export Complete" toast

NEXT: User can download the MP4 file
```

### 6.2 Interaction Patterns

```
TIMELINE SCRUBBING (drag the playhead):
  ├─ Mouse down on timeline → pause playback
  ├─ Drag → update currentTime
  ├─ Canvas re-renders at new time
  ├─ Audio seeked to new time
  └─ Mouse up → can resume playback

BEAT VISIBILITY:
  ├─ Beats shown as vertical bars on timeline
  ├─ Scene boundaries shown as colored sections
  ├─ Hover over beat → tooltip: "aurora-text (awe, 0.8s)"
  └─ Click beat → preview at that exact time

REGENERATE WORKFLOW:
  ├─ Go back to theme/layout selection
  ├─ Pick different theme or layout
  ├─ Click "Generate Reel" again
  ├─ Same input (audio) → same intermediate outputs
  ├─ New MotionBeat[] → new animation
  └─ Users can iterate without re-analyzing audio
```

---

## 7. IMPLEMENTATION PHASES

### Phase 1: Core Pipeline (6 weeks)

**Deliverables:**
- ✓ `scriptAnalyzer.ts` (Stage 1: Gemini transcription + enrichment) — DONE
- ✓ `beatAnalyzer.ts` (Stage 2: Web Audio FFT beat detection) — DONE
- ✓ `choreographyEngine.ts` (Stage 3: emotion → animation composition) — DONE
- ✓ `emotionAnimationMap.ts` (Emotion → Primitive decision table) — NEW
- ✓ `wordEmphasisScorer.ts` (Word importance algorithm) — NEW
- ✓ `beatSnapper.ts` (Beat quantization) — NEW
- ✓ `fatiguePreventionEngine.ts` (Animation variety enforcement) — NEW
- ✓ `useTypographyReel.ts` hook (Pipeline orchestration) — NEW
- ✓ TypographyReelStudio component (Main UI) — PARTIAL (exists, enhance)

**Acceptance Criteria:**
- [ ] Audio uploads < 60s, validated
- [ ] Gemini analyzes script → JSON response (enriched captions)
- [ ] Beat detection finds 5+ onsets in typical speech/music
- [ ] Choreography engine outputs MotionBeat[] (20+ beats for 10s audio)
- [ ] All algorithms (emotion map, emphasis scoring, beat snapping, fatigue) tested in isolation
- [ ] Unit tests: 80%+ coverage of core logic
- [ ] E2E: Upload audio → preview timeline (no rendering yet)

**Tech Debt:**
- None; this is the foundation

### Phase 2: Rendering & Export (8 weeks)

**Deliverables:**
- ✓ `animationRegistry.ts` + primitive implementations (kinetic-text, aurora-text, etc.)
- ✓ Canvas rendering pipeline (MotionStage enhanced)
- ✓ `useCanvasRenderer.ts` hook (frame rendering + RAF loop + audio sync)
- ✓ Audio-canvas sync via AudioContext.currentTime
- ✓ MediaRecorder export (MP4 generation)
- ✓ Export dialog (quality, aspect ratio, format)
- ✓ Theme profile system (6 preset themes)

**Acceptance Criteria:**
- [ ] Live canvas preview @ 30 FPS, smooth animation
- [ ] Audio + canvas in sync (± 50ms tolerance)
- [ ] 10 animation primitives fully implemented (kinetic-text, aurora, glitch, fire, wave, typewriter, morph, shimmer, neon-sign, big-text-reveal)
- [ ] Export to MP4 with audio baked in
- [ ] 6 theme profiles render correctly
- [ ] Performance: render 10s reel in <100ms per frame
- [ ] Tests: integration tests for preview + export flow

**Tech Debt:**
- Animation primitives may need performance optimization (GPU acceleration) if frame drops occur

### Phase 3: Polish & Performance (4 weeks)

**Deliverables:**
- ✓ UI/UX refinement (CapCut-grade simplicity)
- ✓ Error handling + user messaging
- ✓ Accessibility (keyboard shortcuts, ARIA labels)
- ✓ Mobile responsive preview (portrait canvas)
- ✓ Undo/redo via immer (optional; scope decision)
- ✓ Settings modal (API key management, quality presets)
- ✓ Analytics (track generation time, popular themes)

**Acceptance Criteria:**
- [ ] <3 clicks from upload to preview
- [ ] All error paths have user-friendly messages
- [ ] Keyboard support: Space = play/pause, Esc = back, D = download
- [ ] Mobile-friendly on iPad / Android tablets (portrait)
- [ ] Generation time < 30 seconds for typical 10s audio
- [ ] Export time < 2 minutes for typical 10s MP4
- [ ] 95+ Lighthouse score
- [ ] A11y audit: WCAG 2.1 AA

**Tech Debt:**
- None for MVP

---

## 8. KEY ALGORITHMS (PSEUDOCODE)

### 8.1 Emotion-to-Animation Decision Tree

```pseudocode
FUNCTION selectAnimationPrimitive(emotion, intensity, layout, theme):
  // 1. Check theme override
  if theme.primitiveByEmotion[emotion] is not null:
    candidate ← theme.primitiveByEmotion[emotion]
  else:
    // 2. Check layout override (for specific layouts)
    if layout == "straight":
      candidate ← "cinematic-title-opener"
    else if layout == "diagrammatic":
      candidate ← "typewriter"
    else:
      // 3. Fall back to emotion default
      candidate ← EMOTION_ANIMATION_MAP[emotion][intensity - 1].primitive
  
  // 4. Validate primitive is supported
  if not isPrimitiveSupported(candidate):
    candidate ← "big-text-reveal"
  
  return candidate

END FUNCTION
```

### 8.2 Word Emphasis Scoring

```pseudocode
FUNCTION scoreWordEmphasis(word, position, totalWords, scriptFrequency):
  score ← 50  // baseline
  
  // Role-based weight
  ROLE_WEIGHTS ← {
    "subject": 30, "action": 25, "emotion": 25,
    "number": 20, "cta": 35, "tech": 20, "connector": -10
  }
  score += ROLE_WEIGHTS[word.role] ?? 0
  
  // Frequency-based (rare = higher)
  freq ← scriptFrequency[word.text.toLowerCase()] ?? 0
  if freq == 1:
    score += 15
  else if freq <= 2:
    score += 10
  
  // Position-based
  if position == 0:          score += 15  // first word
  if position == totalWords - 1:  score += 8  // last word
  
  // Clamp to range
  return max(0, min(100, score))

END FUNCTION
```

### 8.3 Beat Snapping

```pseudocode
FUNCTION snapWordToBeat(word, beatGrid, emphasisScore):
  tolerance ← 0.08  // 80 ms
  
  // Hero words get wider tolerance
  if emphasisScore >= 85:
    tolerance *= 1.25  // 100 ms
  
  // Find nearest beat
  nearest ← findNearestBeat(word.start, beatGrid.beats)
  
  if nearest is null or nearest.distance > tolerance:
    return word  // No snap
  
  // Snap the word
  word.start ← nearest.time
  return word

END FUNCTION

FUNCTION findNearestBeat(time, beats):
  if beats.length == 0:
    return null
  
  // Binary search for closest beat
  idx ← binarySearch(beats, time)
  candidates ← [beats[idx], beats[max(0, idx-1)]]
  
  best ← null
  bestDist ← Infinity
  for beat in candidates:
    dist ← abs(beat - time)
    if dist < bestDist:
      best ← beat
      bestDist ← dist
  
  return { time: best, distance: bestDist }

END FUNCTION
```

### 8.4 Fatigue Prevention

```pseudocode
FUNCTION checkFatigue(timeline, nextBeatIdx, emotion, layout):
  // Get recent primitive history (last 5 beats)
  recent ← timeline[max(0, nextBeatIdx - 5):nextBeatIdx]
  recentPrimitives ← [b.primitive for b in recent]
  
  // Check consecutive count
  lastPrimitive ← timeline[nextBeatIdx - 1]?.primitive
  consecutiveCount ← 0
  for i ← len(recent) - 1 downto 0:
    if recent[i].primitive == lastPrimitive:
      consecutiveCount += 1
    else:
      break
  
  if consecutiveCount >= 3:
    isFatigued ← true
  else:
    isFatigued ← false
  
  // Recommendation chain (if fatigued)
  if isFatigued:
    chain ← [
      theme.primitiveByEmotion[emotion],
      LAYOUT_PRIMITIVE_OVERRIDE[layout],
      DEFAULT_EMOTION_PRIMITIVE[emotion],
      "big-text-reveal"
    ]
    
    for candidate in chain:
      if candidate is not null and candidate not in recentPrimitives:
        recommendation ← candidate
        break
    
    if recommendation is null:
      recommendation ← "big-text-reveal"
  else:
    recommendation ← lastPrimitive
  
  return {
    isFatigued: isFatigued,
    primitiveHistory: recentPrimitives,
    recommendation: recommendation
  }

END FUNCTION
```

### 8.5 Animation Timing Calculation

```pseudocode
FUNCTION calculateAnimationTiming(beat, emotionIntensity, theme):
  // Get the emotion rule
  rule ← EMOTION_ANIMATION_MAP[beat.emotion][emotionIntensity - 1]
  
  // Duration (seconds)
  duration ← rule.animationDuration
  
  // Easing curve
  easing ← rule.easeFunction
  
  // Color strategy
  colorMode ← rule.colorStrategy
  
  return {
    startTime: beat.startTime,
    endTime: beat.startTime + duration,
    easing: easing,
    duration: duration,
    colorMode: colorMode
  }

END FUNCTION

FUNCTION renderAnimationFrame(ctx, beat, progress, palette, intensity):
  // progress: 0 (start) to 1 (end)
  
  // Get primitive renderer
  renderer ← getPrimitiveRenderer(beat.primitive)
  
  // Apply easing
  easedProgress ← applyEasing(progress, beat.easing)
  
  // Call primitive-specific renderer
  renderer.render(ctx, {
    text: beat.text,
    progress: easedProgress,
    palette: palette,
    intensity: intensity,
    width: ctx.canvas.width,
    height: ctx.canvas.height
  })

END FUNCTION
```

---

## 9. TESTING STRATEGY

### 9.1 Unit Tests (Per Service Module)

```typescript
// services/typographyReel/__tests__/

describe('emotionAnimationMap', () => {
  test('maps awe+intensity1 to aurora-text', () => {
    const rule = getAnimationRule('awe', 1);
    expect(rule.primitive).toBe('aurora-text');
    expect(rule.animationDuration).toBe(1.2);
  });
  
  test('maps anger+intensity3 to fire-text with 0.4s duration', () => {
    const rule = getAnimationRule('anger', 3);
    expect(rule.primitive).toBe('fire-text');
    expect(rule.animationDuration).toBe(0.4);
  });
});

describe('wordEmphasisScorer', () => {
  test('CTA words score 35+ baseline', () => {
    const score = scoreWordEmphasis(
      { text: 'subscribe', role: 'cta' },
      { position: 2, totalWords: 5, wordFrequency: new Map() }
    );
    expect(score).toBeGreaterThanOrEqual(35);
  });
  
  test('rare words score higher than common words', () => {
    const rareWord = { text: 'serendipity', role: 'emotion' };
    const commonWord = { text: 'the', role: 'connector' };
    
    const freq = new Map([['the', 50]]);
    
    const rareScore = scoreWordEmphasis(rareWord, { wordFrequency: freq });
    const commonScore = scoreWordEmphasis(commonWord, { wordFrequency: freq });
    
    expect(rareScore).toBeGreaterThan(commonScore);
  });
});

describe('beatSnapper', () => {
  test('snaps word to nearest beat within tolerance', () => {
    const word = { text: 'hello', start: 1.15, end: 1.35 };
    const grid = { beats: [0.5, 1.0, 1.2, 1.8] };
    
    const snapped = snapWordToBeat(word, grid);
    expect(snapped.start).toBe(1.2);  // nearest beat within 80ms
  });
  
  test('does not snap if distance exceeds tolerance', () => {
    const word = { text: 'hello', start: 0.3, end: 0.5 };
    const grid = { beats: [0.0, 1.0, 2.0] };
    
    const result = snapWordToBeat(word, grid);
    expect(result.snapped).toBe(false);
    expect(result.snappedTime).toBe(0.3);
  });
});

describe('fatiguePreventionEngine', () => {
  test('detects fatigue after 3 consecutive uses', () => {
    const timeline = [
      { primitive: 'kinetic-text' },
      { primitive: 'kinetic-text' },
      { primitive: 'kinetic-text' },  // 3rd consecutive
    ];
    
    const analysis = checkFatigue(timeline, 3, 'joy', 'one-on-one');
    expect(analysis.isFatigued).toBe(true);
  });
  
  test('recommends alternative primitive when fatigued', () => {
    const timeline = [
      { primitive: 'big-text-reveal' },
      { primitive: 'big-text-reveal' },
      { primitive: 'big-text-reveal' },
    ];
    
    const analysis = checkFatigue(timeline, 3, 'joy', 'one-on-one');
    expect(analysis.recommendation).not.toBe('big-text-reveal');
  });
});
```

### 9.2 Integration Tests (Pipeline)

```typescript
describe('Kinetic Typography Pipeline', () => {
  test('end-to-end: audio → MP4', async () => {
    // 1. Load test audio
    const audioFile = new File(
      [audioBuffer],
      'test-audio.mp3',
      { type: 'audio/mpeg' }
    );
    
    // 2. Stage 1: Analyze
    const captions = await analyzeAudioForReel(audioFile);
    expect(captions.length).toBeGreaterThan(0);
    expect(captions[0].words.length).toBeGreaterThan(0);
    
    // 3. Stage 2: Beat detection
    const beatGrid = await analyzeBeats(audioFile);
    expect(beatGrid.beats.length).toBeGreaterThan(0);
    
    // 4. Stage 3: Choreography
    const theme = getThemeProfile('devon-jatho');
    const timeline = compose(captions, beatGrid, theme);
    expect(timeline.beats.length).toBeGreaterThan(0);
    expect(timeline.duration).toBe(beatGrid.duration);
    
    // 5. Verify timeline structure
    for (const beat of timeline.beats) {
      expect(beat.startTime).toBeGreaterThanOrEqual(0);
      expect(beat.endTime).toBeGreaterThan(beat.startTime);
      expect(isPrimitiveSupported(beat.primitive)).toBe(true);
    }
  });
  
  test('canvas rendering produces valid frames', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    
    const ctx = canvas.getContext('2d')!;
    const timeline = /* ... composed timeline ... */;
    
    // Render at different times
    for (let t = 0; t < timeline.duration; t += 0.1) {
      renderFrame(ctx, timeline, t);
      
      // Verify canvas was modified (not black fill only)
      const imageData = ctx.getImageData(0, 0, 100, 100);
      const hasContent = imageData.data.some(pixel => pixel > 0);
      expect(hasContent).toBe(true);
    }
  });
});
```

### 9.3 Performance Tests

```typescript
describe('Performance', () => {
  test('analyze 10s audio < 5s total time', async () => {
    const audioFile = /* 10s MP3 */;
    
    const start = performance.now();
    
    const captions = await analyzeAudioForReel(audioFile);
    const beatGrid = await analyzeBeats(audioFile);
    const theme = getThemeProfile('devon-jatho');
    const timeline = compose(captions, beatGrid, theme);
    
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000);  // 5 seconds
  });
  
  test('render 30 FPS without frame drops', async () => {
    const canvas = /* ... */;
    const timeline = /* ... */;
    
    let frameCount = 0;
    let droppedFrames = 0;
    
    const raf = () => {
      const now = performance.now();
      const frameDeadline = 1000 / 30;  // 33.3ms per frame @ 30 FPS
      
      renderFrame(canvas, timeline, now);
      frameCount++;
      
      if (performance.now() - now > frameDeadline * 1.2) {
        droppedFrames++;
      }
      
      if (frameCount < 300) requestAnimationFrame(raf);
    };
    
    requestAnimationFrame(raf);
    
    // Expect < 5% frame drop rate
    expect(droppedFrames / frameCount).toBeLessThan(0.05);
  });
});
```

---

## 10. DEPLOYMENT & MONITORING

### 10.1 Build Artifacts

```bash
npm run build
# Output:
#   dist/index.html
#   dist/index.{hash}.js        # Main bundle (~250 KB gzipped)
#   dist/assets/                # Image/font assets
#   dist/workers/              # Web Worker files (FFT, if separate)

# Size budget:
#   - JS bundle: < 300 KB (gzipped)
#   - Fonts: < 200 KB (subset only Devon Jatho, Montserrat, Orbitron)
#   - Total: < 500 KB (app + assets)
```

### 10.2 Performance Monitoring

```typescript
// Services can emit custom events for monitoring
window.addEventListener('kinetic:stage-complete', (e) => {
  const { stage, duration } = e.detail;
  // Send to analytics
  console.log(`${stage} took ${duration}ms`);
});

// Example:
analyzeAudioForReel(file).then(
  captions => {
    window.dispatchEvent(new CustomEvent('kinetic:stage-complete', {
      detail: { stage: 'analyze', duration: 2500 }
    }));
  }
);
```

### 10.3 Error Tracking

```typescript
// Wrap pipeline in try-catch with error codes
async function generate(input: ReelGenerationInput) {
  try {
    // Stage 1
    const captions = await analyzeAudioForReel(input.audioFile);
  } catch (err) {
    if (err instanceof NetworkError) {
      // ERR_001: Gemini API unavailable
      reportError({ code: 'ERR_001', message: err.message });
    }
  }
  
  try {
    // Stage 2
    const beatGrid = await analyzeBeats(input.audioFile);
  } catch (err) {
    if (err instanceof Error && err.message.includes('decode')) {
      // ERR_002: Audio decode failed
      reportError({ code: 'ERR_002', message: err.message });
    }
  }
}

const ERROR_CODES = {
  ERR_001: 'Gemini API call failed — check network / API key',
  ERR_002: 'Audio decode failed — unsupported format',
  ERR_003: 'No beats detected — audio may be too quiet',
  ERR_004: 'Rendering error — try a different theme',
  ERR_005: 'Export failed — browser not supported',
};
```

---

## 11. ACCESSIBILITY & INTERNATIONALIZATION

### 11.1 Keyboard Shortcuts

```typescript
const KEYBOARD_SHORTCUTS = {
  ' ': 'Play/Pause',
  'Enter': 'Generate Reel',
  'Escape': 'Back / Close dialog',
  'Ctrl+Z': 'Undo',
  'Ctrl+Shift+Z': 'Redo',
  'D': 'Download MP4',
  'P': 'Preview (play from current scrub position)',
  'T': 'Toggle theme selector',
  'L': 'Toggle layout selector',
  '←': 'Scrub backwards 1 second',
  '→': 'Scrub forwards 1 second',
  'Shift+←': 'Scrub backwards 10 seconds',
  'Shift+→': 'Scrub forwards 10 seconds',
};
```

### 11.2 ARIA Labels

```typescript
// Input Panel
<button aria-label="Upload audio file (MP3, WAV, OGG ≤ 60s)">
  Upload Audio
</button>

// Theme Selector
<fieldset aria-label="Typography theme selection">
  <legend>Theme</legend>
  <label>
    <input type="radio" name="theme" value="devon-jatho" />
    Devon Jatho — Premium gradient text style
  </label>
</fieldset>

// Canvas
<canvas
  aria-label="Real-time preview of typography reel animation"
  role="img"
/>

// Timeline
<div role="region" aria-label="Timeline with beat markers and scene boundaries">
  ...
</div>
```

### 11.3 Internationalization (i18n)

```typescript
// i18n.ts
export const MESSAGES = {
  en: {
    'upload.label': 'Drop audio here or click to upload',
    'upload.error.size': 'File too large (max 50 MB)',
    'upload.error.duration': 'Audio too long (max 60 seconds)',
    'theme.label': 'Choose a theme',
    'layout.label': 'Choose a layout (optional)',
    'generate.button': 'Generate Reel',
    'generating.step1': 'Analyzing script with Gemini…',
    'generating.step2': 'Detecting audio beats…',
    'generating.step3': 'Choreographing scenes…',
    'export.button': 'Download MP4',
    'stats.duration': 'Duration: {duration} seconds',
    'stats.beats': '{count} beats detected',
    'error.network': 'Network error. Check your connection.',
    'error.api': 'API error. Check your API key.',
  },
  es: {
    'upload.label': 'Arrastra audio aquí o haz clic para cargar',
    // ... Spanish translations ...
  },
};

// Usage
const message = MESSAGES[lang]['upload.label'];
```

---

## 12. EDGE CASES & FAILURE MODES

### 12.1 Audio Edge Cases

| Scenario | Handling |
|----------|----------|
| **Silent/low-volume audio** | Increase gain, retry beat detection. If still no beats, notify user "No clear rhythm detected" but continue. |
| **Very fast speech (>200 WPM)** | Word timing overlaps. Choreography engine spreads words across beats; duration calculated from next word's start. |
| **Background music + speech** | Gemini extracts speech; beats detect both. User may see animation syncing to music instead of speech — this is desired! |
| **Audio with long pauses** | Beats will have gaps. Timeline will have gaps too. Render empty frames (black canvas). |
| **Stereo audio** | Mix to mono in beatAnalyzer.ts. Gemini handles multi-channel audio fine. |

### 12.2 Browser Edge Cases

| Scenario | Handling |
|----------|----------|
| **MediaRecorder not supported** | Show error "Your browser doesn't support video export. Try Chrome, Firefox, or Edge." |
| **AudioContext not available** | Show error "Web Audio API not supported." |
| **Canvas doesn't support rendering** | Fallback to static image (no animation) or error message. |
| **Low memory (mobile)** | Reduce canvas resolution (720×1280 instead of 1080×1920). Warn user. |

### 12.3 API Edge Cases

| Scenario | Handling |
|----------|----------|
| **Gemini timeout (>30s)** | Retry once; if still fails, show "API took too long. Try again." |
| **Gemini returns invalid JSON** | Log raw response; show "AI analyzer returned malformed response. Try a different audio." |
| **Gemini rate limit (429)** | Show "API rate limited. Try again in 1 minute." |
| **Gemini invalid API key** | Show "Invalid API key. Check your settings." |

---

## 13. FUTURE EXTENSIONS (Out of Scope for v1)

### Phase 4+: Advanced Features

1. **Per-Beat Editor**
   - UI to click each beat → edit timing/primitive/text
   - Requires timeline scrubbing + click detection

2. **User Theme Creator**
   - UI to pick colors + fonts → save as theme
   - Extends themeProfiles.ts

3. **Motion Graphics Integration**
   - Blend kinetic typography with motion graphics (stickers, backgrounds, icons)
   - Requires rendering layering system

4. **Batch Processing**
   - Generate 10 reels at once with different themes
   - Parallelizes Stage 3 (choreography) across themes

5. **Cloud Save**
   - Save reel project (audio, captions, timeline) to Firebase/Supabase
   - Enable sharing & collaboration

6. **AI-Generated Audio**
   - User provides script text
   - AI generates speech (Google TTS) → Music (MusicLM)
   - Full end-to-end automation

---

## 14. GLOSSARY

| Term | Definition |
|------|-----------|
| **Beat** | An audio onset (transient, kick drum, snare, stressed syllable) detected via spectral flux. Timestamps in seconds. |
| **Primitive** | A named animation type (e.g., "kinetic-text", "aurora-text"). Maps to a canvas renderer function. |
| **Scene** | A contiguous segment of captions grouped by `sceneBoundary` flags. Each scene has one emotion + layout. |
| **Choreography** | The process of mapping captions + beats → MotionBeat[]. Pure local logic, deterministic. |
| **Motion Beat** | The output of choreography: a beat with text, timing, primitive type, and style parameters. |
| **Emphasis Score** | A 0..100 importance value for each word, computed by Gemini + refined by word importance algorithm. |
| **Snapping** | Aligning a word's start time to the nearest beat (within tolerance) for synchronization impact. |
| **Fatigue** | Viewer eye fatigue from repeating the same animation primitive too often. Prevented by algorithm. |
| **Easing** | A function that maps animation progress (0..1) to a curve (linear, ease-out, ease-in-out, bounce). |
| **Palette** | A set of colors (primary, secondary, accent, background) used for all text in a reel. |
| **Theme Profile** | A preset configuration: palette + fonts + primitive overrides + intensity bias. |
| **RAF Loop** | requestAnimationFrame loop running at 30 FPS, rendering canvas + syncing to audio. |
| **MediaRecorder** | Web API for recording canvas frames → chunks → MP4 blob for download. |

---

## 15. REFERENCES & RESOURCES

### Web Audio API
- MDN Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- Beat detection tutorial: https://www.bbc.co.uk/rd/blog/2013-11-auditory-beat-detection

### Canvas & Typography
- MDN Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- Text rendering: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_text

### Gemini API
- Docs: https://ai.google.dev/docs
- Structured output (JSON schemas): https://ai.google.dev/docs/json_mode

### CapCut & Typography Reel Design
- Devon Jatho on YouTube: https://www.youtube.com/@DevonJatho
- CapCut effects library: https://www.capcut.com/

### Performance & Monitoring
- Chrome DevTools: https://developer.chrome.com/docs/devtools/
- Web Vitals: https://web.dev/vitals/

---

## DOCUMENT VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-05-24 | Initial architecture document. Complete pipeline design. |

---

**Document Owner:** Engineering Lead  
**Last Updated:** 2026-05-24  
**Next Review:** After Phase 1 completion (6 weeks)

