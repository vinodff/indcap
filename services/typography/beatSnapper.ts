/**
 * Beat Snapper
 *
 * Aligns word start times to detected audio beats for that "snappy" feeling.
 * Words feel like they land on the beat → cinematic synchronization.
 *
 * Algorithm: Binary search for closest beat within tolerance window (±80-100ms)
 */

import type { BeatGrid, TranscriptWord } from './types';

// ─── Configuration ──────────────────────────────────────────────────────────

const BEAT_SNAP_TOLERANCE = 0.08; // ±80ms for normal words
const HERO_WORD_TOLERANCE = 0.1; // ±100ms for emphasized words (more flexible)
const MINIMUM_BEAT_SPACING = 0.12; // Don't place two words within 120ms of each other

// ─── Main Snapping Engine ──────────────────────────────────────────────────

export function snapWordsToBeatGrid(
  words: TranscriptWord[],
  beatGrid: BeatGrid
): TranscriptWord[] {
  if (beatGrid.beats.length === 0) {
    // No beats detected, return words as-is
    return words;
  }

  return words.map((word, index) => {
    const tolerance =
      word.emphasisScore >= 85 ? HERO_WORD_TOLERANCE : BEAT_SNAP_TOLERANCE;

    const snappedTime = findNearestBeat(word.startTime, beatGrid.beats, tolerance);

    // Ensure no overlap with previous word
    const prevWord = index > 0 ? words[index - 1] : null;
    const minTime = prevWord ? prevWord.startTime + MINIMUM_BEAT_SPACING : 0;

    return {
      ...word,
      startTime: Math.max(snappedTime, minTime),
    };
  });
}

// ─── Beat Search Algorithm ──────────────────────────────────────────────────

/**
 * Find the nearest beat to a given time, within tolerance window.
 * If no beat within tolerance, returns original time.
 *
 * Uses binary search for O(log n) complexity.
 */
export function findNearestBeat(
  time: number,
  beats: number[],
  tolerance: number = BEAT_SNAP_TOLERANCE
): number {
  if (beats.length === 0) {
    return time;
  }

  // Binary search for insertion point
  let lo = 0;
  let hi = beats.length;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (beats[mid] < time) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  // Check candidates: beat at lo and beat at lo-1
  const candidates: number[] = [];

  if (lo > 0) {
    candidates.push(beats[lo - 1]);
  }
  if (lo < beats.length) {
    candidates.push(beats[lo]);
  }

  // Find closest candidate within tolerance
  let bestBeat = time; // Default: no snapping
  let bestDistance = tolerance;

  for (const beat of candidates) {
    const distance = Math.abs(beat - time);
    if (distance <= bestDistance) {
      bestBeat = beat;
      bestDistance = distance;
    }
  }

  return bestBeat;
}

// ─── Syllable-Level Snapping for Speech ────────────────────────────────────

/**
 * For speech-heavy content (podcasts, voiceovers), snap to syllable timings
 * rather than beat grid for more natural feel.
 */
export function snapWordsToSyllables(
  words: TranscriptWord[],
  syllableTimings: number[]
): TranscriptWord[] {
  if (syllableTimings.length === 0) {
    return words;
  }

  return words.map((word) => {
    const snappedTime = findNearestBeat(
      word.startTime,
      syllableTimings,
      0.1 // Slightly more tolerance for syllables
    );

    return {
      ...word,
      startTime: snappedTime,
    };
  });
}

// ─── Beat-Aware Timing Adjustment ──────────────────────────────────────────

/**
 * Calculate total duration needed for a word, considering beat grid.
 * If a beat occurs before natural word end, extend to that beat.
 */
export function adjustWordDurationToBeat(
  word: TranscriptWord,
  beatGrid: BeatGrid
): number {
  const originalDuration = word.endTime - word.startTime;

  // Find next beat after word start
  const nextBeatIndex = beatGrid.beats.findIndex((b) => b > word.startTime);

  if (nextBeatIndex === -1 || nextBeatIndex >= beatGrid.beats.length) {
    // No next beat, use original duration
    return originalDuration;
  }

  const nextBeatTime = beatGrid.beats[nextBeatIndex];
  const timeToNextBeat = nextBeatTime - word.startTime;

  // If next beat is within 200ms of natural end, extend to beat
  if (timeToNextBeat < originalDuration + 0.2 && timeToNextBeat > originalDuration) {
    return timeToNextBeat;
  }

  return originalDuration;
}

