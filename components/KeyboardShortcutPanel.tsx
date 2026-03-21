import React, { useState, useEffect, useCallback } from 'react';
import { Menu, ChevronDown, X, Check, Zap, RotateCcw, Play, MousePointer2, Settings2 } from 'lucide-react';

interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  defaultKey: string;
  category: 'playback' | 'editing' | 'navigation' | 'tools';
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Playback
  { id: 'toggle-play', name: 'Play/Pause', description: 'Toggle video playback', defaultKey: 'Space', category: 'playback' },
  { id: 'seek-backward', name: 'Seek Backward', description: 'Seek backward 5 seconds', defaultKey: 'ArrowLeft', category: 'playback' },
  { id: 'seek-forward', name: 'Seek Forward', description: 'Seek forward 5 seconds', defaultKey: 'ArrowRight', category: 'playback' },

  // Editing
  { id: 'split-caption', name: 'Split Caption', description: 'Split caption at playhead', defaultKey: 'S', category: 'editing' },
  { id: 'delete-caption', name: 'Delete Caption', description: 'Delete selected caption', defaultKey: 'Delete', category: 'editing' },
  { id: 'duplicate-caption', name: 'Duplicate Caption', description: 'Duplicate selected caption', defaultKey: 'D', category: 'editing' },
  { id: 'undo', name: 'Undo', description: 'Undo last action', defaultKey: 'Meta+Z', category: 'editing' },
  { id: 'redo', name: 'Redo', description: 'Redo last undone action', defaultKey: 'Meta+Shift+Z', category: 'editing' },

  // Navigation
  { id: 'select-previous', name: 'Select Previous Caption', description: 'Select previous caption in timeline', defaultKey: 'ArrowUp', category: 'navigation' },
  { id: 'select-next', name: 'Select Next Caption', description: 'Select next caption in timeline', defaultKey: 'ArrowDown', category: 'navigation' },
  { id: 'jump-to-start', name: 'Jump to Start', description: 'Jump to beginning of video', defaultKey: 'Home', category: 'navigation' },
  { id: 'jump-to-end', name: 'Jump to End', description: 'Jump to end of video', defaultKey: 'End', category: 'navigation' },

  // Tools
  { id: 'toggle-sticker-panel', name: 'Toggle Sticker Panel', description: 'Show/hide sticker panel', defaultKey: 'Shift+S', category: 'tools' },
  { id: 'toggle-style-customizer', name: 'Toggle Style Customizer', description: 'Show/hide style customizer panel', defaultKey: 'Shift+C', category: 'tools' },
  { id: 'toggle-transcript-editor', name: 'Toggle Transcript Editor', description: 'Show/hide transcript editor panel', defaultKey: 'Shift+T', category: 'tools' },
];

interface KeyboardShortcutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onShortcutChange: (shortcuts: Record<string, string>) => void;
}

