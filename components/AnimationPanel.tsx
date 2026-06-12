import React, { useState } from 'react';
import { Zap, ArrowUp, ArrowDown, Sparkles, Waves, ToggleLeft, ToggleRight, Film, Music } from 'lucide-react';
import { EntryAnimation, ExitAnimation, WordHighlightMode, KineticMode } from '../types';

interface AnimationPanelProps {
    entryAnimation: EntryAnimation;
    setEntryAnimation: (val: EntryAnimation) => void;
    exitAnimation: ExitAnimation;
    setExitAnimation: (val: ExitAnimation) => void;
    wordHighlight: WordHighlightMode;
    setWordHighlight: (val: WordHighlightMode) => void;
    animationSpeed: 'FAST' | 'MEDIUM' | 'SLOW';
    setAnimationSpeed: (val: 'FAST' | 'MEDIUM' | 'SLOW') => void;
    kineticMode?: KineticMode;
    setKineticMode?: (val: KineticMode) => void;
    autoMotionEnabled?: boolean;
    setAutoMotionEnabled?: (val: boolean) => void;
    autoSfxEnabled?: boolean;
    setAutoSfxEnabled?: (val: boolean) => void;
}

const ENTRY_ANIMATIONS: { id: EntryAnimation; label: string; icon: string }[] = [
    { id: 'NONE', label: 'None', icon: '—' },
    { id: 'FADE_IN', label: 'Fade In', icon: '◎' },
    { id: 'SLIDE_UP', label: 'Slide Up', icon: '↑' },
    { id: 'SLIDE_DOWN', label: 'Slide Down', icon: '↓' },
    { id: 'ZOOM_IN', label: 'Zoom In', icon: '⊕' },
    { id: 'BOUNCE', label: 'Bounce', icon: '⟳' },
    { id: 'FLIP', label: 'Flip', icon: '⟺' },
    { id: 'ROTATE_IN', label: 'Rotate', icon: '↻' },
    { id: 'BLUR_IN', label: 'Blur In', icon: '◈' },
    { id: 'GLITCH', label: 'Glitch', icon: '⚡' },
    { id: 'ELASTIC', label: 'Elastic', icon: '🔄' },
    { id: 'KINETIC', label: 'Kinetic', icon: '💥' },
    { id: 'SHATTER', label: 'Shatter', icon: '💢' },
    { id: 'SPOTLIGHT', label: 'Spotlight', icon: '🔦' },
    { id: 'WIPE_RIGHT', label: 'Wipe Right', icon: '➡️' },
];

const EXIT_ANIMATIONS: { id: ExitAnimation; label: string; icon: string }[] = [
    { id: 'NONE', label: 'None', icon: '—' },
    { id: 'FADE_OUT', label: 'Fade Out', icon: '◎' },
    { id: 'SLIDE_DOWN', label: 'Slide Down', icon: '↓' },
    { id: 'SLIDE_UP', label: 'Slide Up', icon: '↑' },
    { id: 'ZOOM_OUT', label: 'Zoom Out', icon: '⊖' },
    { id: 'DISSOLVE', label: 'Dissolve', icon: '✦' },
    { id: 'GLITCH_OUT', label: 'Glitch Out', icon: '⚡' },
    { id: 'SHRINK', label: 'Shrink', icon: '▼' },
];

const WORD_HIGHLIGHTS: { id: WordHighlightMode; label: string; desc: string; color: string }[] = [
    { id: 'NONE', label: 'None', desc: 'No word highlight', color: 'bg-gray-700' },
    { id: 'KARAOKE', label: 'Karaoke', desc: 'Color sweep as spoken', color: 'bg-yellow-500' },
    { id: 'SPOTLIGHT', label: 'Spotlight', desc: 'Active word bright', color: 'bg-blue-500' },
    { id: 'COLOR_POP', label: 'Color Pop', desc: 'Vibrant word colors', color: 'bg-pink-500' },
    { id: 'UNDERLINE', label: 'Underline', desc: 'Animated underline', color: 'bg-green-500' },
    { id: 'BOX', label: 'Box', desc: 'Highlight box', color: 'bg-orange-500' },
    { id: 'FIRE', label: '🔥 Fire', desc: 'Radial fire glow on active word', color: 'bg-red-500' },
    { id: 'RAINBOW', label: '🌈 Rainbow', desc: 'Cycling hue per word', color: 'bg-purple-500' },
    { id: 'WAVE', label: '🌊 Wave', desc: 'Oscillating word positions', color: 'bg-cyan-500' },
    { id: 'SPARKLE', label: '✨ Sparkle', desc: 'Glitter dots around active word', color: 'bg-pink-400' },
];

const KINETIC_MODES: { id: KineticMode; label: string; desc: string; icon: string }[] = [
    { id: 'NONE', label: 'None', desc: 'No kinetic effect', icon: '—' },
    { id: 'WAVE', label: 'Wave', desc: 'Words oscillate like a wave', icon: '🌊' },
    { id: 'BOUNCE_CHAIN', label: 'Bounce Chain', desc: 'Sequential bounce per word', icon: '⛓️' },
    { id: 'SHAKE', label: 'Shake', desc: 'Rapid micro-shake on active word', icon: '💫' },
    { id: 'STOMP', label: 'Stomp', desc: 'Heavy slam from large to normal', icon: '🦶' },
];

