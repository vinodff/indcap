import { Caption, WordTiming } from '../types';

const FILLER_WORDS = new Set([
  'like', 'basically', 'literally', 'actually', 'just', 'really',
  'very', 'so', 'um', 'uh', 'er', 'ah', 'right'
]);

const MAX_WORDS_PER_SEGMENT = 4;

/**
 * Filter out filler words (e.g. "like", "you know") and dynamically split
 * caption blocks into shorter, punchy segments (max 4 words) to maximize retention.
 */
export function applySmartBrevity(captions: Caption[]): Caption[] {
  const result: Caption[] = [];

  captions.forEach((caption) => {
    const words = caption.words || [];
    if (words.length === 0) {
      result.push(caption);
      return;
    }

    // 1. Filter out filler words
    const filteredWords: WordTiming[] = [];
    for (let i = 0; i < words.length; i++) {
      const w1 = words[i].text.toLowerCase().replace(/[^a-z]/g, '');
      const w2 = words[i + 1] ? words[i + 1].text.toLowerCase().replace(/[^a-z]/g, '') : '';
      
      // Single word fillers
      if (FILLER_WORDS.has(w1)) {
        continue;
      }
      
      // Two-word fillers
      if (w1 === 'you' && w2 === 'know') {
        i++; // Skip "know"
        continue;
      }
      if (w1 === 'i' && w2 === 'mean') {
        i++; // Skip "mean"
        continue;
      }
      if (w1 === 'kind' && w2 === 'of') {
        i++; // Skip "of"
        continue;
      }
      if (w1 === 'sort' && w2 === 'of') {
        i++; // Skip "of"
        continue;
      }

      filteredWords.push(words[i]);
    }

    if (filteredWords.length === 0) {
      // Fallback: if all words are fillers, preserve the original block
      result.push(caption);
      return;
    }

    // 2. Split into segments (max 4 words)
    const chunks: WordTiming[][] = [];
    for (let i = 0; i < filteredWords.length; i += MAX_WORDS_PER_SEGMENT) {
      chunks.push(filteredWords.slice(i, i + MAX_WORDS_PER_SEGMENT));
    }

    // 3. Reconstruct captions
    chunks.forEach((chunk, index) => {
      const chunkText = chunk.map(w => w.text).join(' ');
      const chunkStartTime = chunk[0].start;
      // Use end of last word in chunk, clamped to original caption's end
      const chunkEndTime = Math.min(chunk[chunk.length - 1].end, caption.endTime);

      result.push({
        ...caption,
        id: `${caption.id}_brevity_${index}`,
        startTime: chunkStartTime,
        endTime: chunkEndTime,
        text: chunkText,
        words: chunk,
      });
    });
  });

  return result;
}
