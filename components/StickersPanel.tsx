import React, { useState } from 'react';
import { Plus, Trash2, Smile, Settings, Sparkles, Clock, Trash } from 'lucide-react';
import { StickerItem, StickerAnimation } from '../types';
import { emojiToNotoUrl } from '../services/caption/emojiUtils';

interface StickersPanelProps {
  stickers: StickerItem[];
  onAddSticker: (sticker: StickerItem) => void;
  onUpdateSticker: (id: string, updates: Partial<StickerItem>) => void;
  onRemoveSticker: (id: string) => void;
  currentTime: number;
  videoDuration: number;
}

const EMOJI_PRESETS = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '✨', label: 'Sparkles' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '😂', label: 'Joy' },
  { emoji: '😍', label: 'Love' },
  { emoji: '🎉', label: 'Party' },
  { emoji: '🚀', label: 'Rocket' },
  { emoji: '💥', label: 'Boom' },
  { emoji: '💯', label: '100' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '👍', label: 'Like' },
  { emoji: '😱', label: 'Shock' },
  { emoji: '💸', label: 'Money' },
  { emoji: '👑', label: 'Crown' },
  { emoji: '⚡', label: 'Volt' },
  { emoji: '🎯', label: 'Target' },
  { emoji: '🌟', label: 'Star' },
  { emoji: '🎈', label: 'Balloon' },
  { emoji: '💡', label: 'Idea' },
  { emoji: '🔔', label: 'Bell' },
];

const ANIMATION_TYPES: { value: StickerAnimation; label: string }[] = [
  { value: 'NONE', label: 'Static' },
  { value: 'BOUNCE', label: 'Bounce' },
  { value: 'SPIN', label: 'Spin' },
  { value: 'PULSE', label: 'Pulse' },
  { value: 'SHAKE', label: 'Shake' },
  { value: 'FLOAT', label: 'Float' },
  { value: 'WOBBLE', label: 'Wobble' },
  { value: 'POP_IN', label: 'Pop In' },
  { value: 'ORBIT', label: 'Orbit' },
  { value: 'JELLY', label: 'Jelly' },
  { value: 'SWING', label: 'Swing' },
];

