import { Caption } from '../types';

// ─── Demo Project ────────────────────────────────────────────────────────────
// One-click test project: bundled video + pre-generated captions. Lets you
// exercise every editor feature (templates, timeline, FX, export) without
// uploading a video or spending Gemini tokens.
//
// Caption data resolution order:
//   1. A captured real Gemini result (localStorage) — press "Save as demo"
//      once after any real generation and it becomes the permanent demo.
//   2. The hand-written fixture below (realistic shape: word timings,
//      emphasis, sentiment), timed for a ~20s clip.

/** Drop your own clip at public/demo_video.mp4 — auto-falls back to the bundled sample. */
const DEMO_VIDEO_CANDIDATES = ['/demo_video.mp4', '/test_video.mp4'];

const CAPTURE_KEY = 'createrin_demo_captions';

/** First demo candidate that actually exists on the dev server. */
export async function resolveDemoVideoUrl(): Promise<string> {
  for (const url of DEMO_VIDEO_CANDIDATES) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) return url;
    } catch { /* try next */ }
  }
  return DEMO_VIDEO_CANDIDATES[DEMO_VIDEO_CANDIDATES.length - 1];
}

/** Captured real output wins over the fixture. */
export function getDemoCaptions(): Caption[] {
  try {
    const raw = localStorage.getItem(CAPTURE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* fall through to fixture */ }
  // Deep-copy so timeline edits in one demo session never mutate the fixture.
  return JSON.parse(JSON.stringify(DEMO_CAPTIONS));
}

/** Snapshot the current (real, Gemini-generated) captions as the demo dataset. */
export function captureDemoCaptions(captions: Caption[]): void {
  localStorage.setItem(CAPTURE_KEY, JSON.stringify(captions));
}

export function hasCapturedDemo(): boolean {
  return !!localStorage.getItem(CAPTURE_KEY);
}

// ─── Transcript cache ────────────────────────────────────────────────────────
// Re-uploading a video you already transcribed loads the cached result
// instantly instead of calling Gemini again.
// ponytail: key = name+size+mtime, content hash if collisions ever matter.

function fileKey(file: File): string {
  return `createrin_transcript_${file.name}_${file.size}_${file.lastModified}`;
}

export function getCachedTranscript(file: File): { captions: Caption[]; language?: string } | null {
  try {
    const raw = localStorage.getItem(fileKey(file));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.captions) && parsed.captions.length > 0) return parsed;
  } catch { /* corrupt entry — ignore */ }
  return null;
}

export function cacheTranscript(file: File, captions: Caption[], language?: string): void {
  try {
    localStorage.setItem(fileKey(file), JSON.stringify({ captions, language }));
  } catch { /* quota exceeded — caching is best-effort */ }
}

// ─── Hand-written fixture ────────────────────────────────────────────────────
// Mirrors real pipeline output: filler-stripped text, per-word timings,
// emphasis scores (0-100), sentiment, confidence. Telugu-English creator mix.

