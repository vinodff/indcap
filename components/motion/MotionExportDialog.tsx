/**
 * MotionExportDialog — modal for exporting the motion graphics video.
 *
 * Owns export options (fps, bitrate, audio), shows filename preview, drives
 * the recording, then triggers download. Pulls the canvas + video element
 * via props since they live on the panel.
 *
 * The dialog asks the panel to drive playback while we record by calling the
 * `startExportPlayback` / `stopExportPlayback` callbacks the panel passes in.
 */

import React, { useMemo, useRef, useState } from 'react';
import { X, Download, Loader2, AlertCircle, Video, CheckCircle2, Files } from 'lucide-react';
import type { MotionBeat, MotionPlan, AspectRatio } from '../../services/motionGraphicsService';
import {
  exportMotionVideo,
  pickSupportedMime,
  pickPrimaryPrimitive,
  buildExportFilename,
  triggerDownload,
} from '../../services/motionGraphicsExport';
import { exportEachBeat, downloadBlob } from '../../services/motionGraphicsBatchExport';

interface Props {
  open: boolean;
  onClose: () => void;
  canvas: HTMLCanvasElement | null;
  videoEl: HTMLVideoElement | null;
  durationSec: number;
  beats: MotionBeat[];
  topicSlug: string;
  /** The full plan needed for per-beat batch export. */
  plan: MotionPlan | null;
  aspect: AspectRatio;
  /** Tell the panel to reset to t=0 (paused) before recording. */
  resetPlayback: () => void;
  /** Tell the panel to start playing — fires AFTER the recorder is recording. */
  startPlayback: () => void;
  /** Tell the panel to stop playing once recording is done. */
  stopPlayback: () => void;
  /** Panel exposes its currentTime for the exporter to poll. */
  getCurrentTime: () => number;
}

type Phase = 'configure' | 'recording' | 'done' | 'error';
type Mode = 'single' | 'batch';

