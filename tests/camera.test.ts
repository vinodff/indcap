import { describe, it, expect } from 'vitest';
import { runAutoCamera } from '../services/camera/orchestrator';
import { evaluateCamera } from '../services/camera/cameraEngine';
import type { Caption } from '../types';

// Synthetic 12s clip: 3 captions, each with one high-emphasis "punch" word,
// energetic sentiment, plus a beat grid — enough to trigger every move kind.
function makeCaptions(): Caption[] {
  const mk = (i: number, t: number): Caption => ({
    id: `c${i}`, startTime: t, endTime: t + 3.5,
    text: 'this is INSANE right now',
    sentiment: 'energetic',
    words: [
      { text: 'this', start: t, end: t + 0.4, emphasis: 20 },
      { text: 'is', start: t + 0.4, end: t + 0.7, emphasis: 10 },
      { text: 'INSANE', start: t + 1.0, end: t + 1.6, emphasis: 95 }, // crash trigger
      { text: 'right', start: t + 1.8, end: t + 2.2, emphasis: 30 },
      { text: 'now', start: t + 2.4, end: t + 2.8, emphasis: 40 },
    ],
  });
  // Gaps > 1s between captions so sceneAgent splits them into separate shots.
  return [mk(0, 0), mk(1, 5), mk(2, 10)];
}

const beats = Array.from({ length: 30 }, (_, i) => i * 0.5);

describe('advanced auto-camera', () => {
  it('punchy style emits crash-zoom, whip-pan, dutch and shake', () => {
    const track = runAutoCamera(
      { captions: makeCaptions(), duration: 13.5, beats },
      { style: 'punchy', intensity: 1, maxZoom: 1.6, shake: 1 },
    );
    const kinds = new Set(track.map(k => k.kind));
    expect(track.length).toBeGreaterThan(5);
    expect(kinds.has('crash-zoom')).toBe(true);
    expect(kinds.has('whip-pan')).toBe(true);

    // Some keyframe carries a non-zero dutch rotation and some shake.
    expect(track.some(k => Math.abs(k.rotation ?? 0) > 0.1)).toBe(true);
    expect(track.some(k => (k.shake ?? 0) > 0.05)).toBe(true);

    // Zoom never exceeds the cap, focus stays in-bounds (no black edges).
    for (const k of track) {
      expect(k.zoom).toBeLessThanOrEqual(1.6 + 1e-9);
      expect(k.zoom).toBeGreaterThanOrEqual(1);
      const half = 0.5 / k.zoom;
      expect(k.focusX).toBeGreaterThanOrEqual(half - 1e-9);
      expect(k.focusX).toBeLessThanOrEqual(1 - half + 1e-9);
    }
  });

  it('subtle style stays calm: no crash/whip, no shake, level frame', () => {
    const track = runAutoCamera(
      { captions: makeCaptions(), duration: 13.5, beats },
      { style: 'subtle', intensity: 1, maxZoom: 1.45, shake: 1 },
    );
    const kinds = new Set(track.map(k => k.kind));
    expect(kinds.has('crash-zoom')).toBe(false);
    expect(kinds.has('whip-pan')).toBe(false);
    // Subtle: perfectly level (no dutch) and at most an imperceptible impact micro-shake.
    expect(track.every(k => Math.abs(k.rotation ?? 0) < 1e-9)).toBe(true);
    expect(track.every(k => (k.shake ?? 0) < 0.1)).toBe(true);
  });

  it('evaluateCamera applies rotation + procedural shake between keyframes', () => {
    const track = runAutoCamera(
      { captions: makeCaptions(), duration: 13.5, beats },
      { style: 'handheld', intensity: 1, maxZoom: 1.5, shake: 1.5 },
    );
    // Sample two nearby times inside the track; handheld shake should make the
    // evaluated focus differ frame-to-frame (it's time-varying noise).
    const a = evaluateCamera(track, 6.00);
    const b = evaluateCamera(track, 6.05);
    const moved = Math.abs(a.focusX - b.focusX) + Math.abs(a.focusY - b.focusY) + Math.abs(a.rotation - b.rotation);
    expect(moved).toBeGreaterThan(0);
    // Output is well-formed.
    for (const s of [a, b]) {
      expect(Number.isFinite(s.zoom)).toBe(true);
      expect(Number.isFinite(s.rotation)).toBe(true);
    }
  });

  it('user shake multiplier of 0 removes all shake', () => {
    const track = runAutoCamera(
      { captions: makeCaptions(), duration: 13.5, beats },
      { style: 'handheld', shake: 0 },
    );
    expect(track.every(k => (k.shake ?? 0) < 1e-9)).toBe(true);
  });
});
