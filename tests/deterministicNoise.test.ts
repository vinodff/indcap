/**
 * Regression test: render determinism primitive.
 *
 * shake/glitch animations used Math.random(), making the render a non-pure
 * function of time — exported video would not match preview, and two exports
 * of the same input would differ. deterministicNoise() replaces Math.random()
 * so the render is reproducible. These tests pin that contract.
 */

import { describe, it, expect } from 'vitest';
import { deterministicNoise } from '../services/typography/deterministicNoise';

describe('deterministicNoise', () => {
  it('is stable: same (seed, phase) always yields the same value', () => {
    const a = deterministicNoise('word-7', 0.42);
    const b = deterministicNoise('word-7', 0.42);
    expect(a).toBe(b);
  });

  it('stays within [0, 1)', () => {
    for (let i = 0; i < 200; i++) {
      const v = deterministicNoise(`word-${i}`, (i % 50) / 50);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('varies across seeds (different words jitter differently)', () => {
    const a = deterministicNoise('word-1', 0.5);
    const b = deterministicNoise('word-2', 0.5);
    expect(a).not.toBe(b);
  });

  it('varies across phase steps (jitter changes frame-to-frame)', () => {
    // Quantised to ~120 steps; samples a third of a step apart should differ
    const a = deterministicNoise('word-1', 0.10);
    const b = deterministicNoise('word-1', 0.30);
    expect(a).not.toBe(b);
  });

  it('the x/y seed-suffix trick produces independent axes', () => {
    const x = deterministicNoise('word-1x', 0.5);
    const y = deterministicNoise('word-1y', 0.5);
    expect(x).not.toBe(y);
  });
});
