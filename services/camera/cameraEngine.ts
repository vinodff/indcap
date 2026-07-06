// Camera interpolation — evaluate a CameraTrack at any time into a concrete
// {zoom, focusX, focusY}. Reuses the project's cubic-bezier solver so camera
// easing matches the caption-keyframe easing feel.

import { solveCubicBezier } from '../caption/keyframeEngine';
import type { CameraTrack, CameraEasing } from './types';
import { DEFAULT_FOCUS_X, DEFAULT_FOCUS_Y } from './types';

export interface CameraState { zoom: number; focusX: number; focusY: number; rotation: number; }

const NEUTRAL: CameraState = { zoom: 1, focusX: DEFAULT_FOCUS_X, focusY: DEFAULT_FOCUS_Y, rotation: 0 };

function ease(t: CameraEasing, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  switch (t) {
    case 'ease':    return solveCubicBezier(0.42, 0, 0.58, 1, x); // in-out
    case 'easeIn':  return solveCubicBezier(0.42, 0, 1, 1, x);
    case 'easeOut': return solveCubicBezier(0, 0, 0.58, 1, x);
    // Overshoot-and-settle — the signature pro "snap". Classic easeOutBack.
    case 'easeOutBack': {
      const c1 = 1.70158, c3 = c1 + 1, p = x - 1;
      return 1 + c3 * p * p * p + c1 * p * p;
    }
    // Stronger elastic overshoot for crash zooms (damped sine).
    case 'spring': {
      const c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    }
    default:        return x; // linear
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Cheap deterministic value-noise in [-1,1] for organic handheld drift. Two
// detuned sines per axis read as non-repeating over short clips and cost nothing.
function shakeNoise(time: number, seed: number): number {
  return (
    Math.sin(time * 11.13 + seed) * 0.6 +
    Math.sin(time * 27.7 + seed * 2.3) * 0.4
  );
}

/** Evaluate the camera at `time`. Returns a neutral full-frame camera if empty. */
export function evaluateCamera(track: CameraTrack | undefined, time: number): CameraState {
  if (!track || track.length === 0) return { ...NEUTRAL };

  let base: CameraState;
  let shakeAmp: number;
  if (track.length === 1 || time <= track[0].time) {
    const k = track[0];
    base = { zoom: k.zoom, focusX: k.focusX, focusY: k.focusY, rotation: k.rotation ?? 0 };
    shakeAmp = k.shake ?? 0;
  } else {
    const last = track[track.length - 1];
    if (time >= last.time) {
      base = { zoom: last.zoom, focusX: last.focusX, focusY: last.focusY, rotation: last.rotation ?? 0 };
      shakeAmp = last.shake ?? 0;
    } else {
      // Binary search for the surrounding pair.
      let lo = 0, hi = track.length - 1;
      while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (track[mid].time <= time) lo = mid; else hi = mid;
      }
      const a = track[lo], b = track[hi];
      const span = b.time - a.time;
      const raw = span > 0 ? (time - a.time) / span : 1;
      const t = ease(a.easing, raw);
      base = {
        zoom: lerp(a.zoom, b.zoom, t),
        focusX: lerp(a.focusX, b.focusX, t),
        focusY: lerp(a.focusY, b.focusY, t),
        rotation: lerp(a.rotation ?? 0, b.rotation ?? 0, t),
      };
      // Shake follows the same envelope but biases toward whichever kf is hotter.
      shakeAmp = lerp(a.shake ?? 0, b.shake ?? 0, t);
    }
  }

  if (shakeAmp > 0.001) {
    // Positional shake scales with zoom so it reads consistently; rotational
    // micro-jitter sells the "handheld" feel. Amplitudes kept subtle on purpose.
    const posAmp = 0.012 * shakeAmp;
    base.focusX += shakeNoise(time, 1.7) * posAmp;
    base.focusY += shakeNoise(time, 8.3) * posAmp;
    base.rotation += shakeNoise(time, 4.9) * 0.5 * shakeAmp;
  }
  return base;
}

/**
 * Translate a camera state into a source sub-rectangle (in source pixels) for
 * ctx.drawImage(src, sx, sy, sw, sh, 0,0, dw,dh). Clamps so the rect never
 * leaves the frame (no black edges), which also bounds the focus point.
 */
export function cameraSourceRect(cam: CameraState, srcW: number, srcH: number) {
  const zoom = Math.max(1, cam.zoom);
  const sw = srcW / zoom;
  const sh = srcH / zoom;
  let sx = cam.focusX * srcW - sw / 2;
  let sy = cam.focusY * srcH - sh / 2;
  sx = Math.max(0, Math.min(sx, srcW - sw));
  sy = Math.max(0, Math.min(sy, srcH - sh));
  return { sx, sy, sw, sh };
}
