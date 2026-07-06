// Sound Design Orchestrator — the lead "sound designer" that hires the
// specialized agents, hands them ONE locked signature palette, then runs the
// director to finish an intentional, budgeted track.
//
// Flow:  buildPalette(vibe, seed)  →  agents propose candidates (with priority)
//        →  mixAgent (director) admits within the density budget, preserving the
//           user's locked/manual cues.
//
// Each agent is wrapped so one throwing agent can't kill the whole pass.

import type { SoundDesignInput, SoundDesignOptions, SfxTrack, SfxCue } from './types';
import { buildPalette } from './palette';
import { motionAgent } from './motionAgent';
import { textureAgent } from './textureAgent';
import { riserHitAgent } from './riserHitAgent';
import { mixAgent } from './mixAgent';

export function runSoundDesign(input: SoundDesignInput, options: SoundDesignOptions = {}): SfxTrack {
  if (!input.captions || input.captions.length === 0) {
    // Even with no captions, carry over any user-placed cues.
    return options.preserve ?? [];
  }

  const vibe = options.vibe ?? 'CLEAN';
  const intensity = Math.max(0.3, Math.min(1.8, options.intensity ?? 1));
  const seed = options.seed ?? `${Math.round(input.duration)}:${input.captions.length}:${vibe}`;
  const palette = buildPalette(vibe, seed);

  const enable = {
    motion: options.motion ?? true,
    texture: options.texture ?? true,
    risersHits: options.risersHits ?? true,
  };

  const raw: SfxCue[] = [];
  const run = (name: string, fn: () => SfxCue[]) => {
    try { raw.push(...fn()); }
    catch (e) { console.warn(`[soundDesign] ${name} agent failed:`, e); }
  };

  if (enable.motion) run('motion', () => motionAgent(input, palette));
  if (enable.texture) run('texture', () => textureAgent(input, palette));
  if (enable.risersHits) run('riserHit', () => riserHitAgent(input, palette));

  const track = mixAgent(raw, {
    intensity,
    durationSec: input.duration,
    densityPerMin: palette.densityPerMin,
    gainScale: palette.gainScale,
    preserve: options.preserve,
  });

  // Observability: one grouped summary of what the pass produced.
  try {
    const bySource: Record<string, number> = {};
    const byCat: Record<string, number> = {};
    for (const c of track) {
      bySource[c.source] = (bySource[c.source] ?? 0) + 1;
      byCat[c.category] = (byCat[c.category] ?? 0) + 1;
    }
    // eslint-disable-next-line no-console
    console.groupCollapsed(`[soundDesign] ${vibe} · ${track.length} cues (${raw.length} raw, intensity ${intensity.toFixed(2)})`);
    console.log('by source:', bySource);
    console.log('by category:', byCat);
    console.groupEnd();
  } catch { /* logging is best-effort */ }

  return track;
}

export type { SoundDesignInput, SoundDesignOptions, SfxTrack, SfxCue } from './types';
export type { SfxSource } from './types';
export type { SfxVibe, SfxRole } from './palette';
export { VIBES, cycleAsset, curatedAssets } from './palette';
