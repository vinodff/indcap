// Director / Mix Agent — turns raw agent candidates into a clean, intentional
// track the way a senior editor finishes a pass:
//
//   1. PRESERVE the user's locked + manual cues verbatim (never culled).
//   2. Rank remaining candidates by editorial PRIORITY (hits > motivated
//      transitions > risers > texture filler).
//   3. Admit greedily under a DENSITY BUDGET (cues/minute from the vibe ×
//      intensity) so it never machine-guns — filler is culled first.
//   4. Enforce spacing: global min-gap, larger same-category gap, and a hard
//      concurrency cap so two sounds never collide.
//   5. Punchlines (high-priority hits) bypass the budget — you always keep them.
//   6. Apply the vibe's loudness character.
//
// Ducking itself is applied at the bus level by SfxPlayer; the per-cue `duck`
// flag just marks which cues participate.

import type { SfxCue, SfxTrack } from './types';

const GLOBAL_MIN_GAP = 0.09;     // sec — nothing closer than this anywhere
const SAME_CAT_MIN_GAP = 0.16;   // sec — same category needs more breathing room
const CONCURRENCY_WINDOW = 0.05; // sec
const MAX_CONCURRENT = 2;
const ALWAYS_KEEP = 0.85;        // priority at/above which a cue bypasses the budget

export interface DirectorOptions {
  intensity: number;       // ~0.4..1.6
  durationSec: number;
  densityPerMin: number;   // from the active vibe
  gainScale: number;       // from the active vibe
  preserve?: SfxCue[];     // locked / manual cues to carry over and protect
}

/** Would admitting `cue` collide with anything already in `admitted`? */
function spacingOk(cue: SfxCue, admitted: SfxCue[]): boolean {
  let concurrent = 0;
  for (const c of admitted) {
    const dt = Math.abs(c.time - cue.time);
    if (dt < GLOBAL_MIN_GAP) return false;
    if (c.category === cue.category && dt < SAME_CAT_MIN_GAP) return false;
    if (dt <= CONCURRENCY_WINDOW) concurrent++;
  }
  return concurrent < MAX_CONCURRENT;
}

export function mixAgent(raw: SfxCue[], opts: DirectorOptions): SfxTrack {
  const { intensity, durationSec, densityPerMin, gainScale } = opts;
  const preserve = opts.preserve ?? [];

  // Budget: target cues across the whole clip, never below a sane floor.
  const minutes = Math.max(durationSec, 1) / 60;
  const budget = Math.max(4, Math.round(densityPerMin * minutes * intensity));

  // Locked/manual cues come first and are immune to culling + spacing rejection.
  const admitted: SfxCue[] = [...preserve];
  const preservedIds = new Set(preserve.map((c) => c.id));
  let spent = preserve.length;

  // Rank candidates: priority first, then loudness as a tiebreak.
  const ranked = [...raw].sort((a, b) =>
    (b.priority ?? 0.5) - (a.priority ?? 0.5) || b.gain - a.gain);

  for (const cue of ranked) {
    const isPunchline = (cue.priority ?? 0) >= ALWAYS_KEEP;
    if (!isPunchline && spent >= budget) continue;     // out of budget → cull filler
    if (!spacingOk(cue, admitted)) continue;           // collides → drop
    admitted.push(cue);
    spent++;
  }

  // Loudness character + final ordering. User-tuned (preserved) gains are left
  // exactly as the user set them; only generated cues take the vibe's character.
  return admitted
    .map((c) => preservedIds.has(c.id)
      ? c
      : { ...c, gain: Math.max(0, Math.min(1, c.gain * gainScale)) })
    .sort((a, b) => a.time - b.time);
}
