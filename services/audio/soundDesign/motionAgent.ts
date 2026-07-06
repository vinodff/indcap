// Motion Agent — Stage 1 of sound design.
//
// A senior editor does NOT whoosh every caption — that's the #1 amateur tell.
// They sound *motivated* transitions: the first line, a new sentence, a line
// that arrives after a breath/gap, a position jump, or a zoom emphasis. Routine
// back-to-back lines stay silent so the deliberate ones land.
//
// We don't hard-drop the routine ones here; we emit them with a low PRIORITY and
// let the director's density budget decide. Significant moments get high
// priority and survive; filler gets culled first. Every sound is drawn from the
// LOCKED signature palette so transitions feel consistent, not random.

import type { SoundDesignInput, SfxCue } from './types';
import type { Palette } from './palette';
import { cueId, snapToBeats } from './types';

const SENTENCE_END = /[.!?…]\s*$/;

export function motionAgent(input: SoundDesignInput, palette: Palette): SfxCue[] {
  const cues: SfxCue[] = [];
  const caps = [...input.captions].sort((a, b) => a.startTime - b.startTime);
  const motionInOff = input.entryAnimation === 'NONE';

  caps.forEach((cap, i) => {
    if (cap.sfxDisabled) return;
    const prev = caps[i - 1];
    const next = caps[i + 1];

    // ── Is this entrance worth a whoosh? Score its "significance". ──
    const gapBefore = prev ? cap.startTime - prev.endTime : Infinity;
    const newSentence = !prev || SENTENCE_END.test(prev.text ?? '');
    const scaleJump = Math.abs((cap.customScale ?? 1) - (prev?.customScale ?? 1)) > 0.15;
    const posJump = !!prev && (Math.abs((cap.customY ?? 0) - (prev.customY ?? 0)) > 0.08 ||
                               Math.abs((cap.customX ?? 0) - (prev.customX ?? 0)) > 0.08);
    const significant = i === 0 || gapBefore > 0.45 || newSentence || scaleJump || posJump;

    if (!motionInOff && palette.allows('whoosh-in')) {
      const a = palette.pick('whoosh-in');
      if (a) {
        cues.push({
          id: cueId('motion'), time: snapToBeats(cap.startTime, input.beats),
          category: a.category, assetId: a.id, gain: significant ? 0.5 : 0.4,
          source: 'motion', role: 'whoosh-in', layer: 0,
          label: significant ? 'Whoosh in' : 'Whoosh (soft)', duck: true,
          // High priority for motivated entrances; filler is first to be culled.
          priority: significant ? 0.7 : 0.32,
        });
      }

      // Zoom / big-move emphasis → layer a deeper whoosh just under the lead one.
      if ((cap.customScale ?? 1) > 1.2 && palette.allows('whoosh-big')) {
        const big = palette.pick('whoosh-big');
        if (big) {
          cues.push({
            id: cueId('motion'), time: Math.max(0, snapToBeats(cap.startTime, input.beats) - 0.04),
            category: big.category, assetId: big.id, gain: 0.62, source: 'motion',
            role: 'whoosh-big', layer: 1, label: 'Whoosh (zoom)', duck: true, priority: 0.74,
          });
        }
      }
    }

    // ── Whoosh-out only when the line slides away into a real visible gap. ──
    const gapAfter = next ? next.startTime - cap.endTime : input.duration - cap.endTime;
    if (gapAfter > 0.7 && palette.allows('whoosh-out')) {
      const a = palette.pick('whoosh-out');
      if (a) {
        cues.push({
          id: cueId('motion'), time: snapToBeats(cap.endTime, input.beats),
          category: a.category, assetId: a.id, gain: 0.38, source: 'motion',
          role: 'whoosh-out', layer: 0, label: 'Whoosh out', duck: true, priority: 0.45,
        });
      }
    }
  });

  return cues;
}
