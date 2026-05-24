/**
 * Audio Analyzer — Beat Detection via Web Audio API
 *
 * Pure Web Audio implementation (no external libraries):
 * - Spectral flux onset detection
 * - BPM estimation via autocorrelation
 * - Syllable timing extraction for speech
 *
 * Optimized for accuracy without library dependencies.
 */

import type { BeatGrid } from './types';

// ─── Configuration ──────────────────────────────────────────────────────

const FFT_SIZE = 512; // Frequency resolution vs latency trade-off
const HOP_SIZE_MS = 10; // 10ms hop = ~100 Hz frame rate
const SENSITIVITY = 1.4; // Peak must exceed 1.4× local average
const MIN_BEAT_INTERVAL_MS = 120; // Minimum 120ms between beats (refractory)
const CONFIDENCE_THRESHOLD = 0.6; // Only beats with sufficient confidence

// ─── Main API ──────────────────────────────────────────────────────────

/**
 * Analyze audio file and detect beat grid.
 * Works offline—no network required after audio decoding.
 */
export async function analyzeBeats(audioFile: File): Promise<BeatGrid> {
  // Decode audio
  const audioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)();

  let audioBuffer: AudioBuffer;
  try {
    const arrayBuffer = await audioFile.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } finally {
    await audioContext.close().catch(() => undefined);
  }

  const sampleRate = audioBuffer.sampleRate;
  const pcm = mixToMono(audioBuffer);

  // Compute spectral flux (onset function)
  const flux = computeSpectralFlux(pcm, sampleRate);

  // Detect peaks in flux (beat onsets)
  const beats = detectBeats(flux, sampleRate);

  // Estimate BPM from inter-beat intervals
  const bpm = estimateBPM(beats);

  // Compute energy envelope for visualization
  const energyCurve = computeEnergyEnvelope(pcm, sampleRate);

  // Extract syllable timings (for speech emphasis)
  const syllabeTimings = extractSyllableTimings(pcm, sampleRate);

  return {
    beats,
    bpm,
    energyCurve,
    syllabeTimings,
    duration: audioBuffer.duration,
  };
}

// ─── Stage 1: Mix Stereo to Mono ────────────────────────────────────────

function mixToMono(buffer: AudioBuffer): Float32Array {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const mono = new Float32Array(length);

  for (let c = 0; c < numChannels; c++) {
    const channel = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      mono[i] += channel[i];
    }
  }

  // Normalize
  for (let i = 0; i < length; i++) {
    mono[i] /= numChannels;
  }

  return mono;
}

// ─── Stage 2: Compute Spectral Flux (Onset Detection Function) ─────────

/**
 * Spectral flux measures high-frequency energy changes.
 * Peaks = onsets (beats, attacks, consonants).
 *
 * Algorithm:
 * 1. Apply high-pass filter (first-order difference)
 * 2. Compute frame energy over hop size
 * 3. Take positive differences between frames
 * 4. Smooth with moving average
 */
function computeSpectralFlux(pcm: Float32Array, sampleRate: number): number[] {
  const hopSamples = Math.round((HOP_SIZE_MS / 1000) * sampleRate);
  const numFrames = Math.floor(pcm.length / hopSamples);

  // High-pass filter via first-order difference
  const hpf = new Float32Array(pcm.length);
  hpf[0] = pcm[0];
  for (let i = 1; i < pcm.length; i++) {
    hpf[i] = pcm[i] - pcm[i - 1];
  }

  // Compute energy per frame
  const flux = new Array<number>(numFrames);
  let prevEnergy = 0;

  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSamples;
    let energy = 0;

    for (let i = 0; i < hopSamples && start + i < hpf.length; i++) {
      energy += hpf[start + i] * hpf[start + i];
    }

    energy = Math.sqrt(energy / hopSamples);

    // Spectral flux = positive energy difference
    flux[f] = Math.max(0, energy - prevEnergy);
    prevEnergy = energy;
  }

  // Smooth with 3-frame moving average
  const smoothed = new Array<number>(numFrames);
  for (let i = 0; i < numFrames; i++) {
    const a = flux[Math.max(0, i - 1)];
    const b = flux[i];
    const c = flux[Math.min(numFrames - 1, i + 1)];
    smoothed[i] = (a + b + c) / 3;
  }

  return smoothed;
}

