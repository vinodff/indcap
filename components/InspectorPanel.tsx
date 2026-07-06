import React from 'react';
import { X, Camera, Music2, Film, Smile, Trash2, Volume2, VolumeX, RefreshCw, ToggleLeft, ToggleRight, Play } from 'lucide-react';
import type { Caption, StickerItem } from '../types';
import type { SfxCue } from '../services/audio/soundDesign/types';
import type { SfxVibe } from '../services/audio/soundDesign/palette';
import type { CameraKeyframe, CameraStyle } from '../services/camera';
import SfxControlPanel from './SfxControlPanel';
import { TRACK_META, type TimelineSelection } from './timeline/trackModel';

// CapCut-style contextual inspector. Renders the properties of whatever clip is
// selected on the timeline. Captions route to the Customize tab instead (handled
// in App), so this panel covers camera / sfx / b-roll / sticker objects.
export interface InspectorPanelProps {
  selection: TimelineSelection;
  onClose: () => void;

  // Camera
  cameraTrack: CameraKeyframe[];
  onDeleteCameraKeyframe?: (id: string) => void;
  cameraStyle: CameraStyle;
  setCameraStyle: (s: CameraStyle) => void;
  cameraIntensity: number;
  setCameraIntensity: (n: number) => void;
  cameraShake: number;
  setCameraShake: (n: number) => void;
  cameraMaxZoom: number;
  setCameraMaxZoom: (n: number) => void;
  cameraTrackFaces: boolean;
  setCameraTrackFaces: (b: boolean) => void;

  // SFX
  sfxTrack: SfxCue[];
  sfxVibe: SfxVibe;
  setSfxVibe: (v: SfxVibe) => void;
  sfxIntensity: number;
  setSfxIntensity: (n: number) => void;
  sfxVolume: 'LOW' | 'MED' | 'HIGH';
  setSfxVolume: (v: 'LOW' | 'MED' | 'HIGH') => void;
  onAdjustSfxCueGain?: (id: string, gain: number) => void;
  onToggleSfxCueMuted?: (id: string) => void;
  onSwapSfxCue?: (id: string, dir: 1 | -1) => void;
  onDeleteSfxCue?: (id: string) => void;
  onPreviewSfxCue?: (id: string) => void;

  // B-roll (per caption)
  captions: Caption[];
  onUpdateCaption: (id: string, updates: Partial<Caption>) => void;

  // Stickers
  stickers: StickerItem[];
  onUpdateSticker?: (id: string, updates: Partial<StickerItem>) => void;
  onRemoveSticker?: (id: string) => void;
}

const SENTIMENTS: { id: NonNullable<Caption['sentiment']>; label: string; emoji: string }[] = [
  { id: 'energetic', label: 'Energetic', emoji: '⚡' },
  { id: 'joyful', label: 'Joyful', emoji: '😊' },
  { id: 'calm', label: 'Calm', emoji: '🌊' },
  { id: 'serious', label: 'Serious', emoji: '🎯' },
];

const CAMERA_STYLES: [CameraStyle, string][] = [
  ['subtle', 'Subtle'], ['dynamic', 'Dynamic'], ['punchy', 'Punchy'],
  ['cinematic', 'Cinematic'], ['handheld', 'Handheld'],
];

const KIND_ICON: Record<TimelineSelection['kind'], React.ReactNode> = {
  caption: <Film size={13} />, camera: <Camera size={13} />, sfx: <Music2 size={13} />,
  broll: <Film size={13} />, sticker: <Smile size={13} />,
};

const Row: React.FC<{ label: string; value?: string; children: React.ReactNode }> = ({ label, value, children }) => (
  <label className="block">
    <div className="flex justify-between text-[10px] text-white/50 mb-1">
      <span className="uppercase tracking-wider">{label}</span>
      {value && <span className="text-white/70 font-mono">{value}</span>}
    </div>
    {children}
  </label>
);

