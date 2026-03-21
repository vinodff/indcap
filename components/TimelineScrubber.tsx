import React, { useRef, useCallback, useEffect } from 'react';
import { Caption } from '../types';

interface TimelineScrubberProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  captions: Caption[];
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
}

const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  videoRef,
  captions,
  currentTime,
  isPlaying,
  onSeek
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const duration = videoRef.current?.duration || 1;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const seekToPosition = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = ratio * (videoRef.current?.duration || 0);
    onSeek(newTime);
  }, [videoRef, onSeek]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    seekToPosition(e.clientX);
  }, [seekToPosition]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) seekToPosition(e.clientX);
    };
    const handleMouseUp = () => { isDragging.current = false; };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [seekToPosition]);

  const formatTime = (t: number): string => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full px-4 py-3 bg-[#1a1a1a] border-t border-gray-800 select-none">
      {/* Time display */}
      <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1.5">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative w-full h-8 rounded-lg bg-gray-900 cursor-pointer group"
        onMouseDown={handleMouseDown}
      >
        {/* Caption blocks */}
        {captions.map((cap, i) => {
          const left = (cap.startTime / duration) * 100;
          const width = ((cap.endTime - cap.startTime) / duration) * 100;
          return (
            <div
              key={cap.id || i}
              className="absolute top-1 bottom-1 rounded bg-blue-500/30 border border-blue-500/20"
              style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
              title={cap.text}
            />
          );
        })}

        {/* Progress fill */}
        <div
          className="absolute top-0 left-0 h-full rounded-l-lg bg-blue-600/20"
          style={{ width: `${progress}%` }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-0.5 bg-blue-500 shadow-lg shadow-blue-500/50 z-10"
          style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-300 shadow-lg group-hover:scale-125 transition-transform" />
        </div>
      </div>
    </div>
  );
};

export default TimelineScrubber;
