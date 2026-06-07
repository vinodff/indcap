import React from 'react';
import type { WordAnimation } from '../services/typography/types';

interface WordTimelineProps {
  animations: WordAnimation[];
  selectedWordId: string | null;
  onSelectWord: (id: string) => void;
  totalDuration: number;
  currentTime?: number;
}

export const WordTimeline: React.FC<WordTimelineProps> = ({
  animations,
  selectedWordId,
  onSelectWord,
  totalDuration,
  currentTime = 0,
}) => {
  if (!totalDuration || animations.length === 0) {
    return null;
  }

  // Group words into visual blocks
  const timelineWidth = 100; // 100% width
  const pixelsPerSecond = timelineWidth / totalDuration;

  return (
    <div className="w-full space-y-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-gray-300">Timeline</h4>
        <span className="text-xs text-gray-500">
          {(currentTime / 1000).toFixed(2)}s / {totalDuration.toFixed(2)}s
        </span>
      </div>

      {/* Visual Timeline */}
      <div className="relative h-16 bg-gray-900 rounded border border-gray-700 overflow-hidden">
        {/* Progress line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10 transition-all"
          style={{
            left: `${(currentTime / 1000 / totalDuration) * 100}%`,
          }}
        />

        {/* Word blocks */}
        <div className="absolute inset-0 flex items-center">
          {animations.map((word) => {
            const startPercent = (word.startTime / 1000 / totalDuration) * 100;
            const widthPercent = (word.duration / 1000 / totalDuration) * 100;
            const isSelected = word.id === selectedWordId;

            return (
              <button
                key={word.id}
                onClick={() => onSelectWord(word.id)}
                className={`absolute h-12 rounded transition-all overflow-hidden text-center flex items-center justify-center text-xs font-medium truncate ${
                  isSelected
                    ? 'bg-blue-500 border-2 border-blue-300 z-20 scale-105'
                    : 'bg-gray-600 hover:bg-gray-500 border border-gray-500'
                }`}
                style={{
                  left: `${startPercent}%`,
                  width: `${Math.max(widthPercent, 2)}%`, // Minimum 2% width for visibility
                  color: isSelected ? 'white' : 'rgba(255,255,255,0.8)',
                }}
                title={`${word.text} (${(word.startTime / 1000).toFixed(2)}s)`}
              >
                <span className="px-1 truncate">{word.text}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time markers */}
      <div className="relative h-6 text-xs text-gray-500">
        {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => {
          const percent = (i / totalDuration) * 100;
          return (
            <div
              key={i}
              className="absolute top-0 text-center"
              style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
            >
              <div className="h-1 w-px bg-gray-600 mx-auto mb-1" />
              <span className="text-xs">{i}s</span>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs text-gray-400 pt-2">
        <div>
          <div className="text-gray-500 font-medium">Words</div>
          <div className="text-white">{animations.length}</div>
        </div>
        <div>
          <div className="text-gray-500 font-medium">Avg Duration</div>
          <div className="text-white">
            {(animations.reduce((sum, w) => sum + w.duration, 0) / animations.length / 1000).toFixed(2)}s
          </div>
        </div>
        <div>
          <div className="text-gray-500 font-medium">Coverage</div>
          <div className="text-white">
            {(
              (animations.reduce((sum, w) => sum + w.duration, 0) / 1000 / totalDuration) *
              100
            ).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
};
