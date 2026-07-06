import React from 'react';
import { Sparkles, Wand2, Loader2, Check, Gauge, RotateCcw, SlidersHorizontal } from 'lucide-react';
import type { EnhanceParams, QualityResult, SceneType } from '../services/enhance/types';
import { PLATFORM_LIST, type SocialTarget } from '../services/enhance/exportPresets';

interface StudioModePanelProps {
  hasVideo: boolean;
  analyzing: boolean;
  supported: boolean;
  /** 'webgl' = full (incl. face-local), '2d' = global filters fallback. */
  mode: 'webgl' | '2d' | 'none';
  scene: SceneType | null;
  before: QualityResult | null;
  after: QualityResult | null;
  active: boolean;
  onToggle: (next: boolean) => void;
  comparePos: number;
  onComparePos: (v: number) => void;
  /** Live adjustable params + change handler (manual fine-tuning). */
  params: EnhanceParams | null;
  onParamsChange: (p: EnhanceParams) => void;
  onResetParams: () => void;
  audioEnabled: boolean;
  onAudioToggle: (next: boolean) => void;
  onPickPlatform: (target: SocialTarget) => void;
  activePlatform: SocialTarget | null;
}

const SCENE_LABEL: Record<SceneType, string> = {
  indoor: 'Indoor', outdoor: 'Outdoor', night: 'Night / low light',
  gaming: 'Gaming / screen', podcast: 'Talking head', educational: 'Slides / lesson',
  generic: 'General',
};

const scoreColor = (s: number) => (s >= 80 ? '#22c55e' : s >= 55 ? '#eab308' : '#ef4444');

