import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Caption } from '../types';
import { ZoomIn, ZoomOut, Scissors, Trash2, Copy } from 'lucide-react';

interface EnhancedTimelineProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    captions: Caption[];
    isPlaying: boolean;
    onSeek: (time: number) => void;
    onUpdateCaption: (id: string, updates: Partial<Caption>) => void;
    onDeleteCaption?: (id: string) => void;
    onSplitCaption?: (id: string, time: number) => void;
    onDuplicateCaption?: (id: string) => void;
    selectedCaptionId?: string | null;
    onSelectCaption?: (id: string | null) => void;

}

const TRACK_HEIGHT = 36;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;

const EnhancedTimeline: React.FC<EnhancedTimelineProps> = ({
    videoRef,
    captions,
    isPlaying,
    onSeek,
    onUpdateCaption,
    onDeleteCaption,
    onSplitCaption,
    onDuplicateCaption,
    selectedCaptionId,
    onSelectCaption,
}) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isDraggingPlayhead = useRef(false);
    const isDraggingCaption = useRef<{ id: string; type: 'move' | 'left' | 'right'; startX: number; startTime: number; startEnd: number } | null>(null);
    const [zoom, setZoom] = useState(1);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string; type: 'caption' } | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(10);

    // Compute virtual duration: max of video duration and latest caption endTime
    // This ensures the timeline covers all captions even when using a short/blank video
    const captionMaxTime = captions.length > 0
        ? Math.max(...captions.map(c => c.endTime)) + 2 // +2s padding after last caption
        : 0;

    const effectiveDuration = videoRef.current && duration > 0 ? duration : (
        captions.length > 0
            ? Math.max(...captions.map(c => c.endTime)) + 2
            : 10
    );
    const isSyntheticMode = !videoRef.current || !isFinite(duration) || duration < captionMaxTime;

    // Attach timeupdate + metadata listeners — use stable ref identity, not .current
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const updateTime = () => {
            if (!isSyntheticMode) setCurrentTime(video.currentTime);
        };
        const updateDuration = () => { if (video.duration && isFinite(video.duration)) setDuration(video.duration); };
        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('loadedmetadata', updateDuration);
        video.addEventListener('durationchange', updateDuration);
        updateTime();
        updateDuration();
        return () => {
            video.removeEventListener('timeupdate', updateTime);
            video.removeEventListener('loadedmetadata', updateDuration);
            video.removeEventListener('durationchange', updateDuration);
        };
    }, [videoRef, isSyntheticMode]);

    // RAF loop while playing for smooth playhead
    // In synthetic mode (blank/short video), drive a wall-clock timer instead of video.currentTime
    const syntheticStartRef = useRef<{ wallStart: number; timeStart: number } | null>(null);

    useEffect(() => {
        if (!isPlaying) {
            syntheticStartRef.current = null;
            return;
        }
        let rafId: number;

        if (isSyntheticMode) {
            // Synthetic clock: advance currentTime using wall-clock elapsed time
            if (!syntheticStartRef.current) {
                syntheticStartRef.current = { wallStart: performance.now(), timeStart: currentTime };
            }
            const tick = () => {
                const elapsed = (performance.now() - syntheticStartRef.current!.wallStart) / 1000;
                const newTime = syntheticStartRef.current!.timeStart + elapsed;
                if (newTime >= effectiveDuration) {
                    setCurrentTime(0);
                    syntheticStartRef.current = { wallStart: performance.now(), timeStart: 0 };
                } else {
                    setCurrentTime(newTime);
                }
                rafId = requestAnimationFrame(tick);
            };
            rafId = requestAnimationFrame(tick);
        } else {
            const tick = () => {
                const video = videoRef.current;
                if (video) setCurrentTime(video.currentTime);
                rafId = requestAnimationFrame(tick);
            };
            rafId = requestAnimationFrame(tick);
        }
        return () => cancelAnimationFrame(rafId);
    }, [isPlaying, videoRef, isSyntheticMode, effectiveDuration]);

    const progress = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

    const formatTime = (t: number): string => {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60);
        const ms = Math.floor((t % 1) * 10);
        return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
    };

    const getTimeFromX = useCallback((clientX: number): number => {
        const track = trackRef.current;
        if (!track) return 0;
        const rect = track.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return ratio * effectiveDuration;
    }, [effectiveDuration]);

    // Playhead drag
    const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        isDraggingPlayhead.current = true;
        const t = getTimeFromX(e.clientX);
        setCurrentTime(t);
        onSeek(t);
    }, [getTimeFromX, onSeek]);

    // Track click to seek
    const handleTrackMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('[data-caption-block]')) return;
        isDraggingPlayhead.current = true;
        const t = getTimeFromX(e.clientX);
        setCurrentTime(t);
        onSeek(t);
        onSelectCaption?.(null);
    }, [getTimeFromX, onSeek, onSelectCaption]);

    // Caption block drag
    const handleCaptionMouseDown = useCallback((e: React.MouseEvent, caption: Caption, type: 'move' | 'left' | 'right') => {
        e.stopPropagation();
        isDraggingCaption.current = {
            id: caption.id,
            type,
            startX: e.clientX,
            startTime: caption.startTime,
            startEnd: caption.endTime,
        };
        onSelectCaption?.(caption.id);
    }, [onSelectCaption]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingPlayhead.current) {
                const t = getTimeFromX(e.clientX);
                setCurrentTime(t);
                onSeek(t);
                return;
            }
            if (isDraggingCaption.current) {
                const { id, type, startX, startTime, startEnd } = isDraggingCaption.current;
                const track = trackRef.current;
                if (!track) return;
                const rect = track.getBoundingClientRect();
                const dx = e.clientX - startX;
                const dtRatio = dx / rect.width;
                const dt = dtRatio * effectiveDuration;

                if (type === 'move') {
                    const newStart = Math.max(0, startTime + dt);
                    const captionDuration = startEnd - startTime;
                    const newEnd = Math.min(effectiveDuration, newStart + captionDuration);
                    onUpdateCaption(id, {
                        startTime: Math.max(0, newEnd - captionDuration),
                        endTime: newEnd,
                    });
                } else if (type === 'left') {
                    const newStart = Math.max(0, Math.min(startEnd - 0.1, startTime + dt));
                    onUpdateCaption(id, { startTime: newStart });
                } else if (type === 'right') {
                    const newEnd = Math.max(startTime + 0.1, Math.min(effectiveDuration, startEnd + dt));
                    onUpdateCaption(id, { endTime: newEnd });
                }
            }
        };

        const handleMouseUp = () => {
            isDraggingPlayhead.current = false;
            isDraggingCaption.current = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [getTimeFromX, onSeek, onUpdateCaption, effectiveDuration]);

    // Zoom with scroll wheel
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z - e.deltaY * 0.01)));
        }
    }, []);

    // Context menu — Bug 11 Fix: clamp position so menu stays within screen
    const handleCaptionRightClick = useCallback((e: React.MouseEvent, captionId: string) => {
        e.preventDefault();
        const MENU_W = 170;
        const MENU_H = 140;
        const x = Math.min(e.clientX, window.innerWidth - MENU_W - 8);
        const y = Math.min(e.clientY, window.innerHeight - MENU_H - 8);
        setContextMenu({ x, y, itemId: captionId, type: 'caption' });
    }, []);



    useEffect(() => {
        const close = () => setContextMenu(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    // Auto-scroll playhead into view
    useEffect(() => {
        const scroll = scrollRef.current;
        if (!scroll || !isPlaying) return;
        const playheadX = (currentTime / effectiveDuration) * scroll.scrollWidth;
        const viewLeft = scroll.scrollLeft;
        const viewRight = viewLeft + scroll.clientWidth;
        if (playheadX < viewLeft + 50 || playheadX > viewRight - 50) {
            scroll.scrollLeft = playheadX - scroll.clientWidth / 2;
        }
    }, [currentTime, effectiveDuration, isPlaying]);

    // Generate time ruler ticks
    const generateTicks = () => {
        const ticks = [];
        const step = zoom < 1 ? 10 : zoom < 2 ? 5 : zoom < 4 ? 2 : 1;
        for (let t = 0; t <= effectiveDuration; t += step) {
            const left = (t / effectiveDuration) * 100;
            ticks.push(
                <div
                    key={t}
                    className="absolute top-0 flex flex-col items-center"
                    style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
                >
                    <div className="w-px h-2 bg-gray-600" />
                    <span className="text-[9px] font-mono text-gray-500 mt-0.5 whitespace-nowrap">
                        {formatTime(t)}
                    </span>
                </div>
            );
        }
        return ticks;
    };

    // Caption color by sentiment
    const getCaptionColor = (caption: Caption) => {
        switch (caption.sentiment) {
            case 'energetic': return { bg: 'bg-orange-500/40', border: 'border-orange-500/60', text: 'text-orange-200' };
            case 'joyful': return { bg: 'bg-yellow-500/40', border: 'border-yellow-500/60', text: 'text-yellow-200' };
            case 'calm': return { bg: 'bg-blue-500/40', border: 'border-blue-500/60', text: 'text-blue-200' };
            case 'serious': return { bg: 'bg-red-500/40', border: 'border-red-500/60', text: 'text-red-200' };
            default: return { bg: 'bg-blue-500/30', border: 'border-blue-500/50', text: 'text-blue-100' };
        }
    };

    return (
        <div className="w-full bg-[#0f0f0f] border-t border-gray-800 select-none" onWheel={handleWheel}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50">
                <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-gray-500 mr-2">
                        {formatTime(currentTime)} / {formatTime(effectiveDuration)}
                    </span>
                    {selectedCaptionId && (
                        <>
                            {onSplitCaption && (
                                <button
                                    onClick={() => onSplitCaption(selectedCaptionId, currentTime)}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-[10px] font-bold transition-colors"
                                    title="Split at playhead (S)"
                                >
                                    <Scissors size={11} /> Split
                                </button>
                            )}
                            {onDuplicateCaption && (
                                <button
                                    onClick={() => onDuplicateCaption(selectedCaptionId)}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-[10px] font-bold transition-colors"
                                    title="Duplicate"
                                >
                                    <Copy size={11} /> Dupe
                                </button>
                            )}
                            {onDeleteCaption && (
                                <button
                                    onClick={() => { onDeleteCaption(selectedCaptionId); onSelectCaption?.(null); }}
                                    className="flex items-center gap-1 px-2 py-1 rounded bg-red-900/40 hover:bg-red-900/70 text-red-400 hover:text-red-300 text-[10px] font-bold transition-colors"
                                    title="Delete (Del)"
                                >
                                    <Trash2 size={11} /> Delete
                                </button>
                            )}
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600 font-mono">{Math.round(zoom * 100)}%</span>
                    <button
                        onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.5))}
                        className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut size={12} />
                    </button>
                    <input
                        type="range"
                        min={MIN_ZOOM}
                        max={MAX_ZOOM}
                        step={0.1}
                        value={zoom}
                        onChange={e => setZoom(parseFloat(e.target.value))}
                        className="w-20 h-1 bg-gray-700 rounded accent-blue-500 cursor-pointer"
                    />
                    <button
                        onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.5))}
                        className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                        title="Zoom In"
                    >
                        <ZoomIn size={12} />
                    </button>
                </div>
            </div>

            {/* Scrollable Timeline */}
            <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden custom-scrollbar">
                <div style={{ width: `${100 * zoom}%`, minWidth: '100%' }}>
                    {/* Time Ruler */}
                    <div className="relative h-7 border-b border-gray-800/50 mx-4">
                        {generateTicks()}
                    </div>

                    {/* Caption Track */}
                    <div
                        ref={trackRef}
                        className="relative mx-4 cursor-pointer"
                        style={{ height: `${TRACK_HEIGHT + 8}px` }}
                        onMouseDown={handleTrackMouseDown}
                    >
                        {/* Track background */}
                        <div className="absolute inset-0 rounded-lg bg-gray-900/50" />

                        {/* Caption blocks */}
                        {captions.map((cap) => {
                            const left = (cap.startTime / effectiveDuration) * 100;
                            const width = ((cap.endTime - cap.startTime) / effectiveDuration) * 100;
                            const isSelected = selectedCaptionId === cap.id;
                            const colors = getCaptionColor(cap);

                            return (
                                <div
                                    key={cap.id}
                                    data-caption-block="true"
                                    className={`absolute top-1 rounded-md border overflow-hidden group transition-all cursor-grab active:cursor-grabbing ${colors.bg} ${colors.border} ${isSelected ? 'ring-1 ring-white/50 shadow-lg' : 'hover:brightness-125'}`}
                                    style={{
                                        left: `${left}%`,
                                        width: `${Math.max(width, 0.5)}%`,
                                        height: `${TRACK_HEIGHT}px`,
                                    }}
                                    onMouseDown={(e) => handleCaptionMouseDown(e, cap, 'move')}
                                    onContextMenu={(e) => handleCaptionRightClick(e, cap.id)}
                                    onClick={(e) => { e.stopPropagation(); onSelectCaption?.(cap.id); }}
                                    title={cap.text}
                                >
                                    {/* Left resize handle */}
                                    <div
                                        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/20 hover:bg-white/40 transition-colors z-10 flex items-center justify-center"
                                        onMouseDown={(e) => { e.stopPropagation(); handleCaptionMouseDown(e, cap, 'left'); }}
                                    >
                                        <div className="w-px h-3 bg-white/60" />
                                    </div>

                                    {/* Caption text */}
                                    <div className={`absolute inset-0 flex items-center px-3 pointer-events-none`}>
                                        <span className={`text-[9px] font-bold truncate ${colors.text}`}>
                                            {cap.text}
                                        </span>
                                    </div>

                                    {/* Right resize handle */}
                                    <div
                                        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-white/20 hover:bg-white/40 transition-colors z-10 flex items-center justify-center"
                                        onMouseDown={(e) => { e.stopPropagation(); handleCaptionMouseDown(e, cap, 'right'); }}
                                    >
                                        <div className="w-px h-3 bg-white/60" />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Playhead */}
                        <div
                            className="absolute top-0 h-full w-0.5 bg-red-500 shadow-lg shadow-red-500/50 z-20 cursor-ew-resize pointer-events-none"
                            style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
                        >
                            <div
                                className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500 pointer-events-auto"
                                onMouseDown={handlePlayheadMouseDown}
                            />
                        </div>
                    </div>

                    {/* Bottom padding */}
                    <div className="h-4" />
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && contextMenu.type === 'caption' && (
                <div
                    className="fixed z-50 bg-[#1e1e1e] border border-gray-700 rounded-xl shadow-2xl py-1 min-w-[160px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={e => e.stopPropagation()}
                >
                    {onSplitCaption && (
                        <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                            onClick={() => { onSplitCaption(contextMenu.itemId, currentTime); setContextMenu(null); }}
                        >
                            <Scissors size={13} /> Split at Playhead
                        </button>
                    )}
                    {onDuplicateCaption && (
                        <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                            onClick={() => { onDuplicateCaption(contextMenu.itemId); setContextMenu(null); }}
                        >
                            <Copy size={13} /> Duplicate
                        </button>
                    )}
                    <div className="border-t border-gray-700 my-1" />
                    {onDeleteCaption && (
                        <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-colors"
                            onClick={() => { onDeleteCaption(contextMenu.itemId); onSelectCaption?.(null); setContextMenu(null); }}
                        >
                            <Trash2 size={13} /> Delete Caption
                        </button>
                    )}
                </div>
            )}


        </div>
    );
};

export default EnhancedTimeline;
