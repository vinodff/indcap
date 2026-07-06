// Cue-level editing helpers — power the per-cue "swap / adjust / mute / lock"
// controls in the timeline and the manual "add SFX here" action. These are pure
// functions over an SfxCue (or category) so the App can map them onto the track.

import { getAsset, type SfxCategory } from '../sfxLibrary';
import { cueId } from './types';
import { cycleAsset, curatedAssets } from './palette';
import type { SfxCue } from './types';

/** Swap a cue's sound to the next/previous curated alternative in its category. */
export function swapCueSound(cue: SfxCue, dir: 1 | -1): SfxCue {
  const next = cycleAsset(cue.assetId, cue.category, dir);
  if (!next) return cue;
  return { ...cue, assetId: next.id, label: prettyName(next.name), locked: true };
}

/** Clamp + set a cue's gain (and mark it user-tuned so it survives regen). */
export function setCueGain(cue: SfxCue, gain: number): SfxCue {
  return { ...cue, gain: Math.max(0, Math.min(1, gain)), locked: true };
}

/** Nudge a cue earlier/later on the timeline (seconds), staying >= 0. */
export function nudgeCue(cue: SfxCue, deltaSec: number): SfxCue {
  return { ...cue, time: Math.max(0, cue.time + deltaSec), locked: true };
}

export function toggleCueMuted(cue: SfxCue): SfxCue {
  return { ...cue, muted: !cue.muted, locked: true };
}

export function toggleCueLocked(cue: SfxCue): SfxCue {
  return { ...cue, locked: !cue.locked };
}

/** Create a user-placed cue at `time` using the best curated sound in a category. */
export function createManualCue(time: number, category: SfxCategory): SfxCue | null {
  const asset = curatedAssets(category)[0];
  if (!asset) return null;
  return {
    id: cueId('manual'), time: Math.max(0, time), category, assetId: asset.id,
    gain: category === 'HIT' ? 0.8 : 0.5, source: 'manual', layer: 0,
    label: prettyName(asset.name), duck: category !== 'HIT' && category !== 'RISER',
    priority: 1, locked: true,
  };
}

/** Friendly display name from a raw asset filename. */
export function prettyName(name: string): string {
  const base = name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();
  // Drop leading index numbers like "06 " and noisy suffixes.
  return base.replace(/^\d+\s+/, '').replace(/\b(sound effect|sfx|hd|no copyright)\b/gi, '').replace(/\s+/g, ' ').trim() || base;
}

/** Resolve a cue's current display name (for the edit popover). */
export function cueSoundName(cue: SfxCue): string {
  const a = getAsset(cue.assetId);
  return a ? prettyName(a.name) : cue.label;
}