const DEMO_CAPTIONS: Caption[] = [
  {
    id: 'demo-1', startTime: 0.0, endTime: 1.9, text: 'So content creation chala mandi', language: 'te', confidence: 96, sentiment: 'energetic',
    words: [
      { text: 'So', start: 0.0, end: 0.3, emphasis: 20 },
      { text: 'content', start: 0.3, end: 0.85, emphasis: 65 },
      { text: 'creation', start: 0.85, end: 1.4, emphasis: 70 },
      { text: 'chala', start: 1.4, end: 1.65, emphasis: 30 },
      { text: 'mandi', start: 1.65, end: 1.9, emphasis: 30 },
    ],
  },
  {
    id: 'demo-2', startTime: 1.9, endTime: 3.6, text: 'start cheyalani anukuntaru', language: 'te', confidence: 95, sentiment: 'calm',
    words: [
      { text: 'start', start: 1.9, end: 2.4, emphasis: 75 },
      { text: 'cheyalani', start: 2.4, end: 3.0, emphasis: 40 },
      { text: 'anukuntaru', start: 3.0, end: 3.6, emphasis: 35 },
    ],
  },
  {
    id: 'demo-3', startTime: 3.6, endTime: 5.4, text: 'kani first step lo fail avutaru', language: 'te', confidence: 94, sentiment: 'serious',
    words: [
      { text: 'kani', start: 3.6, end: 3.9, emphasis: 25 },
      { text: 'first', start: 3.9, end: 4.3, emphasis: 80 },
      { text: 'step', start: 4.3, end: 4.6, emphasis: 60 },
      { text: 'lo', start: 4.6, end: 4.75, emphasis: 10 },
      { text: 'fail', start: 4.75, end: 5.1, emphasis: 92 },
      { text: 'avutaru', start: 5.1, end: 5.4, emphasis: 30 },
    ],
  },
  {
    id: 'demo-4', startTime: 5.4, endTime: 7.2, text: 'Why? Planning ledu kabatti', language: 'te', confidence: 95, sentiment: 'serious',
    words: [
      { text: 'Why?', start: 5.4, end: 5.9, emphasis: 88 },
      { text: 'Planning', start: 5.9, end: 6.5, emphasis: 75 },
      { text: 'ledu', start: 6.5, end: 6.85, emphasis: 45 },
      { text: 'kabatti', start: 6.85, end: 7.2, emphasis: 25 },
    ],
  },
  {
    id: 'demo-5', startTime: 7.2, endTime: 9.3, text: 'Ee 3 secrets follow avvandi', language: 'te', confidence: 96, sentiment: 'energetic',
    words: [
      { text: 'Ee', start: 7.2, end: 7.4, emphasis: 15 },
      { text: '3', start: 7.4, end: 7.8, emphasis: 95 },
      { text: 'secrets', start: 7.8, end: 8.4, emphasis: 90 },
      { text: 'follow', start: 8.4, end: 8.9, emphasis: 55 },
      { text: 'avvandi', start: 8.9, end: 9.3, emphasis: 30 },
    ],
  },
  {
    id: 'demo-6', startTime: 9.3, endTime: 11.2, text: 'First: daily oka video post cheyandi', language: 'te', confidence: 94, sentiment: 'energetic',
    words: [
      { text: 'First:', start: 9.3, end: 9.7, emphasis: 70 },
      { text: 'daily', start: 9.7, end: 10.1, emphasis: 85 },
      { text: 'oka', start: 10.1, end: 10.3, emphasis: 15 },
      { text: 'video', start: 10.3, end: 10.65, emphasis: 60 },
      { text: 'post', start: 10.65, end: 10.95, emphasis: 55 },
      { text: 'cheyandi', start: 10.95, end: 11.2, emphasis: 25 },
    ],
  },
  {
    id: 'demo-7', startTime: 11.2, endTime: 13.4, text: 'Second: hook lo full energy pettandi', language: 'te', confidence: 95, sentiment: 'energetic',
    words: [
      { text: 'Second:', start: 11.2, end: 11.7, emphasis: 70 },
      { text: 'hook', start: 11.7, end: 12.1, emphasis: 90 },
      { text: 'lo', start: 12.1, end: 12.25, emphasis: 10 },
      { text: 'full', start: 12.25, end: 12.6, emphasis: 75 },
      { text: 'energy', start: 12.6, end: 13.05, emphasis: 85 },
      { text: 'pettandi', start: 13.05, end: 13.4, emphasis: 30 },
    ],
  },
  {
    id: 'demo-8', startTime: 13.4, endTime: 15.6, text: 'Third: captions tho retention double', language: 'te', confidence: 96, sentiment: 'joyful',
    words: [
      { text: 'Third:', start: 13.4, end: 13.9, emphasis: 70 },
      { text: 'captions', start: 13.9, end: 14.5, emphasis: 88 },
      { text: 'tho', start: 14.5, end: 14.65, emphasis: 10 },
      { text: 'retention', start: 14.65, end: 15.2, emphasis: 80 },
      { text: 'double', start: 15.2, end: 15.6, emphasis: 95 },
    ],
  },
  {
    id: 'demo-9', startTime: 15.6, endTime: 17.6, text: 'Idi work chesthe subscribe cheyandi', language: 'te', confidence: 94, sentiment: 'joyful',
    words: [
      { text: 'Idi', start: 15.6, end: 15.9, emphasis: 20 },
      { text: 'work', start: 15.9, end: 16.3, emphasis: 70 },
      { text: 'chesthe', start: 16.3, end: 16.7, emphasis: 30 },
      { text: 'subscribe', start: 16.7, end: 17.3, emphasis: 92 },
      { text: 'cheyandi', start: 17.3, end: 17.6, emphasis: 30 },
    ],
  },
  {
    id: 'demo-10', startTime: 17.6, endTime: 19.6, text: 'Next video lo full guide FREE', language: 'te', confidence: 95, sentiment: 'energetic',
    words: [
      { text: 'Next', start: 17.6, end: 17.95, emphasis: 50 },
      { text: 'video', start: 17.95, end: 18.35, emphasis: 55 },
      { text: 'lo', start: 18.35, end: 18.5, emphasis: 10 },
      { text: 'full', start: 18.5, end: 18.8, emphasis: 60 },
      { text: 'guide', start: 18.8, end: 19.15, emphasis: 75 },
      { text: 'FREE', start: 19.15, end: 19.6, emphasis: 98 },
    ],
  },
];
