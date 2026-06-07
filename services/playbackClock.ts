// Playback clock for the caption preview/render loop.
//
// The caption canvas is redrawn every animation frame at `currentTime`. That
// time has to come from somewhere. Two sources exist:
//   1. A real <video> element, when one is loaded AND actually playing.
//   2. A synthetic clock, for "black screen" / sandbox testing where there is
//      no video, or when a video element is mounted but isn't advancing yet
//      (autoplay blocked, still buffering, or the load/play race in
//      startPreviewMode where play() is called before the element mounts).
//
// The historical bug: the loop only ran the synthetic clock when *no* video
// element existed (`!videoRef.current`). A mounted-but-stalled video therefore
// got neither the real clock (no timeupdate fired) nor the synthetic clock, so
// `currentTime` froze at 0 and captions never moved. The fix keys off whether
// the video is *advancing*, not whether it *exists*.

export interface VideoClockState {
  /** A <video> element is present in the DOM. */
  hasVideo: boolean;
  paused: boolean;
  ended: boolean;
  /** HTMLMediaElement.readyState (>= 2 / HAVE_CURRENT_DATA means frames exist). */
  readyState: number;
  /** HTMLMediaElement.currentTime in seconds. */
  currentTime: number;
}

/** True when a real <video> is actually advancing and should drive the clock. */
export function isVideoAdvancing(v: VideoClockState | null | undefined): boolean {
  return !!v && v.hasVideo && !v.paused && !v.ended && v.readyState >= 2;
}

export interface NextPlayheadOptions {
  video: VideoClockState | null;
  isPlaying: boolean;
  /** Caption playhead time from the previous frame, in seconds. */
  prevTime: number;
  /** Elapsed wall-clock seconds since the previous frame. */
  dt: number;
  /** Length of the synthetic loop before it wraps back to 0, in seconds. */
  maxTime: number;
}

/**
 * Compute the caption playhead time for the next animation frame.
 *
 * - Real video advancing  → follow `video.currentTime` (frame-accurate).
 * - Otherwise, if playing  → advance the synthetic clock by `dt`, wrapping at
 *   `maxTime`. This keeps captions moving even when a video element is present
 *   but stalled, so the preview never appears frozen.
 * - Otherwise               → hold `prevTime`.
 */
export function nextPlayheadTime(opts: NextPlayheadOptions): number {
  const { video, isPlaying, prevTime, dt, maxTime } = opts;

  if (isVideoAdvancing(video)) {
    return video!.currentTime;
  }

  if (isPlaying) {
    const t = prevTime + dt;
    return t > maxTime ? 0 : t;
  }

  return prevTime;
}
