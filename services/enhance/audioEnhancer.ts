// AudioEnhancer — client-side voice cleanup, zero external deps.
//
// v1 ships a real Web Audio noise-reduction chain (no WASM download required):
//   highpass (kill rumble/hum) -> low-shelf cut -> noise gate / downward expander
//   (via DynamicsCompressor tuned as an expander-ish gate) -> presence lift ->
//   de-ess/low-pass (tame hiss) -> makeup gain.
//
// It's structured so a future RNNoise WASM AudioWorklet can drop in as an extra
// node in buildChain() without touching callers (see plan §2, cherry-pick E3).
//
// Both the live preview path and the MediaRecorder export path can route their
// MediaElementSource through processNode() before the destination.

export interface AudioEnhanceOptions {
  /** Master on/off. When false, connect() is a passthrough. */
  enabled: boolean;
  /** 0..1 strength; scales gate aggressiveness and presence lift. */
  strength: number;
}

export const DEFAULT_AUDIO_OPTIONS: AudioEnhanceOptions = { enabled: true, strength: 0.7 };

export class AudioEnhancer {
  private ctx: AudioContext;
  private input: GainNode;
  private output: GainNode;
  private opts: AudioEnhanceOptions;
  private built = false;

  constructor(ctx: AudioContext, opts: AudioEnhanceOptions = DEFAULT_AUDIO_OPTIONS) {
    this.ctx = ctx;
    this.opts = opts;
    this.input = ctx.createGain();
    this.output = ctx.createGain();
    this.buildChain();
  }

  /** The node a source should connect INTO. */
  get inputNode(): AudioNode {
    return this.input;
  }
  /** The node that should connect OUT to a destination. */
  get outputNode(): AudioNode {
    return this.output;
  }

  setOptions(opts: Partial<AudioEnhanceOptions>) {
    this.opts = { ...this.opts, ...opts };
    // Rebuild so gain/gate constants reflect the new strength.
    this.disconnectInternal();
    this.buildChain();
  }

  private internalNodes: AudioNode[] = [];

  private disconnectInternal() {
    try {
      this.input.disconnect();
    } catch { /* noop */ }
    for (const n of this.internalNodes) {
      try { n.disconnect(); } catch { /* noop */ }
    }
    this.internalNodes = [];
  }

  private buildChain() {
    const ctx = this.ctx;

    if (!this.opts.enabled) {
      // Passthrough.
      this.input.connect(this.output);
      this.internalNodes = [];
      this.built = true;
      return;
    }

    const s = Math.max(0, Math.min(1, this.opts.strength));

    // 1. High-pass: remove low-frequency rumble, AC hum, handling noise.
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 85;
    hp.Q.value = 0.7;

    // 2. Low-shelf cut: trim boominess.
    const lowShelf = ctx.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 200;
    lowShelf.gain.value = -3 * s;

    // 3. Notch around mains hum (50/60Hz handled by HP; add a 120Hz harmonic notch).
    const hum = ctx.createBiquadFilter();
    hum.type = 'notch';
    hum.frequency.value = 120;
    hum.Q.value = 8;

    // 4. Downward gate via a compressor configured to clamp low-level noise.
    //    Higher strength -> higher threshold and ratio -> more aggressive gating.
    const gate = ctx.createDynamicsCompressor();
    gate.threshold.value = -45 + s * 15; // -45..-30 dB
    gate.knee.value = 6;
    gate.ratio.value = 3 + s * 6; // 3..9
    gate.attack.value = 0.003;
    gate.release.value = 0.18;

    // 5. Presence lift: intelligibility around 3-5kHz.
    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 4000;
    presence.Q.value = 1.0;
    presence.gain.value = 3 * s;

    // 6. De-ess / hiss tame: gentle low-pass above speech sibilance.
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 14000 - s * 3000; // 14k..11k
    lp.Q.value = 0.7;

    // 7. Makeup gain to compensate for the gate/shelf cuts.
    const makeup = ctx.createGain();
    makeup.gain.value = 1 + s * 0.25;

    // Wire: input -> hp -> lowShelf -> hum -> gate -> presence -> lp -> makeup -> output
    this.input.connect(hp);
    hp.connect(lowShelf);
    lowShelf.connect(hum);
    hum.connect(gate);
    gate.connect(presence);
    presence.connect(lp);
    lp.connect(makeup);
    makeup.connect(this.output);

    this.internalNodes = [hp, lowShelf, hum, gate, presence, lp, makeup];
    this.built = true;
  }

  isEnabled(): boolean {
    return this.opts.enabled;
  }
}

/**
 * Convenience: insert an AudioEnhancer between a source node and a destination.
 * Returns the enhancer so the caller can toggle it. Falls back to a direct
 * connection (and returns null) if the Web Audio graph throws.
 */
export function insertAudioEnhancer(
  ctx: AudioContext,
  source: AudioNode,
  destination: AudioNode,
  opts: AudioEnhanceOptions = DEFAULT_AUDIO_OPTIONS
): AudioEnhancer | null {
  try {
    if (!opts.enabled) {
      source.connect(destination);
      return null;
    }
    const enh = new AudioEnhancer(ctx, opts);
    source.connect(enh.inputNode);
    enh.outputNode.connect(destination);
    return enh;
  } catch (e) {
    console.warn('[AudioEnhancer] insert failed, passing audio through:', e);
    try { source.connect(destination); } catch { /* noop */ }
    return null;
  }
}
