import React, { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';

interface FindReplacePanelProps {
  totalMatches: number;
  onFind: (query: string) => void;
  onReplace: (find: string, replace: string, all: boolean) => void;
  onClose: () => void;
}

export const FindReplacePanel: React.FC<FindReplacePanelProps> = ({
  totalMatches,
  onFind,
  onReplace,
  onClose,
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');

  const handleFind = () => {
    onFind(findText);
  };

  const handleReplace = (replaceAll: boolean) => {
    onReplace(findText, replaceText, replaceAll);
    if (replaceAll) {
      setFindText('');
      setReplaceText('');
    }
  };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-96 bg-gray-800 rounded-lg border border-gray-700 shadow-xl p-4 space-y-3 z-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <RefreshCw size={16} />
          Find & Replace
        </h4>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X size={14} className="text-gray-400" />
        </button>
      </div>

      {/* Find */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-300">Find</label>
        <input
          type="text"
          value={findText}
          onChange={(e) => setFindText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleFind();
          }}
          placeholder="Search text..."
          className="w-full px-3 py-2 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
        />
        {findText && (
          <div className="text-xs text-gray-400">
            {totalMatches} match{totalMatches !== 1 ? 'es' : ''} found
          </div>
        )}
      </div>

      {/* Replace */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-300">Replace with</label>
        <input
          type="text"
          value={replaceText}
          onChange={(e) => setReplaceText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleReplace(false);
          }}
          placeholder="Replacement text..."
          className="w-full px-3 py-2 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => handleReplace(false)}
          disabled={!findText}
          className="flex-1 px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Replace
        </button>
        <button
          onClick={() => handleReplace(true)}
          disabled={!findText}
          className="flex-1 px-3 py-2 text-xs font-medium bg-blue-700 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Replace All
        </button>
      </div>

      {/* Keyboard Hint */}
      <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
        Press Enter to find • Ctrl+H to close
      </div>
    </div>
  );
};