export const MotionExportDialog: React.FC<Props> = ({
  open,
  onClose,
  canvas,
  videoEl,
  durationSec,
  beats,
  topicSlug,
  plan,
  aspect,
  resetPlayback,
  startPlayback,
  stopPlayback,
  getCurrentTime,
}) => {
  const [mode, setMode] = useState<Mode>('single');
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [bitrateMbps, setBitrateMbps] = useState<2 | 5 | 8 | 12>(8);
  const [phase, setPhase] = useState<Phase>('configure');
  const [progress, setProgress] = useState(0);
  const [batchLabel, setBatchLabel] = useState<string>('');
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultName, setResultName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const primaryPrimitive = useMemo(() => pickPrimaryPrimitive(beats), [beats]);
  const supportedMime = useMemo(() => {
    try {
      return pickSupportedMime();
    } catch (e) {
      return { mimeType: 'unsupported', extension: 'webm' as const };
    }
  }, []);
  const previewFilename = useMemo(
    () => buildExportFilename(topicSlug, primaryPrimitive, supportedMime.extension),
    [topicSlug, primaryPrimitive, supportedMime.extension],
  );

  const reset = () => {
    setPhase('configure');
    setProgress(0);
    setResultBlob(null);
    setResultName('');
    setError('');
    abortRef.current = null;
  };

  const close = () => {
    if (phase === 'recording') return; // can't close mid-record; user clicks Cancel
    reset();
    onClose();
  };

  const startExport = async () => {
    if (beats.length === 0) {
      setError('No beats to export. Generate a plan first.');
      setPhase('error');
      return;
    }
    setError('');
    setProgress(0);
    setBatchLabel('');
    setPhase('recording');
    const ctl = new AbortController();
    abortRef.current = ctl;

    try {
      if (mode === 'batch') {
        if (!plan) {
          throw new Error('Plan not available for batch export.');
        }
        const result = await exportEachBeat({
          plan,
          aspect,
          fps,
          videoBitsPerSecond: bitrateMbps * 1_000_000,
          signal: ctl.signal,
          onProgress: (info) => {
            setProgress(info.overall);
            setBatchLabel(info.beatLabel);
          },
        });
        setResultBlob(result.blob);
        setResultName(result.filename);
        setPhase('done');
        return;
      }

      // Single-clip mode (default).
      if (!canvas) {
        throw new Error('Canvas is not ready. Try regenerating the plan first.');
      }
      resetPlayback();
      await new Promise((r) => setTimeout(r, 60));
      const { blob, extension } = await exportMotionVideo({
        canvas,
        videoEl,
        durationSec,
        fps,
        videoBitsPerSecond: bitrateMbps * 1_000_000,
        signal: ctl.signal,
        onStart: () => startPlayback(),
        onStop: () => stopPlayback(),
        getCurrentTime,
        onProgress: (t01) => setProgress(t01),
      });
      const name = buildExportFilename(topicSlug, primaryPrimitive, extension);
      setResultBlob(blob);
      setResultName(name);
      setPhase('done');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setPhase('error');
      if (mode === 'single') stopPlayback();
    } finally {
      abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
  };

  const download = () => {
    if (!resultBlob) return;
    if (mode === 'batch') {
      downloadBlob(resultBlob, resultName);
    } else {
      triggerDownload(resultBlob, resultName);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0a0a0a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
        <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Video size={18} className="text-fuchsia-400" />
            <h2 className="text-base font-black tracking-tight">Export Motion Graphics</h2>
          </div>
          <button
            onClick={close}
            disabled={phase === 'recording'}
            className="p-1.5 rounded-lg hover:bg-gray-900 text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-6 space-y-5">
          {/* Filename preview */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
              Output filename
            </label>
            <div className="bg-black border border-gray-800 rounded-lg p-3 font-mono text-xs text-fuchsia-400 break-all">
              {mode === 'batch'
                ? `motion-graphics-${topicSlug}-…-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.zip`
                : previewFilename}
            </div>
            {mode === 'batch' && (
              <p className="text-[10px] text-gray-500 mt-2">
                ZIP contains <span className="text-fuchsia-400 font-bold">{beats.length} clips</span> in <code className="text-gray-300">clips/</code> + <code className="text-gray-300">manifest.json</code> + <code className="text-gray-300">manifest.md</code>.
              </p>
            )}
          </div>

          {phase === 'configure' && (
            <>
              {/* Mode toggle */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
                  Output
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('single')}
                    className={`p-3 rounded-xl text-xs font-bold text-left transition-colors ${
                      mode === 'single'
                        ? 'bg-fuchsia-500/15 border border-fuchsia-500 text-white'
                        : 'bg-black border border-gray-800 text-gray-400 hover:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Video size={14} />
                      <span>Single video</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium">
                      Whole timeline as one file
                    </div>
                  </button>
                  <button
                    onClick={() => setMode('batch')}
                    className={`p-3 rounded-xl text-xs font-bold text-left transition-colors ${
                      mode === 'batch'
                        ? 'bg-fuchsia-500/15 border border-fuchsia-500 text-white'
                        : 'bg-black border border-gray-800 text-gray-400 hover:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Files size={14} />
                      <span>Each animation (ZIP)</span>
                    </div>
                    <div className="text-[10px] text-gray-500 font-medium">
                      {beats.length} clips + timeline manifest
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
                    Frame rate
                  </label>
                  <div className="flex gap-1">
                    {[24, 30, 60].map((n) => (
                      <button
                        key={n}
                        onClick={() => setFps(n as 24 | 30 | 60)}
                        className={`flex-1 py-2 rounded-lg font-black text-xs ${
                          fps === n
                            ? 'bg-fuchsia-500 text-white'
                            : 'bg-black border border-gray-800 text-gray-400 hover:bg-gray-900'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
                    Bitrate (Mbps)
                  </label>
                  <div className="flex gap-1">
                    {[2, 5, 8, 12].map((n) => (
                      <button
                        key={n}
                        onClick={() => setBitrateMbps(n as 2 | 5 | 8 | 12)}
                        className={`flex-1 py-2 rounded-lg font-black text-xs ${
                          bitrateMbps === n
                            ? 'bg-fuchsia-500 text-white'
                            : 'bg-black border border-gray-800 text-gray-400 hover:bg-gray-900'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-gray-500 space-y-1">
                <div>
                  Format:{' '}
                  <span className="font-bold text-gray-300">
                    {supportedMime.extension === 'mp4' ? 'MP4 (H.264)' : 'WebM (VP9/VP8)'}
                  </span>
                </div>
                <div>
                  Duration: <span className="font-bold text-gray-300">{durationSec.toFixed(1)}s</span>
                </div>
                <div>
                  {videoEl ? 'Audio from your video will be included.' : 'Silent (no source video attached).'}
                </div>
                <div className="text-amber-400/80 mt-2">
                  Recording happens in real time — the editor will play through the timeline once. Don't switch tabs.
                </div>
              </div>

              <button
                onClick={startExport}
                disabled={!canvas || beats.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm tracking-wide shadow-lg shadow-fuchsia-500/20"
              >
                <Video size={16} /> Start recording
              </button>
            </>
          )}

          {phase === 'recording' && (
            <>
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-gray-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    {mode === 'batch' ? 'Recording clips' : 'Recording'}
                  </span>
                  <span className="font-mono text-gray-500">{Math.round(progress * 100)}%</span>
                </div>
                <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-fuchsia-500 to-orange-500 transition-all"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                {mode === 'batch' && batchLabel && (
                  <div className="mt-2 text-[11px] text-gray-500 font-mono">{batchLabel}</div>
                )}
              </div>
              <button
                onClick={cancel}
                className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-sm transition-colors"
              >
                Cancel
              </button>
            </>
          )}

          {phase === 'done' && (
            <>
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300">
                <CheckCircle2 size={22} className="flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-bold">Recording complete</div>
                  <div className="text-emerald-400/80 mt-0.5">
                    {resultBlob ? `${(resultBlob.size / 1024 / 1024).toFixed(2)} MB ready` : ''}
                  </div>
                </div>
              </div>
              <button
                onClick={download}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-500 hover:opacity-90 text-white font-black text-sm tracking-wide shadow-lg shadow-fuchsia-500/20"
              >
                <Download size={16} /> Download
              </button>
              <button
                onClick={reset}
                className="w-full py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 font-bold text-xs"
              >
                Record another with different settings
              </button>
            </>
          )}

          {phase === 'error' && (
            <>
              <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                <AlertCircle size={20} className="flex-shrink-0" />
                <div>
                  <div className="font-bold">Export failed</div>
                  <div className="text-red-400/80 mt-1">{error}</div>
                </div>
              </div>
              <button
                onClick={reset}
                className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-sm"
              >
                Try again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MotionExportDialog;

// Silence unused import warning (Loader2 reserved for a future inline state).
void Loader2;
