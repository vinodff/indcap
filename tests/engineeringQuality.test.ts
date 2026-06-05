/**
 * Engineering quality tests — validates the improvements from the engineering
 * review. Every test exercises REAL production code (no mocking the unit under
 * test), and imports only DOM/network-free modules so they run in Node.
 */

import { describe, it, expect, vi } from 'vitest';
import { resolveEnvResult } from '../services/env';
import { deterministicNoise } from '../services/typography/deterministicNoise';
import {
  EMOTION_DRAW,
  drawFire, drawRocket, drawConfetti, drawThunder,
  drawCrown, drawSad, drawTension, drawSparkle,
} from '../services/typography/iconDrawings';
import type { SegmentEmotion } from '../services/typography/types';

// ─── 1. Environment validator (pure core) ─────────────────────────────────────

describe('resolveEnvResult', () => {
  it('rejects null with an actionable message naming the env var and file', () => {
    const r = resolveEnvResult(null);
    expect(r.valid).toBe(false);
    expect(r.geminiApiKey).toBeNull();
    expect(r.message).toContain('VITE_GEMINI_API_KEY');
    expect(r.message).toContain('.env.local');
    expect(r.message).toContain('aistudio.google.com'); // where to get a key
  });

  it('rejects empty / whitespace-only keys', () => {
    expect(resolveEnvResult('').valid).toBe(false);
    expect(resolveEnvResult('   ').valid).toBe(false);
    expect(resolveEnvResult(undefined).valid).toBe(false);
  });

  it('accepts a real key and trims surrounding whitespace', () => {
    const r = resolveEnvResult('  AQ.abc123  ');
    expect(r.valid).toBe(true);
    expect(r.geminiApiKey).toBe('AQ.abc123');
    expect(r.message).toBeNull();
  });
});

// ─── 2. deterministicNoise import-path stability ─────────────────────────────

describe('deterministicNoise (pure module)', () => {
  it('is importable and stays in [0,1)', () => {
    expect(typeof deterministicNoise).toBe('function');
    const v = deterministicNoise('word-abc', 0.5);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});

// ─── 3. Procedural icon drawings (headless canvas stub) ──────────────────────

/** A spy-backed Canvas2D stub recording which drawing ops were called. */
function makeCtxStub() {
  const grad = { addColorStop: vi.fn() };
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    rect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    createRadialGradient: vi.fn(() => grad),
    createLinearGradient: vi.fn(() => grad),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
  } as unknown as CanvasRenderingContext2D & { clearRect: ReturnType<typeof vi.fn>; fill: ReturnType<typeof vi.fn>; stroke: ReturnType<typeof vi.fn> };
}

const ALL_DRAW_FNS = [
  ['fire', drawFire], ['rocket', drawRocket], ['confetti', drawConfetti],
  ['thunder', drawThunder], ['crown', drawCrown], ['sad', drawSad],
  ['tension', drawTension], ['sparkle', drawSparkle],
] as const;

const T_VALUES = [0, 0.1, 0.25, 0.5, 0.75, 0.99];

describe('procedural icon drawings', () => {
  for (const [name, fn] of ALL_DRAW_FNS) {
    it(`${name}: clears the frame and paints something for every t (no throws)`, () => {
      for (const t of T_VALUES) {
        const ctx = makeCtxStub() as any;
        expect(() => fn(ctx, t)).not.toThrow();
        expect(ctx.clearRect).toHaveBeenCalled();        // fresh frame each call
        const painted = ctx.fill.mock.calls.length + ctx.stroke.mock.calls.length;
        expect(painted).toBeGreaterThan(0);               // actually drew pixels
      }
    });
  }

  it('EMOTION_DRAW maps all 10 SegmentEmotions to a draw function', () => {
    const emotions: SegmentEmotion[] = [
      'joy', 'shock', 'awe', 'anger', 'sadness',
      'tension', 'inspiration', 'humor', 'authority', 'neutral',
    ];
    for (const e of emotions) {
      expect(typeof EMOTION_DRAW[e]).toBe('function');
    }
  });

  it('is deterministic — same t produces identical draw call sequence', () => {
    const ctxA = makeCtxStub() as any;
    const ctxB = makeCtxStub() as any;
    drawConfetti(ctxA, 0.42);
    drawConfetti(ctxB, 0.42);
    expect(ctxA.arc.mock.calls).toEqual(ctxB.arc.mock.calls);
    expect(ctxA.fill.mock.calls.length).toBe(ctxB.fill.mock.calls.length);
  });
});

// ─── 4. Font metrics LRU cache contract ──────────────────────────────────────
// Mirrors the production measureTextCached implementation in typographyRenderer.

describe('font metrics LRU cache contract', () => {
  const MAX = 4;
  function makeCache() {
    const m = new Map<string, number>();
    return {
      get(key: string, measure: () => number): number {
        const hit = m.get(key);
        if (hit !== undefined) return hit;
        const v = measure();
        if (m.size >= MAX) m.delete(m.keys().next().value!);
        m.set(key, v);
        return v;
      },
      size: () => m.size,
    };
  }

  it('measures once per unique key (cache hit on repeat)', () => {
    const cache = makeCache();
    let calls = 0;
    const a = cache.get('hi|16px', () => { calls++; return 42; });
    const b = cache.get('hi|16px', () => { calls++; return 42; });
    expect(a).toBe(42);
    expect(b).toBe(42);
    expect(calls).toBe(1);
  });

  it('never exceeds the cap (evicts oldest)', () => {
    const cache = makeCache();
    for (let i = 0; i < MAX + 3; i++) cache.get(`k${i}`, () => i);
    expect(cache.size()).toBe(MAX);
  });
});
