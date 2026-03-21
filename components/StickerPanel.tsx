import React, { useState } from 'react';
import { Smile, Image, Zap, Settings2, X } from 'lucide-react';
import { StickerItem } from '../types';

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

const EMOJIS = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '☺️', '😊', '😇',
    '🥰', '😍', '🤩', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪',
    '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕',
    '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
    '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔',
    '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '💯', '🔥', '⭐', '💎',
    '💥', '💫', '✨', '💥', '💢', '💦', '💨', '👀', '👁️', '👅', '👄',
    '👆', '👇', '👈', '👉', '👍', '👎', '👊', '✊', '🤛', '🤜', '👏',
    '🙌', '👐', '🤲', '🤝', '👏', '🙏', '✋', '🤚', '🖐️', '✌️', '🤞',
    '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '👉', '👈', '👆', '👇'
];

const StickerPanel: React.FC<StickerPanelProps> = ({
    stickers,
    setStickers,
    selectedStickerId,
    setSelectedStickerId,
    videoRef,
    canvasRef,
    updateSticker,
    deleteSticker,
    addSticker
}) => {
    const [emojiTab, setEmojiTab] = useState(true);
    const [isAddingSticker, setIsAddingSticker] = useState(false);

    const handleEmojiClick = (emoji: string) => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Center position
        const x = 0.5;
        const y = 0.8; // Bottom area

        const newSticker: StickerItem = {
            id: `sticker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            emoji,
            x,
            y,
            scale: 1.5,
            rotation: 0,
            startTime: video.currentTime,
            endTime: video.currentTime + 3, // 3 second default duration
            animation: 'NONE',
            opacity: 1
        };

        setStickers([...stickers, newSticker]);
        setSelectedStickerId(newSticker.id);
        setIsAddingSticker(false);
    };

    const handleStickerSelect = (sticker: StickerItem) => {
        setSelectedStickerId(sticker.id);
    };

    return (
        <div className="space-y-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                    <Smile size={13} className="text-pink-400" /> Stickers
                </div>
                {selectedStickerId && (
                    <button
                        onClick={() => { deleteSticker(selectedStickerId); setSelectedStickerId(null); }}
                        className="p-1 rounded hover:bg-red-900/30 hover:text-red-400 transition-colors text-red-400 text-xs"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-3">
                <button
                    onClick={() => setEmojiTab(true)}
                    className={`flex-1 py-2 rounded-tl-lg border-b-2 transition-all ${emojiTab
                        ? 'bg-gray-800 border-blue-500 text-white'
                        : 'bg-transparent border-gray-700 text-gray-500 hover:bg-gray-800 hover:text-white'
                        }`}
                >
                    Emojis
                </button>
                <button
                    onClick={() => setEmojiTab(false)}
                    className={`flex-1 py-2 rounded-tr-lg border-b-2 transition-all ${!emojiTab
                        ? 'bg-gray-800 border-blue-500 text-white'
                        : 'bg-transparent border-gray-700 text-gray-500 hover:bg-gray-800 hover:text-white'
                        }`}
                >
                    Images
                </button>
            </div>

            {/* Content */}
            {emojiTab ? (
                <div className="space-y-3">
                    {/* Emoji Grid */}
                    <div className="grid grid-cols-6 gap-2">
                        {EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => handleEmojiClick(emoji)}
                                className={`w-full h-12 rounded-xl border flex items-center justify-center text-lg transition-all ${isAddingSticker ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
                                    }`}
                                disabled={isAddingSticker}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    {/* Add button */}
                    {!isAddingSticker && (
                        <button
                            onClick={() => setIsAddingSticker(true)}
                            className="w-full py-3 rounded-xl border bg-gray-900 hover:bg-gray-800 text-gray-400 transition-all flex items-center justify-center"
                        >
                            <Zap size={14} className="mr-2" /> Add Emoji to Video
                        </button>
                    )}

                    {isAddingSticker && (
                        <div className="text-center py-4">
                            <p className="text-[10px] text-gray-400">
                                Click on the video to place the emoji
                            </p>
                            <button
                                onClick={() => setIsAddingSticker(false)}
                                className="mt-2 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-all text-xs"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-6">
                    <p className="text-[10px] text-gray-500">
                        Image sticker support coming soon!
                    </p>
                    <Image size={24} className="mx-auto mb-2 text-gray-500" />
                </div>
            )}

            {/* Selected Sticker Properties */}
            {selectedStickerId && (
                <>
                    <div className="border-t border-gray-800 pt-4">
                        <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">
                            <Settings2 size={13} className="text-yellow-400" /> Properties
                        </div>

                        {/* Duration */}
                        <div className="space-y-2">
                            <label className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                                Duration <span>{selectedStickerId ? `${stickers.find(s => s.id === selectedStickerId)?.startTime?.toFixed(1)}s - ${stickers.find(s => s.id === selectedStickerId)?.endTime?.toFixed(1)}s` : '0s'}</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min={0}
                                    step={0.1}
                                    placeholder="Start"
                                    className="w-1/2 p-1 bg-gray-900 border border-gray-800 rounded-l text-xs text-white"
                                />
                                <input
                                    type="number"
                                    min={0}
                                    step={0.1}
                                    placeholder="End"
                                    className="w-1/2 p-1 bg-gray-900 border border-gray-800 rounded-r text-xs text-white"
                                />
                            </div>
                        </div>

                        {/* Animation */}
                        <div className="space-y-2">
                            <label className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                                Animation
                            </label>
                            <div className="flex gap-2">
                                {(['NONE', 'BOUNCE', 'SPIN', 'PULSE', 'SHAKE'] as const).map(anim => (
                                    <button
                                        key={anim}
                                        onClick={() => updateSticker(selectedStickerId, { animation: anim as any })}
                                        className={`flex-1 py-1 rounded border text-[9px] font-black transition-all ${stickers.find(s => s.id === selectedStickerId)?.animation === anim
                                            ? 'bg-gray-700 text-white'
                                            : 'bg-gray-900 hover:bg-gray-800 hover:text-gray-300'
                                            }`}
                                    >
                                        {anim === 'NONE' ? '―' : anim === 'BOUNCE' ? '↑↓' : anim === 'SPIN' ? '⟳' : anim === 'PULSE' ? '♡' : '≋'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default StickerPanel;
