/**
 * Deterministic pseudo-noise in [0, 1). Seeded by a string (e.g. wordId) and a
 * numeric phase, so the same (seed, phase) ALWAYS yields the same value.
 * Replaces Math.random() in shake/glitch so the render is a pure function of
 * (sequence, time) — required for frame-accurate, reproducible video export.
 * Pure module — no DOM, no canvas, safe to import in Node test environment.
 */
export function deterministicNoise(seed: string, phase: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Quantise phase to ~120 steps so jitter changes frame-to-frame but stays stable
  h ^= Math.floor(phase * 120);
  h = Math.imul(h, 16777619);
  return (h >>> 0) / 4294967296;
}
