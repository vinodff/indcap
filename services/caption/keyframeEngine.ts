import { Keyframe, KeyframeMap } from '../../types';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function solveCubicBezier(x1: number, y1: number, x2: number, y2: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Newton-Raphson iteration
  let t = x; 
  for (let i = 0; i < 8; i++) {
    const xT = 3 * Math.pow(1 - t, 2) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
    const dx = xT - x;
    if (Math.abs(dx) < 1e-6) {
      return 3 * Math.pow(1 - t, 2) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
    }
    const dxdt = 3 * Math.pow(1 - t, 2) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
    if (Math.abs(dxdt) < 1e-6) break;
    t -= dx / dxdt;
  }

  // Binary search fallback
  let lo = 0;
  let hi = 1;
  t = x;
  while (lo < hi) {
    const xT = 3 * Math.pow(1 - t, 2) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
    if (Math.abs(xT - x) < 1e-5) break;
    if (xT < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return 3 * Math.pow(1 - t, 2) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
}

/** Apply the easing curve defined on the FROM keyframe to a 0-1 progress value. */
function applyEasing(t: number, kf: Keyframe): number {
  if (kf.controlPoints) {
    const [x1, y1, x2, y2] = kf.controlPoints;
    return solveCubicBezier(x1, y1, x2, y2, t);
  }
  const easing = kf.easing;
  if (easing === 'instant') return t < 1 ? 0 : 1;
  if (easing === 'ease') {
    // cubic ease-in-out: matches captions.ai "ease" feel
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  return t; // linear (default)
}

/**
 * Returns the evaluated Keyframe at `time` for a given caption (and optional word).
 * Linearly interpolates between the two surrounding keyframes.
 * Returns undefined when there are no keyframes for the target.
 */
export function evaluateKeyframe(
  frames: Keyframe[],
  time: number,
  wordIdx?: number
): Keyframe | undefined {
  const relevant = frames.filter(f => f.wordIdx === wordIdx);
  if (relevant.length === 0) return undefined;

  // Single keyframe — snap to it
  if (relevant.length === 1) return relevant[0];

  // Before first keyframe
  if (time <= relevant[0].time) return relevant[0];
  // After last keyframe
  if (time >= relevant[relevant.length - 1].time) return relevant[relevant.length - 1];

  // Find surrounding pair
  let lo = 0;
  let hi = relevant.length - 1;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (relevant[mid].time <= time) lo = mid;
    else hi = mid;
  }

  const a = relevant[lo];
  const b = relevant[hi];
  const rawT = (time - a.time) / (b.time - a.time);
  const t = applyEasing(rawT, a);

  return {
    time,
    wordIdx,
    scale:    lerpOpt(a.scale,    b.scale,    t),
    opacity:  lerpOpt(a.opacity,  b.opacity,  t),
    offsetX:  lerpOpt(a.offsetX,  b.offsetX,  t),
    offsetY:  lerpOpt(a.offsetY,  b.offsetY,  t),
    rotation: lerpOpt(a.rotation, b.rotation, t),
    color: t < 0.5 ? a.color : b.color,
    easing: a.easing,
    controlPoints: a.controlPoints,
  };
}

function lerpOpt(a: number | undefined, b: number | undefined, t: number): number | undefined {
  if (a === undefined && b === undefined) return undefined;
  return lerp(a ?? (b as number), b ?? (a as number), t);
}

/** Insert or update a keyframe. Returns a new map (immutable update). */
export function upsertKeyframe(map: KeyframeMap, captionId: string, kf: Keyframe): KeyframeMap {
  const next = new Map(map);
  const existing = [...(next.get(captionId) ?? [])];
  const idx = existing.findIndex(f => f.time === kf.time && f.wordIdx === kf.wordIdx);
  if (idx >= 0) existing[idx] = kf;
  else existing.push(kf);
  existing.sort((a, b) => a.time - b.time);
  next.set(captionId, existing);
  return next;
}

/** Remove a keyframe by time + wordIdx. Returns a new map. */
export function removeKeyframe(
  map: KeyframeMap,
  captionId: string,
  time: number,
  wordIdx?: number
): KeyframeMap {
  const next = new Map(map);
  const frames = (next.get(captionId) ?? []).filter(
    f => !(f.time === time && f.wordIdx === wordIdx)
  );
  if (frames.length === 0) next.delete(captionId);
  else next.set(captionId, frames);
  return next;
}

/** Apply a caption-level keyframe as ctx transforms. Returns alpha to set. */
export function applyCaptionKeyframe(
  ctx: CanvasRenderingContext2D,
  kf: Keyframe,
  anchorX: number,
  anchorY: number
): number {
  const alpha = kf.opacity ?? 1;
  const scale = kf.scale ?? 1;
  const ox = kf.offsetX ?? 0;
  const oy = kf.offsetY ?? 0;
  const rot = kf.rotation ?? 0;

  ctx.translate(anchorX + ox, anchorY + oy);
  if (scale !== 1) ctx.scale(scale, scale);
  if (rot !== 0) ctx.rotate(rot);
  ctx.translate(-anchorX, -anchorY);

  return alpha;
}
