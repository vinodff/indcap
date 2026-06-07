import { describe, it, expect } from 'vitest';
import { CaptionRenderer } from '../services/captionRenderer';

// Minimal stand-in for the parts of CanvasRenderingContext2D that applyShadow writes.
function makeCtx() {
  return { shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 } as unknown as CanvasRenderingContext2D & {
    shadowColor: string; shadowBlur: number; shadowOffsetX: number; shadowOffsetY: number;
  };
}

describe('CaptionRenderer.applyShadow — no doubled-caption ghost', () => {
  const r = new CaptionRenderer();
  const MAX = 3; // CaptionRenderer.MAX_SHADOW_OFFSET

  it('clamps a large hard offset so it cannot render as a displaced copy', () => {
    const ctx = makeCtx();
    // Bold Impact: shadowBlur 0, offsetY 16 — the classic "two captions" ghost.
    r.applyShadow(ctx, { shadowColor: '#FF0000', shadowBlur: 0, shadowOffsetY: 16 }, 1);
    expect(Math.abs(ctx.shadowOffsetY)).toBeLessThanOrEqual(MAX);
    // Blur must be forced up so the residual offset softens into depth.
    expect(ctx.shadowBlur).toBeGreaterThan(0);
    expect(ctx.shadowBlur).toBeGreaterThanOrEqual(16 * 1.5 * 1 - 1e-9);
  });

  it('clamps the Pop Out pink offset shadow', () => {
    const ctx = makeCtx();
    r.applyShadow(ctx, { shadowColor: '#FF1493', shadowBlur: 15, shadowOffsetY: 8 }, 1);
    expect(Math.abs(ctx.shadowOffsetY)).toBeLessThanOrEqual(MAX);
    expect(ctx.shadowColor).toBe('#FF1493');
  });

  it('scales the clamped offset by scaleFactor', () => {
    const ctx = makeCtx();
    r.applyShadow(ctx, { shadowColor: '#000', shadowBlur: 0, shadowOffsetX: 50 }, 2);
    expect(ctx.shadowOffsetX).toBeCloseTo(MAX * 2, 5); // clamped to 3, then *2
  });

  it('leaves small offsets essentially untouched (just scaled)', () => {
    const ctx = makeCtx();
    r.applyShadow(ctx, { shadowColor: '#000', shadowBlur: 4, shadowOffsetX: 2, shadowOffsetY: 2 }, 1);
    expect(ctx.shadowOffsetX).toBe(2);
    expect(ctx.shadowOffsetY).toBe(2);
    expect(ctx.shadowBlur).toBe(4); // unchanged: offset was within range
  });

  it('does nothing when no shadowColor is set', () => {
    const ctx = makeCtx();
    r.applyShadow(ctx, {}, 1);
    expect(ctx.shadowColor).toBe('');
    expect(ctx.shadowBlur).toBe(0);
  });
});
