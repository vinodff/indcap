import React, { useRef, useState } from 'react';
import { Caption } from '../types';
import { Smile, X } from 'lucide-react';

interface TranscriptEditorProps {
  captions: Caption[];
  updateCaption: (id: string, updates: Partial<Caption>) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

// ─── Curated emoji palette ────────────────────────────────────────────────────
// Using Noto Animated Emoji categories — same source as the Flutter package
const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Hype',
    icon: '🔥',
    emojis: ['🔥', '💥', '⚡', '🚀', '💫', '✨', '🌟', '⭐', '🎉', '🎊'],
  },
  {
    label: 'Faces',
    icon: '😂',
    emojis: ['😂', '🤣', '😍', '🤩', '😎', '🥳', '😤', '🤯', '😱', '🙏'],
  },
  {
    label: 'Hands',
    icon: '👏',
    emojis: ['👏', '🙌', '💪', '👊', '✊', '🤝', '👍', '🫶', '🤙', '☝️'],
  },
  {
    label: 'Money',
    icon: '💸',
    emojis: ['💸', '💰', '🤑', '💵', '💎', '👑', '🏆', '🥇', '🎯', '📈'],
  },
  {
    label: 'Vibes',
    icon: '🎵',
    emojis: ['🎵', '🎶', '🕺', '💃', '🎸', '🥁', '🎤', '🎬', '🎮', '🧠'],
  },
  {
    label: 'Nature',
    icon: '🌈',
    emojis: ['🌈', '🌊', '🌸', '🌺', '🍀', '🦋', '🐉', '🦁', '🐺', '🦅'],
  },
];

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({ captions, updateCaption, videoRef }) => {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeEmojiCaptionId, setActiveEmojiCaptionId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  // Store refs to each contentEditable div so we can insert emoji at cursor
  const editRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Track saved selection range per caption
  const savedRangeRef = useRef<{ captionId: string; range: Range } | null>(null);

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleInput = (id: string, text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (text.trim()) updateCaption(id, { text: text.trim() });
    }, 250);
  };

  // Save cursor position before the emoji picker steals focus
  const saveSelection = (captionId: string) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = { captionId, range: sel.getRangeAt(0).cloneRange() };
    }
  };

  // Insert emoji at saved cursor position
  const insertEmoji = (emoji: string, captionId: string) => {
    const el = editRefs.current[captionId];
    if (!el) return;

    // Restore saved range if available and for this caption
    const savedRange = savedRangeRef.current;
    if (savedRange && savedRange.captionId === captionId) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRange.range);
      }
    } else {
      // Fallback: insert at end
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    // Insert the emoji as a text node
    document.execCommand('insertText', false, emoji);

    // Update caption state
    const newText = el.innerText.trim();
    updateCaption(captionId, { text: newText });

    // Close picker
    setActiveEmojiCaptionId(null);
    savedRangeRef.current = null;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1);
    return `${m}:${parseFloat(sec) < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
      {/* Header hint */}
      <div className="flex items-center gap-2 px-1 pb-1 border-b border-white/5">
        <Smile size={12} className="text-purple-400 shrink-0" />
        <span className="text-[10px] text-gray-500">
          Click <span className="text-purple-400 font-bold">✨</span> on any caption to insert an animated emoji — it will play live on the canvas.
        </span>
      </div>

      {captions.map((caption) => (
        <div
          key={caption.id}
          className="bg-[#1a1a1a] border border-white/5 rounded-xl p-3 hover:border-white/10 transition-colors"
        >
          {/* Timestamp + emoji toggle */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => seekTo(caption.startTime)}
              className="text-[10px] font-mono text-blue-400 hover:text-blue-300 transition-colors"
            >
              {formatTime(caption.startTime)} → {formatTime(caption.endTime)}
            </button>
            <button
              onClick={() => {
                if (activeEmojiCaptionId === caption.id) {
                  setActiveEmojiCaptionId(null);
                } else {
                  saveSelection(caption.id);
                  setActiveEmojiCaptionId(caption.id);
                  setActiveCategory(0);
                }
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold transition-all ${
                activeEmojiCaptionId === caption.id
                  ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 border border-transparent'
              }`}
              title="Insert animated emoji"
            >
              {activeEmojiCaptionId === caption.id ? <X size={10} /> : <Smile size={10} />}
              {activeEmojiCaptionId === caption.id ? 'Close' : 'Emoji'}
            </button>
          </div>

          {/* Editable caption text */}
          <div
            ref={(el) => { editRefs.current[caption.id] = el; }}
            contentEditable
            suppressContentEditableWarning
            onFocus={() => {
              // Reset saved range on fresh focus
              savedRangeRef.current = null;
            }}
            onKeyUp={() => saveSelection(caption.id)}
            onMouseUp={() => saveSelection(caption.id)}
            onInput={(e) => handleInput(caption.id, (e.target as HTMLDivElement).innerText)}
            className="text-sm text-white/90 outline-none cursor-text leading-relaxed focus:text-white rounded px-1 -mx-1 focus:bg-white/5 transition-colors"
          >
            {caption.text}
          </div>

          {/* ── Animated Emoji Picker ── */}
          {activeEmojiCaptionId === caption.id && (
            <div className="mt-3 rounded-xl border border-purple-500/20 bg-[#110a1f] overflow-hidden shadow-xl shadow-purple-900/20">
              {/* Category tabs */}
              <div className="flex overflow-x-auto scrollbar-hide border-b border-white/5">
                {EMOJI_CATEGORIES.map((cat, i) => (
                  <button
                    key={cat.label}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent losing focus on contentEditable
                      setActiveCategory(i);
                    }}
                    className={`flex items-center gap-1 px-3 py-2 text-[10px] font-bold whitespace-nowrap shrink-0 transition-all ${
                      activeCategory === i
                        ? 'text-purple-300 border-b-2 border-purple-400 bg-purple-500/10'
                        : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Emoji grid */}
              <div className="p-2 grid grid-cols-10 gap-0.5">
                {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onMouseDown={(e) => {
                      e.preventDefault(); // prevent stealing focus
                      insertEmoji(emoji, caption.id);
                    }}
                    className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-white/10 transition-all hover:scale-125 active:scale-100"
                    title={`Insert ${emoji} (animated)`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Footer hint */}
              <div className="px-3 py-1.5 border-t border-white/5 flex items-center gap-1.5">
                <span className="text-[9px] text-purple-400/70">✨ Powered by Noto Animated Emoji</span>
                <span className="text-[9px] text-gray-600 ml-auto">Animates live on canvas</span>
              </div>
            </div>
          )}
        </div>
      ))}

      {captions.length === 0 && (
        <div className="text-center text-gray-600 text-sm py-8">
          Generate captions to start editing.
        </div>
      )}
    </div>
  );
};

export default TranscriptEditor;
