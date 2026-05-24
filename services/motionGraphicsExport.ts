/**
 * MotionGraphicsExport — wraps MediaRecorder around the motion stage canvas.
 *
 * The render pipeline already draws video + motion graphics + post-processing
 * onto a single canvas. To export we simply record `canvas.captureStream(fps)`
 * for the duration of the timeline, then download the resulting blob.
 *
 * The panel drives playback while we record: this service is just plumbing
 * (recorder lifecycle, MIME negotiation, audio merging, filename).
 */

import type { MotionBeat, PrimitiveType } from './motionGraphicsService';

export interface ExportOptions {
  canvas: HTMLCanvasElement;
  videoEl: HTMLVideoElement | null;
  durationSec: number;
  fps: number;
  videoBitsPerSecond?: number;
  /** Called once recorder has started. Panel should set time=0 and play. */
  onStart: () => void;
  /** Polled to know when playback has finished so we can stop the recorder. */
  getCurrentTime: () => number;
  /** Called when we've stopped recording. Panel pauses + resets if it wants. */
  onStop: () => void;
  /** Called on each progress sample with t01 ∈ [0,1]. */
  onProgress?: (t01: number) => void;
  /** Called if the user aborts. */
  signal?: AbortSignal;
}

export interface ExportResult {
  blob: Blob;
  mimeType: string;
  extension: 'mp4' | 'webm';
}

const PREFERRED_MIME = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export const pickSupportedMime = (): { mimeType: string; extension: 'mp4' | 'webm' } => {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder is not available in this browser.');
  }
  for (const m of PREFERRED_MIME) {
    if (MediaRecorder.isTypeSupported(m)) {
      return { mimeType: m, extension: m.startsWith('video/mp4') ? 'mp4' : 'webm' };
    }
  }
  return { mimeType: '', extension: 'webm' };
};

export const exportMotionVideo = async (opts: ExportOptions): Promise<ExportResult> => {
  const {
    canvas,
    videoEl,
    durationSec,
    fps,
    videoBitsPerSecond = 8_000_000,
    onStart,
    onStop,
    onProgress,
    getCurrentTime,
    signal,
  } = opts;

  if (!canvas) throw new Error('Canvas is not ready yet.');
  if (typeof (canvas as HTMLCanvasElement & { captureStream?: unknown }).captureStream !== 'function') {
    throw new Error('Canvas.captureStream is not supported in this browser.');
  }
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error('Invalid export duration.');
  }

  const { mimeType, extension } = pickSupportedMime();
  if (!mimeType) {
    throw new Error('Your browser has no supported MediaRecorder codec for MP4 or WebM.');
  }

  // Build composite stream — canvas video + (optional) source-video audio.
  const canvasStream = (canvas as HTMLCanvasElement & {
    captureStream: (frameRate?: number) => MediaStream;
  }).captureStream(fps);
  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
  let audioStream: MediaStream | null = null;
  if (videoEl) {
    type CapturableVideo = HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    const v = videoEl as CapturableVideo;
    const cap = v.captureStream || v.mozCaptureStream;
    if (cap) {
      try {
        audioStream = cap.call(v);
        if (audioStream) tracks.push(...audioStream.getAudioTracks());
      } catch (e) {
        console.warn('[export] could not capture audio from video:', e);
      }
    }
  }
  const combined = new MediaStream(tracks);

  const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e: BlobEvent) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  // Single settled-flag prevents resolve/reject race between onstop and onerror.
  let settled = false;
  const result = new Promise<ExportResult>((resolve, reject) => {
    recorder.onstop = () => {
      if (settled) return;
      settled = true;
      const blob = new Blob(chunks, { type: mimeType });
      resolve({ blob, mimeType, extension });
    };
    recorder.onerror = (e: Event) => {
      if (settled) return;
      settled = true;
      const err = (e as ErrorEvent).error || new Error('MediaRecorder error');
      reject(err);
    };
  });

  // Start with no timeslice — onstop flushes one final clean blob.
  // Timeslicing produced fragmented MP4s that some players couldn't seek.
  recorder.start();
  onStart();

  // Drive a wall-clock watcher to detect end-of-timeline and report progress.
  const startedAt = performance.now();
  // Allow up to 2 seconds of overflow so the recorder captures the final
  // post-roll frame even if currentTime stalls right at duration.
  const maxWallSec = durationSec + 2;

  const stopAndReset = () => {
    try { recorder.stop(); } catch (e) { void e; }
    onStop();
  };

  const onAbort = () => stopAndReset();
  if (signal) signal.addEventListener('abort', onAbort, { once: true });

  return new Promise<ExportResult>((resolve, reject) => {
    const tick = () => {
      if (signal?.aborted) {
        reject(new Error('Export aborted.'));
        return;
      }
      const wallSec = (performance.now() - startedAt) / 1000;
      const t = getCurrentTime();
      onProgress?.(Math.max(0, Math.min(1, t / durationSec)));

      const finished = t >= durationSec - 0.05 || wallSec >= maxWallSec;
      if (finished) {
        stopAndReset();
        result.then(resolve, reject);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
};

// ─── Filename ─────────────────────────────────────────────────────────────

const pad = (n: number): string => n.toString().padStart(2, '0');

const timestamp = (): string => {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
};

/**
 * Pick the "primary primitive" used for the filename. Defined as the most
 * frequent primitive type among foreground beats — we skip pure-background
 * primitives because they don't describe what the video is.
 */
const BACKGROUND_PRIMITIVES = new Set<PrimitiveType>([
  'bg-gradient-pulse',
  'transition-wipe',
  'light-sweep',
]);

export const pickPrimaryPrimitive = (beats: MotionBeat[]): PrimitiveType => {
  if (beats.length === 0) return 'big-text-reveal';
  const counts = new Map<PrimitiveType, number>();
  for (const b of beats) {
    if (BACKGROUND_PRIMITIVES.has(b.primitive)) continue;
    const weight = b.params.intensity || 1;
    counts.set(b.primitive, (counts.get(b.primitive) || 0) + weight);
  }
  if (counts.size === 0) {
    // Plan was all-background; just pick the first one.
    return beats[0].primitive;
  }
  let best: PrimitiveType = beats[0].primitive;
  let bestN = -1;
  counts.forEach((n, p) => {
    if (n > bestN) {
      bestN = n;
      best = p;
    }
  });
  return best;
};

export const buildExportFilename = (
  topicSlug: string,
  primaryPrimitive: PrimitiveType,
  extension: 'mp4' | 'webm',
): string => {
  const safeSlug = (topicSlug || 'motion-graphics-video').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
  return `createrin-motion-${safeSlug}-${primaryPrimitive}-${timestamp()}.${extension}`;
};

export const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick to give the download time to start.
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};
