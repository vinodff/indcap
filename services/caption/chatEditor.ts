/**
 * Chat-based caption editor — parses natural-language commands and returns
 * a mutated Caption[] plus a human-readable result message.
 *
 * Supports 15 commands:
 *  1. make [word] [color]          — tint a word in the active caption
 *  2. bold [word]                  — mark word for emphasis (emphasis=90)
 *  3. emphasize [word]             — same as bold
 *  4. remove [word]                — delete word from caption
 *  5. split at [time]              — split caption containing time into two
 *  6. merge [n] [n+1]              — merge two adjacent captions by index
 *  7. move caption [id] to [time]  — shift caption start to time
 *  8. set font size [n]            — sets customScale on active caption
 *  9. add emoji [emoji] after [word] — appends emoji after target word
 * 10. position [top|middle|bottom] — sets customPosition on active caption
 * 11. remove filler words          — strips fillers from all captions
 * 12. add speaker colors           — applies speaker detection
 * 13. delete caption [n]           — removes caption by 1-based index
 * 14. uppercase [word]             — upper-cases word text
 * 15. lowercase [word]             — lower-cases word text
 */

import { Caption, WordTiming } from '../../types';
import { removeFillerWords } from '../fillerWordRemover';
import { annotateSpeakers } from './speakerColorMap';

export interface EditResult {
  captions: Caption[];
  message: string;
}

// Named color map
const COLOR_NAMES: Record<string, string> = {
  red: '#EF4444', orange: '#F97316', yellow: '#EAB308',
  green: '#22C55E', blue: '#3B82F6', purple: '#A855F7',
  pink: '#EC4899', white: '#FFFFFF', black: '#000000',
  gold: '#F59E0B', cyan: '#06B6D4', teal: '#14B8A6',
  lime: '#84CC16', indigo: '#6366F1', rose: '#F43F5E',
};

function resolveColor(raw: string): string | undefined {
  const lower = raw.toLowerCase().trim();
  if (COLOR_NAMES[lower]) return COLOR_NAMES[lower];
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw)) return raw;
  return undefined;
}

function cloneCaptions(captions: Caption[]): Caption[] {
  return captions.map(c => ({
    ...c,
    words: c.words ? c.words.map(w => ({ ...w })) : undefined,
    wordColors: c.wordColors ? [...c.wordColors] : undefined,
  }));
}

