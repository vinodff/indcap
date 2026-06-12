/**
 * Regression tests for hidden bugs found in the Viral Captions feature
 * (/investigate session). Each test documents the original failure mode.
 */
import { describe, it, expect } from 'vitest';
import { removeFillerWords } from '../services/fillerWordRemover';
import { captionsToSrt } from '../services/exporters/srtExporter';
import { captionsToVtt } from '../services/exporters/vttExporter';
import { applyCommand } from '../services/caption/chatEditor';
import type { Caption } from '../types';

const word = (text: string, start: number, end: number) => ({ text, start, end });

describe('removeFillerWords — per-word metadata alignment', () => {
  it('keeps wordColors aligned with surviving words', () => {
    // "um" is a filler; before the fix the colors array kept 4 entries and
    // "world" inherited the color that belonged to "um".
    const caption: Caption = {
      id: 'c1',
      startTime: 0,
      endTime: 2,
      text: 'hello um big world',
      words: [
        word('hello', 0, 0.5),
        word('um', 0.5, 0.8),
        word('big', 0.8, 1.2),
        word('world', 1.2, 2),
      ],
      wordColors: ['#FFFFFF', '#111111', '#22C55E', '#EF4444'],
    } as Caption;

    const [out] = removeFillerWords([caption]);
    expect(out.words!.map(w => w.text)).toEqual(['hello', 'big', 'world']);
    // Colors must follow their words, not their old indices.
    expect(out.wordColors).toEqual(['#FFFFFF', '#22C55E', '#EF4444']);
  });

  it('remaps highlightIndices past removed words', () => {
    const caption: Caption = {
      id: 'c2',
      startTime: 0,
      endTime: 2,
      text: 'um buy now',
      words: [word('um', 0, 0.3), word('buy', 0.3, 1), word('now', 1, 2)],
      highlightIndices: [1, 2], // "buy", "now"
    } as Caption;

    const [out] = removeFillerWords([caption]);
    // After removing index 0, highlights must shift down to keep pointing
    // at "buy" and "now".
    expect(out.highlightIndices).toEqual([0, 1]);
  });
});

describe('SRT/VTT timestamp rounding', () => {
  // 1.9996s rounds the fractional part to 1000ms — invalid in both formats
  // before the fix ("00:00:01,1000").
  const caption: Caption = {
    id: 't1',
    startTime: 1.9996,
    endTime: 3.9995,
    text: 'rounding',
  } as Caption;

  it('SRT never emits ms component >= 1000', () => {
    const srt = captionsToSrt([caption]);
    expect(srt).toContain('00:00:02,000');
    expect(srt).not.toMatch(/,\d{4,}/);
  });

  it('VTT never emits ms component >= 1000', () => {
    const vtt = captionsToVtt([caption]);
    expect(vtt).toContain('00:00:02.000');
    expect(vtt).not.toMatch(/\.\d{4,}/);
  });
});

describe('chatEditor — word matching with punctuation', () => {
  const captions: Caption[] = [
    {
      id: 'c1',
      startTime: 0,
      endTime: 2,
      text: 'this is amazing,',
      words: [
        word('this', 0, 0.5),
        word('is', 0.5, 1),
        word('amazing,', 1, 2), // transcript keeps trailing comma
      ],
    } as Caption,
  ];

  it('matches words despite trailing punctuation', () => {
    const result = applyCommand(captions, 'make amazing red', 1.5);
    expect(result.message).toContain('Set "amazing" to');
    const cap = result.captions[0];
    expect(cap.wordColors?.[2]).toBe('#EF4444');
  });
});
