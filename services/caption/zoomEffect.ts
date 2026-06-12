import { Caption } from '../../types';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
  'we', 'they', 'my', 'your', 'his', 'her', 'our', 'their', 'what', 'which',
  'so', 'if', 'not', 'no', 'do', 'did', 'does', 'have', 'has', 'had',
  'just', 'then', 'than', 'about', 'also', 'more', 'me', 'him', 'us', 'them',
]);

function computeWordEmphasis(word: string, index: number, total: number): number {
  const stripped = word.replace(/[.,!?'"]/g, '');
  const norm = stripped.toLowerCase();

  // Stop word → near-zero emphasis regardless of case
  if (STOP_WORDS.has(norm)) return 10;

  // Fully uppercase, length > 1 → very high (e.g., "FIRE", "WOW", "INSANE")
  if (stripped.length > 1 && stripped === stripped.toUpperCase()) return 90;

  // Trailing exclamation mark on the raw word
  if (word.endsWith('!')) return 80;

  // First or last meaningful word in a caption → higher weight
  if (index === 0 || index === total - 1) return 60;

  // Default content word
  return 40;
}

/**
 * Annotates every WordTiming with an emphasis score (0–100).
 * Call once after Gemini transcription returns, before setting captions in state.
 */
export function annotateWordEmphasis(captions: Caption[]): Caption[] {
  return captions.map(caption => {
    if (!caption.words || caption.words.length === 0) return caption;

    const total = caption.words.length;
    const words = caption.words.map((w, i) => ({
      ...w,
      emphasis: computeWordEmphasis(w.text, i, total),
    }));

    return { ...caption, words };
  });
}

/**
 * Returns the emphasis score of whichever word is active at renderTime.
 * Returns 0 if no word matches (silence gap).
 */
export function getActiveWordEmphasis(caption: Caption, renderTime: number): number {
  if (!caption.words || caption.words.length === 0) return 0;
  const BUFFER = 0.06;
  const word = caption.words.find(
    w => renderTime >= w.start - BUFFER && renderTime <= w.end + BUFFER
  );
  return word?.emphasis ?? 0;
}