const ScoreRing: React.FC<{ value: number | null; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center gap-1">
    <div
      className="relative flex h-16 w-16 items-center justify-center rounded-full"
      style={{
        background: value == null
          ? 'conic-gradient(#334155 0deg, #334155 360deg)'
          : `conic-gradient(${scoreColor(value)} ${value * 3.6}deg, #1e293b ${value * 3.6}deg)`,
      }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white">
        {value == null ? '—' : value}
      </div>
    </div>
    <span className="text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
  </div>
);

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  hint?: string;
  display?: (v: number) => string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, disabled, hint, display, onChange }) => (
  <div className={disabled ? 'opacity-40' : ''}>
    <div className="flex items-center justify-between text-[11px] text-slate-300">
      <span>{label}{hint && <span className="ml-1 text-slate-500">{hint}</span>}</span>
      <span className="tabular-nums text-slate-400">{display ? display(value) : value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="mt-1 w-full accent-blue-500"
    />
  </div>
);

const pct = (v: number) => `${Math.round(v * 100)}%`;

/**
 * Studio Mode panel: auto-analyze + one-tap enhance + FULL manual adjustments
 * (brightness, contrast, saturation, warmth, denoise, sharpen, face, skin) +
 * audio cleanup + per-platform export. Works on every browser: the WebGL2 pass
 * when available, a 2D-canvas filter fallback otherwise.
 */
const StudioModePanel: React.FC<StudioModePanelProps> = ({
  hasVideo, analyzing, supported, mode, scene, before, after, active, onToggle,
  comparePos, onComparePos, params, onParamsChange, onResetParams,
  audioEnabled, onAudioToggle, onPickPlatform, activePlatform,
}) => {
  if (!hasVideo) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-4 text-sm text-slate-400">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Sparkles size={16} className="text-[var(--cc-blue-light)]" /> Studio Mode
        </div>
        <p className="mt-2">Upload a video and AI will auto-analyze it for one-tap enhancement.</p>
      </div>
    );
  }

  const delta = before && after ? after.score - before.score : null;
  const set = (patch: Partial<EnhanceParams>) => {
    if (params) onParamsChange({ ...params, ...patch });
  };
  // Face retouch now works in BOTH webgl (PRO) and 2D (LITE, frequency-separation)
  // — only truly unavailable if there's no enhancement path at all.
  const faceDisabled = mode === 'none';

  return (
    <div className="rounded-xl border border-[var(--cc-border-mid)] bg-[var(--cc-surface-3)]/95 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-slate-100">
          <Sparkles size={16} className="text-[var(--cc-blue-light)]" /> Studio Mode
        </div>
        <div className="flex items-center gap-1.5">
          {scene && !analyzing && (
            <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-[11px] text-slate-300">
              {SCENE_LABEL[scene]}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${mode === 'webgl' ? 'bg-[var(--cc-blue-dim)] text-[var(--cc-blue-light)]' : 'bg-white/10 text-slate-400'}`}
            title={mode === 'webgl' ? 'Full GPU pass incl. face-local enhancement' : 'Lite mode: global adjustments (no face-local pass) — your GPU/browser lacks WebGL2'}
          >
            {mode === 'webgl' ? 'PRO' : 'LITE'}
          </span>
        </div>
      </div>

      {analyzing ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
          <Loader2 size={16} className="animate-spin text-[var(--cc-blue-light)]" />
          Analyzing footage…
        </div>
      ) : (
        <>
          {/* Score readout */}
          <div className="mt-4 flex items-center justify-around">
            <ScoreRing value={before?.score ?? null} label="Before" />
            <div className="flex flex-col items-center text-slate-400">
              <Gauge size={18} />
              {delta != null && (
                <span className="mt-1 text-sm font-bold" style={{ color: delta >= 0 ? '#22c55e' : '#ef4444' }}>
                  {delta >= 0 ? '+' : ''}{delta}
                </span>
              )}
            </div>
            <ScoreRing value={active ? after?.score ?? null : null} label="After" />
          </div>

          {/* Before/after compare wipe */}
          {active && (
            <div className="mt-4">
              <label className="text-[11px] uppercase tracking-wide text-slate-400">Before / After compare</label>
              <input
                type="range" min={0} max={100} value={Math.round(comparePos * 100)}
                onChange={(e) => onComparePos(Number(e.target.value) / 100)}
                className="mt-1 w-full accent-blue-500"
              />
            </div>
          )}

          {/* Apply toggle */}
          <button
            onClick={() => onToggle(!active)}
            className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              active ? 'bg-[var(--cc-blue)] text-white hover:bg-blue-500' : 'bg-slate-700 text-slate-100 hover:bg-slate-600'
            }`}
          >
            {active ? <Check size={16} /> : <Wand2 size={16} />}
            {active ? 'Studio Mode On' : 'Apply Studio Mode'}
          </button>

          {/* Manual adjustments — every enhancement as a slider */}
          {params && (
            <div className="mt-4 rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-300">
                  <SlidersHorizontal size={13} className="text-[var(--cc-blue-light)]" /> Adjustments
                </div>
                <button
                  onClick={onResetParams}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-slate-700/60 hover:text-slate-200"
                  title="Reset to AI auto values"
                >
                  <RotateCcw size={11} /> Auto
                </button>
              </div>
              <div className="mt-3 space-y-3">
                <Slider label="Brightness" value={params.exposure} min={-1} max={1} step={0.02}
                  display={(v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`}
                  onChange={(v) => set({ exposure: v })} />
                <Slider label="Contrast" value={params.contrast} min={0.5} max={1.8} step={0.02}
                  display={pct} onChange={(v) => set({ contrast: v })} />
                <Slider label="Saturation" value={params.saturation} min={0} max={2} step={0.02}
                  display={pct} onChange={(v) => set({ saturation: v })} />
                <Slider label="Warmth" value={params.temperature} min={-1} max={1} step={0.02}
                  display={(v) => (v === 0 ? 'neutral' : v > 0 ? `warm ${Math.round(v * 100)}` : `cool ${Math.round(-v * 100)}`)}
                  onChange={(v) => set({ temperature: v })} />
                <Slider label="Denoise" value={params.denoise} min={0} max={1} step={0.02}
                  display={pct} onChange={(v) => set({ denoise: v })} />
                <Slider label="Sharpen" value={params.sharpen} min={0} max={2} step={0.02}
                  hint={faceDisabled ? '' : ''} display={(v) => v.toFixed(2)}
                  onChange={(v) => set({ sharpen: v })} />
                <Slider label="Face enhance" value={params.faceSharpen} min={0} max={1} step={0.02}
                  disabled={faceDisabled} display={pct}
                  onChange={(v) => set({ faceSharpen: v })} />
                <Slider label="Skin smooth" value={params.skinSmooth} min={0} max={1} step={0.02}
                  disabled={faceDisabled} display={pct}
                  onChange={(v) => set({ skinSmooth: v })} />
                <Slider label="Studio lighting" value={params.relight} min={0} max={1} step={0.02}
                  hint="fill + key + separation" display={pct}
                  onChange={(v) => set({ relight: v })} />
              </div>
              <p className="mt-2 text-[10px] leading-snug text-slate-500">
                Face retouch (frequency-separation skin smoothing) applies automatically when a face is detected — works in {mode === 'webgl' ? 'PRO (GPU)' : 'LITE (CPU)'} mode.
              </p>
            </div>
          )}

          {/* Audio cleanup */}
          <label className="mt-3 flex items-center justify-between text-sm text-slate-300">
            <span>AI audio cleanup</span>
            <button
              onClick={() => onAudioToggle(!audioEnabled)}
              className={`relative h-5 w-9 rounded-full transition ${audioEnabled ? 'bg-[var(--cc-blue)]' : 'bg-slate-600'}`}
              aria-pressed={audioEnabled}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${audioEnabled ? 'left-4' : 'left-0.5'}`} />
            </button>
          </label>

          {/* Platform export presets */}
          <div className="mt-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Optimize export for</div>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {PLATFORM_LIST.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPickPlatform(p.id)}
                  title={p.note}
                  className={`rounded-md px-2 py-1.5 text-[11px] font-medium transition ${
                    activePlatform === p.id ? 'bg-[var(--cc-blue)] text-white' : 'bg-slate-700/70 text-slate-200 hover:bg-slate-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudioModePanel;
