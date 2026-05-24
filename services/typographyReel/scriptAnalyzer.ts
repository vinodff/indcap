/**
 * Script Analyzer — single Gemini call returning EnrichedCaption[].
 *
 * Extends the standard transcription with emotion, layout hint, scene boundary,
 * and per-word emphasis. Reuses the same Gemini SDK pattern as geminiService.ts.
 */

import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODEL, REEL_ANALYZER_INSTRUCTION, ROMAN_AUTO_INSTRUCTION } from '../../constants';
import type {
  EnrichedCaption,
  EnrichedWord,
  ReelLayoutKind,
  SegmentEmotion,
  WordRole,
} from './types';

const Type = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  INTEGER: 'INTEGER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT',
} as const;

const getApiKey = (): string => {
  const key =
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_API_KEY ||
    localStorage.getItem('createrin_api_key');
  if (!key) throw new Error('API Key not found. Set VITE_GEMINI_API_KEY in .env.');
  return key;
};

// ─── time parsing ────────────────────────────────────────────────────────────

const parseTime = (s: string | number | undefined): number => {
  if (typeof s === 'number') return s;
  if (!s) return 0;
  const parts = s.toString().split(':');
  if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  if (parts.length === 3) return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  return parseFloat(parts[0]) || 0;
};

// ─── validation helpers ─────────────────────────────────────────────────────

const VALID_EMOTIONS: SegmentEmotion[] = [
  'awe', 'shock', 'joy', 'anger', 'sadness', 'tension',
  'inspiration', 'humor', 'authority', 'neutral',
];

const VALID_LAYOUTS: ReelLayoutKind[] = [
  'one-on-one', 'straight', 'cluster', 'diagrammatic',
];

const VALID_ROLES: WordRole[] = [
  'action', 'emotion', 'subject', 'number', 'connector', 'cta', 'tech',
];

const clampEmphasis = (n: unknown): number => {
  const v = typeof n === 'number' ? n : parseFloat(String(n ?? 50));
  if (Number.isNaN(v)) return 50;
  return Math.max(0, Math.min(100, v));
};

const clampIntensity = (n: unknown): 1 | 2 | 3 => {
  const v = typeof n === 'number' ? n : parseInt(String(n ?? 2), 10);
  if (v <= 1) return 1;
  if (v >= 3) return 3;
  return 2;
};

const safeEmotion = (e: unknown): SegmentEmotion => {
  return VALID_EMOTIONS.includes(e as SegmentEmotion)
    ? (e as SegmentEmotion)
    : 'neutral';
};

const safeLayout = (l: unknown): ReelLayoutKind => {
  return VALID_LAYOUTS.includes(l as ReelLayoutKind)
    ? (l as ReelLayoutKind)
    : 'one-on-one';
};

const safeRole = (r: unknown): WordRole => {
  return VALID_ROLES.includes(r as WordRole) ? (r as WordRole) : 'connector';
};

// ─── Gemini response schema ─────────────────────────────────────────────────

const RESPONSE_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      start:            { type: Type.STRING },
      end:              { type: Type.STRING },
      text:             { type: Type.STRING },
      emotion:          { type: Type.STRING },
      emotionIntensity: { type: Type.INTEGER },
      layoutHint:       { type: Type.STRING },
      sceneBoundary:    { type: Type.BOOLEAN },
      emoji:            { type: Type.STRING },
      words: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text:           { type: Type.STRING },
            start:          { type: Type.STRING },
            end:            { type: Type.STRING },
            role:           { type: Type.STRING },
            emphasisScore:  { type: Type.NUMBER },
          },
          required: ['text', 'start', 'end', 'role', 'emphasisScore'],
        },
      },
    },
    required: ['start', 'end', 'text', 'emotion', 'emotionIntensity', 'layoutHint', 'sceneBoundary', 'words'],
  },
};

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Transcribe audio and produce a fully enriched caption list in one Gemini call.
 * Defaults to Roman-script transliteration so Telugu/Hindi/Tamil audio comes
 * back readable for typography rendering.
 */
export async function analyzeAudioForReel(
  audioFile: File,
  options: { romanScript?: boolean } = {},
): Promise<EnrichedCaption[]> {
  const { romanScript = true } = options;

  const { base64, mimeType } = await fileToBase64(audioFile);

  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const instruction = romanScript
    ? `${REEL_ANALYZER_INSTRUCTION}\n\n${ROMAN_AUTO_INSTRUCTION}`
    : REEL_ANALYZER_INSTRUCTION;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: 'Transcribe verbatim and enrich every word/segment per the system rules.' },
      ],
    },
    config: {
      systemInstruction: instruction,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const rawText = response.text ?? '[]';
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    console.error('[reel] Gemini response not valid JSON:', rawText);
    throw new Error('AI analyzer returned malformed JSON.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('AI analyzer expected an array of segments.');
  }

  return parsed.map((seg, i) => normalizeSegment(seg, i));
}

function normalizeSegment(raw: unknown, index: number): EnrichedCaption {
  const seg = (raw ?? {}) as Record<string, unknown>;
  const startTime = parseTime(seg.start as string);
  const endTime = parseTime(seg.end as string);

  const rawWords = Array.isArray(seg.words) ? (seg.words as unknown[]) : [];
  const words: EnrichedWord[] = rawWords.map((w): EnrichedWord => {
    const wordObj = (w ?? {}) as Record<string, unknown>;
    return {
      text: String(wordObj.text ?? ''),
      start: parseTime(wordObj.start as string),
      end: parseTime(wordObj.end as string),
      role: safeRole(wordObj.role),
      emphasisScore: clampEmphasis(wordObj.emphasisScore),
    };
  }).filter(w => w.text.length > 0);

  return {
    id: `seg-${index}-${Math.random().toString(36).slice(2, 7)}`,
    text: String(seg.text ?? ''),
    startTime,
    endTime: Math.max(endTime, startTime + 0.1),
    words,
    emotion: safeEmotion(seg.emotion),
    emotionIntensity: clampIntensity(seg.emotionIntensity),
    layoutHint: safeLayout(seg.layoutHint),
    sceneBoundary: Boolean(seg.sceneBoundary) || index === 0,
    emoji: typeof seg.emoji === 'string' ? seg.emoji : undefined,
  };
}

// ─── small helper: file → base64 (self-contained) ──────────────────────────

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({
        base64: dataUrl.split(',')[1],
        mimeType: file.type || 'audio/mpeg',
      });
    };
    reader.onerror = () => reject(new Error('Failed to read audio file'));
    reader.readAsDataURL(file);
  });
}
