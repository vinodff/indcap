/**
 * Transcript Analyzer — Gemini-Powered Enrichment
 *
 * Single Gemini API call returns:
 * - Verbatim transcript with precise word timing
 * - Per-word emphasis score (0-100)
 * - Per-word semantic role (action/emotion/subject/etc.)
 * - Per-segment emotion + intensity
 * - Scene boundaries (topic shifts)
 *
 * Roman-script transliteration for Indian languages (Telugu→Telglish, etc.)
 */

import type {
  EnrichedTranscript,
  SegmentEmotion,
  TranscriptSegment,
  TranscriptWord,
  WordRole,
} from './types';

// ─── Gemini Configuration ──────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-flash-latest';

const TRANSCRIPT_PROMPT = `
You are analyzing audio for a typography reel—a cinematic short video where text appears word-by-word, synced to music/speech.

Listen to this audio and output VALID JSON (no markdown, no code blocks, raw JSON only):

{
  "segments": [
    {
      "text": "complete phrase or sentence",
      "startTime": 0.5,
      "endTime": 2.3,
      "emotion": "joy|shock|awe|anger|sadness|tension|inspiration|humor|authority|neutral",
      "emotionIntensity": 1|2|3,
      "words": [
        {
          "text": "word",
          "startTime": 0.5,
          "endTime": 0.8,
          "role": "action|emotion|subject|number|tech|cta|connector",
          "emphasisScore": 75
        }
      ]
    }
  ],
  "language": "en|te|hi|ta|ka|etc"
}

RULES:

1. EMOTION DETECTION
   - Analyze tone, words, sentiment
   - joy: positive, excited, happy
   - shock: surprise, unexpected
   - awe: wonder, amazement
   - anger: aggressive, urgent, intense
   - sadness: melancholy, loss
   - tension: suspenseful, building
   - inspiration: motivating, breakthrough
   - humor: funny, ironic, playful
   - authority: confident, expert
   - neutral: standard narration

2. WORD EMPHASIS (0-100 score)
   - 85-100: Hero words (verbs, CTAs, surprising words)
   - 50-84: Important words (descriptors, numbers)
   - 20-49: Supporting words (adjectives, context)
   - 0-19: Filler words (the, and, is, but)

3. WORD ROLES
   - "action": verbs (run, click, discover, buy)
   - "emotion": adjectives/adverbs (beautiful, incredible, slowly)
   - "subject": nouns, main focus
   - "number": statistics, metrics, amounts
   - "tech": technical terms, jargon
   - "cta": call-to-action (click, subscribe, join, try)
   - "connector": filler (the, and, but, is, in)

4. TIMING
   - startTime/endTime in seconds
   - Precise to 0.1s
   - Each word must have accurate timing

5. ROMAN SCRIPT (IMPORTANT)
   - If audio is Telugu, Hindi, Tamil, Kannada, etc.
   - Output text in Roman script (Telglish, Hinglish, Tamlish, etc.)
   - This makes typography readable across devices

6. EMOTION INTENSITY (1-3)
   - 1: Subtle, gentle
   - 2: Normal, balanced
   - 3: Strong, aggressive

OUTPUT ONLY VALID JSON. NO EXPLANATIONS. NO MARKDOWN.
`;

// ─── Type Helpers ──────────────────────────────────────────────────────

const VALID_EMOTIONS: SegmentEmotion[] = [
  'awe',
  'shock',
  'joy',
  'anger',
  'sadness',
  'tension',
  'inspiration',
  'humor',
  'authority',
  'neutral',
];

const VALID_ROLES: WordRole[] = [
  'action',
  'emotion',
  'subject',
  'number',
  'connector',
  'cta',
  'tech',
];

// ─── Validation Helpers ────────────────────────────────────────────────

function safeEmotion(val: unknown): SegmentEmotion {
  if (typeof val === 'string' && VALID_EMOTIONS.includes(val as SegmentEmotion)) {
    return val as SegmentEmotion;
  }
  return 'neutral';
}

function safeIntensity(val: unknown): 1 | 2 | 3 {
  const num = typeof val === 'number' ? val : parseInt(String(val ?? 2), 10);
  if (num <= 1) return 1;
  if (num >= 3) return 3;
  return 2;
}

function safeRole(val: unknown): WordRole {
  if (typeof val === 'string' && VALID_ROLES.includes(val as WordRole)) {
    return val as WordRole;
  }
  return 'connector';
}

function clampEmphasis(val: unknown): number {
  const num = typeof val === 'number' ? val : parseFloat(String(val ?? 50));
  if (Number.isNaN(num)) return 50;
  return Math.max(0, Math.min(100, num));
}

function parseTime(val: string | number | undefined): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;

  const parts = String(val).split(':');
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  if (parts.length === 3) {
    return (
      parseFloat(parts[0]) * 3600 +
      parseFloat(parts[1]) * 60 +
      parseFloat(parts[2])
    );
  }
  return parseFloat(parts[0]) || 0;
}

// ─── Main API ──────────────────────────────────────────────────────────

/**
 * Analyze audio using Gemini to extract enriched transcript.
 * Requires VITE_GEMINI_API_KEY environment variable.
 * Falls back to demo transcript on error.
 */