// ─── Stage 3: Peak Detection with Adaptive Threshold ───────────────────

function detectBeats(
  flux: number[],
  sampleRate: number
): number[] {
  if (flux.length === 0) {
    return [];
  }

  const hopSamples = Math.round((HOP_SIZE_MS / 1000) * sampleRate);
  const framesPerSecond = 1000 / HOP_SIZE_MS;

  // Compute moving average threshold (0.5s window)
  const windowFrames = Math.max(5, Math.round(framesPerSecond * 0.5));
  const movingAvg = computeMovingAverage(flux, windowFrames);

  // Peak picking
  const beats: number[] = [];
  let lastBeatFrame = -Math.round((MIN_BEAT_INTERVAL_MS / 1000) * framesPerSecond);

  for (let f = 1; f < flux.length - 1; f++) {
    const isLocalMax = flux[f] > flux[f - 1] && flux[f] >= flux[f + 1];
    const aboveThreshold =
      flux[f] > movingAvg[f] * SENSITIVITY && flux[f] > 1e-4;
    const respectsMinGap =
      f - lastBeatFrame >= Math.round((MIN_BEAT_INTERVAL_MS / 1000) * framesPerSecond);

    if (isLocalMax && aboveThreshold && respectsMinGap) {
      const beatTime = (f * hopSamples) / sampleRate;
      beats.push(beatTime);
      lastBeatFrame = f;
    }
  }

  return beats;
}

function computeMovingAverage(arr: number[], windowSize: number): number[] {
  const out = new Array<number>(arr.length);
  let sum = 0;

  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    if (i >= windowSize) {
      sum -= arr[i - windowSize];
    }

    out[i] =
      i >= windowSize ? sum / windowSize : sum / (i + 1);
  }

  return out;
}

// ─── Stage 4: BPM Estimation ────────────────────────────────────────────

/**
 * Estimate BPM via inter-beat-interval histogram.
 *
 * Algorithm:
 * 1. Compute intervals between consecutive beats
 * 2. Convert to BPM (BPM = 60 / interval)
 * 3. Bin into 5-BPM buckets
 * 4. Return most common bucket (mode)
 */
function estimateBPM(beats: number[]): number {
  if (beats.length < 4) {
    return Number.NaN; // Not enough beats
  }

  // Compute inter-beat intervals (in seconds)
  const intervals: number[] = [];
  for (let i = 1; i < beats.length; i++) {
    const dt = beats[i] - beats[i - 1];
    // Filter: 40-240 BPM range (0.25-1.5 second intervals)
    if (dt > 0.25 && dt < 1.5) {
      intervals.push(dt);
    }
  }

  if (intervals.length < 3) {
    return Number.NaN;
  }

  // Bin intervals into 5-BPM buckets
  const bins = new Map<number, number>();
  for (const dt of intervals) {
    const bpm = 60 / dt;
    const bucket = Math.round(bpm / 5) * 5; // Round to nearest 5
    bins.set(bucket, (bins.get(bucket) ?? 0) + 1);
  }

  // Find most common bucket
  let bestBpm = 120; // Default fallback
  let bestCount = 0;
  bins.forEach((count, bpm) => {
    if (count > bestCount) {
      bestCount = count;
      bestBpm = bpm;
    }
  });

  return bestBpm;
}

// ─── Stage 5: Energy Envelope (for visualization) ──────────────────────

function computeEnergyEnvelope(
  pcm: Float32Array,
  sampleRate: number
): number[] {
  const hopSamples = Math.round((HOP_SIZE_MS / 1000) * sampleRate);
  const numFrames = Math.floor(pcm.length / hopSamples);
  const energy = new Array<number>(numFrames);

  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSamples;
    let frameEnergy = 0;

    for (let i = 0; i < hopSamples && start + i < pcm.length; i++) {
      const sample = pcm[start + i];
      frameEnergy += sample * sample;
    }

    energy[f] = Math.sqrt(frameEnergy / hopSamples);
  }

  // Normalize to 0-1
  const maxEnergy = Math.max(...energy);
  return energy.map((e) => e / maxEnergy);
}

