/**
 * Choreography Engine — turns enriched captions + beat grid into TypographyBeat[].
 *
 * This is the editorial brain of the typography reel. Pure function:
 *
 *     compose(captions, beatGrid, theme) → TypographyBeat[]
 *
 * No I/O, no Gemini calls. All decisions are deterministic given the inputs,
 * so the user can press "Regenerate" with the same inputs and get the same
 * output — predictability is a feature.
 *
 * Pipeline:
 *   1. Group captions into scenes via sceneBoundary flags.
 *   2. For each scene, emit:
 *        a. an optional background-pulse beat (if intensity ≥ 2)
 *        b. a transition beat at scene start (if not the first scene)
 *        c. per-caption beats (one per caption) using the layout strategy
 *        d. per-word emphasis-flash beats for words with emphasisScore ≥ 85
 *   3. Snap word/beat start times to nearest audio onset (within ±80 ms).
 *
 * The output uses the existing TypographyBeat schema, so the renderer is unchanged.
 */

import type {
  TypographyBeat,
  TypographyBeatParams,
  TypographyPalette,
  TypographyPrimitive,
} from './types';
import { snapToBeat } from './beatAnalyzer';
import {
  isPrimitiveSupported,
  TYPOGRAPHY_PRIMITIVES,
} from './assetRegistry';
import type {
  BeatGrid,
  EnrichedCaption,
  EnrichedWord,
  ReelLayoutKind,
  ReelTimeline,
  SceneSpec,
  SegmentEmotion,
  ThemeProfile,
} from './types';

// ─── Default emotion → primitive rules (when profile has no override) ────────

const DEFAULT_EMOTION_PRIMITIVE: Record<SegmentEmotion, TypographyPrimitive> = {
  awe:         'aurora-text',
  shock:       'glitch-text',
  joy:         'kinetic-text',
  anger:       'fire-text',
  sadness:     'shimmer-text',
  tension:     'typewriter',
  inspiration: 'big-text-reveal',
  humor:       'wave-text',
  authority:   'big-text-reveal',
  neutral:     'big-text-reveal',
};

const LAYOUT_PRIMITIVE_OVERRIDE: Partial<Record<ReelLayoutKind, TypographyPrimitive>> = {
  // For "straight" (punchline) we prefer a stronger reveal regardless of emotion
  straight: 'cinematic-title-opener',
  // For "diagrammatic" (data) typewriter reads better than aurora
  diagrammatic: 'typewriter',
  // For "cluster" we use split-text so the multiple lines land in sequence
  cluster: 'split-text-reveal',
};

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ComposeOptions {
  layoutOverride?: ReelLayoutKind | 'auto';
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:5';
}

export function compose(
  captions: EnrichedCaption[],
  beatGrid: BeatGrid,
  theme: ThemeProfile,
  options: ComposeOptions = {},
): ReelTimeline {
  const scenes = groupIntoScenes(captions);

  // Apply layout override if user picked a specific one (not 'auto')
  if (options.layoutOverride && options.layoutOverride !== 'auto') {
    for (const scene of scenes) {
      scene.layout = options.layoutOverride;
      for (const c of scene.captions) c.layoutHint = options.layoutOverride;
    }
  }

  const beats: TypographyBeat[] = [];

  scenes.forEach((scene, sceneIdx) => {
    // Per-scene beats are generated from captions below, not as separate background beats
    // Typography reel focuses on text-only animations

    // Per-caption text beats
    scene.captions.forEach((cap) => {
      const captionBeat = makeCaptionBeat(cap, theme, beatGrid);
      beats.push(captionBeat);

      // Per-word emphasis flash for hero words (only one per caption to avoid spam)
      const heroWord = findHeroWord(cap.words);
      if (heroWord) {
        const flashStart = snapToBeat(heroWord.start, beatGrid);
        beats.push(makeBeat({
          startTime: flashStart,
          endTime: flashStart + 0.45,
          primitive: theme.emphasisPrimitive as TypographyPrimitive,
          text: heroWord.text,
          palette: theme.palette,
          intensity: 3,
          rationale: `emphasis "${heroWord.text}" (score ${heroWord.emphasisScore})`,
          anchor: 'center',
        }));
      }
    });
  });

  // Sort by start time (renderer expects this for efficient lookup)
  beats.sort((a, b) => a.startTime - b.startTime);

  const lastBeat = beats[beats.length - 1];
  const duration = lastBeat
    ? Math.max(lastBeat.endTime, beatGrid.duration)
    : beatGrid.duration;

  return {
    beats,
    scenes,
    duration,
    palette: theme.palette,
    aspectRatio: options.aspectRatio ?? '9:16',
    profileId: theme.id,
  };
}