const AnimationPanel: React.FC<AnimationPanelProps> = ({
    entryAnimation,
    setEntryAnimation,
    exitAnimation,
    setExitAnimation,
    wordHighlight,
    setWordHighlight,
    animationSpeed,
    setAnimationSpeed,
    kineticMode = 'NONE',
    setKineticMode,
    autoMotionEnabled = true,
    setAutoMotionEnabled,
    autoSfxEnabled = true,
    setAutoSfxEnabled,
}) => {
    return (
        <div className="space-y-6 p-4">
            {/* Master toggles — B-roll & SFX */}
            <section className="space-y-2">
                <div className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">
                    Master Effects
                </div>
                <div className="flex items-center justify-between py-1.5 px-1">
                    <div className="flex items-center gap-2">
                        <Film size={13} className={autoMotionEnabled ? 'text-violet-400' : 'text-gray-600'} />
                        <span className="text-xs text-gray-300">B-Roll & Motion</span>
                        <span className="text-[9px] text-gray-600 uppercase tracking-wider">Ken Burns, video clips</span>
                    </div>
                    <button
                        onClick={() => setAutoMotionEnabled?.(!autoMotionEnabled)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: autoMotionEnabled ? '#a78bfa' : '#4b5563', display: 'flex' }}
                    >
                        {autoMotionEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                </div>
                <div className="flex items-center justify-between py-1.5 px-1">
                    <div className="flex items-center gap-2">
                        <Music size={13} className={autoSfxEnabled ? 'text-green-400' : 'text-gray-600'} />
                        <span className="text-xs text-gray-300">Sound Effects</span>
                        <span className="text-[9px] text-gray-600 uppercase tracking-wider">beat-sync SFX</span>
                    </div>
                    <button
                        onClick={() => setAutoSfxEnabled?.(!autoSfxEnabled)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: autoSfxEnabled ? '#4ade80' : '#4b5563', display: 'flex' }}
                    >
                        {autoSfxEnabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                </div>
            </section>

            {/* Entry Animation */}
            <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">
                    <ArrowUp size={13} className="text-green-400" /> Entry Animation
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {ENTRY_ANIMATIONS.map(anim => (
                        <button
                            key={anim.id}
                            onClick={() => setEntryAnimation(anim.id)}
                            className={`p-2.5 rounded-xl border text-center transition-all ${entryAnimation === anim.id
                                    ? 'bg-green-600/20 border-green-500/60 text-green-300'
                                    : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                                }`}
                        >
                            <div className="text-lg mb-1">{anim.icon}</div>
                            <div className="text-[9px] font-bold uppercase">{anim.label}</div>
                        </button>
                    ))}
                </div>
            </section>

            {/* Exit Animation */}
            <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">
                    <ArrowDown size={13} className="text-red-400" /> Exit Animation
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {EXIT_ANIMATIONS.map(anim => (
                        <button
                            key={anim.id}
                            onClick={() => setExitAnimation(anim.id)}
                            className={`p-2.5 rounded-xl border text-center transition-all ${exitAnimation === anim.id
                                    ? 'bg-red-600/20 border-red-500/60 text-red-300'
                                    : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                                }`}
                        >
                            <div className="text-lg mb-1">{anim.icon}</div>
                            <div className="text-[9px] font-bold uppercase">{anim.label}</div>
                        </button>
                    ))}
                </div>
            </section>

            {/* Kinetic Typography Mode */}
            {setKineticMode && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">
                        <Waves size={13} className="text-cyan-400" /> Kinetic Typography
                    </div>
                    <div className="space-y-2">
                        {KINETIC_MODES.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => setKineticMode(mode.id)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${kineticMode === mode.id
                                        ? 'bg-cyan-600/15 border-cyan-500/50'
                                        : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                    }`}
                            >
                                <span className="text-xl flex-shrink-0">{mode.icon}</span>
                                <div className="text-left flex-1">
                                    <div className={`text-xs font-bold ${kineticMode === mode.id ? 'text-cyan-300' : 'text-gray-400'}`}>
                                        {mode.label}
                                    </div>
                                    <div className="text-[10px] text-gray-600">{mode.desc}</div>
                                </div>
                                {kineticMode === mode.id && (
                                    <div className="w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0">
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Word Highlight Mode */}
            <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">
                    <Sparkles size={13} className="text-yellow-400" /> Word Highlight
                </div>
                <div className="space-y-2">
                    {WORD_HIGHLIGHTS.map(mode => (
                        <button
                            key={mode.id}
                            onClick={() => setWordHighlight(mode.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${wordHighlight === mode.id
                                    ? 'bg-gray-800 border-blue-500/50'
                                    : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                                }`}
                        >
                            <div className={`w-3 h-3 rounded-full ${mode.color} flex-shrink-0`} />
                            <div className="text-left flex-1">
                                <div className={`text-xs font-bold ${wordHighlight === mode.id ? 'text-white' : 'text-gray-400'}`}>
                                    {mode.label}
                                </div>
                                <div className="text-[10px] text-gray-600">{mode.desc}</div>
                            </div>
                            {wordHighlight === mode.id && (
                                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </section>

            {/* Animation Speed */}
            <section className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2">
                    <Zap size={13} className="text-purple-400" /> Animation Speed
                </div>
                <div className="flex gap-2">
                    {(['FAST', 'MEDIUM', 'SLOW'] as const).map(speed => (
                        <button
                            key={speed}
                            onClick={() => setAnimationSpeed(speed)}
                            className={`flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${animationSpeed === speed
                                    ? 'bg-purple-600/20 border-purple-500/60 text-purple-300'
                                    : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600'
                                }`}
                        >
                            {speed === 'FAST' ? '⚡ Fast' : speed === 'MEDIUM' ? '◎ Med' : '🌊 Slow'}
                        </button>
                    ))}
                </div>
            </section>

            {/* Preview hint */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                <p className="text-[10px] text-blue-300 text-center">
                    ✨ Animations apply to all captions. Play the video to preview.
                </p>
            </div>
        </div>
    );
};

export default AnimationPanel;
