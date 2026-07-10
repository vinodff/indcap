/**
 * Zero-token visual harness for the typography renderer.
 *
 * Fabricates a deterministic AnimationSequence (no Gemini, no audio file,
 * no network) and renders fixed timestamps side by side — one glance covers
 * every cinematic-frame system: virtual camera, emotion spotlight, vignette,
 * grain drift, hero flash/burst, motion-blur ghosts, letter cascade (incl.
 * the Telugu ASCII-gate fallback), block exit, and energy-reactive motion.
 *
 * Open http://localhost:5173/typography-preview.html while `npm run dev`
 * runs. Dev-only page — not linked from the app.
 */

import { TypographyRenderer } from './services/typography/typographyRenderer';
import type {
  AnimationSequence,
  AnimationTiming,
  TextStyle,
  WordAnimation,
} from './services/typography/types';

const timing = (entry: number, hold: number, exit: number): AnimationTiming => ({
  entryDuration: entry,
  holdDuration: hold,
  exitDuration: exit,
  entryEasing: 'overshoot-ease-out',
  exitEasing: 'ease-in',
});

const style = (over: Partial<TextStyle>): TextStyle => ({
  fontFamily: 'Space Grotesk',
  fontSize: 80,
  fontWeight: 700,
  letterSpacing: 0,
  color: '#FFFFFF',
  textCase: 'uppercase',
  ...over,
});

const word = (
  wordId: string,
  text: string,
  startTime: number,
  duration: number,
  over: Partial<WordAnimation>
): WordAnimation => ({
  wordId,
  text,
  startTime,
  duration,
  type: 'slide-up',
  intensity: 2,
  timing: timing(0.24, duration - 0.32, 0.08),
  style: style({}),
  emotion: 'tension',
  ...over,
});

const sequence: AnimationSequence = {
  id: 'harness',
  durationMs: 4000,
  layout: {
    width: 1080,
    height: 1920,
    backgroundColor: '#0B0B1E',
    maxWordsPerLine: 8,
    textAlignment: 'center',
    verticalPosition: 'center',
    padding: 54,
    backgroundType: 'textured_solid',
    backgroundTextureOpacity: 0.12,
    emphasisStyle: 'bold',
  },
  // Sawtooth 0→1 each second — columns at different t show different energy
  energyCurve: Array.from({ length: 400 }, (_, i) => (i % 100) / 100),
  animations: [
    // Phrase 1 — tension (red spotlight): ASCII hero w/ cascade+burst+flash
    word('w1', 'BUILD', 0.0, 0.6, {
      type: 'pop-slide-up',
      intensity: 3,
      style: style({ fontSize: 180, fontWeight: 900 }),
    }),
    word('w2', 'faster', 0.6, 0.5, {
      style: style({ fontSize: 92, gradientColors: ['#FF6A3D', '#FFD93D'] }),
    }),
    word('w3', 'today', 1.1, 0.5, {
      type: 'slide-left',
      style: style({
        fontSize: 68,
        fontWeight: 600,
        fontFamily: 'Playfair Display',
        fontStyle: 'italic',
        textCase: 'normal',
      }),
    }),
    // Phrase 2 — inspiration (cyan spotlight): Telugu hero must NOT cascade
    // (starts 2.05 → 0.45s silence gap; phrase boundary needs gap > 0.4s)
    word('w4', 'నమస్కారం', 2.05, 0.7, {
      intensity: 3,
      emotion: 'inspiration',
      style: style({ fontSize: 150, fontWeight: 900, textCase: 'normal' }),
    }),
    word('w5', 'dream', 2.7, 0.6, {
      emotion: 'inspiration',
      style: style({ fontSize: 96 }),
    }),
  ],
};

const FRAMES: Array<[number, string]> = [
  [0.06, 'hero flash + cascade start + punch'],
  [0.18, 'cascade ~70% + burst fading'],
  [0.45, 'hero settled (hold breathe)'],
  [0.72, 'slide entry: motion-blur ghosts'],
  [1.65, 'phrase block-exit (lift + fade)'],
  [2.2, 'Telugu hero: whole-word entry (gate)'],
];

async function main(): Promise<void> {
  await (document as any).fonts?.ready;
  const row = document.getElementById('frames')!;

  for (const [t, label] of FRAMES) {
    const fig = document.createElement('figure');
    const canvas = document.createElement('canvas');
    fig.appendChild(canvas);
    const cap = document.createElement('figcaption');
    cap.textContent = `t=${t.toFixed(2)}s — ${label}`;
    fig.appendChild(cap);
    row.appendChild(fig);

    const renderer = new TypographyRenderer(canvas, sequence);
    // Renderer pins CSS size to 1080×1920 — shrink for the contact sheet
    canvas.style.width = '250px';
    canvas.style.height = '444px';
    // Warm-up renders: linger/block-exit and slate-wipe depend on state from
    // prior frames (as in real sequential playback) — a cold single render
    // can't show them. Two lead frames make each column playback-accurate.
    renderer.render(Math.max(0, t - 0.12) * 1000);
    renderer.render(Math.max(0, t - 0.06) * 1000);
    renderer.render(t * 1000); // no audio element → pure timeline clock (ms)
  }

  document.getElementById('status')!.textContent =
    'Typography renderer harness — 6 frames rendered (deterministic, zero-token)';
}

main().catch((err) => {
  document.getElementById('status')!.textContent = 'HARNESS ERROR: ' + err;
  console.error(err);
});
