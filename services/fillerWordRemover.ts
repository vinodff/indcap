import { Caption, WordTiming } from '../types';

const FILLER_SINGLE = new Set([
  'um', 'uh', 'uhh', 'umm', 'hmm', 'hm', 'mhm', 'ugh', 'er', 'err',
  'like', 'literally', 'basically', 'right',
]);

// Two consecutive words that together form a filler phrase
const FILLER_BIGRAMS = new Set([
  'you know', 'i mean', 'sort of', 'kind of', 'you see',
]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[.,!?'"]/g, '').trim();
}

export function removeFillerWords(captions: Caption[]): Caption[] {
  const result: Caption[] = [];

  for (const caption of captions) {
    if (!caption.words || caption.words.length === 0) {
      result.push(caption);
      continue;
    }

    const words = caption.words;
    const skipIndices = new Set<number>();

    for (let i = 0; i < words.length; i++) {
      const norm = normalize(words[i].text);

      if (FILLER_SINGLE.has(norm)) {
        skipIndices.add(i);
        continue;
      }

      if (i + 1 < words.length) {
        const bigram = `${norm} ${normalize(words[i + 1].text)}`;
        if (FILLER_BIGRAMS.has(bigram)) {
          skipIndices.add(i);
          skipIndices.add(i + 1);
          i++; // skip the second word of the pair
        }
      }
    }

    const cleaned: WordTiming[] = words.filter((_, i) => !skipIndices.has(i));
    if (cleaned.length === 0) continue; // drop caption if all words were fillers

    // Per-word metadata is indexed by word position — removing words without
    // remapping shifts every color/highlight onto the WRONG word downstream
    // (generic renderer reads caption.wordColors[displayWordIndex]).
    const wordColors = caption.wordColors
      ? caption.wordColors.filter((_, i) => !skipIndices.has(i))
      : caption.wordColors;
    const indexShift = (orig: number) => {
      let removedBefore = 0;
      skipIndices.forEach(s => { if (s < orig) removedBefore++; });
      return orig - removedBefore;
    };
    const highlightIndices = caption.highlightIndices
      ? caption.highlightIndices
          .filter(i => !skipIndices.has(i))
          .map(indexShift)
      : caption.highlightIndices;

    result.push({
      ...caption,
      words: cleaned,
      wordColors,
      highlightIndices,
      text: cleaned.map(w => w.text).join(' '),
      startTime: cleaned[0].start,
      endTime: cleaned[cleaned.length - 1].end,
    });
  }

  return result;
}
