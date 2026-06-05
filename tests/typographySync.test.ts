/**
 * Regression test: word-level audio sync.
 *
 * Root cause this guards against: choreograph() used to ALWAYS run
 * snapWordsWithConstraints, which shifted each word's startTime to the nearest
 * acoustic onset within ±250ms — overwriting the transcript's true spoken
 * timings and breaking exact word-level sync.
 *
 * Contract now:
 *  - default (syncMode 'exact')  → animation startTimes == transcript startTimes
 *  - syncMode 'beat'             → snapping still available (opt-in)
 */

import { describe, it, expect } from 'vitest';
import { choreograph } from '../services/typography/choreographyEngine';
import { THEME_PRESETS } from '../services/typography/types';
import type { BeatGrid, EnrichedTranscript } from '../services/typography/types';

const theme = THEME_PRESETS['cinematic-poet'];

// Word starts are deliberately OFF the beat grid so that, if snapping ran,
// every start would move by a measurable amount.
const transcript: EnrichedTranscript = {
  language: 'en',
  duration: 3.0,
  confidence: 0.95,
  segments: [
    {
      id: 'seg-0',
      text: 'wo bhi bina',
      startTime: 0.37,
      endTime: 2.13,
      emotion: 'neutral',
      emotionIntensity: 2,
      words: [
        { text: 'wo', startTime: 0.37, endTime: 0.71, role: 'connector', emphasisScore: 10 },
        { text: 'bhi', startTime: 0.86, endTime: 1.19, role: 'connector', emphasisScore: 12 },
        { text: 'bina', startTime: 1.41, endTime: 2.13, role: 'subject', emphasisScore: 70 },
      ],
    },
  ],
};

// Onsets sit ~150–230ms away from each word start — inside the 250ms snap
// tolerance, so 'beat' mode would pull every word onto these.
const beatGrid: BeatGrid = {
  beats: [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
  bpm: 120,
  energyCurve: [],
  syllabeTimings: [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0],
  duration: 3.0,
};

const originalStarts = transcript.segments[0].words.map((w) => w.startTime);

describe('choreograph word-level sync', () => {
  it('exact mode (default) preserves transcript word startTimes to the millisecond', () => {
    const seq = choreograph({ transcript, beatGrid, theme });

    expect(seq.animations).toHaveLength(originalStarts.length);
    seq.animations.forEach((anim, i) => {
      // Exact equality within 1ms — no beat drift allowed.
      expect(Math.abs(anim.startTime - originalStarts[i])).toBeLessThan(0.001);
    });
  });

  it('beat mode still snaps (opt-in), proving exact mode is what protects sync', () => {
    const seq = choreograph({ transcript, beatGrid, theme, syncMode: 'beat' });

    // At least one word should have moved off its spoken time when snapping.
    const moved = seq.animations.some(
      (anim, i) => Math.abs(anim.startTime - originalStarts[i]) > 0.05
    );
    expect(moved).toBe(true);
  });
});
