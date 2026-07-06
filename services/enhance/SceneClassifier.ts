// SceneClassifier — uses Gemini vision to tag a clip's scene type, which picks
// the enhancement preset. Runs ONCE per clip (cached), never per frame.
//
// Fully fault-tolerant: any failure (no key, 429, 404, malformed/hallucinated
// response) falls back to 'generic' so enhancement still applies.
import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODEL } from '../../constants';
import { SceneType } from './types';

const VALID: SceneType[] = ['indoor', 'outdoor', 'night', 'gaming', 'podcast', 'educational', 'generic'];

const getApiKey = (): string | null =>
  import.meta.env.VITE_GEMINI_API_KEY ||
  import.meta.env.VITE_API_KEY ||
  (typeof localStorage !== 'undefined' ? localStorage.getItem('createrin_api_key') : null) ||
  null;

/** Grab a representative still from a video element as a base64 JPEG (no prefix). */
function grabFrameBase64(video: HTMLVideoElement, maxW = 320): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const w = Math.min(maxW, vw);
  const h = Math.round((vh / vw) * w);
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d');
  if (!ctx) return null;
  try {
    ctx.drawImage(video, 0, 0, w, h);
    return cvs.toDataURL('image/jpeg', 0.7).split(',')[1] || null;
  } catch {
    return null; // tainted / not decoded
  }
}

const PROMPT =
  'Classify the dominant scene type of this video frame for the purpose of choosing a ' +
  'video color/enhancement preset. Respond with EXACTLY ONE lowercase word from this list ' +
  'and nothing else: indoor, outdoor, night, gaming, podcast, educational, generic. ' +
  'Use "gaming" for screen/game capture, "podcast" for a talking-head person, ' +
  '"educational" for slides/whiteboard, "night" for dark low-light scenes.';

const TIMEOUT_MS = 12000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('scene-classify-timeout')), ms)),
  ]);
}

/**
 * Classify the scene. Always resolves (never rejects) — returns 'generic' on
 * any error so the enhancement pipeline can proceed unconditionally.
 */
export async function classifyScene(video: HTMLVideoElement): Promise<SceneType> {
  try {
    const apiKey = getApiKey();
    if (!apiKey) return 'generic';
    const b64 = grabFrameBase64(video);
    if (!b64) return 'generic';

    const ai = new GoogleGenAI({ apiKey });
    const response: any = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: b64 } },
              { text: PROMPT },
            ],
          },
        ],
      }),
      TIMEOUT_MS
    );

    const raw = (response?.text ?? '').toString().trim().toLowerCase();
    // Defend against hallucinated extra words — match against the allowlist.
    const hit = VALID.find((s) => raw === s) || VALID.find((s) => raw.includes(s));
    return hit ?? 'generic';
  } catch (e) {
    console.warn('[SceneClassifier] falling back to generic:', e);
    return 'generic';
  }
}
