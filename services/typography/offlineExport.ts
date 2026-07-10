/**
 * Offline (non-realtime) MP4 export for typography reels.
 *
 * Why this exists: the old path recorded the LIVE preview with
 * canvas.captureStream + MediaRecorder. That bakes every GC pause, heavy
 * frame, and background-tab throttle into the file as frozen frames, starts
 * the audio track with a race-dependent offset, and emits fragmented
 * variable-frame-rate output many players reject. Unfixable by tuning — the
 * architecture records the wall clock.
 *
 * This path exploits the one property we already guarantee: the renderer is a
 * pure function of playbackTime. So we render every frame at its exact
 * timestamp (no realtime constraint), hardware-encode with WebCodecs
 * (H.264 + AAC), and mux a real seekable constant-frame-rate MP4:
 *
 *   frames:  render(t=i/fps) → VideoFrame(timestamp=i/fps) → VideoEncoder
 *   audio:   voice buffer + per-word SFX mixed in an OfflineAudioContext
 *            (sample-accurate — triggers are the words' own startTimes)
 *   mux:     mp4-muxer, fastStart in-memory (moov up front, instant playback)
 *
 * Callers must feature-check with supportsOfflineExport() and fall back to
 * the legacy realtime path when WebCodecs is unavailable.
 */

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import type { AnimationSequence } from './types';
import { TypographyRenderer } from './typographyRenderer';
import type { TypographyReelImageIntegration } from '../imageAssets';

export interface OfflineExportOptions {
  sequence: AnimationSequence;
  /** Decoded narration. Omit for silent/SFX-only export. */
  voiceAudio?: AudioBuffer;
  imageAssets?: TypographyReelImageIntegration[];
  fps?: number;
  videoBitsPerSecond?: number;
  onProgress?: (t01: number) => void;
  signal?: AbortSignal;
}

export interface OfflineExportResult {
  blob: Blob;
  extension: 'mp4';
}

const SAMPLE_RATE = 48_000;
const AUDIO_CHUNK_FRAMES = 4800; // 100ms per AudioData — comfortable for AAC's 1024-frame windows

export const supportsOfflineExport = (): boolean =>
  typeof VideoEncoder !== 'undefined' &&
  typeof AudioEncoder !== 'undefined' &&
  typeof VideoFrame !== 'undefined';

// ─── Audio: voice + SFX mixed offline ───────────────────────────────────────

/**
 * Recreates SoundEngine's pop/whoosh synths (services/soundEngine.ts) inside
 * an OfflineAudioContext at each word's startTime — the same trigger rule the
 * preview RAF loop uses, but sample-accurate instead of "whenever the frame
 * happened to fire".
 */
function scheduleSfx(ctx: OfflineAudioContext, master: GainNode, sequence: AnimationSequence): void {
  // 1s white-noise buffer (matches SoundEngine's whoosh source)
  const noiseBuffer = ctx.createBuffer(1, SAMPLE_RATE, SAMPLE_RATE);
  const noise = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noise.length; i++) noise[i] = Math.random() * 2 - 1;

  const durationSec = ctx.length / ctx.sampleRate;
  for (const word of sequence.animations) {
    const t = word.startTime;
    if (!(t >= 0) || t >= durationSec) continue;

    const isHero = (word.style.fontSize || 0) >= 80 || word.intensity === 3;
    const isPop =
      word.type === 'pop-slide-up' || word.type === 'bounce-in' || word.type === 'scale-pop';

    if (isHero || isPop) {
      // playPop: 150→40Hz sine thump over 150ms
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.15);
    } else {
      // playWhoosh: lowpass-swept noise, 300ms
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(200, t);
      filter.frequency.linearRampToValueAtTime(800, t + 0.1);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start(t);
      src.stop(t + 0.3);
    }
  }
}

async function renderMixedAudio(
  sequence: AnimationSequence,
  durationSec: number,
  voiceAudio?: AudioBuffer
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.ceil(durationSec * SAMPLE_RATE), SAMPLE_RATE);

  if (voiceAudio) {
    const voice = ctx.createBufferSource();
    voice.buffer = voiceAudio; // OfflineAudioContext resamples as needed
    voice.connect(ctx.destination);
    voice.start(0);
  }

  // SoundEngine runs its masterGain at 0.3 — same balance here
  const sfxMaster = ctx.createGain();
  sfxMaster.gain.value = 0.3;
  sfxMaster.connect(ctx.destination);
  scheduleSfx(ctx, sfxMaster, sequence);

  return ctx.startRendering();
}

/** Interleaves an AudioBuffer into 100ms planar-f32 AudioData chunks. */
function* audioDataChunks(buffer: AudioBuffer): Generator<AudioData> {
  const channels = buffer.numberOfChannels;
  const chL = buffer.getChannelData(0);
  const chR = channels > 1 ? buffer.getChannelData(1) : chL;

  for (let offset = 0; offset < buffer.length; offset += AUDIO_CHUNK_FRAMES) {
    const frames = Math.min(AUDIO_CHUNK_FRAMES, buffer.length - offset);
    const planar = new Float32Array(frames * 2);
    planar.set(chL.subarray(offset, offset + frames), 0);
    planar.set(chR.subarray(offset, offset + frames), frames);
    yield new AudioData({
      format: 'f32-planar',
      sampleRate: buffer.sampleRate,
      numberOfFrames: frames,
      numberOfChannels: 2,
      timestamp: Math.round((offset / buffer.sampleRate) * 1_000_000),
      data: planar,
    });
  }
}