const InspectorPanel: React.FC<InspectorPanelProps> = (props) => {
  const { selection, onClose } = props;
  const meta = TRACK_META[selection.kind];

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
      {/* Selection header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg" style={{ background: `${meta.color}22`, color: meta.color }}>
            {KIND_ICON[selection.kind]}
          </span>
          <div>
            <div className="text-[11px] font-black uppercase tracking-wider" style={{ color: meta.color }}>{meta.name}</div>
            <div className="text-[9px] text-white/40">Selected clip · Esc to deselect</div>
          </div>
        </div>
        <button onClick={onClose} title="Deselect (Esc)"
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
          <X size={14} />
        </button>
      </div>

      {selection.kind === 'camera' && <CameraInspector {...props} />}
      {selection.kind === 'sfx' && <SfxInspector {...props} />}
      {selection.kind === 'broll' && <BrollInspector {...props} />}
      {selection.kind === 'sticker' && <StickerInspector {...props} />}
    </div>
  );
};

const CameraInspector: React.FC<InspectorPanelProps> = (p) => {
  const kf = p.cameraTrack.find(k => k.id === p.selection.id);
  return (
    <div className="space-y-4">
      {kf && (
        <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
          <div className="text-[11px] text-white/80">
            <span className="font-bold uppercase tracking-wider text-cyan-300">{kf.kind.replace('-', ' ')}</span>
            <span className="text-white/40 ml-2 font-mono">{kf.time.toFixed(2)}s · {kf.zoom.toFixed(2)}×</span>
          </div>
          <button onClick={() => p.onDeleteCameraKeyframe?.(kf.id)} title="Delete this move"
            className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10">
            <Trash2 size={13} />
          </button>
        </div>
      )}

      <div className="text-[10px] uppercase tracking-wider text-white/40">Director style</div>
      <div className="grid grid-cols-3 gap-1.5">
        {CAMERA_STYLES.map(([val, label]) => (
          <button key={val} onClick={() => p.setCameraStyle(val)}
            className={`px-1.5 py-1.5 rounded-md text-[10px] font-semibold transition-all ${p.cameraStyle === val ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
            {label}
          </button>
        ))}
      </div>

      <Row label="Intensity" value={`${Math.round(p.cameraIntensity * 100)}%`}>
        <input type="range" min={0.3} max={1.6} step={0.05} value={p.cameraIntensity}
          onChange={e => p.setCameraIntensity(parseFloat(e.target.value))} className="w-full accent-cyan-500 h-1" />
      </Row>
      <Row label="Shake" value={`${Math.round(p.cameraShake * 100)}%`}>
        <input type="range" min={0} max={2} step={0.1} value={p.cameraShake}
          onChange={e => p.setCameraShake(parseFloat(e.target.value))} className="w-full accent-cyan-500 h-1" />
      </Row>
      <Row label="Max Zoom" value={`${p.cameraMaxZoom.toFixed(2)}×`}>
        <input type="range" min={1.2} max={1.8} step={0.05} value={p.cameraMaxZoom}
          onChange={e => p.setCameraMaxZoom(parseFloat(e.target.value))} className="w-full accent-cyan-500 h-1" />
      </Row>
      <button onClick={() => p.setCameraTrackFaces(!p.cameraTrackFaces)}
        className="flex items-center justify-between w-full text-[10px] text-white/60 hover:text-white pt-1">
        <span>Track speaker's face</span>
        {p.cameraTrackFaces ? <ToggleRight size={20} className="text-cyan-400" /> : <ToggleLeft size={20} className="text-white/30" />}
      </button>
    </div>
  );
};

const SfxInspector: React.FC<InspectorPanelProps> = (p) => {
  const cue = p.sfxTrack.find(c => c.id === p.selection.id);
  return (
    <div className="space-y-4">
      {cue && (
        <div className="rounded-lg bg-white/5 px-3 py-2.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] text-white/85 font-bold truncate">{cue.label}</div>
            <span className="text-[8px] uppercase tracking-wider text-white/40 font-mono">{cue.source}</span>
          </div>
          <Row label="Volume" value={`${Math.round((cue.gain ?? 0) * 100)}%`}>
            <input type="range" min={0} max={1} step={0.05} value={cue.gain ?? 0}
              onChange={e => p.onAdjustSfxCueGain?.(cue.id, parseFloat(e.target.value))} className="w-full accent-green-500 h-1" />
          </Row>
          <div className="flex items-center gap-1.5">
            <button onClick={() => p.onPreviewSfxCue?.(cue.id)} title="Preview"
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-white/70 hover:text-white"><Play size={11} /> Preview</button>
            <button onClick={() => p.onSwapSfxCue?.(cue.id, 1)} title="Swap sound"
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-white/70 hover:text-white"><RefreshCw size={11} /> Swap</button>
            <button onClick={() => p.onToggleSfxCueMuted?.(cue.id)} title={cue.muted ? 'Unmute' : 'Mute'}
              className={`px-2.5 py-1.5 rounded-md text-[10px] ${cue.muted ? 'bg-white/5 text-white/40' : 'bg-green-600/30 text-green-300'} hover:bg-white/10`}>{cue.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}</button>
            <button onClick={() => p.onDeleteSfxCue?.(cue.id)} title="Delete cue"
              className="px-2.5 py-1.5 rounded-md bg-white/5 text-white/40 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={12} /></button>
          </div>
        </div>
      )}

      {/* Global sound-design controls, reused from the inline panel. */}
      <SfxControlPanel
        vibe={p.sfxVibe} onVibeChange={p.setSfxVibe}
        intensity={p.sfxIntensity} onIntensityChange={p.setSfxIntensity}
        volume={p.sfxVolume} onVolumeChange={p.setSfxVolume}
        cueCount={p.sfxTrack.length}
      />
    </div>
  );
};

