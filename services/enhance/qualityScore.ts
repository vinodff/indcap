// No-reference video quality score (0..100). Cheap enough to run on a single
// downsampled frame. Used to show "before vs after" in Studio Mode.
//
// This is a heuristic blend of four classic no-reference signals:
//   - sharpness  : variance of a Laplacian (blur detector)
//   - exposure   : mean luma + highlight/shadow clipping penalty
//   - contrast   : luma standard deviation (dynamic range usage)
//   - color      : Hasler-Susstrunk colorfulness metric
// plus an optional audio sub-score from a live AnalyserNode.
import { QualityBreakdown, QualityResult } from './types';

const SAMPLE_W = 192; // downsample target; keeps the whole pass ~sub-millisecond

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const to100 = (x: number) => Math.round(clamp01(x) * 100);

/**
 * Compute a quality score from a video frame (or any drawable). Returns null if
 * the frame cannot be sampled yet (e.g. video not decoded).
 */
export function scoreFrame(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  audio?: number
): QualityResult | null {
  if (!srcW || !srcH) return null;

  const w = SAMPLE_W;
  const h = Math.max(1, Math.round((srcH / srcW) * SAMPLE_W));
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  try {
    ctx.drawImage(source, 0, 0, w, h);
  } catch {
    return null; // frame not ready / tainted
  }

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return null;
  }

  // Build a luma plane and accumulate exposure / contrast / color stats.
  const luma = new Float32Array(w * h);
  let sum = 0;
  let clipHi = 0;
  let clipLo = 0;
  let rgSum = 0;
  let rgSqSum = 0;
  let ybSum = 0;
  let ybSqSum = 0;
  const n = w * h;

  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    luma[i] = y;
    sum += y;
    if (y >= 250) clipHi++;
    if (y <= 5) clipLo++;
    // Colorfulness (Hasler-Susstrunk) accumulators.
    const rg = r - g;
    const yb = 0.5 * (r + g) - b;
    rgSum += rg;
    rgSqSum += rg * rg;
    ybSum += yb;
    ybSqSum += yb * yb;
  }

  const mean = sum / n;

  // Exposure score: Gaussian tolerance around the ideal mid-tone (~118) so a
  // well-exposed frame scores high without demanding a pixel-perfect mean, minus
  // a penalty for genuinely blown highlights / crushed shadows.
  const expoTol = (mean - 118) / 46;
  const expoCenter = Math.exp(-expoTol * expoTol);
  const clipPenalty = Math.min(0.5, ((clipHi + clipLo) / n) * 1.4);
  const exposure = to100(expoCenter * (1 - clipPenalty));

  // Contrast score: luma std dev. ~52 already reads as a healthy, punchy image.
  let varSum = 0;
  for (let i = 0; i < n; i++) {
    const d = luma[i] - mean;
    varSum += d * d;
  }
  const std = Math.sqrt(varSum / n);
  const contrast = to100(std / 50);

  // Sharpness: variance of a 4-neighbour Laplacian on the luma plane.
  let lapSum = 0;
  let lapSqSum = 0;
  let cnt = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = 4 * luma[i] - luma[i - 1] - luma[i + 1] - luma[i - w] - luma[i + w];
      lapSum += lap;
      lapSqSum += lap * lap;
      cnt++;
    }
  }
  const lapMean = cnt ? lapSum / cnt : 0;
  const lapVar = cnt ? lapSqSum / cnt - lapMean * lapMean : 0;
  // Empirical (at this 192px sample scale): lapVar ~330 already reads as crisp,
  // <60 is blurry. Log-ish compression so sharpness saturates gracefully.
  const sharpness = to100(Math.log10(1 + lapVar) / Math.log10(1 + 300));

  // Colorfulness.
  const rgMean = rgSum / n;
  const ybMean = ybSum / n;
  const rgStd = Math.sqrt(Math.max(0, rgSqSum / n - rgMean * rgMean));
  const ybStd = Math.sqrt(Math.max(0, ybSqSum / n - ybMean * ybMean));
  const stdRoot = Math.sqrt(rgStd * rgStd + ybStd * ybStd);
  const meanRoot = Math.sqrt(rgMean * rgMean + ybMean * ybMean);
  const colorfulness = stdRoot + 0.3 * meanRoot; // ~0..150 in practice
  const color = to100(colorfulness / 58);

  const breakdown: QualityBreakdown = { sharpness, exposure, contrast, color };
  if (audio !== undefined) breakdown.audio = to100(audio);

  // Weighted blend. Sharpness and exposure dominate perceived "quality".
  let score =
    sharpness * 0.34 +
    exposure * 0.28 +
    contrast * 0.20 +
    color * 0.18;
  if (breakdown.audio !== undefined) {
    // Fold audio in at 25% weight, renormalizing the visual portion.
    score = score * 0.75 + breakdown.audio * 0.25;
  }

  return { score: Math.round(score), breakdown };
}
