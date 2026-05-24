/**
 * MotionTimeline — single-track horizontal timeline for motion beats.
 *
 * Each beat is a colored block (color = primitive type). Interactions:
 *   - click to select
 *   - drag block body to move (clamped to [0, duration - beatLen])
 *   - drag block edges to resize (min length 0.1s)
 *   - click timeline background to scrub
 *   - keyboard: Delete removes selected beat
 *
 * Parent owns the data: passes beats + duration + currentTime + selectedId.
 * Notifies via callbacks on every mutation. We never mutate beats in place.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { MotionBeat } from '../../services/motionGraphicsService';
import { PRIMITIVE_COLORS, PRIMITIVE_LABELS } from '../../services/motionGraphicsService';

interface Props {
  beats: MotionBeat[];
  duration: number;
  currentTime: number;
  selectedBeatId: string | null;
  onSelectBeat: (id: string | null) => void;
  onUpdateBeat: (beat: MotionBeat) => void;
  onDeleteBeat: (id: string) => void;
  onSeek: (t: number) => void;
}

type DragMode = 'move' | 'resize-left' | 'resize-right';

interface DragState {
  beatId: string;
  mode: DragMode;
  pointerStartX: number;
  beatStartTime: number;
  beatEndTime: number;
  /** trackWidth captured at pointerdown so window resize mid-drag doesn't break the offset. */
  trackPxWidth: number;
}

const MIN_BEAT_LEN = 0.1;

const formatTime = (t: number): string => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
};

export const MotionTimeline: React.FC<Props> = ({
  beats,
  duration,
  currentTime,
  selectedBeatId,
  onSelectBeat,
  onUpdateBeat,
  onDeleteBeat,
  onSeek,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const beginDrag = (beatId: string, mode: DragMode, ev: React.PointerEvent, b: MotionBeat) => {
    const w = trackRef.current?.clientWidth ?? 1;
    setDrag({
      beatId,
      mode,
      pointerStartX: ev.clientX,
      beatStartTime: b.startTime,
      beatEndTime: b.endTime,
      trackPxWidth: w,
    });
  };

  // Pointer move / up handlers for dragging.
  useEffect(() => {
    if (!drag) return;
    const onMove = (ev: PointerEvent) => {
      const deltaPx = ev.clientX - drag.pointerStartX;
      // Use the trackPxWidth captured at pointerdown, NOT the current width.
      const deltaSec = (deltaPx / drag.trackPxWidth) * duration;
      const beat = beats.find((b) => b.id === drag.beatId);
      if (!beat) return;
      let nextStart = beat.startTime;
      let nextEnd = beat.endTime;
      if (drag.mode === 'move') {
        const len = drag.beatEndTime - drag.beatStartTime;
        nextStart = Math.max(0, Math.min(duration - len, drag.beatStartTime + deltaSec));
        nextEnd = nextStart + len;
      } else if (drag.mode === 'resize-left') {
        nextStart = Math.max(0, Math.min(drag.beatEndTime - MIN_BEAT_LEN, drag.beatStartTime + deltaSec));
        nextEnd = drag.beatEndTime;
      } else if (drag.mode === 'resize-right') {
        nextEnd = Math.max(drag.beatStartTime + MIN_BEAT_LEN, Math.min(duration, drag.beatEndTime + deltaSec));
        nextStart = drag.beatStartTime;
      }
      onUpdateBeat({ ...beat, startTime: nextStart, endTime: nextEnd });
    };
    const onUp = () => setDrag(null);
    const onCancel = () => setDrag(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, beats, duration]);

  // Keyboard delete — scoped to the timeline only (not global). Backspace is
  // intentionally excluded — too easy to trigger via browser-back muscle memory.
  // The timeline div uses tabIndex so it can receive focus + key events.
  const handleTimelineKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!selectedBeatId) return;
    if (e.key === 'Delete') {
      e.preventDefault();
      onDeleteBeat(selectedBeatId);
    }
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Click on empty track area: deselect + seek.
    if (e.target !== trackRef.current) return;
    const rect = trackRef.current!.getBoundingClientRect();
    const sec = ((e.clientX - rect.left) / rect.width) * duration;
    onSelectBeat(null);
    onSeek(Math.max(0, Math.min(duration, sec)));
  };

  return (
    <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-300">Motion track</span>
          <span className="text-gray-500">{beats.length} beats</span>
        </div>
        <div className="flex items-center gap-3 text-gray-500">
          <span className="font-mono">{formatTime(currentTime)} / {formatTime(duration)}</span>
          {selectedBeatId && (
            <span className="text-fuchsia-400 font-bold">Selected · Delete to remove</span>
          )}
        </div>
      </div>

      {/* Ruler */}
      <div className="relative h-5 select-none">
        {Array.from({ length: 11 }).map((_, i) => {
          const f = i / 10;
          return (
            <div
              key={i}
              className="absolute top-0 flex flex-col items-center pointer-events-none"
              style={{ left: `${f * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-px h-2 bg-gray-700" />
              <span className="text-[9px] text-gray-600 font-mono mt-0.5">
                {formatTime(duration * f)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        onKeyDown={handleTimelineKeyDown}
        tabIndex={0}
        className="relative h-16 bg-[#050505] border border-gray-800 rounded-xl overflow-hidden cursor-crosshair focus:outline-none focus:ring-1 focus:ring-fuchsia-500/40"
      >
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-20 shadow-[0_0_8px_rgba(255,255,255,0.5)]"
          style={{ left: `${(currentTime / Math.max(0.01, duration)) * 100}%` }}
        />
        {/* Beat blocks */}
        {beats.map((b) => {
          const left = (b.startTime / duration) * 100;
          const width = ((b.endTime - b.startTime) / duration) * 100;
          const color = PRIMITIVE_COLORS[b.primitive];
          const selected = b.id === selectedBeatId;
          return (
            <div
              key={b.id}
              className={`absolute top-1 bottom-1 rounded-lg border transition-shadow ${
                selected ? 'shadow-[0_0_0_2px_rgba(244,114,182,0.9)] z-10' : 'shadow-none z-0'
              }`}
              style={{
                left: `${left}%`,
                width: `${Math.max(0.5, width)}%`,
                background: color + '33',
                borderColor: color,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelectBeat(b.id);
                beginDrag(b.id, 'move', e, b);
              }}
            >
              {/* Left resize handle */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelectBeat(b.id);
                  beginDrag(b.id, 'resize-left', e, b);
                }}
              />
              {/* Right resize handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/30"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelectBeat(b.id);
                  beginDrag(b.id, 'resize-right', e, b);
                }}
              />
              {/* Label */}
              <div
                className="absolute inset-x-2 top-1 truncate text-[10px] font-black tracking-wider uppercase pointer-events-none"
                style={{ color }}
              >
                {PRIMITIVE_LABELS[b.primitive]}
              </div>
              {b.params.text && (
                <div className="absolute inset-x-2 bottom-1 truncate text-[10px] text-white/80 pointer-events-none">
                  {b.params.text}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-gray-600">
        Click empty track to scrub · click a beat to select · drag body to move · drag edges to resize · Delete key removes
      </div>
    </div>
  );
};

export default MotionTimeline;
