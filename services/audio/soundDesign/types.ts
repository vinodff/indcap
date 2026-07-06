// Sound Design — shared types for the multi-agent SFX pipeline.
import type { Caption } from '../../../types';
import type { SfxCategory } from '../sfxLibrary';
import type { SfxVibe, SfxRole, Palette } from './palette';

export type SfxSource = 'motion' | 'texture' | 'riser' | 'hit' | 'semantic' | 'manual';

/** One scheduled sound effect on the video timeline. */
export interface SfxCue {
  id: string;
  time: number;          // absolute seconds on the video timeline
  category: SfxCategory;
  assetId: string;       // resolves via sfxLibrary.getAsset
  gain: number;          // 0..1 linear
  source: SfxSource;
  role?: SfxRole;        // editorial purpose (drives swap-alternatives in the UI)
  layer: number;         // 0 = base; higher = stacked on top (e.g. big whoosh over small)
  label: string;         // human-readable, shown on the timeline
  duck: boolean;         // true = participates in voice-ducking
  /** Director-stage admission priority (0..1). Higher survives the density budget. */
  priority?: number;
  /** User pinned this cue: survive regeneration and never get culled. */
  locked?: boolean;
  /** User silenced this cue: stays on the timeline but does not play/bake. */
  muted?: boolean;
}

export type SfxTrack = SfxCue[];

export interface SoundDesignInput {
  captions: Caption[];
  duration: number;
  beats?: number[];          // onset times (sec) from beatAnalyzer
  energy?: number[];         // energy curve
  energyHz?: number;         // frames/sec of the energy curve
  entryAnimation?: string;   // global caption entry animation (NONE disables motion-in)
  exitAnimation?: string;
  hasIcons?: boolean;        // icon captions enabled (texture flourishes)
  stickers?: { startTime: number }[];
}

export interface SoundDesignOptions {
  motion?: boolean;
  texture?: boolean;
  risersHits?: boolean;
  /** Sound-design personality. Selects the curated palette + density character. */
  vibe?: SfxVibe;
  /** ~0.4..1.6 density multiplier vs. the vibe's base budget (1 = default). */
  intensity?: number;
  /** Stable per-video string so the signature palette is locked across re-runs. */
  seed?: string;
  /** Cues to carry over verbatim (user-locked / manual) — protected from culling. */
  preserve?: SfxCue[];
}

/** What each agent receives: the timeline input plus the locked palette. */
export interface AgentContext {
  input: SoundDesignInput;
  palette: Palette;
}

/** Snap a time to the nearest beat within tolerance (sec). */
export function snapToBeats(time: number, beats: number[] | undefined, tol = 0.08): number {
  if (!beats || beats.length === 0) return time;
  let best = time;
  let bestD = tol;
  // linear scan is fine — beat arrays are small (hundreds at most)
  for (const b of beats) {
    const d = Math.abs(b - time);
    if (d <= bestD) { best = b; bestD = d; }
    else if (b > time + tol) break;
  }
  return best;
}

let _idc = 0;
export function cueId(source: SfxSource): string {
  return `sfx_${source}_${(_idc++).toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
