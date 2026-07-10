import React, { useState } from 'react';
import { Music, Sparkles, ChevronDown } from 'lucide-react';
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

// Sound-design controls. Collapsed to a one-line summary by default so the
// preview + timeline keep the vertical space; expands for the full vibe /
// intensity / volume controls when the user actually wants to tweak audio.
const SfxControlPanel: React.FC<Props> = ({
  vibe, onVibeChange, intensity, onIntensityChange, volume, onVolumeChange, cueCount,
}) => {
  const [expanded, setExpanded] = useState(false);
  const intensityLabel = intensity <= 0.7 ? 'Subtle' : intensity >= 1.3 ? 'Punchy' : 'Balanced';
  const vibeLabel = VIBES.find(v => v.id === vibe)?.label ?? vibe;

  return (
    <div className="mb-2 rounded-xl border border-[var(--cc-border)] bg-[var(--cc-surface-2)]">
      {/* Collapsed summary row — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left"
        title={expanded ? 'Collapse sound design controls' : 'Expand sound design controls'}
      >
        <Music size={12} className="text-[var(--cc-blue-light)] shrink-0" />
        <span className="text-[11px] font-semibold text-[var(--cc-text-1)]">Sound design</span>
        <span className="text-[10px] text-[var(--cc-text-3)] truncate">
          {vibeLabel} · {intensityLabel} · {volume} · {cueCount} cue{cueCount === 1 ? '' : 's'}
        </span>
        <ChevronDown size={12} className={`ml-auto shrink-0 text-[var(--cc-text-3)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {/* Vibe / personality */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-[var(--cc-text-3)]">Vibe</span>
              <div className="flex gap-1">
                {VIBES.map(v => (
                  <button
                    key={v.id}
                    onClick={() => onVibeChange(v.id)}
                    title={v.blurb}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                      vibe === v.id
                        ? 'bg-[var(--cc-blue)] text-white'
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
              <span className="text-[10px] font-medium text-[var(--cc-text-3)] flex items-center gap-1">
                <Sparkles size={9} /> Intensity
              </span>
              <input
                type="range" min={0.4} max={1.6} step={0.05} value={intensity}
                onChange={e => onIntensityChange(parseFloat(e.target.value))}
                className="w-28 accent-blue-500 cursor-pointer"
              />
              <span className="text-[10px] font-semibold text-[var(--cc-text-2)] w-14">{intensityLabel}</span>
            </div>

            {/* Master volume */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-[var(--cc-text-3)]">Volume</span>
              <div className="flex gap-1">
                {(['LOW', 'MED', 'HIGH'] as const).map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => onVolumeChange(lvl)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                      volume === lvl
                        ? 'bg-[var(--cc-blue)] text-white'
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
      )}
    </div>
  );
};

export default SfxControlPanel;