function findWordInCaption(caption: Caption, target: string): number {
  if (!caption.words) return -1;
  // Transcripts keep punctuation attached to words ("amazing,"). Compare with
  // punctuation stripped on both sides so chat commands match what users type.
  const norm = (s: string) => s.toLowerCase().replace(/[.,!?'"”“‘’]/g, '').trim();
  const want = norm(target);
  return caption.words.findIndex(w => norm(w.text) === want);
}

// Find the active caption at a given time
function captionAtTime(captions: Caption[], time: number): Caption | undefined {
  return captions.find(c => time >= c.startTime && time <= c.endTime);
}

export function applyCommand(
  captions: Caption[],
  command: string,
  currentTime: number
): EditResult {
  const cmd = command.trim();
  const lower = cmd.toLowerCase();
  const cloned = cloneCaptions(captions);

  // ── 1 & 2 & 3: make [word] [color] | bold/emphasize [word] ──
  const makeColorMatch = lower.match(/^make\s+(\S+)\s+(\S+)/);
  if (makeColorMatch) {
    const [, word, colorRaw] = makeColorMatch;
    const color = resolveColor(colorRaw);
    if (!color) return { captions, message: `Unknown color "${colorRaw}". Try red, blue, gold, etc.` };
    const cap = captionAtTime(cloned, currentTime);
    if (!cap || !cap.words) return { captions, message: 'No active caption at current time.' };
    const wi = findWordInCaption(cap, word);
    if (wi < 0) return { captions, message: `Word "${word}" not found in current caption.` };
    if (!cap.wordColors) cap.wordColors = cap.words.map(() => '#FFFFFF');
    while (cap.wordColors.length < cap.words.length) cap.wordColors.push('#FFFFFF');
    cap.wordColors[wi] = color;
    return { captions: cloned, message: `Set "${word}" to ${color}.` };
  }

  const boldMatch = lower.match(/^(?:bold|emphasize)\s+(\S+)/);
  if (boldMatch) {
    const [, word] = boldMatch;
    const cap = captionAtTime(cloned, currentTime);
    if (!cap || !cap.words) return { captions, message: 'No active caption at current time.' };
    const wi = findWordInCaption(cap, word);
    if (wi < 0) return { captions, message: `Word "${word}" not found in current caption.` };
    cap.words[wi] = { ...cap.words[wi], emphasis: 90 };
    return { captions: cloned, message: `Emphasized "${word}".` };
  }

  // ── 4: remove [word] ──
  const removeWordMatch = lower.match(/^remove\s+(?!filler|caption)(\S+)/);
  if (removeWordMatch) {
    const [, word] = removeWordMatch;
    const cap = captionAtTime(cloned, currentTime);
    if (!cap || !cap.words) return { captions, message: 'No active caption at current time.' };
    const wi = findWordInCaption(cap, word);
    if (wi < 0) return { captions, message: `Word "${word}" not found.` };
    cap.words.splice(wi, 1);
    if (cap.wordColors) cap.wordColors.splice(wi, 1);
    // Rebuild caption text from remaining words
    cap.text = cap.words.map(w => w.text).join(' ');
    return { captions: cloned, message: `Removed "${word}".` };
  }

  // ── 5: split at [time] ──
  const splitMatch = lower.match(/^split\s+at\s+([\d.]+)/);
  if (splitMatch) {
    const splitTime = parseFloat(splitMatch[1]);
    const idx = cloned.findIndex(c => splitTime > c.startTime && splitTime < c.endTime);
    if (idx < 0) return { captions, message: `No caption spans time ${splitTime}.` };
    const cap = cloned[idx];
    const splitPoint = cap.words?.findIndex(w => w.start >= splitTime) ?? -1;
    if (!cap.words || splitPoint <= 0) {
      return { captions, message: `Can't split caption at ${splitTime} — no word boundary.` };
    }

    const wordsA = cap.words.slice(0, splitPoint);
    const wordsB = cap.words.slice(splitPoint);

    const capA: Caption = {
      ...cap,
      endTime: splitTime,
      words: wordsA,
      text: wordsA.map(w => w.text).join(' '),
      wordColors: cap.wordColors?.slice(0, splitPoint),
    };
    const capB: Caption = {
      ...cap,
      id: cap.id + '_b',
      startTime: splitTime,
      words: wordsB,
      text: wordsB.map(w => w.text).join(' '),
      wordColors: cap.wordColors?.slice(splitPoint),
    };

    cloned.splice(idx, 1, capA, capB);
    return { captions: cloned, message: `Split caption at ${splitTime}s.` };
  }

  // ── 6: merge [n] and [n+1] (1-based) ──
  const mergeMatch = lower.match(/^merge\s+(\d+)\s+(?:and\s+)?(\d+)/);
  if (mergeMatch) {
    const a = parseInt(mergeMatch[1]) - 1;
    const b = parseInt(mergeMatch[2]) - 1;
    if (a < 0 || b >= cloned.length || Math.abs(a - b) !== 1) {
      return { captions, message: 'Merge requires two adjacent caption numbers.' };
    }
    const lo = Math.min(a, b);
    const capA = cloned[lo];
    const capB = cloned[lo + 1];
    const merged: Caption = {
      ...capA,
      endTime: capB.endTime,
      text: capA.text + ' ' + capB.text,
      words: capA.words && capB.words ? [...capA.words, ...capB.words] : undefined,
      wordColors: capA.wordColors && capB.wordColors
        ? [...capA.wordColors, ...capB.wordColors]
        : undefined,
    };
    cloned.splice(lo, 2, merged);
    return { captions: cloned, message: `Merged captions ${a + 1} and ${b + 1}.` };
  }

  // ── 7: move caption [n] to [time] ──
  const moveMatch = lower.match(/^move\s+caption\s+(\d+)\s+to\s+([\d.]+)/);
  if (moveMatch) {
    const n = parseInt(moveMatch[1]) - 1;
    const newStart = parseFloat(moveMatch[2]);
    if (n < 0 || n >= cloned.length) return { captions, message: 'Caption index out of range.' };
    const cap = cloned[n];
    const dur = cap.endTime - cap.startTime;
    cap.startTime = newStart;
    cap.endTime = newStart + dur;
    cloned.sort((a, b) => a.startTime - b.startTime);
    return { captions: cloned, message: `Moved caption ${n + 1} to ${newStart}s.` };
  }

  // ── 8: set font size [n] ──
  const fontMatch = lower.match(/^set\s+font\s+size\s+([\d.]+)/);
  if (fontMatch) {
    const size = parseFloat(fontMatch[1]);
    const scale = size / 48; // 48 is the reference base fontSize
    const cap = captionAtTime(cloned, currentTime);
    if (!cap) return { captions, message: 'No active caption at current time.' };
    cap.customScale = scale;
    return { captions: cloned, message: `Set font size to ${size}px (scale ${scale.toFixed(2)}).` };
  }

  // ── 9: add emoji [emoji] after [word] ──
  const emojiMatch = cmd.match(/^add emoji\s+(\S+)\s+after\s+(\S+)/i);
  if (emojiMatch) {
    const [, emoji, word] = emojiMatch;
    const cap = captionAtTime(cloned, currentTime);
    if (!cap || !cap.words) return { captions, message: 'No active caption at current time.' };
    const wi = findWordInCaption(cap, word);
    if (wi < 0) return { captions, message: `Word "${word}" not found.` };
    // Insert a fake word entry for the emoji at the same time as target word
    const targetWord = cap.words[wi];
    const emojiWord: WordTiming = {
      text: emoji,
      start: targetWord.end,
      end: targetWord.end + 0.1,
      iconEmoji: emoji,
    };
    cap.words.splice(wi + 1, 0, emojiWord);
    cap.text = cap.words.map(w => w.text).join(' ');
    return { captions: cloned, message: `Added ${emoji} after "${word}".` };
  }

  // ── 10: position [top|middle|bottom] ──
  const posMatch = lower.match(/^position\s+(top|middle|bottom)/);
  if (posMatch) {
    const pos = posMatch[1].toUpperCase() as 'TOP' | 'MIDDLE' | 'BOTTOM';
    const cap = captionAtTime(cloned, currentTime);
    if (!cap) return { captions, message: 'No active caption at current time.' };
    cap.customPosition = pos;
    return { captions: cloned, message: `Set position to ${pos}.` };
  }

  // ── 11: remove filler words ──
  if (lower.startsWith('remove filler')) {
    const cleaned = removeFillerWords(cloned);
    return { captions: cleaned, message: 'Removed filler words from all captions.' };
  }

  // ── 12: add speaker colors ──
  if (lower.includes('speaker color')) {
    const annotated = annotateSpeakers(cloned);
    return { captions: annotated, message: 'Applied speaker color detection.' };
  }

  // ── 13: delete caption [n] ──
  const deleteMatch = lower.match(/^delete\s+caption\s+(\d+)/);
  if (deleteMatch) {
    const n = parseInt(deleteMatch[1]) - 1;
    if (n < 0 || n >= cloned.length) return { captions, message: 'Caption index out of range.' };
    cloned.splice(n, 1);
    return { captions: cloned, message: `Deleted caption ${n + 1}.` };
  }

  // ── 14: uppercase [word] ──
  const upperMatch = lower.match(/^uppercase\s+(\S+)/);
  if (upperMatch) {
    const word = upperMatch[1];
    const cap = captionAtTime(cloned, currentTime);
    if (!cap || !cap.words) return { captions, message: 'No active caption.' };
    const wi = findWordInCaption(cap, word);
    if (wi < 0) return { captions, message: `Word "${word}" not found.` };
    cap.words[wi] = { ...cap.words[wi], text: cap.words[wi].text.toUpperCase() };
    cap.text = cap.words.map(w => w.text).join(' ');
    return { captions: cloned, message: `Uppercased "${cap.words[wi].text}".` };
  }

  // ── 15: lowercase [word] ──
  const lowerMatch = lower.match(/^lowercase\s+(\S+)/);
  if (lowerMatch) {
    const word = lowerMatch[1];
    const cap = captionAtTime(cloned, currentTime);
    if (!cap || !cap.words) return { captions, message: 'No active caption.' };
    const wi = findWordInCaption(cap, word);
    if (wi < 0) return { captions, message: `Word "${word}" not found.` };
    cap.words[wi] = { ...cap.words[wi], text: cap.words[wi].text.toLowerCase() };
    cap.text = cap.words.map(w => w.text).join(' ');
    return { captions: cloned, message: `Lowercased "${cap.words[wi].text}".` };
  }

  return {
    captions,
    message: [
      `Unknown command: "${cmd}"`,
      'Try: make [word] [color] · bold [word] · remove [word] · split at [time]',
      'merge [n] [n+1] · move caption [n] to [time] · set font size [n]',
      'add emoji [emoji] after [word] · position top/middle/bottom',
      'remove filler words · add speaker colors · delete caption [n]',
      'uppercase [word] · lowercase [word]',
    ].join('\n'),
  };
}