// ─── Stage A: group captions into scenes ────────────────────────────────────

function groupIntoScenes(captions: EnrichedCaption[]): SceneSpec[] {
  const scenes: SceneSpec[] = [];
  let current: SceneSpec | null = null;

  captions.forEach((cap, i) => {
    const isBoundary = cap.sceneBoundary || i === 0 || current === null;
    if (isBoundary) {
      if (current) scenes.push(current);
      current = {
        index: scenes.length,
        startTime: cap.startTime,
        endTime: cap.endTime,
        emotion: cap.emotion,
        layout: cap.layoutHint,
        captions: [cap],
      };
    } else if (current) {
      current.endTime = Math.max(current.endTime, cap.endTime);
      current.captions.push(cap);
    }
  });
  if (current) scenes.push(current);

  return scenes;
}

function sceneMaxIntensity(scene: SceneSpec): 1 | 2 | 3 {
  let max: 1 | 2 | 3 = 1;
  for (const c of scene.captions) {
    if (c.emotionIntensity > max) max = c.emotionIntensity;
  }
  return max;
}

// ─── Stage B: build the main text beat per caption ──────────────────────────

function makeCaptionBeat(
  cap: EnrichedCaption,
  theme: ThemeProfile,
  beatGrid: BeatGrid,
): TypographyBeat {
  // Primitive selection: profile override → layout override → emotion default
  const profileChoice = theme.primitiveByEmotion[cap.emotion];
  const layoutChoice = LAYOUT_PRIMITIVE_OVERRIDE[cap.layoutHint];
  const defaultChoice = DEFAULT_EMOTION_PRIMITIVE[cap.emotion];

  const candidate = profileChoice ?? layoutChoice ?? defaultChoice;
  const primitive: TypographyPrimitive = isPrimitiveSupported(candidate)
    ? (candidate as TypographyPrimitive)
    : 'big-text-reveal';

  // Snap caption start to nearest beat (within ±80 ms)
  const start = snapToBeat(cap.startTime, beatGrid);

  // Use higher of caption.emotionIntensity vs theme bias
  const intensity = Math.max(cap.emotionIntensity, theme.intensityBias) as 1 | 2 | 3;

  return makeBeat({
    startTime: start,
    endTime: cap.endTime,
    primitive,
    text: cap.text,
    palette: theme.palette,
    intensity,
    rationale: `${cap.emotion} / ${cap.layoutHint}`,
    anchor: cap.layoutHint === 'straight' ? 'center' : 'center',
  });
}

// ─── Stage C: hero word selection (one per caption max) ─────────────────────

function findHeroWord(words: EnrichedWord[]): EnrichedWord | null {
  if (words.length === 0) return null;
  let best: EnrichedWord | null = null;
  for (const w of words) {
    if (w.emphasisScore >= 85) {
      if (!best || w.emphasisScore > best.emphasisScore) best = w;
    }
  }
  return best;
}

// ─── small helper ───────────────────────────────────────────────────────────

interface MakeBeatArgs {
  startTime: number;
  endTime: number;
  primitive: TypographyPrimitive;
  text: string | undefined;
  palette: TypographyPalette;
  intensity: 1 | 2 | 3;
  rationale: string;
  anchor?: 'top' | 'center' | 'bottom';
}

function makeBeat(args: MakeBeatArgs): TypographyBeat {
  return {
    id: `beat-${Math.random().toString(36).slice(2, 9)}`,
    startTime: Math.max(0, args.startTime),
    endTime: Math.max(args.startTime + 0.1, args.endTime),
    primitive: args.primitive,
    params: {
      text: args.text,
      palette: args.palette,
      intensity: args.intensity,
      anchor: args.anchor,
    },
    rationale: args.rationale,
  };
}

// ─── exports for UI debugging ───────────────────────────────────────────────

export { TYPOGRAPHY_PRIMITIVES };