const BrollInspector: React.FC<InspectorPanelProps> = (p) => {
  const cap = p.captions.find(c => c.id === p.selection.id);
  if (!cap) return <div className="text-[11px] text-white/40">Clip not found.</div>;
  const disabled = !!cap.brollDisabled;
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white/5 px-3 py-2 text-[11px] text-white/70 truncate">{cap.text}</div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5">Mood (drives footage)</div>
        <div className="grid grid-cols-2 gap-1.5">
          {SENTIMENTS.map(s => (
            <button key={s.id} onClick={() => p.onUpdateCaption(cap.id, { sentiment: s.id, brollDisabled: false })}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-semibold transition-all ${cap.sentiment === s.id && !disabled ? 'bg-violet-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
              <span>{s.emoji}</span> {s.label}
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => p.onUpdateCaption(cap.id, { brollDisabled: !disabled })}
        className="flex items-center justify-between w-full text-[10px] text-white/60 hover:text-white">
        <span>{disabled ? 'B-roll disabled' : 'B-roll enabled'} for this clip</span>
        {disabled ? <ToggleLeft size={20} className="text-white/30" /> : <ToggleRight size={20} className="text-violet-400" />}
      </button>
    </div>
  );
};

const StickerInspector: React.FC<InspectorPanelProps> = (p) => {
  const st = p.stickers.find(s => s.id === p.selection.id);
  if (!st) return <div className="text-[11px] text-white/40">Sticker not found.</div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
        <span className="text-2xl">{st.emoji}</span>
        <button onClick={() => { p.onRemoveSticker?.(st.id); p.onClose(); }} title="Delete sticker"
          className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={13} /></button>
      </div>
      <Row label="Size" value={`${st.scale.toFixed(1)}×`}>
        <input type="range" min={0.3} max={3} step={0.1} value={st.scale}
          onChange={e => p.onUpdateSticker?.(st.id, { scale: parseFloat(e.target.value) })} className="w-full accent-pink-500 h-1" />
      </Row>
      <Row label="Opacity" value={`${Math.round(st.opacity * 100)}%`}>
        <input type="range" min={0.1} max={1} step={0.05} value={st.opacity}
          onChange={e => p.onUpdateSticker?.(st.id, { opacity: parseFloat(e.target.value) })} className="w-full accent-pink-500 h-1" />
      </Row>
      <Row label="Rotation" value={`${Math.round(st.rotation)}°`}>
        <input type="range" min={-180} max={180} step={1} value={st.rotation}
          onChange={e => p.onUpdateSticker?.(st.id, { rotation: parseFloat(e.target.value) })} className="w-full accent-pink-500 h-1" />
      </Row>
    </div>
  );
};

export default InspectorPanel;