export async function analyzeTranscript(
  audioFile: File
): Promise<EnrichedTranscript> {
  try {
    const apiKey = getGeminiApiKey();

    // Convert audio to base64
    const base64Audio = await fileToBase64(audioFile);

    // Determine MIME type
    const mimeType = audioFile.type || 'audio/mpeg';

    // Call Gemini API with audio
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Audio,
                  },
                },
                {
                  text: TRANSCRIPT_PROMPT,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3, // Low temp for consistency
            maxOutputTokens: 4000,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error('No response from Gemini');
    }

    // Parse JSON response
    let parsed: any;
    try {
      // Handle case where response might have markdown code blocks
      let jsonStr = textContent.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7); // Remove ```json
      }
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3); // Remove ```
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3); // Remove trailing ```
      }

      parsed = JSON.parse(jsonStr);
    } catch (err) {
      console.error('Failed to parse Gemini response:', textContent);
      throw new Error('Invalid JSON from Gemini');
    }

    // Normalize response
    return normalizeTranscript(parsed);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[typography] Gemini transcription failed:', errorMsg);

    // Check if it's an API key issue
    if (errorMsg.includes('API key') || errorMsg.includes('not found')) {
      throw new Error(
        'Gemini API key not configured. Set VITE_GEMINI_API_KEY environment variable or save API key in localStorage.'
      );
    }

    // For other errors, fall back to demo but warn the user
    console.warn('Using demo transcript as fallback. Original error:', errorMsg);
    return createDemoTranscript();
  }
}

// ─── Helper: File to Base64 ────────────────────────────────────────────

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// ─── Helper: Get API Key ───────────────────────────────────────────────

function getGeminiApiKey(): string {
  const key =
    import.meta.env.VITE_GEMINI_API_KEY ||
    (typeof localStorage !== 'undefined'
      ? localStorage.getItem('gemini_api_key')
      : null);

  if (!key) {
    throw new Error(
      'Gemini API key not found. Set VITE_GEMINI_API_KEY or save in localStorage.'
    );
  }

  return key;
}

// ─── Helper: Normalize & Validate Response ─────────────────────────────

function normalizeTranscript(raw: any): EnrichedTranscript {
  const segments: TranscriptSegment[] = [];

  if (!Array.isArray(raw.segments)) {
    throw new Error('Invalid transcript format: missing segments array');
  }

  let maxEndTime = 0;

  for (const seg of raw.segments) {
    const startTime = parseTime(seg.startTime);
    const endTime = parseTime(seg.endTime);
    maxEndTime = Math.max(maxEndTime, endTime);

    const words: TranscriptWord[] = [];
    if (Array.isArray(seg.words)) {
      for (const w of seg.words) {
        const wordStartTime = parseTime(w.startTime);
        const wordEndTime = parseTime(w.endTime);

        words.push({
          text: String(w.text ?? ''),
          startTime: wordStartTime,
          endTime: Math.max(wordEndTime, wordStartTime + 0.1),
          role: safeRole(w.role),
          emphasisScore: clampEmphasis(w.emphasisScore),
        });
      }
    }

    // Filter empty words
    const validWords = words.filter((w) => w.text.length > 0);

    segments.push({
      id: `seg-${segments.length}-${Math.random().toString(36).slice(2, 9)}`,
      text: String(seg.text ?? ''),
      startTime,
      endTime: Math.max(endTime, startTime + 0.1),
      emotion: safeEmotion(seg.emotion),
      emotionIntensity: safeIntensity(seg.emotionIntensity),
      words: validWords,
    });
  }

  return {
    segments,
    language: String(raw.language ?? 'en'),
    duration: maxEndTime || 60,
    confidence: 0.95, // Gemini-provided analysis
  };
}

// ─── Alternative: Fallback for Demo ────────────────────────────────────

/**
 * Create a dummy transcript for testing/demo purposes.
 * Useful when Gemini API is unavailable.
 */
export function createDemoTranscript(): EnrichedTranscript {
  return {
    segments: [
      {
        id: 'seg-0',
        text: 'Create amazing videos',
        startTime: 0,
        endTime: 2,
        emotion: 'joy',
        emotionIntensity: 3,
        words: [
          {
            text: 'Create',
            startTime: 0,
            endTime: 0.6,
            role: 'action',
            emphasisScore: 90,
          },
          {
            text: 'amazing',
            startTime: 0.7,
            endTime: 1.2,
            role: 'emotion',
            emphasisScore: 75,
          },
          {
            text: 'videos',
            startTime: 1.3,
            endTime: 2,
            role: 'subject',
            emphasisScore: 60,
          },
        ],
      },
      {
        id: 'seg-1',
        text: 'No coding required',
        startTime: 2.1,
        endTime: 3.8,
        emotion: 'inspiration',
        emotionIntensity: 2,
        words: [
          {
            text: 'No',
            startTime: 2.1,
            endTime: 2.5,
            role: 'connector',
            emphasisScore: 20,
          },
          {
            text: 'coding',
            startTime: 2.6,
            endTime: 3.2,
            role: 'tech',
            emphasisScore: 70,
          },
          {
            text: 'required',
            startTime: 3.3,
            endTime: 3.8,
            role: 'emotion',
            emphasisScore: 85,
          },
        ],
      },
      {
        id: 'seg-2',
        text: 'Start today',
        startTime: 3.9,
        endTime: 5,
        emotion: 'authority',
        emotionIntensity: 3,
        words: [
          {
            text: 'Start',
            startTime: 3.9,
            endTime: 4.4,
            role: 'action',
            emphasisScore: 85,
          },
          {
            text: 'today',
            startTime: 4.5,
            endTime: 5,
            role: 'cta',
            emphasisScore: 95,
          },
        ],
      },
    ],
    language: 'en',
    duration: 5,
    confidence: 0.5, // Demo data
  };
}
