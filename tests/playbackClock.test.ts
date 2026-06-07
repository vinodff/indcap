import { describe, it, expect } from 'vitest';
import { nextPlayheadTime, isVideoAdvancing, VideoClockState } from '../services/playbackClock';

const stalledVideo: VideoClockState = {
  hasVideo: true,
  paused: true,   // mounted but not playing (errored / buffering / load-play race)
  ended: false,
  readyState: 0,  // HAVE_NOTHING
  currentTime: 0,
};

const playingVideo: VideoClockState = {
  hasVideo: true,
  paused: false,
  ended: false,
  readyState: 4,  // HAVE_ENOUGH_DATA
  currentTime: 7.5,
};

describe('isVideoAdvancing', () => {
  it('is false when no video element exists', () => {
    expect(isVideoAdvancing(null)).toBe(false);
  });

  it('is false when the video is mounted but paused/stalled', () => {
    expect(isVideoAdvancing(stalledVideo)).toBe(false);
  });

  it('is false when readyState has no frames yet', () => {
    expect(isVideoAdvancing({ ...playingVideo, readyState: 1 })).toBe(false);
  });

  it('is true only when a real video is actually playing', () => {
    expect(isVideoAdvancing(playingVideo)).toBe(true);
  });
});

describe('nextPlayheadTime', () => {
  // REGRESSION: the static-caption bug. A video element existed but was not
  // advancing, and the old loop gated the synthetic clock on `!videoRef.current`
  // (element absence), so time froze at 0 and captions never moved. The clock
  // must advance whenever playback is requested, regardless of a stalled video.
  it('advances the synthetic clock when a video is mounted-but-stalled and playing', () => {
    const t = nextPlayheadTime({
      video: stalledVideo,
      isPlaying: true,
      prevTime: 1.0,
      dt: 0.5,
      maxTime: 10,
    });
    expect(t).toBeGreaterThan(1.0);
    expect(t).toBeCloseTo(1.5, 5);
  });

  it('advances the synthetic clock in pure black-screen mode (no video)', () => {
    const t = nextPlayheadTime({
      video: null,
      isPlaying: true,
      prevTime: 2.0,
      dt: 0.25,
      maxTime: 10,
    });
    expect(t).toBeCloseTo(2.25, 5);
  });

  it('follows the real video position when it is actually playing', () => {
    const t = nextPlayheadTime({
      video: playingVideo,
      isPlaying: true,
      prevTime: 0,
      dt: 0.5,
      maxTime: 10,
    });
    expect(t).toBe(7.5); // tracks video.currentTime, ignores synthetic advance
  });

  it('wraps the synthetic clock back to 0 past maxTime (looping preview)', () => {
    const t = nextPlayheadTime({
      video: null,
      isPlaying: true,
      prevTime: 9.9,
      dt: 0.5,
      maxTime: 10,
    });
    expect(t).toBe(0);
  });

  it('holds time steady when paused', () => {
    const t = nextPlayheadTime({
      video: stalledVideo,
      isPlaying: false,
      prevTime: 3.3,
      dt: 0.5,
      maxTime: 10,
    });
    expect(t).toBe(3.3);
  });
});