// ─── Beat Grid Visualization Data ──────────────────────────────────────────

/**
 * Generate marker data for timeline UI to show beat grid
 */
export function generateBeatMarkers(
  beatGrid: BeatGrid,
  duration: number
): Array<{ time: number; strength: number; type: 'major' | 'minor' }> {
  return beatGrid.beats.map((beat, index) => {
    // Every 4th beat is "major" (downbeat pattern)
    const isMajor = index % 4 === 0;

    // Estimate strength from tempo (faster beats = higher emphasis)
    let strength = 0.5;
    if (isMajor) {
      strength = 1.0;
    } else if (index % 2 === 0) {
      strength = 0.75;
    }

    return {
      time: beat,
      strength: Math.min(1, strength * (beatGrid.bpm / 120)), // Normalize to 120 BPM
      type: isMajor ? 'major' : 'minor',
    };
  });
}

// ─── Sync Quality Metrics ──────────────────────────────────────────────────

export interface SyncQuality {
  averageSnapDistance: number;  // How far off beat are words?
  percentageSnapped: number;    // % of words snapped to beat
  beatCoverage: number;         // % of beats covered by words
}

export function calculateSyncQuality(
  originalWords: TranscriptWord[],
  snappedWords: TranscriptWord[],
  beatGrid: BeatGrid
): SyncQuality {
  // Average distance of snapping
  let totalDistance = 0;
  let snappedCount = 0;

  for (let i = 0; i < originalWords.length; i++) {
    const distance = Math.abs(snappedWords[i].startTime - originalWords[i].startTime);
    if (distance > 0.001) {
      // Account for floating point errors
      snappedCount++;
    }
    totalDistance += distance;
  }

  const averageSnapDistance = totalDistance / originalWords.length;
  const percentageSnapped = (snappedCount / originalWords.length) * 100;

  // Beat coverage: how many beats have a word near them?
  let beatsWithWords = 0;
  for (const beat of beatGrid.beats) {
    const hasNearbyWord = snappedWords.some(
      (word) => Math.abs(word.startTime - beat) < 0.15
    );
    if (hasNearbyWord) {
      beatsWithWords++;
    }
  }

  const beatCoverage = (beatsWithWords / beatGrid.beats.length) * 100;

  return {
    averageSnapDistance,
    percentageSnapped,
    beatCoverage,
  };
}

// ─── Smart Snapping with Constraints ────────────────────────────────────────

/**
 * Advanced snapping that considers:
 * - Words shouldn't overlap
 * - Preserve relative timing where possible
 * - Respect natural pauses in speech
 */
export function snapWordsWithConstraints(
  words: TranscriptWord[],
  beatGrid: BeatGrid
): TranscriptWord[] {
  const snapped: TranscriptWord[] = [];
  let lastEndTime = 0;

  // Use vocal syllable onsets if available (podcast/voiceover sync), fallback to musical beats
  const onsets = beatGrid.syllabeTimings && beatGrid.syllabeTimings.length > 0
    ? beatGrid.syllabeTimings
    : beatGrid.beats;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Snap to the nearest actual acoustic onset (speech peak) if within 250ms tolerance
    let snappedStart = word.startTime;
    if (onsets && onsets.length > 0) {
      snappedStart = findNearestBeat(word.startTime, onsets, 0.25);
    }

    // Enforce non-overlapping constraint to prevent visual collision
    snappedStart = Math.max(snappedStart, lastEndTime + 0.02);
    const duration = word.endTime - word.startTime;
    const snappedEnd = snappedStart + duration;

    snapped.push({
      ...word,
      startTime: snappedStart,
      endTime: snappedEnd,
    });

    lastEndTime = snappedEnd;
  }

  return snapped;
}
