// Moment Agent — find the "important moments" that deserve a punch-in.
//
// Sources: high word-emphasis (the punchy keyword), energetic-sentiment caption
// starts, and (lightly) beat onsets near a caption start. Kept sparse so the
// camera doesn't twitch on every word.

import type { Caption } from '../../types';

export interface CameraMoment { time: number; strength: number; } // strength 0..1

const MIN_GAP = 1.4;      // seconds between punch-ins
const EMPH_THRESH = 68;   // word emphasis that earns a punch-in

export function momentAgent(captions: Caption[], beats?: number[]): CameraMoment[] {
  const raw: CameraMoment[] = [];

  for (const cap of captions) {
    for (const w of cap.words ?? []) {
      const e = w.emphasis ?? 0;
      if (e >= EMPH_THRESH) raw.push({ time: w.start, strength: Math.min(1, (e - 50) / 50) });
    }
    // Energetic caption with no strong word still gets a modest push on entry.
    const hasStrong = (cap.words ?? []).some(w => (w.emphasis ?? 0) >= EMPH_THRESH);
    if (cap.sentiment === 'energetic' && !hasStrong) {
      raw.push({ time: cap.startTime, strength: 0.6 });
    }
  }

  raw.sort((a, b) => a.time - b.time || b.strength - a.strength);

  // Snap to a nearby beat (±0.12s) for musical timing, then enforce the min gap.
  const out: CameraMoment[] = [];
  let last = -Infinity;
  for (const m of raw) {
    let t = m.time;
    if (beats && beats.length) {
      let best = t, bd = 0.12;
      for (const b of beats) { const d = Math.abs(b - t); if (d <= bd) { best = b; bd = d; } else if (b > t + 0.12) break; }
      t = best;
    }
    if (t - last < MIN_GAP) continue;
    out.push({ time: t, strength: m.strength });
    last = t;
  }
  return out;
}