const KeyboardShortcutPanel: React.FC<KeyboardShortcutPanelProps> = ({
  isOpen,
  onClose,
  onShortcutChange
}) => {
  const [shortcuts, setShortcuts] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<Record<string, string[]>>({});
  const [showAll, setShowAll] = useState(true);

  // Load shortcuts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('createrin_keyboard_shortcuts');
    if (saved) {
      try {
        setShortcuts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse keyboard shortcuts from localStorage', e);
      }
    }
  }, []);

  // Save shortcuts to localStorage when they change
  useEffect(() => {
    localStorage.setItem('createrin_keyboard_shortcuts', JSON.stringify(shortcuts));
    onShortcutChange(shortcuts);
  }, [shortcuts, onShortcutChange]);

  // Detect conflicts
  useEffect(() => {
    const newConflicts: Record<string, string[]> = {};
    const keyToIds: Record<string, string[]> = {};

    // Build mapping of key combinations to shortcut IDs
    Object.entries(shortcuts).forEach(([id, key]) => {
      if (!keyToIds[key]) {
        keyToIds[key] = [];
      }
      keyToIds[key].push(id);
    });

    // Find conflicts (keys mapped to more than one ID)
    Object.entries(keyToIds).forEach(([key, ids]) => {
      if (ids.length > 1) {
        ids.forEach(id => {
          if (!newConflicts[id]) {
            newConflicts[id] = [];
          }
          newConflicts[id].push(...ids.filter(otherId => otherId !== id));
        });
      }
    });

    setConflicts(newConflicts);
  }, [shortcuts]);

  // Get effective shortcut (custom or default)
  const getEffectiveShortcut = useCallback((id: string): string => {
    return shortcuts[id] || DEFAULT_SHORTCUTS.find(s => s.id === id)?.defaultKey || '';
  }, [shortcuts]);

  // Handle key input during editing
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (editingId) {
      e.preventDefault();
      const key = e.code;
      // Handle modifier keys
      const modifiers = [];
      if (e.ctrlKey || e.metaKey) modifiers.push('Meta');
      if (e.shiftKey) modifiers.push('Shift');
      if (e.altKey) modifiers.push('Alt');

      // Filter out modifier keys from the main key
      const mainKey = key.replace(/^(Control|Meta|Shift|Alt)$/, '');
      const keyParts = [...modifiers, mainKey].filter(Boolean);
      const keyCombination = keyParts.join('+');

      setShortcuts(prev => ({
        ...prev,
        [editingId]: keyCombination
      }));
      setEditingId(null);
    }
  }, [editingId, setShortcuts]);

  // Start editing a shortcut
  const startEditing = useCallback((id: string) => {
    setEditingId(id);
  }, []);

  // Reset shortcut to default
  const resetToDefault = useCallback((id: string) => {
    const defaultKey = DEFAULT_SHORTCUTS.find(s => s.id === id)?.defaultKey || '';
    setShortcuts(prev => ({
      ...prev,
      [id]: defaultKey
    }));
    setEditingId(null);
  }, [setShortcuts]);

  // Toggle category visibility
  const toggleCategory = useCallback((category: string) => {
    setShowAll(!showAll);
  }, [showAll]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-black text-white">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-800/50 transition-colors">
            <X size={20} className="text-gray-400 hover:text-white" />
          </button>
        </div>

        {/* Instructions */}
        <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-400">
            Click on a shortcut to customize it. Press the key combination you want to use.
            Modifier keys (Cmd/Ctrl, Shift, Alt) work automatically.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Changes are saved automatically and take effect immediately.
          </p>
        </div>

        {/* Conflicts warning */}
        {Object.keys(conflicts).length > 0 && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-800/50 rounded-lg">
            <div className="flex items-start gap-3">
              <Zap size={20} className="mt-1 text-red-400" />
              <div>
                <h3 className="font-black text-red-300 mb-2">Conflicts Detected</h3>
                <p className="text-sm text-red-400">
                  The following shortcuts have conflicts and may not work as expected:
                </p>
                <ul className="mt-2 text-xs space-y-1 pl-4 text-red-300">
                  {Object.entries(conflicts).map(([id, conflictIds]) => (
                    <li key={id}>
                      {DEFAULT_SHORTCUTS.find(s => s.id === id)?.name}: conflicts with
                      {conflictIds.map(cid =>
                        <span key={cid} className="font-bold">
                          {DEFAULT_SHORTCUTS.find(s => s.id === cid)?.name}
                        </span>
                      ).join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Shortcuts list */}
        <div className="space-y-4">
          {['playback', 'editing', 'navigation', 'tools'].map(category => (
            <div key={category} className={showAll ? 'block' : 'hidden'}>
              <div className="flex items-center gap-2 text-lg font-black text-white mb-4">
                {category === 'playback' && <Play size={20} className="text-blue-400" />}
                {category === 'editing' && <Zap size={20} className="text-yellow-400" />}
                {category === 'navigation' && <MousePointer2 size={20} className="text-green-400" />}
                {category === 'tools' && <Settings2 size={20} className="text-purple-400" />}
                <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
              </div>

              <div className="space-y-3">
                {DEFAULT_SHORTCUTS
                  .filter(shortcut => shortcut.category === category)
                  .map(shortcut => (
                    <div
                      key={shortcut.id}
                      className={`flex items-center gap-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50 transition-all hover:bg-gray-800 hover:border-gray-600 ${editingId === shortcut.id ? 'border-blue-500 bg-blue-900/30' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 flex items-center justify-center bg-gray-900/50 rounded-lg">
                              {shortcut.category === 'playback' && <Play size={16} className="text-blue-400" />}
                              {shortcut.category === 'editing' && <Zap size={16} className="text-yellow-400" />}
                              {shortcut.category === 'navigation' && <MousePointer2 size={16} className="text-green-400" />}
                              {shortcut.category === 'tools' && <Settings2 size={16} className="text-purple-400" />}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-black text-white">{shortcut.name}</h4>
                            <p className="text-xs text-gray-500">{shortcut.description}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {editingId === shortcut.id ? (
                          <div className="flex items-center gap-2 px-3 py-1 rounded bg-gray-900 border border-blue-500 text-blue-400 font-mono text-sm">
                            Press any key combination...
                            <button
                              onClick={() => setEditingId(null)}
                              className="ml-2 p-0.5 rounded hover:bg-blue-800/50 transition-colors"
                            >
                              <X size={14} className="text-blue-300" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1 rounded bg-gray-900/50 text-gray-400 font-mono text-sm hover:bg-gray-800/50 transition-colors cursor-pointer"
                            onClick={() => startEditing(shortcut.id)}
                          >
                            {getEffectiveShortcut(shortcut.id).split('+').map(part => (
                              <span key={part} className="px-2 py-0.5 rounded bg-gray-800/50 text-xs">
                                {part}
                              </span>
                            ))}
                          </div>
                        )}

                        {!conflicts[shortcut.id] && (
                          <button
                            onClick={() => resetToDefault(shortcut.id)}
                            className="p-1 rounded hover:bg-gray-800/50 transition-colors text-gray-500 hover:text-gray-300"
                          >
                            <RotateCcw size={16} className="text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {/* Show all / Show categories toggle */}
          <div className="mt-6 flex items-center gap-2 text-xs text-gray-500">
            <button
              onClick={() => setShowAll(true)}
              className={`flex-1 px-3 py-1.5 rounded bg-gray-800/50 text-white/70 hover:text-white hover:bg-gray-800 transition-colors ${showAll ? 'font-bold bg-gray-800' : ''}`}
            >
              Show All
            </button>
            <button
              onClick={() => setShowAll(false)}
              className={`flex-1 px-3 py-1.5 rounded bg-gray-800/50 text-white/70 hover:text-white hover:bg-gray-800 transition-colors ${!showAll ? 'font-bold bg-gray-800' : ''}`}
            >
              Show Categories
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutPanel;