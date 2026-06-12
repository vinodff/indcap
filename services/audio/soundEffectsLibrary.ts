import { SoundEngine } from '../soundEngine';
import type { BeatGrid } from '../typographyReel/types';
import { snapToBeat } from '../typographyReel/beatAnalyzer';

/**
 * SoundEffectsLibrary — beat-aware SFX layer over SoundEngine.
 *
 * Distinguishes three event types:
 *   impact  — high-emphasis word (≥85) fires a punchy freq-sweep + noise burst
 *   whoosh  — new caption transition, gated to ±80ms of nearest beat when a
 *             beat grid is available
 *   pop     — any lower-emphasis word highlight or emoji reveal
 *
 * If no BeatGrid is set, all events fire unconditionally.
 */
export class SoundEffectsLibrary {
  private engine: SoundEngine;
  private beatGrid: BeatGrid | null = null;

  constructor(engine: SoundEngine) {
    this.engine = engine;
  }

  setBeatGrid(grid: BeatGrid | null): void {
    this.beatGrid = grid;
  }

  /** Caption changed. Fires whoosh (beat-snapped when grid available). */
  onCaptionChange(time: number, hasHighScale: boolean): void {
    if (this.beatGrid) {
      const snapped = snapToBeat(time, this.beatGrid, 0.08);
      const nearBeat = Math.abs(snapped - time) <= 0.08;
      if (!nearBeat) {
        this.engine.playPop();
        return;
      }
    }
    this.engine.playWhoosh();
    if (hasHighScale) {
      setTimeout(() => this.engine.playImpact(), 60);
    }
  }

  /** Emphasized word became active. */
  onEmphasizedWord(emphasis: number, time: number): void {
    if (emphasis >= 85) {
      if (this.beatGrid) {
        const snapped = snapToBeat(time, this.beatGrid, 0.08);
        if (Math.abs(snapped - time) > 0.08) {
          this.engine.playPop();
          return;
        }
      }
      this.engine.playImpact();
    } else {
      this.engine.playPop();
    }
  }

  /** Emoji revealed — play a bright pop. */
  onEmojiReveal(): void {
    this.engine.playPop();
  }
}
