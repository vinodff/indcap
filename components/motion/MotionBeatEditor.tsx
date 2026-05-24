/**
 * MotionBeatEditor — right sidebar that edits the selected beat.
 *
 * Lets user swap primitive type, change text/icon/anchor/intensity,
 * override palette per-beat, and see the rationale Gemini wrote. The
 * parent owns the beat; we just emit the next version via onUpdate.
 */

import React from 'react';
import { Trash2 } from 'lucide-react';
import type { MotionBeat, PrimitiveType, Palette } from '../../services/motionGraphicsService';
import { PRIMITIVE_LABELS, PRIMITIVE_COLORS, PRIMITIVE_TYPES } from '../../services/motionGraphicsService';

interface Props {
  beat: MotionBeat | null;
  onUpdate: (next: MotionBeat) => void;
  onDelete: (id: string) => void;
}

export const MotionBeatEditor: React.FC<Props> = ({ beat, onUpdate, onDelete }) => {
  if (!beat) {
    return (
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 text-center">
        <p className="text-sm font-bold text-gray-400">No beat selected</p>
        <p className="text-xs text-gray-600 mt-1">Click a block on the timeline to edit it.</p>
      </div>
    );
  }

  const tint = PRIMITIVE_COLORS[beat.primitive];

  const update = (patch: Partial<MotionBeat['params']>) =>
    onUpdate({ ...beat, params: { ...beat.params, ...patch } });

  const updatePrimitive = (p: PrimitiveType) => onUpdate({ ...beat, primitive: p });

  return (
    <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-8 rounded-full" style={{ background: tint }} />
          <div>
            <div className="text-xs text-gray-500">Selected beat</div>
            <div className="text-sm font-black" style={{ color: tint }}>
              {PRIMITIVE_LABELS[beat.primitive]}
            </div>
          </div>
        </div>
        <button
          onClick={() => onDelete(beat.id)}
          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors"
          title="Delete beat (or press Delete)"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {beat.rationale && (
        <p className="text-xs text-gray-500 italic border-l-2 border-gray-800 pl-3">
          {beat.rationale}
        </p>
      )}

      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
          Primitive
        </label>
        <select
          value={beat.primitive}
          onChange={(e) => updatePrimitive(e.target.value as PrimitiveType)}
          className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-sm font-bold text-white focus:outline-none focus:border-fuchsia-500"
        >
          {PRIMITIVE_TYPES.map((p) => (
            <option key={p} value={p}>{PRIMITIVE_LABELS[p]}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
          Text
        </label>
        <input
          type="text"
          value={beat.params.text || ''}
          onChange={(e) => update({ text: e.target.value })}
          placeholder="(none)"
          className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
        />
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
          Icon (lucide name or emoji)
        </label>
        <input
          type="text"
          value={beat.params.icon || ''}
          onChange={(e) => update({ icon: e.target.value })}
          placeholder="zap, heart, ⚡"
          className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
            Anchor
          </label>
          <select
            value={beat.params.anchor || 'center'}
            onChange={(e) => update({ anchor: e.target.value as MotionBeat['params']['anchor'] })}
            className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
          >
            <option value="center">Center</option>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
            Palette
          </label>
          <select
            value={beat.params.palette}
            onChange={(e) => update({ palette: e.target.value as Palette })}
            className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
          >
            <option value="energetic">Energetic</option>
            <option value="corporate">Corporate</option>
            <option value="kids">Kids</option>
            <option value="cinematic">Cinematic</option>
            <option value="neon-bright">Neon Bright</option>
            <option value="pastel-pop">Pastel Pop</option>
            <option value="gradient-blast">Gradient Blast</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
          Intensity
        </label>
        <div className="flex gap-2">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => update({ intensity: n as 1 | 2 | 3 })}
              className={`flex-1 py-2 rounded-lg font-black text-xs transition-colors ${
                beat.params.intensity === n
                  ? 'bg-fuchsia-500 text-white'
                  : 'bg-black border border-gray-800 text-gray-400 hover:bg-gray-900'
              }`}
            >
              {n === 1 ? 'Subtle' : n === 2 ? 'Balanced' : 'Loud'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
            Start (s)
          </label>
          <input
            type="number"
            step={0.1}
            min={0}
            value={beat.startTime.toFixed(2)}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next) || next < 0 || next >= beat.endTime) return;
              onUpdate({ ...beat, startTime: next });
            }}
            className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-fuchsia-500"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
            End (s)
          </label>
          <input
            type="number"
            step={0.1}
            min={0}
            value={beat.endTime.toFixed(2)}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next) || next <= beat.startTime) return;
              onUpdate({ ...beat, endTime: next });
            }}
            className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-fuchsia-500"
          />
        </div>
      </div>
    </div>
  );
};

export default MotionBeatEditor;
