// Face Tracker — best-effort subject-tracking pre-pass.
//
// Scrubs the video at a low sample rate, runs MediaPipe face detection at each
// point, and returns a normalized face-center trajectory. The Director uses this
// to pan/keep the speaker centered. Entirely optional: any failure (no detector,
// seek timeout, no faces) returns [] and the camera falls back to a centered
// frame. Reuses the MediaPipe detector from autoFraming.
//
// NOTE: this moves the video playhead; the caller must save/restore currentTime
// and run it off the live preview (e.g. when the user enables Auto-Camera).

import { initFaceDetector } from '../autoFraming';
import type { FaceSample } from './types';

function seekTo(video: HTMLVideoElement, t: number, timeoutMs = 250): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; video.removeEventListener('seeked', finish); resolve(); };
    video.addEventListener('seeked', finish, { once: true });
    try { video.currentTime = t; } catch { finish(); }
    setTimeout(finish, timeoutMs);
  });
}

export interface FaceTrackOptions {
  intervalSec?: number;   // sample spacing
  maxSamples?: number;    // hard cap to bound time
}

export async function sampleFaceTrack(
  video: HTMLVideoElement,
  duration: number,
  options: FaceTrackOptions = {},
): Promise<FaceSample[]> {
  if (!video || duration <= 0) return [];
  const interval = options.intervalSec ?? 0.6;
  const maxSamples = options.maxSamples ?? 100;

  const detector = await initFaceDetector();
  if (!detector) return [];

  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const wasPaused = video.paused;
  const savedTime = video.currentTime;
  const samples: FaceSample[] = [];

  try {
    video.pause();
    const n = Math.min(maxSamples, Math.floor(duration / interval) + 1);
    for (let i = 0; i < n; i++) {
      const t = i * interval;
      await seekTo(video, t);
      if (video.readyState < 2) continue;
      let res;
      try { res = detector.detectForVideo(video, Math.round(t * 1000)); }
      catch { continue; }
      const dets = res?.detections;
      if (!dets || dets.length === 0) continue;
      // largest face = main subject
      const main = dets.reduce((best, d) => {
        const a = (d.boundingBox?.width || 0) * (d.boundingBox?.height || 0);
        const ba = (best.boundingBox?.width || 0) * (best.boundingBox?.height || 0);
        return a > ba ? d : best;
      });
      const bb = main.boundingBox;
      if (!bb) continue;
      samples.push({
        time: t,
        x: (bb.originX + bb.width / 2) / vw,
        y: (bb.originY + bb.height / 2) / vh,
        size: bb.height / vh,
      });
    }
  } catch (e) {
    console.warn('[faceTracker] sampling failed:', e);
  } finally {
    await seekTo(video, savedTime).catch(() => {});
    if (!wasPaused) video.play().catch(() => {});
  }

  return smooth(samples);
}

// Moving-average smoothing so the pan glides instead of chasing detection jitter.
function smooth(samples: FaceSample[]): FaceSample[] {
  if (samples.length < 3) return samples;
  const out: FaceSample[] = [];
  for (let i = 0; i < samples.length; i++) {
    const a = samples[Math.max(0, i - 1)];
    const b = samples[i];
    const c = samples[Math.min(samples.length - 1, i + 1)];
    out.push({ time: b.time, x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3, size: b.size });
  }
  return out;
}
