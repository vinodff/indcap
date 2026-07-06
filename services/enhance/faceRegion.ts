// Bridges the existing MediaPipe FaceDetector (services/autoFraming.ts) to a
// normalized FaceRegion the EnhancementEngine shader consumes for local face
// sharpening + skin smoothing. Reuses the already-loaded detector — no new dep,
// no second model download.
import { initFaceDetector, detectMainFaceBox } from '../autoFraming';
import { FaceRegion } from './types';

/** Ensure the shared MediaPipe detector is warmed up. Safe to call repeatedly. */
export async function ensureFaceDetector(): Promise<boolean> {
  const d = await initFaceDetector();
  return !!d;
}

/**
 * Detect the main face and return it as a normalized ellipse (0..1), padded so
 * it comfortably covers hair/jaw. Returns null when no face is found or the
 * detector is not ready — the engine then just skips the face-local pass.
 */
export function detectFaceRegion(video: HTMLVideoElement, timestamp: number): FaceRegion | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const box = detectMainFaceBox(video, timestamp);
  if (!box) return null;

  const cx = (box.originX + box.width / 2) / vw;
  const cy = (box.originY + box.height / 2) / vh;
  const rx = Math.min(0.5, (box.width / vw) * 0.7);
  const ry = Math.min(0.5, (box.height / vh) * 0.85);
  if (rx <= 0 || ry <= 0) return null;

  return { cx, cy, rx, ry };
}
