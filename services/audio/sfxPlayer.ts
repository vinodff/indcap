// SfxPlayer — plays an SfxTrack of real sound-effect samples.
//
// Two paths:
//   PREVIEW: tick(currentTime) is called from the app's RAF loop; cues are
//            scheduled just-ahead of the playhead. Voice-ducking is applied on a
//            shared bus from a precomputed energy envelope.
//   EXPORT:  renderOffline() pre-mixes the whole track (with ducking) into one
//            AudioBuffer at a target sample rate, for the export graph to play
//            into the MediaRecorder stream. See App.handleExportWithOptions.
//
// Graph:  source ─▶ cueGain ─▶ [duckBus | masterGain] ─▶ masterGain ─▶ destination
//   ducked cues (whoosh/texture) route through duckBus; risers/hits bypass it.

import { getAsset } from './sfxLibrary';
import type { SfxTrack, SfxCue } from './soundDesign/types';

const SCHED_AHEAD = 0.12;     // schedule cues up to this far in the future (sec)
const SCHED_LATE = 0.10;      // don't fire cues older than this (post-seek safety)
const DUCK_DEPTH = 0.6;       // duck to (1 - DEPTH) under loud voice
const MAX_CACHE = 48;

export class SfxPlayer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private duckBus: GainNode | null = null;
  private cache = new Map<string, AudioBuffer>();
  private active = new Set<AudioBufferSourceNode>();

  private track: SfxTrack = [];
  private ptr = 0;
  private lastT = 0;

  private energy?: number[];
  private energyHz = 100;
  private energyMax = 1;
  private volume = 0.7;
  private duckEnabled = true;

  private ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.duckBus = this.ctx.createGain();
      this.duckBus.gain.value = 1;
      this.duckBus.connect(this.masterGain);
    } catch (e) {
      console.error('[SfxPlayer] AudioContext init failed:', e);
      this.ctx = null;
    }
    return this.ctx;
  }

  getContext(): AudioContext | null { return this.ensureCtx(); }

  resume(): void {
    const ctx = this.ensureCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
    }
  }

  setDuckEnabled(on: boolean): void { this.duckEnabled = on; }

  setDuckEnvelope(energy?: number[], energyHz = 100): void {
    this.energy = energy;
    this.energyHz = energyHz || 100;
    this.energyMax = energy && energy.length ? Math.max(1e-6, ...energy) : 1;
  }

  /** Normalized voice energy [0..1] at time t. */
  private energyAt(t: number): number {
    if (!this.energy || !this.energy.length) return 0;
    const i = Math.floor(t * this.energyHz);
    if (i < 0 || i >= this.energy.length) return 0;
    return Math.min(1, this.energy[i] / this.energyMax);
  }

  /** Decode + cache every distinct asset used by a track. Safe to call repeatedly. */
  async loadTrack(track: SfxTrack): Promise<void> {
    this.track = [...track].sort((a, b) => a.time - b.time);
    this.ptr = 0;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const ids = Array.from(new Set(track.map((c) => c.assetId)));
    await Promise.all(ids.map((id) => this.decode(id, ctx)));
  }

  private async decode(assetId: string, ctx: BaseAudioContext): Promise<AudioBuffer | null> {
    if (this.cache.has(assetId)) {
      const b = this.cache.get(assetId)!;
      this.cache.delete(assetId); this.cache.set(assetId, b); // LRU bump
      return b;
    }
    const asset = getAsset(assetId);
    if (!asset) return null;
    try {
      const res = await fetch(asset.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);
      if (this.cache.size >= MAX_CACHE) {
        const oldest = this.cache.keys().next().value as string | undefined;
        if (oldest) this.cache.delete(oldest);
      }
      this.cache.set(assetId, decoded);
      return decoded;
    } catch (e) {
      console.warn(`[SfxPlayer] decode failed for ${asset.name}:`, e);
      return null;
    }
  }

  /** Reset the schedule pointer to the first cue at/after a (seeked) time. */
  resetSchedule(currentTime: number): void {
    this.lastT = currentTime;
    let lo = 0, hi = this.track.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.track[mid].time < currentTime - SCHED_LATE) lo = mid + 1;
      else hi = mid;
    }
    this.ptr = lo;
  }

  /** Preview scheduler — call once per animation frame while playing. */
  tick(currentTime: number, isPlaying: boolean): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain || !this.duckBus) return;
    if (!isPlaying) { this.lastT = currentTime; return; }

    // Seek backwards → re-find pointer.
    if (currentTime < this.lastT - 0.05) this.resetSchedule(currentTime);
    this.lastT = currentTime;

    // Voice ducking on the shared bus.
    const duck = this.duckEnabled ? 1 - DUCK_DEPTH * this.energyAt(currentTime) : 1;
    this.duckBus.gain.setTargetAtTime(duck, ctx.currentTime, 0.08);

    // Fire all cues that fall inside the lookahead window.
    while (this.ptr < this.track.length && this.track[this.ptr].time <= currentTime + SCHED_AHEAD) {
      const cue = this.track[this.ptr];
      this.ptr++;
      if (cue.muted) continue;                           // user-silenced — keep on timeline, don't play
      if (cue.time < currentTime - SCHED_LATE) continue; // skipped past (seek)
      const when = ctx.currentTime + Math.max(0, cue.time - currentTime);
      this.playCue(cue, when);
    }
  }

  private playCue(cue: SfxCue, when: number): void {
    const ctx = this.ctx!;
    const buf = this.cache.get(cue.assetId);
    if (!buf) return; // not decoded (missing/failed) — skip silently
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = cue.gain;
    src.connect(g);
    g.connect(cue.duck && this.duckEnabled ? this.duckBus! : this.masterGain!);
    src.start(when);
    this.active.add(src);
    src.onended = () => { this.active.delete(src); };
  }

  /** Audition one cue right now (ignores mute) — for the timeline edit popover. */
  async previewCue(cue: SfxCue): Promise<void> {
    const ctx = this.ensureCtx();
    if (!ctx || !this.masterGain) return;
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch { /* gesture needed */ } }
    let buf = this.cache.get(cue.assetId);
    if (!buf) buf = (await this.decode(cue.assetId, ctx)) ?? undefined;
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = cue.gain;
    src.connect(g);
    g.connect(this.masterGain);
    src.start();
    this.active.add(src);
    src.onended = () => { this.active.delete(src); };
  }

  stopAll(): void {
    for (const s of this.active) { try { s.stop(); } catch { /* already stopped */ } }
    this.active.clear();
  }

  /**
   * Pre-render the whole track (with ducking) to one AudioBuffer at `sampleRate`.
   * Used by export so SFX bake into the recorded file with deterministic timing.
   * Reuses already-decoded buffers (AudioBuffers are context-independent).
   */
  async renderOffline(track: SfxTrack, durationSec: number, sampleRate: number): Promise<AudioBuffer | null> {
    if (!track.length || durationSec <= 0) return null;
    const length = Math.ceil((durationSec + 1.5) * sampleRate); // tail room for long risers
    const offline = new OfflineAudioContext(2, length, sampleRate);

    // Ensure every asset is decoded (decode against offline ctx if not cached).
    const ids = Array.from(new Set(track.map((c) => c.assetId)));
    await Promise.all(ids.map((id) => this.decode(id, offline)));

    const master = offline.createGain();
    master.gain.value = this.volume;
    master.connect(offline.destination);
    const duckBus = offline.createGain();
    duckBus.connect(master);

    // Bake the duck envelope as scheduled automation.
    if (this.duckEnabled && this.energy && this.energy.length) {
      const step = 0.05;
      for (let t = 0; t < durationSec; t += step) {
        const d = 1 - DUCK_DEPTH * this.energyAt(t);
        duckBus.gain.setValueAtTime(d, t);
      }
    } else {
      duckBus.gain.value = 1;
    }

    for (const cue of track) {
      if (cue.muted) continue; // user-silenced — exclude from the baked mix
      const buf = this.cache.get(cue.assetId);
      if (!buf) continue;
      const src = offline.createBufferSource();
      src.buffer = buf;
      const g = offline.createGain();
      g.gain.value = cue.gain;
      src.connect(g);
      g.connect(cue.duck && this.duckEnabled ? duckBus : master);
      try { src.start(cue.time); } catch { /* out of range */ }
    }

    try {
      return await offline.startRendering();
    } catch (e) {
      console.warn('[SfxPlayer] offline render failed:', e);
      return null;
    }
  }

  destroy(): void {
    this.stopAll();
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; }
    this.masterGain = null;
    this.duckBus = null;
    this.cache.clear();
  }
}
