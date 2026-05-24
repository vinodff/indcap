/**
 * Motion Graphics route — script -> MotionPlan via Gemini.
 *
 * POST /api/motion/analyze-script
 *   body: { script, durationSec, palette?, intensity? }
 *   returns: { success: true, plan: MotionPlan }
 */

import express from 'express';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

const PRIMITIVE_TYPES = [
  'big-text-reveal',
  'lower-third',
  'icon-burst',
  'counter',
  'highlight-box',
  'bar-reveal',
  'bg-gradient-pulse',
  'transition-wipe',
  'quote-card',
  'bullet-list-reveal',
  'callout-arrow',
  'word-emphasis-flash',
  'camera-zoom-3d',
  'animated-arrow',
  'particle-burst',
  'glitch-text',
  'light-sweep',
];

const PALETTES = ['energetic', 'corporate', 'kids', 'cinematic', 'custom'];

const SYSTEM_INSTRUCTION = `You are a senior motion graphics director planning kinetic typography and motion-graphic shots for a short-form video.

You receive a script (user-supplied) and a target duration in seconds. You return a MotionPlan: a list of timed BEATS, each beat triggers ONE motion-graphic PRIMITIVE that visualizes the corresponding moment of the script.

Rules:
1. Distribute beats across the FULL duration. Do not bunch everything at the start.
2. Aim for one beat every 1.5 to 4 seconds. Shorter scripts get fewer beats. A 30s video should have 8-15 beats. A 60s video, 15-25 beats.
3. Each beat must have startTime < endTime, in seconds, and both in [0, duration]. Beats can overlap if it serves the moment (e.g., bg-gradient-pulse running underneath a big-text-reveal).
4. Choose the PRIMITIVE that fits the meaning of that script moment. Prefer the ADVANCED primitives (camera-zoom-3d, animated-arrow, particle-burst, glitch-text, light-sweep) at major beats — they read as cinematic. The classic primitives are for routine moments.

   CLASSIC primitives:
   - big-text-reveal: hero phrases, key statements, hooks. Now ships chromatic aberration on entry — feels premium. Use 1-3 per video at the biggest moments.
   - lower-third: introducing a person, place, or concept. Has a 3D card-flip entry now.
   - icon-burst: a single concrete noun ("phone", "rocket", "brain") - the icon visualizes it. Now with 80-150 physics particles.
   - counter: when a NUMBER appears ("3 ways", "$1M", "97%"). Digit-roll odometer animation.
   - highlight-box: emphasizing a region or callout. Now uses animated corner brackets.
   - bar-reveal: comparing magnitudes or progress.
   - bg-gradient-pulse: emotional swells, transitions between sections. Longer beats (2-5s).
   - transition-wipe: scene changes, hard breaks (under 0.5s each).
   - quote-card: direct quotes or pull-out statements.
   - bullet-list-reveal: enumerations ("First X, second Y, third Z").
   - callout-arrow: pointing at something specific.
   - word-emphasis-flash: a single charged word flashes (0.2-0.4s).

   ADVANCED cinematic primitives (use these at the biggest moments — peak intensity beats):
   - camera-zoom-3d: cinematic "push in" feel. Use at the BIGGEST emotional beat. Letterbox bars, radial speed lines, center bloom. Lasts 1-3s. Pair with a big-text-reveal or counter at the same time for maximum punch.
   - animated-arrow: a real hand-drawn arrow that strokes onto screen and points at something. Use when the script says "look at this", "right here", "see this number", or when reinforcing a counter / highlight-box. Use anchor to set arrow direction.
   - particle-burst: 100+ particles burst with gravity physics. Use for "explosion of insight", celebrations, "boom" moments, or pairing with a big number reveal. Set icon param to add a center icon glyph.
   - glitch-text: chromatic RGB aberration + scan lines + horizontal tear. Use for "warning", "shocking truth", anti-hype subversive moments, or tech/cyber content. NOT for warm/feel-good content.
   - light-sweep: diagonal light beam wipes across the frame illuminating everything underneath. Use as a transition between sections, or to spotlight a moment without a hard cut. Subtle but classy.
5. Each beat's params:
   - text: the words to display, MUST be a short phrase pulled from or paraphrased from the script (under 60 chars).
   - icon: for icon-burst and callout-arrow, a single lucide-react icon name (e.g., "Zap", "Brain", "Rocket", "TrendingUp", "Star", "Heart") OR an emoji codepoint. Pick the most concrete visual.
   - palette: prefer the user-requested palette unless the moment screams for another.
   - intensity: 1-3 (loudness of the animation). Hooks and climaxes are 3.
   - anchor: where on screen (top, center, bottom, left, right). Vary across beats.
6. rationale: ONE sentence explaining why you picked this primitive for this script moment. The user reads this to trust your output.
7. topicSlug: kebab-case slug of the script's topic, 2-5 words, no punctuation. Used for the export filename.
8. suggestedPalette: your overall palette pick for this script (one of: energetic, corporate, kids, cinematic).

Output ONLY valid JSON matching the response schema. No prose. No markdown.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    topicSlug: { type: 'STRING' },
    suggestedPalette: { type: 'STRING', enum: ['energetic', 'corporate', 'kids', 'cinematic'] },
    duration: { type: 'NUMBER' },
    beats: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          startTime: { type: 'NUMBER' },
          endTime: { type: 'NUMBER' },
          primitive: { type: 'STRING', enum: PRIMITIVE_TYPES },
          rationale: { type: 'STRING' },
          params: {
            type: 'OBJECT',
            properties: {
              text: { type: 'STRING' },
              icon: { type: 'STRING' },
              palette: { type: 'STRING', enum: PALETTES },
              anchor: { type: 'STRING', enum: ['top', 'center', 'bottom', 'left', 'right'] },
              intensity: { type: 'INTEGER' },
            },
            required: ['palette', 'intensity'],
          },
        },
        required: ['id', 'startTime', 'endTime', 'primitive', 'params'],
      },
    },
  },
  required: ['topicSlug', 'suggestedPalette', 'duration', 'beats'],
};

// Defensive validation — the model is usually well-behaved with responseSchema,
// but we still clamp times, drop bad beats, and assign IDs if missing.
const sanitizePlan = (raw, durationSec, requestedPalette) => {
  const duration = Number.isFinite(raw?.duration) ? raw.duration : durationSec;
  const suggestedPalette = PALETTES.includes(raw?.suggestedPalette) ? raw.suggestedPalette : 'energetic';
  const topicSlug = (raw?.topicSlug || 'motion-graphics-video')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9-\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'motion-graphics-video';

  const beats = Array.isArray(raw?.beats) ? raw.beats : [];
  const cleaned = beats
    .filter((b) => b && PRIMITIVE_TYPES.includes(b.primitive))
    .map((b, i) => {
      const startTime = Math.max(0, Math.min(durationSec, Number(b.startTime) || 0));
      const endTimeRaw = Number(b.endTime) || startTime + 1;
      const endTime = Math.max(startTime + 0.1, Math.min(durationSec, endTimeRaw));
      const params = b.params || {};
      const intensity = [1, 2, 3].includes(Number(params.intensity)) ? Number(params.intensity) : 2;
      const palette = PALETTES.includes(params.palette) ? params.palette : requestedPalette;
      return {
        id: b.id || `beat-${i}-${Math.random().toString(36).slice(2, 8)}`,
        startTime,
        endTime,
        primitive: b.primitive,
        rationale: b.rationale || undefined,
        params: {
          text: typeof params.text === 'string' ? params.text.slice(0, 120) : undefined,
          icon: typeof params.icon === 'string' ? params.icon.slice(0, 40) : undefined,
          palette,
          anchor: ['top', 'center', 'bottom', 'left', 'right'].includes(params.anchor) ? params.anchor : 'center',
          intensity,
        },
      };
    })
    .sort((a, b) => a.startTime - b.startTime);

  return { topicSlug, suggestedPalette, duration, beats: cleaned };
};

router.post('/analyze-script', async (req, res) => {
  try {
    const { script, durationSec, palette = 'energetic', intensity = 2 } = req.body || {};

    const authHeader = req.headers.authorization;
    const apiKey =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : process.env.VITE_GEMINI_API_KEY || process.env.VITE_API_KEY;
    if (!apiKey) {
      return res.status(401).json({ success: false, error: 'API key not provided' });
    }

    if (typeof script !== 'string' || script.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'script must be a non-empty string' });
    }
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      return res.status(400).json({ success: false, error: 'durationSec must be a positive number' });
    }
    if (!PALETTES.includes(palette)) {
      return res.status(400).json({ success: false, error: `palette must be one of: ${PALETTES.join(', ')}` });
    }

    const ai = new GoogleGenAI({ apiKey });
    const userPrompt = `Target duration: ${durationSec.toFixed(1)} seconds.
Requested palette: ${palette}.
Default intensity: ${intensity}.

SCRIPT:
${script}`;

    console.log('[Motion] Analyzing script', { len: script.length, durationSec, palette });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.8,
      },
    });

    const text = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error('[Motion] JSON parse failure:', text.slice(0, 300));
      return res.status(502).json({ success: false, error: 'AI returned invalid JSON' });
    }

    const plan = sanitizePlan(parsed, durationSec, palette);
    if (plan.beats.length === 0) {
      return res.status(502).json({ success: false, error: 'AI produced zero valid beats. Try a longer script.' });
    }

    console.log('[Motion] Plan ready', { topic: plan.topicSlug, beats: plan.beats.length });
    return res.json({ success: true, plan });
  } catch (error) {
    console.error('[Motion] analyze-script error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal error' });
  }
});

export default router;
