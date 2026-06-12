import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Send, X, ChevronDown } from 'lucide-react';
import { Caption } from '../types';
import { applyCommand } from '../services/caption/chatEditor';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  'make the red',
  'bold INSANE',
  'remove like',
  'split at 4.5',
  'position top',
  'remove filler words',
  'add speaker colors',
  'uppercase NOW',
];

interface ChatEditPanelProps {
  captions: Caption[];
  currentTime: number;
  onCaptionsChange: (captions: Caption[]) => void;
  onClose: () => void;
}

export const ChatEditPanel: React.FC<ChatEditPanelProps> = ({
  captions,
  currentTime,
  onCaptionsChange,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Caption editor ready. Type a command or pick a suggestion.\n\nExamples: "make love red" · "bold NOW" · "split at 4.5" · "remove filler words"',
    },
  ]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;

      const userMsg: Message = { role: 'user', text: trimmed };
      const result = applyCommand(captions, trimmed, currentTime);

      setMessages(prev => [
        ...prev,
        userMsg,
        { role: 'assistant', text: result.message },
      ]);
      onCaptionsChange(result.captions);
      setInput('');
      setShowSuggestions(false);
    },
    [captions, currentTime, onCaptionsChange]
  );

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit(input);
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="flex flex-col w-80 h-96 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#16213e] border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-violet-400" />
          <span className="text-xs font-semibold text-white">Caption Editor</span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-xs">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-2.5 py-1.5 rounded-lg whitespace-pre-wrap break-words leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-none'
                  : 'bg-white/8 text-white/80 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {showSuggestions && (
        <div className="px-3 pb-1 flex flex-wrap gap-1">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => { setInput(s); inputRef.current?.focus(); setShowSuggestions(false); }}
              className="text-[10px] bg-white/8 hover:bg-violet-600/30 text-white/70 hover:text-white px-2 py-0.5 rounded-full transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-1.5 px-2 py-2 border-t border-white/10 flex-shrink-0">
        <button
          onClick={() => setShowSuggestions(v => !v)}
          title="Show suggestions"
          className="text-white/40 hover:text-violet-400 transition-colors flex-shrink-0"
        >
          <ChevronDown size={14} className={showSuggestions ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a command…"
          className="flex-1 bg-white/6 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-violet-500/60 transition-colors"
          autoFocus
        />
        <button
          onClick={() => submit(input)}
          disabled={!input.trim()}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-violet-600 hover:bg-violet-500 disabled:opacity-30 rounded-lg transition-colors"
        >
          <Send size={12} className="text-white" />
        </button>
      </div>
    </div>
  );
};
