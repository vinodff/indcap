// Riser + Hit Agent — Stage 3 of sound design.
//
// Hits are the punctuation of a viral edit: the punchline, the drop, the reveal.
// They carry the HIGHEST priority so the director always keeps them even when it
// culls everything else. Risers build anticipation INTO a hit and stay sparse
// (long sounds, easily overused). Both pull from the locked signature palette,
// with hits allowed to rotate between two curated booms for variety.

import type { SoundDesignInput, SfxCue } from './types';
import type { Palette } from './palette';
import { cueId, snapToBeats } from './types';

const RISER_LEAD = 1.4;       // seconds of build before the peak
const RISER_MIN_GAP = 6;      // don't stack risers closer than this

export function riserHitAgent(input: SoundDesignInput, palette: Palette): SfxCue[] {
  const cues: SfxCue[] = [];
  const caps = [...input.captions].sort((a, b) => a.startTime - b.startTime);
  const peaks: number[] = [];

  if (palette.allows('hit')) {
    let variant = 0;
    caps.forEach((cap) => {
      if (cap.sfxDisabled) return;
      (cap.words ?? []).forEach((w) => {
        if ((w.emphasis ?? 0) >= 85) {
          const a = palette.pick('hit', variant++);
          if (a) {
            cues.push({
              id: cueId('hit'), time: snapToBeats(w.start, input.beats), category: a.category,
              assetId: a.id, gain: 0.8, source: 'hit', role: 'hit', layer: 0,
              label: 'Hit', duck: false, priority: 0.96,
            });
            peaks.push(w.start);
          }
        }
      });
      // An energetic caption with no >=85 word still earns a release on entry.
      const hasPeakWord = (cap.words ?? []).some((w) => (w.emphasis ?? 0) >= 85);
      if (cap.sentiment === 'energetic' && !hasPeakWord) {
        const a = palette.pick('hit', variant++);
        if (a) {
          cues.push({
            id: cueId('hit'), time: snapToBeats(cap.startTime, input.beats), category: a.category,
            assetId: a.id, gain: 0.7, source: 'hit', role: 'hit', layer: 0,
            label: 'Hit', duck: false, priority: 0.85,
          });
          peaks.push(cap.startTime);
        }
      }
    });
  }

  // ── Risers: lead into each peak, kept sparse ──
  if (palette.allows('riser')) {
    peaks.sort((a, b) => a - b);
    let lastRiser = -Infinity;
    let variant = 0;
    for (const peak of peaks) {
      const start = peak - RISER_LEAD;
      if (start < 0) continue;
      if (start - lastRiser < RISER_MIN_GAP) continue;
      const a = palette.pick('riser', variant++);
      if (a) {
        cues.push({
          id: cueId('riser'), time: start, category: a.category, assetId: a.id,
          gain: 0.5, source: 'riser', role: 'riser', layer: 0, label: 'Riser',
          duck: false, priority: 0.6,
        });
        lastRiser = start;
      }
    }
  }

  return cues;
}
