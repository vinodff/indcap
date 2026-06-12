import React, { useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';

interface TimelineItem {
  id: string;
  type: 'text' | 'image';
  text: string;
  startTime: number; // seconds
  duration: number; // seconds
  color?: string;
}

interface TimelineEditorProps {
  items: TimelineItem[];
  totalDuration: number;
  currentTime: number;
  selectedId: string | null;
  playing: boolean;
  onSelectItem: (id: string) => void;
  onSeek: (time: number) => void;
  onPlayPause: () => void;
  onRestart: () => void;
}

export const TimelineEditor: React.FC<TimelineEditorProps> = ({
  items,
  totalDuration,
  currentTime,
  selectedId,
  playing,
  onSelectItem,
  onSeek,
  onPlayPause,
  onRestart,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  // Fixed scale, horizontally scrollable. The old `300 / totalDuration`
  // squeezed the ENTIRE timeline into 300px regardless of length, making
  // word blocks a few pixels wide and unclickable on longer reels.
  const pixelsPerSecond = 60;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pixelsPerSecond;
    onSeek(Math.max(0, Math.min(time, totalDuration)));
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-950 border-t border-gray-800">
      {/* Playback Controls */}
      <div className="h-12 flex items-center gap-3 px-4 border-b border-gray-800 bg-gray-900/50 flex-shrink-0">
        <button
          onClick={onRestart}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          title="Restart"
        >
          <RotateCcw size={16} className="text-gray-400" />
        </button>

        <button
          onClick={onPlayPause}
          className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
        >
          {playing ? (
            <Pause size={16} className="text-white" />
          ) : (
            <Play size={16} className="text-white" />
          )}
        </button>

        <div className="text-xs text-gray-400 font-mono min-w-16">
          {(currentTime / 1000).toFixed(2)}s / {totalDuration.toFixed(2)}s
        </div>

        <div className="flex-1" />

        <Volume2 size={16} className="text-gray-500" />
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 py-3">
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="relative h-20 rounded-lg border border-gray-700 bg-gray-900 cursor-pointer group"
          style={{
            minWidth: `${totalDuration * pixelsPerSecond}px`,
            width: Math.max(400, totalDuration * pixelsPerSecond),
          }}
        >
          {/* Grid lines */}
          {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-gray-800"
              style={{ left: `${i * pixelsPerSecond}px` }}
            >
              <span className="absolute top-0 left-0.5 text-xs text-gray-600 pointer-events-none">
                {i}s
              </span>
            </div>
          ))}

          {/* Timeline items (words/images) */}
          {items.map((item) => {
            const left = item.startTime * pixelsPerSecond;
            const width = Math.max(item.duration * pixelsPerSecond, 20);
            const isSelected = item.id === selectedId;

            return (
              <button
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectItem(item.id);
                }}
                className={`absolute top-2 bottom-2 rounded transition-all truncate text-xs font-medium cursor-pointer flex items-center px-2 ${
                  isSelected
                    ? `bg-blue-500 text-white border-2 border-blue-300 z-20 scale-y-110`
                    : item.type === 'text'
                      ? 'bg-violet-600/60 text-white hover:bg-violet-600/80 border border-violet-500/50'
                      : 'bg-amber-600/60 text-white hover:bg-amber-600/80 border border-amber-500/50'
                }`}
                style={{
                  left: `${left}px`,
                  width: `${width}px`,
                }}
                title={`${item.type === 'text' ? '✏️' : '🖼️'} ${item.text}`}
              >
                <span className="truncate">{item.text}</span>
              </button>
            );
          })}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
            style={{
              left: `${(currentTime / 1000) * pixelsPerSecond}px`,
            }}
          />

          {/* Progress bar */}
          <div
            className="absolute top-0 left-0 bottom-0 bg-blue-500/20 pointer-events-none transition-all"
            style={{
              width: `${((currentTime / 1000) / totalDuration) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="h-8 flex items-center gap-4 px-4 text-xs text-gray-500 border-t border-gray-800 bg-gray-900/30 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-violet-600" />
          Text
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-600" />
          Image
        </div>
      </div>
    </div>
  );
};
