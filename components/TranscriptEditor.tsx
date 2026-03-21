import React from 'react';
import { Caption } from '../types';

interface TranscriptEditorProps {
  captions: Caption[];
  updateCaption: (id: string, updates: Partial<Caption>) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const PRESET_COLORS = [
  'default', // Style's default color
  '#Facc15', // Yellow
  '#4ade80', // Green
  '#60a5fa', // Blue
  '#f87171', // Red
  '#c084fc', // Purple
  '#fb923c', // Orange
];

const TranscriptEditor: React.FC<TranscriptEditorProps> = ({ captions, updateCaption, videoRef }) => {
  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const cycleWordColor = (captionId: string, wordIndex: number, currentColors: string[] | undefined, wordCount: number) => {
    // Initialize array if it doesn't exist
    const newColors = currentColors ? [...currentColors] : Array(wordCount).fill('default');
    
    // Find next color
    const currentColor = newColors[wordIndex] || 'default';
    const currentIndex = PRESET_COLORS.indexOf(currentColor);
    const nextIndex = (currentIndex + 1) % PRESET_COLORS.length;
    
    newColors[wordIndex] = PRESET_COLORS[nextIndex];
    
    updateCaption(captionId, { wordColors: newColors });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
      <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl mb-4">
        <p className="text-xs text-blue-400">
          <strong className="font-bold text-blue-300">Pro Tip:</strong> Click on any word below to change its highlight color. Click the timestamp to jump to that moment in the video.
        </p>
      </div>

      {captions.map((caption, index) => {
        const words = caption.words || [];
        const wordColors = caption.wordColors || [];

        return (
          <div key={caption.id} className="bg-[#222] border border-white/5 rounded-xl p-3 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-gray-500 bg-black/50 px-2 py-0.5 rounded">
                Shot {index + 1}
              </span>
              <button 
                onClick={() => seekTo(caption.startTime)}
                className="text-[10px] font-mono text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
              >
                {caption.startTime.toFixed(1)}s - {caption.endTime.toFixed(1)}s
              </button>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {words.length > 0 ? (
                words.map((w, wIndex) => {
                  const color = wordColors[wIndex] && wordColors[wIndex] !== 'default' ? wordColors[wIndex] : undefined;
                  return (
                    <button
                      key={wIndex}
                      onClick={() => cycleWordColor(caption.id, wIndex, caption.wordColors, words.length)}
                      style={{ color: color || '#FFFFFF' }}
                      className={`text-sm font-semibold hover:bg-white/10 px-1 py-0.5 rounded transition-colors cursor-pointer ${!color ? 'opacity-80' : ''}`}
                    >
                      {w.text}
                    </button>
                  );
                })
              ) : (
                <span className="text-sm text-gray-400">{caption.text}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TranscriptEditor;