// ─── Codec negotiation ──────────────────────────────────────────────────────

/** High → Main → Baseline, all level 4.2 (covers 1080×1920@30). */
const H264_CANDIDATES = ['avc1.64002A', 'avc1.4D402A', 'avc1.42E02A'];

async function pickVideoConfig(
  width: number,
  height: number,
  fps: number,
  bitrate: number
): Promise<VideoEncoderConfig> {
  for (const codec of H264_CANDIDATES) {
    const config: VideoEncoderConfig = {
      codec,
      width,
      height,
      bitrate,
      framerate: fps,
      latencyMode: 'quality',
    };
    const support = await VideoEncoder.isConfigSupported(config);
    if (support.supported) return config;
  }
  throw new Error('No supported H.264 encoder configuration.');
}

// ─── Main export ────────────────────────────────────────────────────────────

export async function exportTypographyReelOffline(
  opts: OfflineExportOptions
): Promise<OfflineExportResult> {
  const {
    sequence,
    voiceAudio,
    imageAssets,
    fps = 30,
    videoBitsPerSecond = 12_000_000,
    onProgress,
    signal,
  } = opts;

  const durationSec = sequence.durationMs / 1000;
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error('Invalid export duration.');
  }
  const width = sequence.layout.width;
  const height = sequence.layout.height;
  const totalFrames = Math.max(1, Math.ceil(durationSec * fps));
  const throwIfAborted = () => {
    if (signal?.aborted) throw new Error('Export aborted.');
  };

  // 1) Audio first — cheap, and if the mix fails we bail before minutes of video encode
  const mixedAudio = await renderMixedAudio(sequence, durationSec, voiceAudio);
  throwIfAborted();

  // 2) Encoders + muxer. AAC preferred; Opus-in-MP4 as fallback (some
  //    platforms lack a platform AAC encoder); video-only as last resort.
  const videoConfig = await pickVideoConfig(width, height, fps, videoBitsPerSecond);

  let audioCodec: 'aac' | 'opus' | null = null;
  let audioConfig: AudioEncoderConfig | null = null;
  for (const candidate of [
    { mux: 'aac' as const, codec: 'mp4a.40.2' },
    { mux: 'opus' as const, codec: 'opus' },
  ]) {
    const cfg: AudioEncoderConfig = {
      codec: candidate.codec,
      sampleRate: SAMPLE_RATE,
      numberOfChannels: 2,
      bitrate: 128_000,
    };
    const support = await AudioEncoder.isConfigSupported(cfg).catch(() => ({ supported: false }));
    if (support.supported) {
      audioCodec = candidate.mux;
      audioConfig = cfg;
      break;
    }
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width, height, frameRate: fps },
    ...(audioCodec
      ? { audio: { codec: audioCodec, sampleRate: SAMPLE_RATE, numberOfChannels: 2 } }
      : {}),
    fastStart: 'in-memory', // moov up front — instant playback/seek everywhere
  });

  let encodeError: Error | null = null;
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      encodeError = e instanceof Error ? e : new Error(String(e));
    },
  });
  videoEncoder.configure(videoConfig);

  let audioEncoder: AudioEncoder | null = null;
  if (audioCodec && audioConfig) {
    audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => {
        encodeError = e instanceof Error ? e : new Error(String(e));
      },
    });
    audioEncoder.configure(audioConfig);
  }

  try {
    // 3) Video: fresh renderer on a detached canvas (preview untouched),
    //    sequential frames so stateful paths (linger, slate wipe) match playback
    const canvas = document.createElement('canvas');
    const renderer = new TypographyRenderer(canvas, sequence);
    if (imageAssets && imageAssets.length > 0) {
      await renderer.loadImageAssets(imageAssets);
    }

    const microsPerFrame = 1_000_000 / fps;
    for (let i = 0; i < totalFrames; i++) {
      throwIfAborted();
      if (encodeError) throw encodeError;

      renderer.render((i / fps) * 1000); // ms — pure timeline clock, no audio element
      const frame = new VideoFrame(canvas, {
        timestamp: Math.round(i * microsPerFrame),
        duration: Math.round(microsPerFrame),
      });
      // Keyframe every 2s — good seek granularity for editors/platforms
      videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();

      // Backpressure + keep the UI thread breathing
      if (videoEncoder.encodeQueueSize > 8 || i % 5 === 4) {
        await new Promise((r) => setTimeout(r, 0));
      }
      onProgress?.((i / totalFrames) * 0.9);
    }

    // 4) Audio chunks (timestamps computed from sample offsets — exact sync)
    if (audioEncoder) {
      for (const data of audioDataChunks(mixedAudio)) {
        audioEncoder.encode(data);
        data.close();
      }
    }

    await videoEncoder.flush();
    if (audioEncoder) await audioEncoder.flush();
    if (encodeError) throw encodeError;
    muxer.finalize();
    onProgress?.(1);

    return { blob: new Blob([target.buffer], { type: 'video/mp4' }), extension: 'mp4' };
  } finally {
    // Encoders hold hardware sessions — always release, even on abort/error
    if (videoEncoder.state !== 'closed') videoEncoder.close();
    if (audioEncoder && audioEncoder.state !== 'closed') audioEncoder.close();
  }
}
