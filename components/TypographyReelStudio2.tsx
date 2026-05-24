/**
 * Typography Reel Studio
 *
 * Minimal, creator-first UI for kinetic typography reel generation.
 * Feels like CapCut × After Effects × AI
 *
 * Flow: Upload Audio → Select Theme → Generate → Preview → Export
 */

import React, { useEffect, useRef } from 'react';
import { useTypographyReel } from '../hooks/useTypographyReel';
import { THEME_PRESETS } from '../services/typography';

export const TypographyReelStudio: React.FC = () => {
  const { state, actions, refs } = useTypographyReel();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Selected theme
  const [selectedTheme, setSelectedTheme] = React.useState<string>('cinematic-poet');

  // ─── Handle File Upload ──────────────────────────────────────────────

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loaded = await actions.loadAudio(file);
    if (loaded) {
      // Immediately generate with selected theme
      const theme = THEME_PRESETS[selectedTheme];
      await actions.generate(file, theme);
    }
  };

  // ─── Animation Loop ──────────────────────────────────────────────────

  useEffect(() => {
    const animate = () => {
      if (refs.audioRef.current) {
        actions.renderFrame(refs.audioRef.current.currentTime * 1000);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [actions, refs]);

  // ─── Time Update Handler ────────────────────────────────────────────

  const handleTimeUpdate = () => {
    if (refs.audioRef.current) {
      // State is managed by the hook, canvas renders via RAF
    }
  };

  // ─── Setup Audio Source ──────────────────────────────────────────────

  useEffect(() => {
    if (state.audioFile && refs.audioRef.current) {
      const url = URL.createObjectURL(state.audioFile);
      refs.audioRef.current.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [state.audioFile, refs]);

  // ─── Export Handler ──────────────────────────────────────────────────

  const handleExport = async () => {
    const blob = await actions.exportToMP4();
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `typography-reel-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 to-slate-950">
      {/* ─── LEFT PANEL: Controls ─────────────────────────────────────── */}
      <div className="w-80 border-r border-slate-700 bg-slate-800/40 overflow-y-auto p-6">
        <h1 className="text-2xl font-bold text-white mb-8">✨ Typography Reel</h1>

        {/* Step 1: Upload Audio */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-300 mb-3">
            Step 1: Upload Audio
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg border-2 border-dashed border-slate-500 transition text-sm font-medium"
            aria-label="Select audio file"
          >
            {state.audioFile ? state.audioFile.name : '📁 Select Audio File'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            hidden
          />
          {state.duration > 0 && (
            <p className="text-xs text-slate-400 mt-2">
              Duration: {Math.round(state.duration)}s (max 60s)
            </p>
          )}
        </div>

        {/* Step 2: Select Theme */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-300 mb-3">
            Step 2: Choose Theme
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(THEME_PRESETS).slice(0, 6).map(([key, theme]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedTheme(key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                  selectedTheme === key
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                aria-pressed={selectedTheme === key ? 'true' : 'false'}
              >
                {theme.name}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Generate */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-slate-300 mb-3">
            Step 3: Generate
          </label>
          <button
            type="button"
            onClick={() => {
              if (state.audioFile) {
                const theme = THEME_PRESETS[selectedTheme];
                actions.generate(state.audioFile, theme);
              }
            }}
            disabled={!state.audioFile || state.stage === 'analyzing' || state.stage === 'beats' || state.stage === 'choreographing'}
            className={`w-full px-4 py-3 rounded-lg font-semibold transition ${
              state.audioFile && state.stage === 'idle'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white cursor-pointer'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {state.stage === 'analyzing'
              ? '🔍 Analyzing...'
              : state.stage === 'beats'
              ? '🎵 Detecting Beats...'
              : state.stage === 'choreographing'
              ? '✨ Choreographing...'
              : '⚡ Generate Reel'}
          </button>
          {state.message && (
            <p className="text-xs text-slate-400 mt-2">{state.message}</p>
          )}
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-200 text-sm mb-8">
            ⚠️ {state.error}
          </div>
        )}

        {/* Progress */}
        {state.progress > 0 && state.progress < 1 && (
          <div className="mb-8">
            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                style={{ width: `${state.progress * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── RIGHT PANEL: Preview & Controls ─────────────────────────── */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-950 to-black">
        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
          {state.animationSequence ? (
            <div className="relative">
              <canvas
                ref={refs.canvasRef}
                className="w-full max-h-full rounded-xl shadow-2xl"
              />
              <audio
                ref={refs.audioRef}
                onTimeUpdate={handleTimeUpdate}
                className="hidden"
              />
            </div>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">🎬</div>
              <p className="text-slate-400 text-lg">
                {state.audioFile
                  ? 'Select theme and click Generate'
                  : 'Upload an audio file to begin'}
              </p>
            </div>
          )}
        </div>

        {/* Controls & Timeline */}
        {state.animationSequence && (
          <div className="border-t border-slate-700 bg-slate-800/40 p-4">
            {/* Playback Controls */}
            <div className="flex items-center gap-4 mb-4">
              <button
                type="button"
                onClick={actions.togglePlayPause}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
              >
                {state.isPlaying ? '⏸ Pause' : '▶️ Play'}
              </button>

              <button
                type="button"
                onClick={() => actions.seek(0)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                ⏮ Restart
              </button>

              <button
                type="button"
                onClick={handleExport}
                disabled={state.isExporting}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  !state.isExporting
                    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {state.isExporting ? '💾 Exporting...' : '📥 Export MP4'}
              </button>
            </div>

            {/* Simple Timeline */}
            <div>
              <label htmlFor="timeline-slider" className="sr-only">
                Timeline scrubber
              </label>
              <input
                id="timeline-slider"
                type="range"
                min="0"
                max={state.duration || 0}
                step="0.1"
                value={state.currentTime}
                onChange={(e) => actions.seek(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                aria-label="Timeline"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>{Math.floor(state.currentTime)}s</span>
                <span>{Math.floor(state.duration)}s</span>
              </div>
            </div>

            {/* Export Progress */}
            {state.isExporting && (
              <div className="mt-4 bg-slate-700 rounded-lg p-3">
                <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${state.exportProgress * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-300 mt-2">
                  {Math.round(state.exportProgress * 100)}% exported
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TypographyReelStudio;