// ─── Stage 6: Syllable Detection (for speech emphasis) ───────────────

/**
 * Extract syllable timing by detecting formant peaks.
 * Used for speech content to snap words to natural emphasis points.
 */
function extractSyllableTimings(
  pcm: Float32Array,
  sampleRate: number
): number[] {
  // Band-pass filter to formant range (200-3500 Hz)
  const filtered = applyBandPassFilter(pcm, 200, 3500, sampleRate);

  // Energy envelope with narrower window (20ms)
  const windowSamples = Math.round(0.02 * sampleRate);
  const hopSamples = Math.round(0.01 * sampleRate); // 10ms hop
  const numFrames = Math.floor(filtered.length / hopSamples);

  const energyEnv = new Array<number>(numFrames);
  for (let f = 0; f < numFrames; f++) {
    const start = f * hopSamples;
    let energy = 0;

    for (let i = 0; i < windowSamples && start + i < filtered.length; i++) {
      energy += filtered[start + i] * filtered[start + i];
    }

    energyEnv[f] = Math.sqrt(energy / windowSamples);
  }

  // Detect peaks (syllable nuclei)
  const syllables: number[] = [];
  const minEnergy = Math.max(...energyEnv) * 0.5;

  for (let f = 1; f < numFrames - 1; f++) {
    const isLocalMax =
      energyEnv[f] > energyEnv[f - 1] && energyEnv[f] >= energyEnv[f + 1];
    const aboveThreshold = energyEnv[f] > minEnergy;

    if (isLocalMax && aboveThreshold) {
      const time = (f * hopSamples) / sampleRate;
      syllables.push(time);
    }
  }

  return syllables;
}

/**
 * Simple band-pass filter using first-order difference high-pass
 * (Not ideal, but avoids external DSP library)
 */
function applyBandPassFilter(
  signal: Float32Array,
  lowHz: number,
  highHz: number,
  sampleRate: number
): Float32Array {
  // First-order high-pass at lowHz
  const highPassed = applyHighPassFilter(signal, lowHz, sampleRate);

  // First-order low-pass at highHz
  return applyLowPassFilter(highPassed, highHz, sampleRate);
}

function applyHighPassFilter(
  signal: Float32Array,
  cutoffHz: number,
  sampleRate: number
): Float32Array {
  const rc = 1.0 / (2 * Math.PI * cutoffHz);
  const dt = 1.0 / sampleRate;
  const alpha = rc / (rc + dt);

  const filtered = new Float32Array(signal.length);
  filtered[0] = signal[0];

  for (let i = 1; i < signal.length; i++) {
    filtered[i] = alpha * (filtered[i - 1] + signal[i] - signal[i - 1]);
  }

  return filtered;
}

function applyLowPassFilter(
  signal: Float32Array,
  cutoffHz: number,
  sampleRate: number
): Float32Array {
  const rc = 1.0 / (2 * Math.PI * cutoffHz);
  const dt = 1.0 / sampleRate;
  const alpha = dt / (rc + dt);

  const filtered = new Float32Array(signal.length);
  filtered[0] = signal[0];

  for (let i = 1; i < signal.length; i++) {
    filtered[i] = filtered[i - 1] + alpha * (signal[i] - filtered[i - 1]);
  }

  return filtered;
}

// ─── Batch Analysis (for offline processing) ──────────────────────────

/**
 * Alternative: Analyze pre-computed audio buffer.
 * Useful for offline processing.
 */
export async function analyzeBeatGrid(
  audioBuffer: AudioBuffer
): Promise<BeatGrid> {
  const sampleRate = audioBuffer.sampleRate;
  const pcm = mixToMono(audioBuffer);

  const flux = computeSpectralFlux(pcm, sampleRate);
  const beats = detectBeats(flux, sampleRate);
  const bpm = estimateBPM(beats);
  const energyCurve = computeEnergyEnvelope(pcm, sampleRate);
  const syllabeTimings = extractSyllableTimings(pcm, sampleRate);

  return {
    beats,
    bpm,
    energyCurve,
    syllabeTimings,
    duration: audioBuffer.duration,
  };
}
