import { Caption, WordTiming } from '../../types';

/**
 * Speaker palette — up to 4 speakers.
 * Colors chosen for contrast on both dark video and text backgrounds.
 */
export const SPEAKER_COLORS: Record<string, string> = {
  SPEAKER_1: '#FFFFFF', // primary speaker: white (neutral, always legible)
  SPEAKER_2: '#34D399', // second speaker: emerald green
  SPEAKER_3: '#60A5FA', // third speaker: sky blue
  SPEAKER_4: '#F472B6', // fourth speaker: pink
};

const SILENCE_GAP_S = 0.4; // gap > 400ms → assume speaker change

/**
 * Detects speaker turns via silence-gap heuristic and annotates each
 * WordTiming with a speakerLabel ("SPEAKER_1", "SPEAKER_2", …).
 *
 * Works across caption boundaries — collects all words from all captions,
 * assigns turns, then distributes back. Single-speaker recordings get all
 * words tagged SPEAKER_1 (zero visual change from current).
 */
export function annotateSpeakers(captions: Caption[]): Caption[] {
  // Flatten all words with their caption index + word index
  type WordRef = { captionIdx: number; wordIdx: number; word: WordTiming };
  const flat: WordRef[] = [];

  captions.forEach((cap, ci) => {
    (cap.words ?? []).forEach((w, wi) => {
      flat.push({ captionIdx: ci, wordIdx: wi, word: w });
    });
  });

  if (flat.length === 0) return captions;

  // Assign speaker labels based on silence gaps
  let currentSpeaker = 1;
  const labels: string[] = [speakerKey(currentSpeaker)];

  for (let i = 1; i < flat.length; i++) {
    const gap = flat[i].word.start - flat[i - 1].word.end;
    if (gap >= SILENCE_GAP_S) {
      // Alternate speakers; cap at 4
      currentSpeaker = currentSpeaker < 4 ? currentSpeaker + 1 : 1;
    }
    labels.push(speakerKey(currentSpeaker));
  }

  // If only one unique label was assigned the whole recording is single-speaker —
  // keep all labels as SPEAKER_1 so no coloring change occurs.
  const uniqueLabels = new Set(labels);
  if (uniqueLabels.size === 1) return captions; // nothing to colour

  // Distribute labels back into a deep copy of captions
  const updated = captions.map(c => ({ ...c, words: c.words ? [...c.words] : undefined }));

  flat.forEach(({ captionIdx, wordIdx }, i) => {
    const words = updated[captionIdx].words;
    if (words) {
      words[wordIdx] = { ...words[wordIdx], speakerLabel: labels[i] };
    }
  });

  return updated;
}

function speakerKey(n: number): string {
  return `SPEAKER_${n}`;
}

/** Returns the hex color for a speakerLabel, defaulting to white. */
export function speakerColor(label: string | undefined): string {
  if (!label) return SPEAKER_COLORS.SPEAKER_1;
  return SPEAKER_COLORS[label] ?? SPEAKER_COLORS.SPEAKER_1;
}
