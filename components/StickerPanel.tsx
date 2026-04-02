import React, { useState } from 'react';
import { Smile, X, Settings2, Zap } from 'lucide-react';
import { StickerItem, StickerAnimation } from '../types';

interface StickerPanelProps {
    stickers: StickerItem[];
    setStickers: (stickers: StickerItem[]) => void;
    selectedStickerId: string | null;
    setSelectedStickerId: (id: string | null) => void;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    updateSticker: (id: string, updates: Partial<StickerItem>) => void;
    deleteSticker: (id: string) => void;
    addSticker: (sticker: StickerItem) => void;
}

// Helper: build Noto Emoji Animation CDN URL
// Format: https://fonts.gstatic.com/s/e/notoemoji/latest/{codepoint}/512.gif
const notoUrl = (codepoint: string) =>
    `https://fonts.gstatic.com/s/e/notoemoji/latest/${codepoint}/512.gif`;

// ──────────────────────────────────────────────────────────────────────────────
// Animated emoji catalog — Noto Emoji Animation CDN
// Each item: emoji char (fallback), gifUrl (real animated GIF), default anim
// ──────────────────────────────────────────────────────────────────────────────
const EMOJI_CATEGORIES: {
    label: string;
    icon: string;
    emojis: { emoji: string; gifUrl: string; anim: StickerAnimation }[];
}[] = [
    {
        label: 'Reactions',
        icon: '😍',
        emojis: [
            { emoji: '😍', gifUrl: notoUrl('1f60d'), anim: 'PULSE' },
            { emoji: '🤩', gifUrl: notoUrl('1f929'), anim: 'SPIN' },
            { emoji: '😂', gifUrl: notoUrl('1f602'), anim: 'BOUNCE' },
            { emoji: '🤣', gifUrl: notoUrl('1f923'), anim: 'BOUNCE' },
            { emoji: '😭', gifUrl: notoUrl('1f62d'), anim: 'WOBBLE' },
            { emoji: '😱', gifUrl: notoUrl('1f631'), anim: 'SHAKE' },
            { emoji: '🥺', gifUrl: notoUrl('1f97a'), anim: 'PULSE' },
            { emoji: '🥹', gifUrl: notoUrl('1f979'), anim: 'PULSE' },
            { emoji: '🥳', gifUrl: notoUrl('1f973'), anim: 'SPIN' },
            { emoji: '🤯', gifUrl: notoUrl('1f92f'), anim: 'POP_IN' },
            { emoji: '😎', gifUrl: notoUrl('1f60e'), anim: 'WOBBLE' },
            { emoji: '🤔', gifUrl: notoUrl('1f914'), anim: 'SWING' },
        ],
    },
    {
        label: 'Hearts',
        icon: '❤️',
        emojis: [
            { emoji: '❤️', gifUrl: notoUrl('2764'), anim: 'PULSE' },
            { emoji: '💕', gifUrl: notoUrl('1f495'), anim: 'FLOAT' },
            { emoji: '💖', gifUrl: notoUrl('1f496'), anim: 'PULSE' },
            { emoji: '💗', gifUrl: notoUrl('1f497'), anim: 'PULSE' },
            { emoji: '💓', gifUrl: notoUrl('1f493'), anim: 'PULSE' },
            { emoji: '💝', gifUrl: notoUrl('1f49d'), anim: 'FLOAT' },
            { emoji: '💞', gifUrl: notoUrl('1f49e'), anim: 'ORBIT' },
            { emoji: '🧡', gifUrl: notoUrl('1f9e1'), anim: 'PULSE' },
            { emoji: '💛', gifUrl: notoUrl('1f49b'), anim: 'PULSE' },
            { emoji: '💚', gifUrl: notoUrl('1f49a'), anim: 'PULSE' },
            { emoji: '💙', gifUrl: notoUrl('1f499'), anim: 'PULSE' },
            { emoji: '💜', gifUrl: notoUrl('1f49c'), anim: 'PULSE' },
        ],
    },
    {
        label: 'Fire & Energy',
        icon: '🔥',
        emojis: [
            { emoji: '🔥', gifUrl: notoUrl('1f525'), anim: 'WOBBLE' },
            { emoji: '⚡', gifUrl: notoUrl('26a1'), anim: 'SHAKE' },
            { emoji: '💥', gifUrl: notoUrl('1f4a5'), anim: 'POP_IN' },
            { emoji: '✨', gifUrl: notoUrl('2728'), anim: 'FLOAT' },
            { emoji: '💫', gifUrl: notoUrl('1f4ab'), anim: 'SPIN' },
            { emoji: '⭐', gifUrl: notoUrl('2b50'), anim: 'SPIN' },
            { emoji: '🌟', gifUrl: notoUrl('1f31f'), anim: 'PULSE' },
            { emoji: '🚀', gifUrl: notoUrl('1f680'), anim: 'FLOAT' },
            { emoji: '🎯', gifUrl: notoUrl('1f3af'), anim: 'POP_IN' },
            { emoji: '💯', gifUrl: notoUrl('1f4af'), anim: 'BOUNCE' },
            { emoji: '⚡', gifUrl: notoUrl('26a1'), anim: 'POP_IN' },
            { emoji: '🌈', gifUrl: notoUrl('1f308'), anim: 'FLOAT' },
        ],
    },
    {
        label: 'Fun',
        icon: '🎉',
        emojis: [
            { emoji: '🎉', gifUrl: notoUrl('1f389'), anim: 'BOUNCE' },
            { emoji: '🎊', gifUrl: notoUrl('1f38a'), anim: 'SPIN' },
            { emoji: '🎈', gifUrl: notoUrl('1f388'), anim: 'FLOAT' },
            { emoji: '🏆', gifUrl: notoUrl('1f3c6'), anim: 'SWING' },
            { emoji: '👑', gifUrl: notoUrl('1f451'), anim: 'BOUNCE' },
            { emoji: '💎', gifUrl: notoUrl('1f48e'), anim: 'ORBIT' },
            { emoji: '🎁', gifUrl: notoUrl('1f381'), anim: 'WOBBLE' },
            { emoji: '🎮', gifUrl: notoUrl('1f3ae'), anim: 'WOBBLE' },
            { emoji: '🎵', gifUrl: notoUrl('1f3b5'), anim: 'BOUNCE' },
            { emoji: '🎶', gifUrl: notoUrl('1f3b6'), anim: 'FLOAT' },
            { emoji: '🥂', gifUrl: notoUrl('1f942'), anim: 'SWING' },
            { emoji: '🍕', gifUrl: notoUrl('1f355'), anim: 'WOBBLE' },
        ],
    },
    {
        label: 'Hands',
        icon: '👍',
        emojis: [
            { emoji: '👍', gifUrl: notoUrl('1f44d'), anim: 'BOUNCE' },
            { emoji: '👎', gifUrl: notoUrl('1f44e'), anim: 'BOUNCE' },
            { emoji: '👏', gifUrl: notoUrl('1f44f'), anim: 'BOUNCE' },
            { emoji: '🙌', gifUrl: notoUrl('1f64c'), anim: 'BOUNCE' },
            { emoji: '🤜', gifUrl: notoUrl('1f91c'), anim: 'SHAKE' },
            { emoji: '✊', gifUrl: notoUrl('270a'), anim: 'PULSE' },
            { emoji: '☝️', gifUrl: notoUrl('261d'), anim: 'WOBBLE' },
            { emoji: '🤞', gifUrl: notoUrl('1f91e'), anim: 'JELLY' },
            { emoji: '✌️', gifUrl: notoUrl('270c'), anim: 'WOBBLE' },
            { emoji: '🤙', gifUrl: notoUrl('1f919'), anim: 'WOBBLE' },
            { emoji: '💪', gifUrl: notoUrl('1f4aa'), anim: 'POP_IN' },
            { emoji: '🙏', gifUrl: notoUrl('1f64f'), anim: 'WOBBLE' },
        ],
    },
    {
        label: 'Animals',
        icon: '🦁',
        emojis: [
            { emoji: '🦁', gifUrl: notoUrl('1f981'), anim: 'WOBBLE' },
            { emoji: '🐸', gifUrl: notoUrl('1f438'), anim: 'JELLY' },
            { emoji: '🦊', gifUrl: notoUrl('1f98a'), anim: 'WOBBLE' },
            { emoji: '🦋', gifUrl: notoUrl('1f98b'), anim: 'FLOAT' },
            { emoji: '🐧', gifUrl: notoUrl('1f427'), anim: 'BOUNCE' },
            { emoji: '🐝', gifUrl: notoUrl('1f41d'), anim: 'ORBIT' },
            { emoji: '🦄', gifUrl: notoUrl('1f984'), anim: 'FLOAT' },
            { emoji: '🐉', gifUrl: notoUrl('1f409'), anim: 'SPIN' },
            { emoji: '🐺', gifUrl: notoUrl('1f43a'), anim: 'SHAKE' },
            { emoji: '🦅', gifUrl: notoUrl('1f985'), anim: 'FLOAT' },
            { emoji: '🐢', gifUrl: notoUrl('1f422'), anim: 'WOBBLE' },
            { emoji: '🦉', gifUrl: notoUrl('1f989'), anim: 'SWING' },
        ],
    },
];

