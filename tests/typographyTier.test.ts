/**
 * Guards for the tier-1/2 typography upgrades:
 *  - iconKeyword: which words are worth an internet icon lookup
 *  - choreograph: energyCurve rides the sequence (audio-reactive motion)
 *  - energyAt: bounds, NaN absorption, and box-average smoothing
 *
 * sampleEnergy lives in the DOM-free ./energy module (the renderer's import
 * chain pulls lottie-web, which needs `document` and can't load in node).
 */

import { describe, it, expect } from 'vitest';
import { iconKeyword } from '../services/typography/keywordIconService';
import { choreograph } from '../services/typography/choreographyEngine';
import { sampleEnergy } from '../services/typography/energy';
import { THEME_PRESETS } from '../services/typography/types';
import type { BeatGrid, EnrichedTranscript } from '../services/typography/types';

const energyAt = sampleEnergy;

describe('iconKeyword', () => {
  it('rejects stopwords and short words', () => {
    expect(iconKeyword('the')).toBeNull();
    expect(iconKeyword('VERY')).toBeNull(); // stopword check is case-folded
    expect(iconKeyword('ok')).toBeNull(); // < 3 chars
  });

  it('normalizes real keywords: emoji + punctuation stripped, lowercased', () => {
    expect(iconKeyword('ROCKET🚀!')).toBe('rocket');
    expect(iconKeyword('Money,')).toBe('money');
  });

  it('emoji-only word yields null, not an empty lookup', () => {
    expect(iconKeyword('🚀🔥')).toBeNull();
  });
});

describe('energyAt', () => {
  it('neutral 0.5 when the sequence has no curve (old saves / demo cache)', () => {
    expect(energyAt(undefined, 1.0)).toBe(0.5);
    expect(energyAt([], 1.0)).toBe(0.5);
  });

  it('absorbs the silent-audio all-NaN curve instead of poisoning alphas', () => {
    expect(energyAt([NaN, NaN, NaN], 0.01)).toBe(0.5);
  });

  it('clamps t outside the curve to the edge windows', () => {
    const curve = Array(100).fill(0.8);
    expect(energyAt(curve, -5)).toBeCloseTo(0.8, 6);
    expect(energyAt(curve, 999)).toBeCloseTo(0.8, 6); // past the end
  });

  it('box-averages ±4 samples (aliasing damper), skipping NaN samples', () => {
    // Impulse at index 50 in a zero curve: window at t=0.5 spans 46..54,
    // so the averaged value is 1/9 — not the raw 1.0.
    const curve = Array(100).fill(0);
    curve[50] = 1;
    expect(energyAt(curve, 0.5)).toBeCloseTo(1 / 9, 6);

    // A NaN inside the window is skipped, not propagated.
    curve[49] = NaN;
    expect(energyAt(curve, 0.5)).toBeCloseTo(1 / 8, 6);
  });
});

describe('choreograph energyCurve attachment', () => {
  const theme = THEME_PRESETS['cinematic-poet'];
  const transcript: EnrichedTranscript = {
    language: 'en',
    duration: 2.0,
    confidence: 0.9,
    segments: [
      {
        id: 'seg-0',
        text: 'build faster',
        startTime: 0.1,
        endTime: 1.4,
        emotion: 'tension',
        emotionIntensity: 2,
        words: [
          { text: 'build', startTime: 0.1, endTime: 0.7, role: 'subject', emphasisScore: 80 },
          { text: 'faster', startTime: 0.8, endTime: 1.4, role: 'action', emphasisScore: 60 },
        ],
      },
    ],
  };
  const beatGrid: BeatGrid = {
    beats: [0, 0.5, 1.0, 1.5],
    bpm: 120,
    energyCurve: [0.1, 0.4, 0.9, 0.4],
    syllabeTimings: [0, 0.5, 1.0],
    duration: 2.0,
  };

  it('the sequence carries the beat grid energy curve for the renderer', () => {
    const seq = choreograph({ transcript, beatGrid, theme });
    expect(seq.energyCurve).toBe(beatGrid.energyCurve);
  });
});
