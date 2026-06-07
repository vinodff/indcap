import React, { useState } from 'react';
import { X, Edit2, Trash2, Copy, Search } from 'lucide-react';
import type { WordAnimation } from '../services/typography/types';

interface TextEditorPanelProps {
  animations: WordAnimation[];
  selectedWordId: string | null;
  onSelectWord: (id: string | null) => void;
  onUpdateWord: (id: string, text: string) => void;
  onDeleteWord: (id: string) => void;
  onDuplicateWord?: (id: string) => void;
  onOpenFindReplace?: () => void;
}

export const TextEditorPanel: React.FC<TextEditorPanelProps> = ({
  animations,
  selectedWordId,
  onSelectWord,
  onUpdateWord,
  onDeleteWord,
  onDuplicateWord,
  onOpenFindReplace,
}) => {
  const [editText, setEditText] = useState('');
  const selectedWord = selectedWordId
    ? animations.find(w => w.id === selectedWordId)
    : null;
  const selectedIndex = selectedWord
    ? animations.findIndex(w => w.id === selectedWordId)
    : -1;

  React.useEffect(() => {
    if (selectedWord) {
      setEditText(selectedWord.text);
    }
  }, [selectedWord]);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedWord || e.ctrlKey || e.metaKey) return;

      switch (e.key) {
        case 'ArrowUp':
          if (selectedIndex > 0) {
            e.preventDefault();
            onSelectWord(animations[selectedIndex - 1].id);
          }
          break;

        case 'ArrowDown':
          if (selectedIndex < animations.length - 1) {
            e.preventDefault();
            onSelectWord(animations[selectedIndex + 1].id);
          }
          break;

        case 'Delete':
          if (e.altKey) {
            e.preventDefault();
            onDeleteWord(selectedWord.id);
          }
          break;

        case 'Escape':
          e.preventDefault();
          onSelectWord(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWord, selectedIndex, animations, onSelectWord, onDeleteWord]);

  if (animations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        No text elements. Generate a reel first.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gray-800/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">Text Editor ({animations.length})</h3>
          {onOpenFindReplace && (
            <button
              onClick={onOpenFindReplace}
              className="p-1.5 hover:bg-gray-700 rounded transition-colors"
              title="Find & Replace (Ctrl+H)"
            >
              <Search size={14} className="text-gray-400 hover:text-blue-400" />
            </button>
          )}
        </div>
        <div className="text-xs text-gray-400 space-y-1">
          <div>• ↑↓ Navigate words</div>
          <div>• Enter to save text</div>
          <div>• Alt+Delete to remove</div>
          <div>• Esc to deselect • Ctrl+H to Find & Replace</div>
        </div>
      </div>

      {/* Word List */}
      <div className="flex-1 overflow-y-auto space-y-1 p-3">
        {animations.map((word) => (
          <button
            key={word.id}
            onClick={() => onSelectWord(word.id)}
            className={`w-full text-left p-3 rounded-lg transition-all ${
              selectedWordId === word.id
                ? 'bg-blue-600/30 border border-blue-500'
                : 'bg-gray-800 border border-gray-700 hover:bg-gray-750'
            }`}
          >
            <div className="font-mono font-semibold text-white text-sm mb-1">
              {word.text}
            </div>
            <div className="text-xs text-gray-400 space-y-0.5">
              <div>#{word.id.slice(0, 8)}</div>
              <div>{(word.startTime / 1000).toFixed(2)}s – {((word.startTime + word.duration) / 1000).toFixed(2)}s</div>
            </div>
          </button>
        ))}
      </div>

      {/* Text Editor */}
      {selectedWord && (
        <div className="border-t border-gray-800 p-4 space-y-4 bg-gray-800/50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-2">
              <Edit2 size={14} />
              EDIT TEXT
            </h4>
            <button
              onClick={() => onSelectWord(null)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <X size={14} className="text-gray-400" />
            </button>
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-300">Content</label>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={() => onUpdateWord(selectedWord.id, editText)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onUpdateWord(selectedWord.id, editText);
                }
              }}
              className="w-full px-3 py-2 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
              placeholder="Enter text..."
            />
            <div className="text-xs text-gray-500">
              {editText.length} characters • {editText.split(/\s+/).length} words
            </div>
          </div>

          {/* Word Properties */}
          <div className="space-y-3 border-t border-gray-700 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Start Time</label>
                <div className="px-2 py-1.5 text-xs bg-gray-600 text-gray-300 rounded">
                  {(selectedWord.startTime / 1000).toFixed(3)}s
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Duration</label>
                <div className="px-2 py-1.5 text-xs bg-gray-600 text-gray-300 rounded">
                  {(selectedWord.duration / 1000).toFixed(3)}s
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Font Size</label>
                <div className="px-2 py-1.5 text-xs bg-gray-600 text-gray-300 rounded">
                  {(selectedWord as any).fontSize || 'Auto'}px
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Emphasis</label>
                <div className="px-2 py-1.5 text-xs bg-gray-600 text-gray-300 rounded">
                  {(selectedWord as any).emphasis || 'Normal'}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-700">
            {onDuplicateWord && (
              <button
                onClick={() => onDuplicateWord(selectedWord.id)}
                className="flex-1 px-2 py-1.5 text-xs font-medium bg-blue-900/30 text-blue-400 rounded hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-1"
              >
                <Copy size={12} />
                Duplicate
              </button>
            )}
            <button
              onClick={() => onDeleteWord(selectedWord.id)}
              className="flex-1 px-2 py-1.5 text-xs font-medium bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 transition-colors flex items-center justify-center gap-1"
            >
              <Trash2 size={12} />
              Delete
            </button>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2 text-xs text-gray-400">
            <div className="bg-gray-700/50 p-2 rounded">
              <div className="font-medium mb-1">💡 Tips:</div>
              <ul className="space-y-1">
                <li>• Keep text short for visual clarity</li>
                <li>• Emojis work (🚀, ✨, 🔥, etc.)</li>
                <li>• Changes sync to preview instantly</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