const ANIMATION_LABELS: { id: StickerAnimation; icon: string; label: string }[] = [
    { id: 'NONE',   icon: '•',  label: 'Still' },
    { id: 'POP_IN', icon: '💥', label: 'Pop' },
    { id: 'BOUNCE', icon: '↕',  label: 'Bounce' },
    { id: 'PULSE',  icon: '❤',  label: 'Pulse' },
    { id: 'FLOAT',  icon: '🪁', label: 'Float' },
    { id: 'WOBBLE', icon: '〰', label: 'Wobble' },
    { id: 'JELLY',  icon: '🍮', label: 'Jelly' },
    { id: 'SHAKE',  icon: '📳', label: 'Shake' },
    { id: 'SPIN',   icon: '↻',  label: 'Spin' },
    { id: 'SWING',  icon: '⏳', label: 'Swing' },
    { id: 'ORBIT',  icon: '🪐', label: 'Orbit' },
];

const StickerPanel: React.FC<StickerPanelProps> = ({
    stickers,
    setStickers,
    selectedStickerId,
    setSelectedStickerId,
    videoRef,
    updateSticker,
    deleteSticker,
}) => {
    const [activeCategory, setActiveCategory] = useState(0);

    const selectedSticker = stickers.find(s => s.id === selectedStickerId);

    const handleEmojiClick = (emoji: string, gifUrl: string, defaultAnim: StickerAnimation) => {
        if (!videoRef.current) return;
        const video = videoRef.current;

        const newSticker: StickerItem = {
            id: `sticker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            emoji,
            gifUrl,
            x: 0.5,
            y: 0.35,
            scale: 1.8,
            rotation: 0,
            startTime: video.currentTime,
            endTime: video.currentTime + 4,
            animation: defaultAnim,
            opacity: 1,
        };

        setStickers([...stickers, newSticker]);
        setSelectedStickerId(newSticker.id);
    };

    return (
        <div className="flex flex-col gap-4 p-3">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                    <Smile size={13} className="text-pink-400" /> Animated Emojis
                </div>
                {selectedStickerId && (
                    <button
                        onClick={() => { deleteSticker(selectedStickerId); setSelectedStickerId(null); }}
                        className="p-1 rounded hover:bg-red-900/30 text-red-400 transition-colors"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Category tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {EMOJI_CATEGORIES.map((cat, i) => (
                    <button
                        key={cat.label}
                        onClick={() => setActiveCategory(i)}
                        className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl border text-[9px] font-bold transition-all ${
                            activeCategory === i
                                ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                                : 'bg-gray-900 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                        }`}
                    >
                        <span className="text-base leading-none">{cat.icon}</span>
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Animated emoji grid — uses real Noto GIF previews */}
            <div className="grid grid-cols-4 gap-2">
                {EMOJI_CATEGORIES[activeCategory].emojis.map(({ emoji, gifUrl, anim }) => (
                    <button
                        key={gifUrl}
                        onClick={() => handleEmojiClick(emoji, gifUrl, anim)}
                        className="group relative flex flex-col items-center justify-center gap-1 h-16 rounded-2xl border border-gray-800 bg-gray-900/60 hover:bg-gray-800 hover:border-pink-500/50 transition-all active:scale-95 overflow-hidden"
                    >
                        {/* Real animated GIF preview */}
                        <img
                            src={gifUrl}
                            alt={emoji}
                            className="w-10 h-10 object-contain"
                            loading="lazy"
                        />
                        <span className="text-[7px] text-gray-600 group-hover:text-pink-400 transition-colors font-bold uppercase tracking-wider">
                            {anim === 'POP_IN' ? 'POP' : anim === 'NONE' ? 'STILL' : anim}
                        </span>
                        {/* animated dot indicator */}
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
                    </button>
                ))}
            </div>

            {/* Hint */}
            <p className="text-[9px] text-gray-600 text-center flex items-center justify-center gap-1">
                <Zap size={9} className="text-yellow-500" />
                Noto animated emojis · Tap to add to video
            </p>

            {/* Selected sticker properties */}
            {selectedSticker && (
                <div className="border-t border-gray-800 pt-4 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                        <Settings2 size={13} className="text-yellow-400" />
                        {selectedSticker.gifUrl && (
                            <img src={selectedSticker.gifUrl} alt={selectedSticker.emoji} className="w-5 h-5" />
                        )}
                        Properties
                    </div>

                    {/* Animation picker */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Motion</label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {ANIMATION_LABELS.map(({ id, icon, label }) => (
                                <button
                                    key={id}
                                    onClick={() => updateSticker(selectedSticker.id, { animation: id })}
                                    className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl border text-[8px] font-bold transition-all ${
                                        selectedSticker.animation === id
                                            ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                                            : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                                    }`}
                                >
                                    <span className="text-sm leading-none">{icon}</span>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scale */}
                    <div className="space-y-1.5">
                        <label className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                            Size <span className="text-white">{selectedSticker.scale.toFixed(1)}×</span>
                        </label>
                        <input type="range" min={0.5} max={5} step={0.1}
                            value={selectedSticker.scale}
                            onChange={e => updateSticker(selectedSticker.id, { scale: parseFloat(e.target.value) })}
                            className="w-full accent-pink-500"
                        />
                    </div>

                    {/* Opacity */}
                    <div className="space-y-1.5">
                        <label className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                            Opacity <span className="text-white">{Math.round(selectedSticker.opacity * 100)}%</span>
                        </label>
                        <input type="range" min={0} max={1} step={0.05}
                            value={selectedSticker.opacity}
                            onChange={e => updateSticker(selectedSticker.id, { opacity: parseFloat(e.target.value) })}
                            className="w-full accent-pink-500"
                        />
                    </div>

                    {/* Duration */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-500 uppercase block">On-screen time</label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[9px] text-gray-600 mb-1 block">Start (s)</label>
                                <input type="number" min={0} step={0.1}
                                    value={selectedSticker.startTime.toFixed(1)}
                                    onChange={e => updateSticker(selectedSticker.id, { startTime: parseFloat(e.target.value) })}
                                    className="w-full p-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-white"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[9px] text-gray-600 mb-1 block">End (s)</label>
                                <input type="number" min={0} step={0.1}
                                    value={selectedSticker.endTime.toFixed(1)}
                                    onChange={e => updateSticker(selectedSticker.id, { endTime: parseFloat(e.target.value) })}
                                    className="w-full p-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Delete */}
                    <button
                        onClick={() => { deleteSticker(selectedSticker.id); setSelectedStickerId(null); }}
                        className="w-full py-2 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 hover:bg-red-900/50 transition-all text-xs font-bold"
                    >
                        🗑️ Remove Emoji
                    </button>
                </div>
            )}
        </div>
    );
};

export default StickerPanel;
