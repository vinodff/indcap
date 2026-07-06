import React from 'react';
import { Music, Sparkles } from 'lucide-react';
import { VIBES, type SfxVibe } from '../services/audio/soundDesign';

interface Props {
  vibe: SfxVibe;
  onVibeChange: (v: SfxVibe) => void;
  intensity: number;                 // 0.4..1.6
  onIntensityChange: (n: number) => void;
  volume: 'LOW' | 'MED' | 'HIGH';
  onVolumeChange: (v: 'LOW' | 'MED' | 'HIGH') => void;
  cueCount: number;
}

// Compact, adjustable sound-design control bar. Sits above the timeline so the
// user can dial the personality (vibe), density (intensity) and loudness without
// digging through menus — the "30+ years editor" controls in one place.
const SfxControlPanel: React.FC<Props> = ({
  vibe, onVibeChange, intensity, onIntensityChange, volume, onVolumeChange, cueCount,
}) => {
  const intensityLabel = intensity <= 0.7 ? 'Subtle' : intensity >= 1.3 ? 'Punchy' : 'Balanced';

  return (
    <div className="mb-2 rounded-xl border border-green-700/30 bg-green-950/20 px-3 py-2">
      <div className="flex items-center gap-2 mb-2">
        <Music size={12} className="text-green-400" />
        <span className="text-[10px] font-black uppercase tracking-widest text-green-300">Sound Design</span>
        <span className="text-[9px] text-green-600/70">{cueCount} cue{cueCount === 1 ? '' : 's'} placed</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* Vibe / personality */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Vibe</span>
          <div className="flex gap-1">
            {VIBES.map(v => (
              <button
                key={v.id}
                onClick={() => onVibeChange(v.id)}
                title={v.blurb}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                  vibe === v.id
                    ? 'bg-green-600 text-white shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Intensity / density */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1">
            <Sparkles size={9} /> Intensity
          </span>
          <input
            type="range" min={0.4} max={1.6} step={0.05} value={intensity}
            onChange={e => onIntensityChange(parseFloat(e.target.value))}
            className="w-28 accent-green-500 cursor-pointer"
          />
          <span className="text-[10px] font-bold text-green-300 w-14">{intensityLabel}</span>
        </div>

        {/* Master volume */}
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Volume</span>
          <div className="flex gap-1">
            {(['LOW', 'MED', 'HIGH'] as const).map(lvl => (
              <button
                key={lvl}
                onClick={() => onVolumeChange(lvl)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                  volume === lvl
                    ? 'bg-white/90 text-black'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-1.5 text-[8.5px] text-white/30 leading-tight">
        Tip: click any cue on the SFX track below to swap its sound, change volume, mute or delete it.
      </p>
    </div>
  );
};

export default SfxControlPanel;
