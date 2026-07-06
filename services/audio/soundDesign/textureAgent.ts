// Texture Agent — Stage 2 of sound design.
//
// Textured sounds (clicks, data ticks, pops, keyboard) bring small reveals to
// life and steer the eye. They're the seasoning — low priority, easily culled by
// the director when the budget is tight, so they never machine-gun. Everything
// comes from the locked palette and only fires for roles the active vibe allows.

import type { SoundDesignInput, SfxCue } from './types';
import type { Palette } from './palette';
import { cueId, snapToBeats } from './types';

export function textureAgent(input: SoundDesignInput, palette: Palette): SfxCue[] {
  const cues: SfxCue[] = [];

  input.captions.forEach((cap, ci) => {
    if (cap.sfxDisabled) return;
    const words = cap.words ?? [];

    // Fast/long text block → a single keyboard flourish at the start.
    if (words.length >= 6 && palette.allows('keyboard')) {
      const a = palette.pick('keyboard');
      if (a) {
        cues.push({
          id: cueId('texture'), time: cap.startTime + 0.02, category: a.category,
          assetId: a.id, gain: 0.3, source: 'texture', role: 'keyboard', layer: 0,
          label: 'Keyboard', duck: true, priority: 0.3,
        });
      }
    }

    words.forEach((w, wi) => {
      const emp = w.emphasis ?? 0;
      const isIcon = !!(w.iconEmoji || w.iconUrl);

      // Icon / emoji reveal → digital data tick.
      if (isIcon && palette.allows('data')) {
        const a = palette.pick('data');
        if (a) {
          cues.push({
            id: cueId('texture'), time: snapToBeats(w.start, input.beats), category: a.category,
            assetId: a.id, gain: 0.33, source: 'texture', role: 'data', layer: 0,
            label: 'Data', duck: true, priority: 0.42,
          });
        }
        return;
      }

      // Mid-emphasis word (below the "hit" threshold) → soft pop or click.
      if (emp >= 55 && emp < 85) {
        const role = emp >= 70 ? 'pop' : 'click';
        if (!palette.allows(role)) return;
        const a = palette.pick(role);
        if (a) {
          cues.push({
            id: cueId('texture'), time: snapToBeats(w.start, input.beats), category: a.category,
            assetId: a.id, gain: 0.32, source: 'texture', role, layer: 0,
            label: role === 'pop' ? 'Pop' : 'Click', duck: true,
            priority: role === 'pop' ? 0.4 : 0.3,
          });
        }
      }
    });
  });

  return cues;
}