export const StickersPanel: React.FC<StickersPanelProps> = ({
  stickers,
  onAddSticker,
  onUpdateSticker,
  onRemoveSticker,
  currentTime,
  videoDuration,
}) => {
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);

  const handleAddEmoji = (emoji: string) => {
    const id = `sticker-${Date.now()}`;
    const gifUrl = emojiToNotoUrl(emoji);
    const newSticker: StickerItem = {
      id,
      emoji,
      gifUrl,
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      rotation: 0,
      startTime: currentTime,
      endTime: Math.min(currentTime + 3.0, videoDuration || 10.0),
      animation: 'POP_IN',
      opacity: 1.0,
    };
    onAddSticker(newSticker);
    setSelectedStickerId(id);
  };

  const activeSticker = stickers.find(s => s.id === selectedStickerId);

  return (
    <div className="flex flex-col h-full bg-[#13111a] text-white select-none">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
        
        {/* Animated Emoji Grid Selector */}
        <div>
          <div className="flex items-center gap-1.5 mb-3 text-xs font-semibold text-white/70 uppercase tracking-wider">
            <Smile size={14} className="text-violet-400" />
            <span>Add Animated Emojis</span>
          </div>
          <div className="grid grid-cols-5 gap-2 bg-white/5 p-3 rounded-xl border border-white/5">
            {EMOJI_PRESETS.map((item, idx) => {
              const url = emojiToNotoUrl(item.emoji);
              return (
                <button
                  key={idx}
                  onClick={() => handleAddEmoji(item.emoji)}
                  className="group relative flex items-center justify-center p-2 rounded-lg bg-white/5 hover:bg-violet-500/20 border border-transparent hover:border-violet-500/30 transition-all active:scale-95 cursor-pointer"
                  title={item.label}
                >
                  <img
                    src={url}
                    alt={item.label}
                    className="w-8 h-8 object-contain transition-transform group-hover:scale-110"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Sticker Customizer */}
        {activeSticker ? (
          <div className="space-y-4 bg-white/5 p-4 rounded-xl border border-violet-500/15">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={14} className="text-violet-400" />
                <span className="text-xs font-bold text-violet-300">Sticker Settings</span>
              </div>
              <button
                onClick={() => {
                  onRemoveSticker(activeSticker.id);
                  setSelectedStickerId(null);
                }}
                className="text-white/40 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                title="Remove Sticker"
              >
                <Trash size={13} />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Animation select */}
              <div>
                <label className="text-[10px] text-white/50 block mb-1 uppercase tracking-wider">Animation</label>
                <select
                  value={activeSticker.animation}
                  onChange={e => onUpdateSticker(activeSticker.id, { animation: e.target.value as StickerAnimation })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  {ANIMATION_TYPES.map(anim => (
                    <option key={anim.value} value={anim.value} className="bg-[#13111a]">
                      {anim.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Span */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-white/50 block mb-1 uppercase tracking-wider">Start Time (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max={activeSticker.endTime}
                    value={activeSticker.startTime.toFixed(1)}
                    onChange={e => onUpdateSticker(activeSticker.id, { startTime: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/50 block mb-1 uppercase tracking-wider">End Time (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    min={activeSticker.startTime}
                    max={videoDuration || 100}
                    value={activeSticker.endTime.toFixed(1)}
                    onChange={e => onUpdateSticker(activeSticker.id, { endTime: Math.min(videoDuration || 100, parseFloat(e.target.value) || 0) })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Scale Slider */}
              <div>
                <div className="flex justify-between text-[10px] text-white/50 mb-1 uppercase tracking-wider">
                  <span>Scale</span>
                  <span className="text-violet-400 font-mono">{activeSticker.scale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.05"
                  value={activeSticker.scale}
                  onChange={e => onUpdateSticker(activeSticker.id, { scale: parseFloat(e.target.value) })}
                  className="w-full h-1 accent-violet-500 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Rotation Slider */}
              <div>
                <div className="flex justify-between text-[10px] text-white/50 mb-1 uppercase tracking-wider">
                  <span>Rotation</span>
                  <span className="text-violet-400 font-mono">{activeSticker.rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={activeSticker.rotation}
                  onChange={e => onUpdateSticker(activeSticker.id, { rotation: parseInt(e.target.value) })}
                  className="w-full h-1 accent-violet-500 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Opacity Slider */}
              <div>
                <div className="flex justify-between text-[10px] text-white/50 mb-1 uppercase tracking-wider">
                  <span>Opacity</span>
                  <span className="text-violet-400 font-mono">{(activeSticker.opacity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={activeSticker.opacity}
                  onChange={e => onUpdateSticker(activeSticker.id, { opacity: parseFloat(e.target.value) })}
                  className="w-full h-1 accent-violet-500 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="text-[9px] text-white/30 pt-1 border-t border-white/5">
              Tip: Drag and drop the sticker directly on the preview video canvas to reposition it.
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-xl border border-white/5 text-center text-white/40 text-xs">
            <Sparkles size={20} className="mb-2 opacity-50" />
            <p>Select a sticker from the list below or click an emoji above to configure properties.</p>
          </div>
        )}

        {/* Stickers Track / List */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold text-white/70 uppercase tracking-wider">
            <Clock size={14} className="text-violet-400" />
            <span>Active Stickers ({stickers.length})</span>
          </div>

          {stickers.length === 0 ? (
            <div className="text-center py-6 bg-white/2 rounded-xl border border-dashed border-white/5 text-white/20 text-xs">
              No stickers added to this project yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {stickers.map(s => {
                const isSelected = s.id === selectedStickerId;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStickerId(s.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-violet-500/20 border-violet-500/40 text-white'
                        : 'bg-white/5 border-transparent text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base flex-shrink-0">{s.emoji}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] text-white/80 font-medium truncate capitalize">
                          {s.animation.toLowerCase()} anim
                        </span>
                        <span className="text-[8px] text-white/40 font-mono">
                          {s.startTime.toFixed(1)}s - {s.endTime.toFixed(1)}s
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onRemoveSticker(s.id);
                        if (selectedStickerId === s.id) setSelectedStickerId(null);
                      }}
                      className="text-white/20 hover:text-red-400 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
