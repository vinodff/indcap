import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Caption, Keyframe, KeyframeMap } from '../types';
import { upsertKeyframe, removeKeyframe } from '../services/caption/keyframeEngine';
import { ZoomIn, ZoomOut, Scissors, Trash2, Copy, Diamond, Film, Zap, X } from 'lucide-react';
import type { SfxCue, SfxSource } from '../services/audio/soundDesign';
import { cueSoundName } from '../services/audio/soundDesign/cueEdits';
import type { CameraKeyframe, CameraMoveKind } from '../services/camera';
import type { TimelineSelection } from './timeline/trackModel';

// Per-source colour for SFX cue markers on the timeline.
// Muted marker palettes — hue still distinguishes source/move type, but
// desaturated so tiny markers don't turn the timeline into confetti.
const SFX_SOURCE_COLOR: Record<SfxSource, string> = {
  motion: '#8b7ec8', texture: '#4fa3a5', hit: '#c98383',
  riser: '#c2a35f', semantic: '#5fa97f', manual: '#d1d5db',
};

// Per-move colour for camera keyframe markers.
const CAM_KIND_COLOR: Record<CameraMoveKind, string> = {
  'punch-in': '#b57d9d', 'zoom-in': '#4fa3a5', 'zoom-out': '#6aa1c8',
  establish: '#8fae6a', pan: '#c2a35f', hold: '#94a3b8',
  'crash-zoom': '#c98383', 'whip-pan': '#c99a5f', dutch: '#a68cc2', shake: '#c08a94',
};

type Sentiment = 'energetic' | 'joyful' | 'calm' | 'serious';

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
    keyframeMap?: KeyframeMap;
    onKeyframeMapChange?: (map: KeyframeMap) => void;
    beatGrid?: import('../services/typographyReel/types').BeatGrid;
    // Resources track props
    autoMotionEnabled?: boolean;
    autoSfxEnabled?: boolean;
    entryAnimation?: string;
    wordHighlight?: string;
    // Dynamic SFX cue track (auto-generated; markers open an edit popover).
    sfxTrack?: SfxCue[];
    onDeleteSfxCue?: (id: string) => void;
    onSwapSfxCue?: (id: string, dir: 1 | -1) => void;
    onAdjustSfxCueGain?: (id: string, gain: number) => void;
    onToggleSfxCueMuted?: (id: string) => void;
    onPreviewSfxCue?: (id: string) => void;
    // AI Auto-Camera keyframe track (auto-generated; markers are click-to-delete).
    cameraTrack?: CameraKeyframe[];
    onDeleteCameraKeyframe?: (id: string) => void;
    // CapCut-style unified selection — clicking any clip routes the inspector.
    selection?: TimelineSelection | null;
    onSelectObject?: (sel: TimelineSelection | null) => void;
}

const TRACK_HEIGHT = 28;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 8;

