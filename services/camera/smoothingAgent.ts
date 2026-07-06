// Smoothing / Safety Agent — turns raw director keyframes into a clean,
// jitter-free, in-bounds camera track.
//
//   1. sort by time
//   2. merge keyframes that land too close (keep the higher-priority move)
//   3. clamp zoom to [1, maxZoom]
//   4. clamp focus so the zoomed source rect never leaves the frame (no black edges)
//   5. limit pan velocity so the camera glides instead of snapping

import type { CameraKeyframe, CameraTrack, CameraMoveKind, AutoCameraOptions } from './types';

const MERGE_GAP = 0.22;       // s — keyframes closer than this collapse
const MAX_PAN_PER_SEC = 0.25; // normalized focus units/sec

const PRIORITY: Record<CameraMoveKind, number> = {
  'crash-zoom': 7, 'punch-in': 5, 'whip-pan': 6, dutch: 5,
  establish: 4, 'zoom-out': 3, 'zoom-in': 2, pan: 1, hold: 0, shake: 1,
};

export function smoothingAgent(raw: CameraKeyframe[], options: AutoCameraOptions = {}): CameraTrack {
  const maxZoom = options.maxZoom ?? 1.45;
  if (!raw.length) return [];

  const sorted = [...raw].sort((a, b) => a.time - b.time || PRIORITY[b.kind] - PRIORITY[a.kind]);

  // 2. merge near-coincident keyframes (keep higher priority / first seen)
  const merged: CameraKeyframe[] = [];
  for (const k of sorted) {
    const prev = merged[merged.length - 1];
    if (prev && k.time - prev.time < MERGE_GAP) {
      if (PRIORITY[k.kind] > PRIORITY[prev.kind]) merged[merged.length - 1] = { ...k, time: prev.time };
      continue;
    }
    merged.push({ ...k });
  }

  // 3 + 4. clamp zoom + focus bounds
  for (const k of merged) {
    k.zoom = Math.max(1, Math.min(maxZoom, k.zoom));
    const half = 0.5 / k.zoom;
    k.focusX = Math.max(half, Math.min(1 - half, k.focusX));
    k.focusY = Math.max(half, Math.min(1 - half, k.focusY));
  }

  // 5. limit pan velocity between consecutive keyframes
  for (let i = 1; i < merged.length; i++) {
    const a = merged[i - 1], b = merged[i];
    // Whip-pans are deliberately fast "swish" moves — exempt them (and the snap
    // back off them) from velocity limiting so the swing survives.
    if (a.kind === 'whip-pan' || b.kind === 'whip-pan') continue;
    const dt = Math.max(0.001, b.time - a.time);
    const maxDelta = MAX_PAN_PER_SEC * dt;
    const dx = b.focusX - a.focusX;
    const dy = b.focusY - a.focusY;
    if (Math.abs(dx) > maxDelta) b.focusX = a.focusX + Math.sign(dx) * maxDelta;
    if (Math.abs(dy) > maxDelta) b.focusY = a.focusY + Math.sign(dy) * maxDelta;
    // re-clamp focus to bounds after velocity limiting
    const half = 0.5 / b.zoom;
    b.focusX = Math.max(half, Math.min(1 - half, b.focusX));
    b.focusY = Math.max(half, Math.min(1 - half, b.focusY));
  }

  return merged;
}
