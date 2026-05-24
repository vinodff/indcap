/**
 * MotionGraphicsPanel — Phase 3 self-contained motion-graphics editor.
 *
 * Layout (desktop):
 *   ┌─────────────── header (back / title) ────────────────┐
 *   │  left column            │  right column (sidebar)    │
 *   │  ─────────────          │  ─────────────             │
 *   │  MotionStage (canvas)   │  Script input + controls   │
 *   │  playback controls      │  Generate button           │
 *   │  MotionTimeline         │  MotionBeatEditor          │
 *   └──────────────────────────────────────────────────────┘
 *
 * Works with or without a video. Without a video, the canvas uses a dark
 * gradient background and an internal wall-clock timer drives playback.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  Wand2,
  Play,
  Pause,
  RotateCcw,
  Upload,
  Plus,
  Download,
} from 'lucide-react';
import {
  analyzeScript,
  MotionBeat,
  MotionPlan,
  Palette,
  AspectRatio,
  ASPECTS,
} from '../services/motionGraphicsService';
import { MotionStage } from './motion/MotionStage';
import { MotionTimeline } from './motion/MotionTimeline';
import { MotionBeatEditor } from './motion/MotionBeatEditor';
import { MotionExportDialog } from './motion/MotionExportDialog';

const SAMPLE_SCRIPT = `Most people think productivity is about doing more. It's not.
The real secret is doing less, but doing it perfectly.
Three rules changed my mornings forever.
One: no phone for the first 30 minutes.
Two: write down the single most important task.
Three: do that task before anything else.
Try this for one week and watch what happens.`;

const formatTime = (t: number): string => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
};

const makeBeatId = (): string => `beat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

interface Props {
  onBack: () => void;
}

export const MotionGraphicsPanel: React.FC<Props> = ({ onBack }) => {
  // Plan inputs
  const [script, setScript] = useState<string>(SAMPLE_SCRIPT);
  const [palette, setPalette] = useState<Palette>('energetic');
  const [intensity, setIntensity] = useState<1 | 2 | 3>(2);
  const [duration, setDuration] = useState<number>(30);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const stageW = ASPECTS[aspectRatio].width;
  const stageH = ASPECTS[aspectRatio].height;

  // Plan output
  const [beats, setBeats] = useState<MotionBeat[]>([]);
  const [topicSlug, setTopicSlug] = useState<string>('motion-graphics-video');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string>('');

  // Editor state
  const [selectedBeatId, setSelectedBeatId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // STATE (not refs) so the export dialog re-renders when canvas/video populate.
  const [exportOpen, setExportOpen] = useState(false);
  const [stageCanvas, setStageCanvas] = useState<HTMLCanvasElement | null>(null);
  const [stageVideoEl, setStageVideoEl] = useState<HTMLVideoElement | null>(null);
  // currentTime lives in React state for the UI, but the export polls a ref
  // every frame for accuracy without re-running the loop on every state change.
  const currentTimeRef = useRef(0);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  // When the user uploads a video, use its duration as the timeline duration.
  const handleVideoReady = (videoEl: HTMLVideoElement) => {
    setStageVideoEl(videoEl);
    if (videoEl.duration && Number.isFinite(videoEl.duration)) {
      setDuration(videoEl.duration);
    }
  };

  const handleCanvasReady = (canvas: HTMLCanvasElement) => {
    setStageCanvas(canvas);
  };

  const wordCount = useMemo(() => script.trim().split(/\s+/).filter(Boolean).length, [script]);
  const selectedBeat = useMemo(
    () => (selectedBeatId ? beats.find((b) => b.id === selectedBeatId) || null : null),
    [selectedBeatId, beats],
  );

  const generatePlan = async () => {
    setError('');
    setGenerating(true);
    try {
      const plan: MotionPlan = await analyzeScript({ script, durationSec: duration, palette, intensity, aspectRatio });
      setBeats(plan.beats);
      setTopicSlug(plan.topicSlug);
      setCurrentTime(0);
      setSelectedBeatId(null);
      // If the plan came back with a longer duration than the user typed, honor it.
      if (plan.duration > 0) setDuration(plan.duration);
    } catch (e: any) {
      setError(e?.message || 'Failed to generate plan');
    } finally {
      setGenerating(false);
    }
  };

  const updateBeat = (next: MotionBeat) => {
    setBeats((prev) => prev.map((b) => (b.id === next.id ? next : b)));
  };

  const deleteBeat = (id: string) => {
    setBeats((prev) => prev.filter((b) => b.id !== id));
    if (selectedBeatId === id) setSelectedBeatId(null);
  };

  const addBeatAtPlayhead = () => {
    const start = currentTime;
    const len = Math.min(2, Math.max(0.5, duration - start - 0.1));
    if (len <= 0) return;
    const b: MotionBeat = {
      id: makeBeatId(),
      startTime: start,
      endTime: start + len,
      primitive: 'icon-burst',
      params: { palette, intensity: 2, anchor: 'center', icon: 'zap', text: '' },
      rationale: 'Manually added beat — edit on the right.',
    };
    setBeats((prev) => [...prev, b].sort((a, b) => a.startTime - b.startTime));
    setSelectedBeatId(b.id);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Revoke previous object URL so we don't leak it
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    const url = URL.createObjectURL(f);
    setVideoSrc(url);
    setCurrentTime(0);
    setPlaying(false);
    // Reset the input so the same file can be picked again
    e.target.value = '';
  };

  const clearVideo = () => {
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    setVideoSrc(null);
    setStageVideoEl(null);
  };

  // Revoke any object URL on unmount
  useEffect(() => {
    return () => {
      if (videoSrc) URL.revokeObjectURL(videoSrc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-pause when reaching end.
  useEffect(() => {
    if (playing && currentTime >= duration - 0.01) {
      setPlaying(false);
    }
  }, [currentTime, duration, playing]);

  return (
    <div className="flex-1 flex flex-col bg-[#050505] overflow-y-auto custom-scrollbar text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-3 px-6 py-3 bg-[#0a0a0a]/95 backdrop-blur border-b border-gray-800">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors text-sm font-bold"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-500 flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight">Auto Motion Graphics</h1>
            <p className="text-xs text-gray-500">Editor · {beats.length} beats · {topicSlug}</p>
          </div>
        </div>
        <div className="ml-auto text-[10px] font-black uppercase tracking-widest text-fuchsia-400">Phase 3 · editor live</div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 p-6 max-w-[1600px] w-full mx-auto">
        {/* ── Left: stage + transport + timeline ────────────────────────── */}
        <div className="space-y-4 min-w-0">
          <MotionStage
            beats={beats}
            duration={duration}
            videoSrc={videoSrc}
            playing={playing}
            currentTime={currentTime}
            onTimeChange={setCurrentTime}
            onVideoReady={handleVideoReady}
            onCanvasReady={handleCanvasReady}
            width={stageW}
            height={stageH}
          />

          {/* Transport */}
          <div className="flex items-center gap-2 bg-[#0a0a0a] border border-gray-800 rounded-2xl px-3 py-2">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="w-10 h-10 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white flex items-center justify-center transition-colors"
              title={playing ? 'Pause' : 'Play'}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setCurrentTime(0);
              }}
              className="w-10 h-10 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 flex items-center justify-center transition-colors"
              title="Restart"
            >
              <RotateCcw size={16} />
            </button>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.05}
              value={currentTime}
              onChange={(e) => {
                setPlaying(false);
                setCurrentTime(Number(e.target.value));
              }}
              className="flex-1 accent-fuchsia-500"
            />
            <span className="font-mono text-xs text-gray-400 min-w-[100px] text-right">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <button
              onClick={addBeatAtPlayhead}
              className="ml-2 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-bold transition-colors"
              title="Add beat at playhead"
            >
              <Plus size={14} /> Add beat
            </button>
            <button
              onClick={() => setExportOpen(true)}
              disabled={beats.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black transition-opacity"
              title={beats.length === 0 ? 'Generate a plan first' : 'Export video'}
            >
              <Download size={14} /> Export
            </button>
            {!videoSrc ? (
              <button
                onClick={() => videoFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-bold transition-colors"
              >
                <Upload size={14} /> Video
              </button>
            ) : (
              <button
                onClick={clearVideo}
                className="px-3 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-bold transition-colors"
              >
                Remove video
              </button>
            )}
            <input
              ref={videoFileInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />
          </div>

          <MotionTimeline
            beats={beats}
            duration={duration}
            currentTime={currentTime}
            selectedBeatId={selectedBeatId}
            onSelectBeat={setSelectedBeatId}
            onUpdateBeat={updateBeat}
            onDeleteBeat={deleteBeat}
            onSeek={(t) => {
              setPlaying(false);
              setCurrentTime(t);
            }}
          />
        </div>

        {/* ── Right: script generator + beat editor ─────────────────────── */}
        <aside className="space-y-4 min-w-0">
          {/* Script generator */}
          <section className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black tracking-tight">Script → Plan</h2>
              <span className="text-[10px] text-gray-600">{wordCount} words</span>
            </div>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={6}
              className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs font-medium text-gray-200 placeholder-gray-600 focus:outline-none focus:border-fuchsia-500 resize-y"
              placeholder="Paste your script here. One sentence per line works best."
            />

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
                Aspect ratio
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(ASPECTS) as AspectRatio[]).map((r) => {
                  const a = ASPECTS[r];
                  const selected = aspectRatio === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setAspectRatio(r)}
                      title={`${a.label} — ${a.hint}`}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors ${
                        selected
                          ? 'bg-fuchsia-500/15 border-fuchsia-500 text-fuchsia-300'
                          : 'bg-black border-gray-800 text-gray-400 hover:bg-gray-900'
                      }`}
                    >
                      {/* Mini glyph showing the ratio */}
                      <div
                        className={`border-2 rounded-sm ${selected ? 'border-fuchsia-400' : 'border-gray-600'}`}
                        style={{
                          width: `${Math.min(28, (a.width / a.height) * 16)}px`,
                          height: `${Math.min(20, (a.height / a.width) * 16)}px`,
                          minWidth: 8,
                          minHeight: 6,
                        }}
                      />
                      <span className="text-[10px] font-black tracking-tighter">{r}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-600 mt-1">{ASPECTS[aspectRatio].hint}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Duration (s)</label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  step={1}
                  value={duration}
                  onChange={(e) => setDuration(Math.max(5, Math.min(300, Number(e.target.value) || 30)))}
                  className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-fuchsia-500"
                  disabled={!!videoSrc}
                  title={videoSrc ? 'Duration locked to uploaded video' : undefined}
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Palette</label>
                <select
                  value={palette}
                  onChange={(e) => setPalette(e.target.value as Palette)}
                  className="w-full bg-black border border-gray-800 rounded-lg p-2 text-xs font-bold text-white focus:outline-none focus:border-fuchsia-500"
                >
                  <option value="energetic">Energetic</option>
                  <option value="corporate">Corporate</option>
                  <option value="kids">Kids</option>
                  <option value="cinematic">Cinematic</option>
                  <option value="neon-bright">Neon Bright</option>
                  <option value="pastel-pop">Pastel Pop</option>
                  <option value="gradient-blast">Gradient Blast</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1">Intensity</label>
              <div className="flex gap-1">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setIntensity(n as 1 | 2 | 3)}
                    className={`flex-1 py-1.5 rounded-lg font-black text-[11px] transition-colors ${
                      intensity === n
                        ? 'bg-fuchsia-500 text-white'
                        : 'bg-black border border-gray-800 text-gray-400 hover:bg-gray-900'
                    }`}
                  >
                    {n === 1 ? 'Subtle' : n === 2 ? 'Balanced' : 'Loud'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generatePlan}
              disabled={generating || !script.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm tracking-wide shadow-lg shadow-fuchsia-500/20 transition-opacity"
            >
              {generating ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Planning...
                </>
              ) : (
                <>
                  <Wand2 size={16} /> {beats.length === 0 ? 'Generate Motion Plan' : 'Regenerate Plan'}
                </>
              )}
            </button>

            {error && (
              <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-xs">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}
          </section>

          {/* Beat editor */}
          <MotionBeatEditor beat={selectedBeat} onUpdate={updateBeat} onDelete={deleteBeat} />

          <div className="text-[10px] text-gray-600 text-center pt-2">
            Phase 4 export shipped. Phase 5 polishes the remaining 4 primitives + animated-emoji toggle.
          </div>
        </aside>
      </div>

      <MotionExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        canvas={stageCanvas}
        videoEl={stageVideoEl}
        durationSec={duration}
        beats={beats}
        topicSlug={topicSlug}
        plan={beats.length > 0 ? { beats, topicSlug, suggestedPalette: palette, duration } : null}
        aspect={aspectRatio}
        resetPlayback={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
        startPlayback={() => setPlaying(true)}
        stopPlayback={() => setPlaying(false)}
        getCurrentTime={() => currentTimeRef.current}
      />
    </div>
  );
};

export default MotionGraphicsPanel;