const SENTIMENT_META: Record<string, { emoji: string; label: string; bg: string; border: string; text: string }> = {
    energetic: { emoji: '⚡', label: 'Energetic', bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-gray-200' },
    joyful:    { emoji: '😊', label: 'Joyful',    bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-gray-200' },
    calm:      { emoji: '🌊', label: 'Calm',       bg: 'bg-blue-500/20',   border: 'border-blue-500/30',   text: 'text-gray-200' },
    serious:   { emoji: '🎯', label: 'Serious',    bg: 'bg-red-500/15',    border: 'border-red-500/30',    text: 'text-gray-200' },
};
const ALL_SENTIMENTS: Sentiment[] = ['energetic', 'joyful', 'calm', 'serious'];

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
    keyframeMap,
    onKeyframeMapChange,
    beatGrid,
    autoMotionEnabled = true,
    autoSfxEnabled = true,
    entryAnimation,
    wordHighlight,
    sfxTrack = [],
    onDeleteSfxCue,
    onSwapSfxCue,
    onAdjustSfxCueGain,
    onToggleSfxCueMuted,
    onPreviewSfxCue,
    cameraTrack = [],
    onDeleteCameraKeyframe,
    selection = null,
    onSelectObject,
}) => {
    const trackRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
    const isDraggingPlayhead = useRef(false);
    const isDraggingCaption = useRef<{ id: string; type: 'move' | 'left' | 'right'; startX: number; startTime: number; startEnd: number } | null>(null);
    const isDraggingWord = useRef<{ captionId: string; wordIdx: number; type: 'move' | 'left' | 'right'; startX: number; startWordStart: number; startWordEnd: number } | null>(null);
    const isDraggingKeyframe = useRef<{ captionId: string; kf: Keyframe } | null>(null);
    const [editingKf, setEditingKf] = useState<{ captionId: string; kf: Keyframe; screenX: number; screenY: number } | null>(null);
    const [zoom, setZoom] = useState(1);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; itemId: string; type: 'caption' } | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(10);
    // Resource popover — click a B-roll/SFX block to edit or delete it
    const [resourcePopover, setResourcePopover] = useState<{ captionId: string; type: 'broll' | 'sfx' | 'anim'; screenX: number; screenY: number } | null>(null);
    // SFX cue edit popover — click a cue marker to swap sound / volume / mute / delete.
    const [sfxCuePopover, setSfxCuePopover] = useState<{ id: string; screenX: number; screenY: number } | null>(null);

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

    // Word block drag (fine-tunes word.start / word.end inside a caption)
    const handleWordMouseDown = useCallback((e: React.MouseEvent, caption: Caption, wordIdx: number, type: 'move' | 'left' | 'right') => {
        e.stopPropagation();
        const word = caption.words![wordIdx];
        isDraggingWord.current = {
            captionId: caption.id,
            wordIdx,
            type,
            startX: e.clientX,
            startWordStart: word.start,
            startWordEnd: word.end,
        };
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingPlayhead.current) {
                const t = getTimeFromX(e.clientX);
                setCurrentTime(t);
                onSeek(t);
                return;
            }
            if (isDraggingKeyframe.current && keyframeMap && onKeyframeMapChange) {
                const { captionId, kf } = isDraggingKeyframe.current;
                const caption = captions.find(c => c.id === captionId);
                if (caption) {
                    const newTime = Math.max(caption.startTime, Math.min(caption.endTime, getTimeFromX(e.clientX)));
                    const removed = removeKeyframe(keyframeMap, captionId, kf.time);
                    const updated: Keyframe = { ...kf, time: newTime };
                    onKeyframeMapChange(upsertKeyframe(removed, captionId, updated));
                    isDraggingKeyframe.current = { captionId, kf: updated };
                }
                return;
            }
            if (isDraggingWord.current) {
                const { captionId, wordIdx, type, startX, startWordStart, startWordEnd } = isDraggingWord.current;
                const track = trackRef.current;
                if (!track) return;
                const rect = track.getBoundingClientRect();
                const dt = ((e.clientX - startX) / rect.width) * effectiveDuration;
                const caption = captions.find(c => c.id === captionId);
                if (!caption?.words) return;
                const updatedWords = [...caption.words];
                const word = { ...updatedWords[wordIdx] };
                const wordDur = startWordEnd - startWordStart;
                if (type === 'move') {
                    const newStart = Math.max(caption.startTime, Math.min(caption.endTime - wordDur, startWordStart + dt));
                    word.start = newStart;
                    word.end = newStart + wordDur;
                } else if (type === 'left') {
                    word.start = Math.max(caption.startTime, Math.min(startWordEnd - 0.05, startWordStart + dt));
                } else if (type === 'right') {
                    word.end = Math.max(startWordStart + 0.05, Math.min(caption.endTime, startWordEnd + dt));
                }
                updatedWords[wordIdx] = word;
                onUpdateCaption(captionId, { words: updatedWords });
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

                // Snap a time value to the nearest beat within 80ms tolerance
                const snapBeat = (t: number): number => {
                    if (!beatGrid || beatGrid.beats.length === 0) return t;
                    const TOL = 0.08;
                    let lo = 0, hi = beatGrid.beats.length - 1;
                    while (lo < hi) {
                        const mid = (lo + hi) >> 1;
                        if (beatGrid.beats[mid] < t) lo = mid + 1; else hi = mid;
                    }
                    const candidates = [beatGrid.beats[lo], beatGrid.beats[Math.max(0, lo - 1)]];
                    let best = t, bestDist = TOL;
                    for (const c of candidates) {
                        const d = Math.abs(c - t);
                        if (d < bestDist) { best = c; bestDist = d; }
                    }
                    return best;
                };

                if (type === 'move') {
                    const newStart = snapBeat(Math.max(0, startTime + dt));
                    const captionDuration = startEnd - startTime;
                    const newEnd = Math.min(effectiveDuration, newStart + captionDuration);
                    onUpdateCaption(id, {
                        startTime: Math.max(0, newEnd - captionDuration),
                        endTime: newEnd,
                    });
                } else if (type === 'left') {
                    const newStart = snapBeat(Math.max(0, Math.min(startEnd - 0.1, startTime + dt)));
                    onUpdateCaption(id, { startTime: newStart });
                } else if (type === 'right') {
                    const newEnd = snapBeat(Math.max(startTime + 0.1, Math.min(effectiveDuration, startEnd + dt)));
                    onUpdateCaption(id, { endTime: newEnd });
                }
            }
        };

        const handleMouseUp = () => {
            isDraggingPlayhead.current = false;
            isDraggingCaption.current = null;
            isDraggingWord.current = null;
            isDraggingKeyframe.current = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [getTimeFromX, onSeek, onUpdateCaption, effectiveDuration, captions, keyframeMap, onKeyframeMapChange, beatGrid]);

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

    // Keep waveform canvas pixel-width in sync with its layout width
    useEffect(() => {
        const canvas = waveformCanvasRef.current;
        if (!canvas) return;
        const ro = new ResizeObserver(entries => {
            for (const e of entries) {
                canvas.width = Math.round(e.contentRect.width);
                // Trigger redraw by dispatching a synthetic event handled below
                canvas.dispatchEvent(new Event('resize'));
            }
        });
        ro.observe(canvas);
        return () => ro.disconnect();
    }, []);

    // Waveform + beat marker canvas
    useEffect(() => {
        const canvas = waveformCanvasRef.current;
        if (!canvas || !beatGrid) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // Waveform — mirrored bars from the vertical centre
        const midY = H / 2;
        const barW = Math.max(1, W / beatGrid.waveform.length);
        ctx.fillStyle = 'rgba(71,85,105,0.55)'; // slate-600 semi-transparent
        for (let i = 0; i < beatGrid.waveform.length; i++) {
            const amp = beatGrid.waveform[i]; // 0..1
            const barH = amp * midY * 0.92;
            const x = (i / beatGrid.waveform.length) * W;
            ctx.fillRect(x, midY - barH, barW, barH * 2);
        }

        // Beat tick marks — thin, quiet vertical lines
        ctx.strokeStyle = 'rgba(148,163,184,0.30)'; // slate-400, subdued
        ctx.lineWidth = 1;
        for (const beat of beatGrid.beats) {
            const x = Math.round((beat / beatGrid.duration) * W);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
            ctx.stroke();
        }
    }, [beatGrid, zoom]);

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
            case 'energetic': return { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-gray-200' };
            case 'joyful': return { bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', text: 'text-gray-200' };
            case 'calm': return { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-gray-200' };
            case 'serious': return { bg: 'bg-red-500/15', border: 'border-red-500/30', text: 'text-gray-200' };
            default: return { bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-gray-200' };
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

                    {/* Waveform + beat markers — shown when beat analysis is ready */}
                    <div className="relative mx-4 mt-0.5" style={{ height: 24 }}>
                        <canvas
                            ref={waveformCanvasRef}
                            height={24}
                            className="absolute inset-0 w-full h-full rounded"
                            style={{ display: beatGrid ? 'block' : 'none' }}
                        />
                        {!beatGrid && (
                            <div className="absolute inset-0 rounded bg-gray-900/30 flex items-center justify-center">
                                <span className="text-[8px] text-gray-700 font-mono tracking-widest uppercase">
                                    waveform — analyzing…
                                </span>
                            </div>
                        )}
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

                    {/* ── RESOURCES TRACK ── B-roll, SFX ── */}
                    {(autoMotionEnabled || autoSfxEnabled) && captions.length > 0 && (
                        <div className="mx-4 mt-1 space-y-0.5">

                            {/* B-roll track */}
                            {autoMotionEnabled && (
                                <div className="relative flex items-center" style={{ height: 20 }}>
                                    <span className="absolute -left-0 text-[7px] font-semibold text-gray-500 uppercase tracking-widest z-10 pointer-events-none">B-Roll</span>
                                    <div className="absolute inset-0 rounded bg-gray-900/30" />
                                    {captions.map(cap => {
                                        const left = (cap.startTime / effectiveDuration) * 100;
                                        const width = ((cap.endTime - cap.startTime) / effectiveDuration) * 100;
                                        const disabled = !!cap.brollDisabled;
                                        const meta = SENTIMENT_META[cap.sentiment ?? 'calm'] ?? SENTIMENT_META.calm;
                                        const isSel = selection?.kind === 'broll' && selection.id === cap.id;
                                        return (
                                            <div
                                                key={cap.id}
                                                title={disabled ? 'B-roll disabled — click to edit' : `B-roll: ${meta.label} — click to edit`}
                                                className={`absolute top-0.5 rounded border cursor-pointer group transition-all ${disabled ? 'bg-gray-800/60 border-gray-700/50 opacity-40' : `${meta.bg} ${meta.border}`} ${isSel ? 'ring-2 ring-white z-10' : ''}`}
                                                style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%`, height: 16 }}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    onSelectObject?.({ kind: 'broll', id: cap.id });
                                                }}
                                            >
                                                <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-bold gap-0.5 pointer-events-none ${disabled ? 'text-gray-500' : meta.text}`}>
                                                    <span>{meta.emoji}</span>
                                                    <span className="truncate hidden sm:inline">{meta.label}</span>
                                                </span>
                                                {/* Delete button */}
                                                {!disabled && (
                                                    <button
                                                        className="absolute right-0 top-0 bottom-0 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white/60 hover:text-red-400 hover:bg-red-900/40 rounded-r transition-all z-10"
                                                        onClick={e => { e.stopPropagation(); onUpdateCaption(cap.id, { brollDisabled: true }); }}
                                                        title="Remove B-roll for this caption"
                                                    >
                                                        <X size={8} />
                                                    </button>
                                                )}
                                                {disabled && (
                                                    <button
                                                        className="absolute right-0 top-0 bottom-0 w-4 flex items-center justify-center opacity-0 group-hover:opacity-100 text-white/30 hover:text-green-400 hover:bg-green-900/30 rounded-r transition-all z-10"
                                                        onClick={e => { e.stopPropagation(); onUpdateCaption(cap.id, { brollDisabled: false }); }}
                                                        title="Re-enable B-roll for this caption"
                                                    >
                                                        <Film size={8} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* SFX cue track — real auto-generated cues, colour-coded by source.
                                Click a marker to delete that cue. */}
                            {autoSfxEnabled && (
                                <div className="relative flex items-center" style={{ height: 22 }}>
                                    <span className="absolute -left-0 text-[7px] font-semibold text-gray-500 uppercase tracking-widest z-10 pointer-events-none">
                                        SFX{sfxTrack.length ? ` · ${sfxTrack.length}` : ''}
                                    </span>
                                    <div className="absolute inset-0 rounded bg-gray-900/20" />
                                    {sfxTrack.map(cue => {
                                        const left = (cue.time / effectiveDuration) * 100;
                                        const color = SFX_SOURCE_COLOR[cue.source] ?? '#9ca3af';
                                        const isSel = selection?.kind === 'sfx' && selection.id === cue.id;
                                        return (
                                            <div
                                                key={cue.id}
                                                title={`${cue.label} · ${cue.source} (${cue.category}) — click to edit`}
                                                className={`absolute top-1 cursor-pointer transition-all group ${isSel ? 'scale-150 z-10' : 'hover:scale-125'}`}
                                                style={{ left: `${left}%`, transform: 'translateX(-50%)', width: 8, height: 16, opacity: cue.muted ? 0.35 : 1 }}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    onPreviewSfxCue?.(cue.id);
                                                    onSelectObject?.({ kind: 'sfx', id: cue.id });
                                                }}
                                            >
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-0.5">
                                                    <div className="rounded-full" style={{ width: 6, height: 6, background: color, boxShadow: `0 0 4px ${color}` }} />
                                                    {cue.locked && <div className="absolute -top-1 -right-1 rounded-full" style={{ width: 3, height: 3, background: '#fff' }} />}
                                                    <div style={{ width: 1, height: 8, background: color, opacity: 0.6 }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {sfxTrack.length === 0 && (
                                        <span className="absolute left-8 text-[7px] text-gray-600 pointer-events-none">no cues — enable SFX or generate captions</span>
                                    )}
                                </div>
                            )}

                            {/* AI Auto-Camera move track — colour-coded by move, click to delete */}
                            {cameraTrack.length > 0 && (
                                <div className="relative flex items-center" style={{ height: 22 }}>
                                    <span className="absolute -left-0 text-[7px] font-semibold text-gray-500 uppercase tracking-widest z-10 pointer-events-none">
                                        CAM · {cameraTrack.length}
                                    </span>
                                    <div className="absolute inset-0 rounded bg-gray-900/20" />
                                    {cameraTrack.map(k => {
                                        const left = (k.time / effectiveDuration) * 100;
                                        const color = CAM_KIND_COLOR[k.kind] ?? '#9ca3af';
                                        const isSel = selection?.kind === 'camera' && selection.id === k.id;
                                        return (
                                            <div
                                                key={k.id}
                                                title={`${k.kind} · zoom ${k.zoom.toFixed(2)}× — click to edit`}
                                                className={`absolute top-1 cursor-pointer transition-all group ${isSel ? 'scale-150 z-10' : 'hover:scale-125'}`}
                                                style={{ left: `${left}%`, transform: 'translateX(-50%)', width: 8, height: 16 }}
                                                onClick={e => { e.stopPropagation(); onSelectObject?.({ kind: 'camera', id: k.id }); }}
                                            >
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-0.5">
                                                    <div style={{ width: 6, height: 6, borderRadius: 2, background: color, boxShadow: `0 0 4px ${color}` }} />
                                                    <div style={{ width: 1, height: 8, background: color, opacity: 0.6 }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Resource popover — click a B-roll block to change sentiment */}
                    {resourcePopover?.type === 'broll' && (() => {
                        const cap = captions.find(c => c.id === resourcePopover.captionId);
                        if (!cap) return null;
                        const { screenX, screenY } = resourcePopover;
                        return (
                            <div
                                className="fixed z-[200] bg-[var(--cc-surface-3)] border border-[var(--cc-border-mid)] rounded-xl shadow-2xl p-3 w-48"
                                style={{ left: Math.min(screenX, window.innerWidth - 200), top: Math.max(8, screenY - 160) }}
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <Film size={10} className="text-[var(--cc-blue-light)]" />
                                        <span className="text-[10px] font-semibold text-white">B-Roll Style</span>
                                    </div>
                                    <button onClick={() => setResourcePopover(null)} className="text-white/30 hover:text-white text-xs">✕</button>
                                </div>
                                <div className="grid grid-cols-2 gap-1 mb-2">
                                    {ALL_SENTIMENTS.map(s => {
                                        const m = SENTIMENT_META[s];
                                        const active = cap.sentiment === s && !cap.brollDisabled;
                                        return (
                                            <button
                                                key={s}
                                                onClick={() => { onUpdateCaption(cap.id, { sentiment: s, brollDisabled: false }); setResourcePopover(null); }}
                                                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[9px] font-bold transition-all ${active ? `${m.bg} ${m.border} ${m.text}` : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70'}`}
                                            >
                                                {m.emoji} {m.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => { onUpdateCaption(cap.id, { brollDisabled: true }); setResourcePopover(null); }}
                                    className="w-full text-[9px] text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg py-1.5 transition-colors flex items-center justify-center gap-1"
                                >
                                    <X size={9} /> Remove B-roll for this caption
                                </button>
                            </div>
                        );
                    })()}

                    {/* SFX cue edit popover — swap sound / volume / mute / delete one cue */}
                    {sfxCuePopover && (() => {
                        const cue = sfxTrack.find(c => c.id === sfxCuePopover.id);
                        if (!cue) return null;
                        const { screenX, screenY } = sfxCuePopover;
                        return (
                            <>
                                <div className="fixed inset-0 z-[199]" onClick={() => setSfxCuePopover(null)} />
                                <div
                                    className="fixed z-[200] bg-[var(--cc-surface-3)] border border-[var(--cc-border-mid)] rounded-xl shadow-2xl p-3 w-56"
                                    style={{ left: Math.min(Math.max(8, screenX - 112), window.innerWidth - 232), top: Math.max(8, screenY - 200) }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Zap size={10} className="text-[var(--cc-blue-light)] shrink-0" />
                                            <span className="text-[10px] font-semibold text-white truncate" title={cueSoundName(cue)}>{cueSoundName(cue)}</span>
                                        </div>
                                        <button onClick={() => setSfxCuePopover(null)} className="text-white/30 hover:text-white text-xs ml-1">✕</button>
                                    </div>
                                    <div className="text-[8px] uppercase tracking-wider text-gray-500 mb-2">{cue.role ?? cue.source} · {cue.category} · {cue.time.toFixed(2)}s</div>

                                    {/* Swap sound */}
                                    <div className="flex items-center justify-between gap-1 mb-2">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Sound</span>
                                        <div className="flex gap-1">
                                            <button onClick={() => { onSwapSfxCue?.(cue.id, -1); setTimeout(() => onPreviewSfxCue?.(cue.id), 30); }} className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70 text-[10px] font-bold">‹ Prev</button>
                                            <button onClick={() => { onPreviewSfxCue?.(cue.id); }} className="px-2 py-0.5 rounded bg-[var(--cc-blue-dim)] hover:bg-blue-600/40 text-[var(--cc-blue-light)] text-[10px] font-bold">▶</button>
                                            <button onClick={() => { onSwapSfxCue?.(cue.id, 1); setTimeout(() => onPreviewSfxCue?.(cue.id), 30); }} className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-white/70 text-[10px] font-bold">Next ›</button>
                                        </div>
                                    </div>

                                    {/* Volume */}
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40 w-12">Vol</span>
                                        <input
                                            type="range" min={0} max={1} step={0.05} value={cue.gain}
                                            onChange={e => onAdjustSfxCueGain?.(cue.id, parseFloat(e.target.value))}
                                            className="flex-1 accent-blue-500 cursor-pointer"
                                        />
                                        <span className="text-[9px] text-gray-300 w-7 text-right">{Math.round(cue.gain * 100)}</span>
                                    </div>

                                    {/* Mute + Delete */}
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => onToggleSfxCueMuted?.(cue.id)}
                                            className={`flex-1 text-[9px] font-bold rounded-lg py-1.5 transition-colors ${cue.muted ? 'bg-[var(--cc-blue-dim)] text-[var(--cc-blue-light)]' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'}`}
                                        >
                                            {cue.muted ? 'Unmute' : 'Mute'}
                                        </button>
                                        <button
                                            onClick={() => { onDeleteSfxCue?.(cue.id); setSfxCuePopover(null); }}
                                            className="flex-1 text-[9px] text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg py-1.5 transition-colors flex items-center justify-center gap-1"
                                        >
                                            <X size={9} /> Delete
                                        </button>
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    {/* Word timing track — shown when selected caption has word timings */}
                    {(() => {
                        const selCap = selectedCaptionId ? captions.find(c => c.id === selectedCaptionId) : null;
                        if (!selCap?.words || selCap.words.length === 0) return null;
                        return (
                            <div className="relative mx-4 mt-1" style={{ height: 28 }}>
                                {/* Track label */}
                                <div className="absolute -left-0 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                    <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest">words</span>
                                </div>
                                {/* Word blocks */}
                                {selCap.words.map((word, wIdx) => {
                                    const left = (word.start / effectiveDuration) * 100;
                                    const width = ((word.end - word.start) / effectiveDuration) * 100;
                                    const isHigh = (word.emphasis ?? 0) >= 70;
                                    return (
                                        <div
                                            key={wIdx}
                                            data-word-block="true"
                                            className={`absolute top-0.5 rounded border cursor-grab active:cursor-grabbing group ${isHigh ? 'bg-blue-500/25 border-blue-500/40' : 'bg-gray-700/60 border-gray-600/70'}`}
                                            style={{ left: `${left}%`, width: `${Math.max(width, 0.4)}%`, height: 22 }}
                                            onMouseDown={(e) => handleWordMouseDown(e, selCap, wIdx, 'move')}
                                        >
                                            {/* Left resize handle */}
                                            <div
                                                className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/20 hover:bg-white/50 z-10 transition-colors"
                                                onMouseDown={(e) => { e.stopPropagation(); handleWordMouseDown(e, selCap, wIdx, 'left'); }}
                                            />
                                            <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white/60 pointer-events-none truncate px-2">
                                                {word.text}
                                            </span>
                                            {/* Right resize handle */}
                                            <div
                                                className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/20 hover:bg-white/50 z-10 transition-colors"
                                                onMouseDown={(e) => { e.stopPropagation(); handleWordMouseDown(e, selCap, wIdx, 'right'); }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* Keyframe track — diamonds for the selected caption's keyframes */}
                    {(() => {
                        const selCap = selectedCaptionId ? captions.find(c => c.id === selectedCaptionId) : null;
                        const frames = selCap && keyframeMap ? (keyframeMap.get(selCap.id) ?? []) : [];
                        if (!selCap || !keyframeMap || !onKeyframeMapChange) return null;
                        return (
                            <div className="relative mx-4 mt-1" style={{ height: 28 }}>
                                <div className="absolute -left-0 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                    <span className="text-[7px] font-semibold text-gray-500 uppercase tracking-widest">keys</span>
                                </div>
                                {/* Clickable track background to add a keyframe */}
                                <div
                                    className="absolute inset-0 cursor-crosshair"
                                    onDoubleClick={e => {
                                        const newTime = Math.max(selCap.startTime, Math.min(selCap.endTime, getTimeFromX(e.clientX)));
                                        const kf: Keyframe = { time: newTime };
                                        onKeyframeMapChange(upsertKeyframe(keyframeMap, selCap.id, kf));
                                        setEditingKf({ captionId: selCap.id, kf, screenX: e.clientX, screenY: e.clientY });
                                    }}
                                />
                                {/* Diamond markers */}
                                {frames.map(kf => {
                                    const leftPct = (kf.time / effectiveDuration) * 100;
                                    const isEditing = editingKf?.captionId === selCap.id && editingKf.kf.time === kf.time;
                                    return (
                                        <div
                                            key={kf.time}
                                            title={`Keyframe @ ${kf.time.toFixed(2)}s — drag to move, click to edit`}
                                            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 cursor-grab active:cursor-grabbing z-20 transition-colors ${
                                                isEditing ? 'bg-white border-2 border-blue-400' : 'bg-blue-500 border border-blue-300 hover:bg-blue-300'
                                            }`}
                                            style={{ left: `${leftPct}%` }}
                                            onMouseDown={e => {
                                                e.stopPropagation();
                                                isDraggingKeyframe.current = { captionId: selCap.id, kf };
                                            }}
                                            onClick={e => {
                                                e.stopPropagation();
                                                setEditingKf(prev =>
                                                    prev?.captionId === selCap.id && prev.kf.time === kf.time
                                                        ? null
                                                        : { captionId: selCap.id, kf, screenX: e.clientX, screenY: e.clientY }
                                                );
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* Keyframe property popover */}
                    {editingKf && (() => {
                        const { captionId, kf, screenX, screenY } = editingKf;
                        const updateKf = (patch: Partial<Keyframe>) => {
                            if (!keyframeMap || !onKeyframeMapChange) return;
                            const next: Keyframe = { ...kf, ...patch };
                            onKeyframeMapChange(upsertKeyframe(keyframeMap, captionId, next));
                            setEditingKf({ captionId, kf: next, screenX, screenY });
                        };
                        const deleteKf = () => {
                            if (!keyframeMap || !onKeyframeMapChange) return;
                            onKeyframeMapChange(removeKeyframe(keyframeMap, captionId, kf.time));
                            setEditingKf(null);
                        };
                        const row = (label: string, field: keyof Keyframe, min: number, max: number, step: number, def: number) => {
                            const val = kf[field] as number | undefined;
                            const active = val !== undefined;
                            return (
                                <div key={field} className="flex items-center gap-1.5">
                                    <button
                                        className={`w-2 h-2 rounded-sm border flex-shrink-0 ${active ? 'bg-blue-500 border-blue-400' : 'bg-transparent border-white/30'}`}
                                        onClick={() => updateKf({ [field]: active ? undefined : def })}
                                    />
                                    <span className="text-[9px] text-white/50 w-10 flex-shrink-0">{label}</span>
                                    <input
                                        type="range" min={min} max={max} step={step}
                                        value={val ?? def}
                                        disabled={!active}
                                        onChange={e => updateKf({ [field]: parseFloat(e.target.value) })}
                                        className="flex-1 h-0.5 accent-blue-500 disabled:opacity-30"
                                    />
                                    <span className="text-[9px] text-white/40 w-7 text-right">{(val ?? def).toFixed(step < 1 ? 2 : 0)}</span>
                                </div>
                            );
                        };
                        return (
                            <div
                                className="fixed z-[200] bg-[var(--cc-surface-3)] border border-[var(--cc-border-mid)] rounded-xl shadow-2xl p-3 w-52"
                                style={{ left: Math.min(screenX, window.innerWidth - 220), top: Math.max(8, screenY - 220) }}
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <Diamond size={10} className="text-[var(--cc-blue-light)]" />
                                        <span className="text-[10px] font-semibold text-white">@ {kf.time.toFixed(2)}s</span>
                                    </div>
                                    <button onClick={() => setEditingKf(null)} className="text-white/30 hover:text-white text-xs">✕</button>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    {row('Scale', 'scale', 0.1, 3, 0.05, 1)}
                                    {row('Opacity', 'opacity', 0, 1, 0.05, 1)}
                                    {row('Offset X', 'offsetX', -200, 200, 1, 0)}
                                    {row('Offset Y', 'offsetY', -200, 200, 1, 0)}
                                    {row('Rotation', 'rotation', -3.14, 3.14, 0.05, 0)}
                                </div>
                                {/* Easing curve — matches captions.ai: linear / ease / instant */}
                                <div className="mt-2 flex gap-1">
                                    {(['linear', 'ease', 'instant'] as const).map(curve => (
                                        <button
                                            key={curve}
                                            onClick={() => updateKf({ easing: curve })}
                                            className={`flex-1 text-[8px] py-1 rounded transition-colors font-mono ${
                                                (kf.easing ?? 'linear') === curve
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white/5 text-white/40 hover:bg-white/10'
                                            }`}
                                        >
                                            {curve}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={deleteKf}
                                    className="mt-2 w-full text-[9px] text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg py-1 transition-colors flex items-center justify-center gap-1"
                                >
                                    <Trash2 size={9} /> Delete keyframe
                                </button>
                                <p className="text-[8px] text-white/20 text-center mt-1.5">Double-click track to add • Drag diamond to move</p>
                            </div>
                        );
                    })()}

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
