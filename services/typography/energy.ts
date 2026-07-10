/**
 * Pure audio-energy sampling — DOM-free so it is unit-testable in node
 * (the renderer's import chain pulls lottie-web, which needs `document`).
 *
 * Curve contract: normalized 0–1 RMS envelope at 100Hz (BeatGrid.energyCurve).
 */

/**
 * Energy 0–1 at playback time t (seconds).
 *
 * ±4-sample (~40ms each side) box average: raw 100Hz RMS sampled at 30fps
 * aliases into visible scale flicker on percussive audio; a deterministic
 * window keeps it calm. Also absorbs the silent-audio NaN curve (the analyzer
 * divides by a maxEnergy of 0): non-finite samples are skipped, and a missing
 * curve or all-NaN window reads as neutral 0.5 so every energy-scaled effect
 * lands mid-range, not dead.
 */
export function sampleEnergy(curve: number[] | undefined, t: number): number {
  if (!curve || curve.length === 0) return 0.5;
  const center = Math.min(curve.length - 1, Math.max(0, Math.floor(t * 100)));
  let sum = 0;
  let count = 0;
  const from = Math.max(0, center - 4);
  const to = Math.min(curve.length - 1, center + 4);
  for (let i = from; i <= to; i++) {
    const v = curve[i];
    if (Number.isFinite(v)) {
      sum += v;
      count++;
    }
  }
  return count > 0 ? sum / count : 0.5;
}
