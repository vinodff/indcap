/**
 * Client-side clip scoring — ranks caption windows as viral clip candidates.
 *
 * Scoring signals (all derived from Caption[]):
 *   • High-emphasis words (emphasis ≥ 70) → energy
 *   • Energetic/joyful sentiment → hook potential
 *   • Dense word rate (words/sec) → pacing
 *   • Short silence gaps → momentum
 *   • Question marks → engagement
 *   • ALL_CAPS words → shouting = hook
 *
 * No network calls, no ffmpeg — pure analysis.
 */

import { Caption, WordTiming } from '../types';

export interface ClipCandidate {
  startTime: number;
  endTime: number;
  score: number;        // 0-100
  reason: string;       // human-readable reason label
  captionCount: number;
  preview: string;      // first ~60 chars of text
}

const WINDOW_DURATIONS = [15, 30, 45, 60]; // seconds

function scoreCaption(cap: Caption): number {
  let s = 0;

  // Emphasis words
  const emphWords = (cap.words ?? []).filter(w => (w.emphasis ?? 0) >= 70).length;
  s += emphWords * 8;

  // Sentiment
  if (cap.sentiment === 'energetic') s += 20;
  else if (cap.sentiment === 'joyful') s += 12;

  // ALL_CAPS words
  const capsCount = (cap.text.match(/\b[A-Z]{2,}\b/g) ?? []).length;
  s += capsCount * 6;

  // Question mark
  if (cap.text.includes('?')) s += 10;

  // Exclamation
  const excCount = (cap.text.match(/!/g) ?? []).length;
  s += excCount * 5;

  // Word density (words per second)
  const duration = cap.endTime - cap.startTime;
  if (duration > 0) {
    const wordCount = cap.words?.length ?? cap.text.split(/\s+/).length;
    const wps = wordCount / duration;
    if (wps > 3) s += 15; // fast speech = high energy
    else if (wps > 2) s += 8;
  }

  return s;
}

function scoreWindow(captions: Caption[], startIdx: number, endIdx: number): number {
  let total = 0;
  const caps = captions.slice(startIdx, endIdx + 1);

  caps.forEach(c => { total += scoreCaption(c); });

  // Normalize by caption count to avoid long windows dominating trivially
  const perCapScore = caps.length > 0 ? total / caps.length : 0;

  // Momentum bonus — no long silences in window
  let maxGap = 0;
  for (let i = 1; i < caps.length; i++) {
    const gap = caps[i].startTime - caps[i - 1].endTime;
    if (gap > maxGap) maxGap = gap;
  }
  const momentumBonus = maxGap < 0.5 ? 15 : maxGap < 1.0 ? 5 : 0;

  return perCapScore + momentumBonus;
}

function reasonLabel(captions: Caption[], start: number, end: number): string {
  const caps = captions.slice(start, end + 1);
  const hasEnergetic = caps.some(c => c.sentiment === 'energetic');
  const hasEmphasis = caps.some(c => (c.words ?? []).some(w => (w.emphasis ?? 0) >= 80));
  const hasQuestion = caps.some(c => c.text.includes('?'));
  const hasCaps = caps.some(c => /\b[A-Z]{3,}\b/.test(c.text));

  if (hasEnergetic && hasEmphasis) return 'High energy moment';
  if (hasQuestion) return 'Engagement hook';
  if (hasCaps) return 'Power statement';
  if (hasEnergetic) return 'Energetic segment';
  return 'Strong segment';
}

export function extractClips(
  captions: Caption[],
  targetDuration = 30,
  maxResults = 5
): ClipCandidate[] {
  if (captions.length === 0) return [];

  const results: ClipCandidate[] = [];
  const tolerance = targetDuration * 0.25; // ±25% of target

  for (let i = 0; i < captions.length; i++) {
    const winStart = captions[i].startTime;

    // Find the furthest caption that fits within [targetDuration - tolerance, targetDuration + tolerance]
    let bestJ = -1;
    let bestScore = -1;

    for (let j = i; j < captions.length; j++) {
      const winDur = captions[j].endTime - winStart;
      if (winDur > targetDuration + tolerance) break;
      if (winDur >= targetDuration - tolerance) {
        const s = scoreWindow(captions, i, j);
        if (s > bestScore) { bestScore = s; bestJ = j; }
      }
    }

    if (bestJ < 0) continue;

    const cap0 = captions[i];
    const capN = captions[bestJ];
    const preview = captions.slice(i, bestJ + 1).map(c => c.text).join(' ').slice(0, 70);

    results.push({
      startTime: cap0.startTime,
      endTime: capN.endTime,
      score: Math.min(100, Math.round(bestScore)),
      reason: reasonLabel(captions, i, bestJ),
      captionCount: bestJ - i + 1,
      preview: preview + (preview.length >= 70 ? '…' : ''),
    });

    // Jump ahead to avoid heavily overlapping candidates
    i = Math.floor(i + (bestJ - i) * 0.5);
  }

  // De-duplicate overlapping windows, keep highest score
  const deduped: ClipCandidate[] = [];
  for (const candidate of results) {
    const overlaps = deduped.some(
      d => candidate.startTime < d.endTime && candidate.endTime > d.startTime
    );
    if (!overlaps) deduped.push(candidate);
  }

  // Sort by score descending, cap at maxResults
  return deduped.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

/** Format seconds as M:SS */
export function formatClipTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
