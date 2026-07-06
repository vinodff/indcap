import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Upload, Play, Pause, Download, Loader2, Sparkles } from 'lucide-react';
import StudioModePanel from './StudioModePanel';
import { StudioController } from '../services/enhance/studioController';
import { insertAudioEnhancer } from '../services/enhance/audioEnhancer';
import { PLATFORM_PRESETS, type SocialTarget } from '../services/enhance/exportPresets';
import type { EnhanceParams, QualityResult, SceneType } from '../services/enhance/types';

interface StudioModeStudioProps {
  onBack: () => void;
}

const RES_HEIGHT: Record<string, number> = { '720p': 720, '1080p': 1080, '4K': 2160 };
const BITRATE: Record<string, number> = { LOW: 2_000_000, MEDIUM: 5_000_000, HIGH: 8_000_000, ULTRA: 15_000_000 };

/**
 * Standalone Studio Mode tool: upload any video → AI auto-enhances it (color,
 * denoise, face, scene-aware) → export, with no captioning step. Reuses the same
 * services/enhance engine that powers Studio Mode inside Viral Captions.
 */
const StudioModeStudio: React.FC<StudioModeStudioProps> = ({ onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studioRef = useRef<StudioController | null>(null);
  if (!studioRef.current && typeof window !== 'undefined') studioRef.current = new StudioController();
  const rafRef = useRef<number | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const exportCtxRef = useRef<AudioContext | null>(null);

  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scene, setScene] = useState<SceneType | null>(null);
  const [before, setBefore] = useState<QualityResult | null>(null);
  const [after, setAfter] = useState<QualityResult | null>(null);
  const [active, setActive] = useState(false);
  const [params, setParams] = useState<EnhanceParams | null>(null);
  const [comparePos, setComparePos] = useState(1);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [platform, setPlatform] = useState<SocialTarget | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const activeRef = useRef(false);
  useEffect(() => { activeRef.current = active; }, [active]);
  const compareRef = useRef(1);
  useEffect(() => { compareRef.current = comparePos; }, [comparePos]);

  // --- Draw one frame (enhanced or raw) onto the display canvas. ---
  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (!vw || !vh) return;

    let enhanced: CanvasImageSource | null = null;
    if (activeRef.current) {
      enhanced = studioRef.current?.processFrame(video, video.currentTime) ?? null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cmp = compareRef.current;
    if (enhanced && cmp < 1) {
      // Right side = enhanced (After), left side = raw (Before). The visible
      // divider + drag handle are drawn as an HTML overlay aligned to splitX.
      ctx.drawImage(enhanced, 0, 0, canvas.width, canvas.height);
      const splitX = Math.round(canvas.width * cmp);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, canvas.height);
      ctx.clip();
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.drawImage(enhanced ?? video, 0, 0, canvas.width, canvas.height);
    }
  }, []);

  // --- Animation loop while playing. ---
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      drawFrame(); // single paused frame
      return;
    }
    const loop = () => {
      drawFrame();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, drawFrame]);

  // Repaint when enhancement state changes while paused.
  useEffect(() => { if (!isPlaying) drawFrame(); }, [active, comparePos, scene, after, isPlaying, drawFrame]);

  const runAnalysis = useCallback(async (video: HTMLVideoElement) => {
    const ctrl = studioRef.current;
    if (!ctrl) return;
    setActive(false); setComparePos(1); setPlatform(null); setAfter(null);
    setAnalyzing(true);
    const res = await ctrl.analyze(video);
    setScene(res.scene);
    setBefore(res.before);
    setParams(res.params);
    setAnalyzing(false);
  }, []);

  // Recompute the "after" score. When paused, drawFrame() has already rendered
  // the enhanced frame, so just score that output (no second full pipeline run).
  const refreshAfter = useCallback(() => {
    const video = videoRef.current, ctrl = studioRef.current;
    if (!video || !ctrl) return;
    const a = isPlaying
      ? ctrl.afterScore(video, video.currentTime)
      : ctrl.scoreOutput(video.videoWidth, video.videoHeight);
    if (a) setAfter(a);
  }, [isPlaying]);

  const handleParamsChange = useCallback((p: EnhanceParams) => {
    studioRef.current?.setParams(p);
    setParams(p);
    activeRef.current = true; // sync NOW so the immediate drawFrame() enhances
    setActive(true); // adjusting a slider implies "show me the result"
    if (!isPlaying) { drawFrame(); refreshAfter(); }
  }, [isPlaying, drawFrame, refreshAfter]);

  const handleResetParams = useCallback(() => {
    const p = studioRef.current?.resetToAuto();
    if (p) setParams({ ...p });
    if (!isPlaying) { drawFrame(); refreshAfter(); }
  }, [isPlaying, drawFrame, refreshAfter]);

  const handleComparePos = useCallback((v: number) => {
    compareRef.current = v; // sync now so a paused redraw uses it immediately
    setComparePos(v);
    if (!isPlaying) drawFrame();
  }, [isPlaying, drawFrame]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setVideoSrc(url);
    setIsPlaying(false);
    setScene(null); setBefore(null); setAfter(null); setActive(false);
  };

  const onLoadedData = () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    drawFrame();
    runAnalysis(video);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) { video.pause(); setIsPlaying(false); }
    else { video.play().catch(() => {}); setIsPlaying(true); }
  };

  const handleToggleStudio = (next: boolean) => {
    // Sync refs NOW so the synchronous draw below uses the new state, not the
    // stale value that the post-render effect would only apply next tick.
    activeRef.current = next;
    compareRef.current = next ? 0.5 : 1;
    setActive(next);
    setComparePos(next ? 0.5 : 1);
    if (!isPlaying) drawFrame(); // render first so the score reads the fresh frame
    if (next) refreshAfter();
  };

  // Drag the before/after divider directly on the video.
  const draggingRef = useRef(false);
  const setComparePosFromEvent = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    compareRef.current = pos; // sync immediately so a paused redraw uses it now
    setComparePos(pos);
    if (!isPlaying) drawFrame();
  };
  const onComparePointerDown = (e: React.PointerEvent) => {
    if (!active) return;
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setComparePosFromEvent(e.clientX);
  };
  const onComparePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    setComparePosFromEvent(e.clientX);
  };
  const onComparePointerUp = () => { draggingRef.current = false; };

  const handlePickPlatform = (t: SocialTarget) => setPlatform(t);

  // --- Export via canvas.captureStream + MediaRecorder. ---
  const handleExport = async () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;

    setExporting(true);
    setExportProgress(0);
    const wasLoop = video.loop;
    video.loop = false;
    video.pause();
    setIsPlaying(false);

    // Resize canvas to the platform/target resolution.
    const preset = platform ? PLATFORM_PRESETS[platform].export : null;
    const targetH = RES_HEIGHT[preset?.resolution ?? '1080p'] ?? canvas.height;
    const fps = preset?.fps ?? 30;
    const origW = canvas.width, origH = canvas.height;
    if (origH > 0 && targetH !== origH) {
      const scale = targetH / origH;
      canvas.width = Math.round(origW * scale);
      canvas.height = targetH;
    }

    await new Promise<void>((resolve) => {
      const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = 0;
    });

    // Manual frame source: push exactly one fully-rendered frame per draw via
    // track.requestFrame(), so the recorder never captures a duplicate/stale frame
    // (the cause of export judder). Probe support, else fall back to timed capture.
    const probe = canvas.captureStream(0).getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
    const canRequestFrame = !!(probe && typeof (probe as any).requestFrame === 'function');
    const canvasStream = canRequestFrame ? canvas.captureStream(0) : canvas.captureStream(fps);
    const vTrack = canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;

    // Audio: route the element audio through the cleanup chain if enabled.
    let audioStream: MediaStream | null = null;
    try {
      if (!exportCtxRef.current) {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        exportCtxRef.current = new Ctor();
      }
      const ctx = exportCtxRef.current!;
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
      const dest = ctx.createMediaStreamDestination();
      const vidAny = video as any;
      if (!vidAny.__studioAudioSource) {
        vidAny.__studioAudioSource = ctx.createMediaElementSource(video);
        vidAny.__studioAudioSource.connect(ctx.destination);
      }
      if (active && audioEnabled) {
        insertAudioEnhancer(ctx, vidAny.__studioAudioSource, dest, { enabled: true, strength: 0.7 });
      } else {
        try { vidAny.__studioAudioSource.connect(dest); } catch { /* connected */ }
      }
      audioStream = dest.stream;
    } catch (e) {
      console.warn('[StudioModeStudio] audio setup failed, video-only export:', e);
    }

    const finalStream = new MediaStream();
    canvasStream.getVideoTracks().forEach((t) => finalStream.addTrack(t));
    audioStream?.getAudioTracks().forEach((t) => finalStream.addTrack(t));

    const mimeCandidates = [
      'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
      'video/webm;codecs="h264,opus"',
      'video/webm;codecs="vp9,opus"',
      'video/webm',
    ];
    const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const recorder = new MediaRecorder(finalStream, {
      mimeType,
      videoBitsPerSecond: BITRATE[preset?.bitrate ?? 'HIGH'],
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };

    const finish = () => {
      if (recorder.state !== 'inactive') recorder.stop();
    };
    const onTime = () => {
      if (video.duration > 0) {
        setExportProgress(Math.round((video.currentTime / video.duration) * 100));
        if (video.currentTime >= video.duration - 0.25) finish();
      }
    };
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('ended', finish, { once: true });

    recorder.onstop = () => {
      video.removeEventListener('timeupdate', onTime);
      video.loop = wasLoop;
      // Restore preview canvas size.
      canvas.width = origW; canvas.height = origH;
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      a.download = `studio-enhanced-${platform ?? 'video'}.${ext}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExporting(false);
      setExportProgress(100);
      drawFrame();
    };

    // Render loop: draw the frame, then push EXACTLY that frame to the recorder.
    // One render == one encoded frame → no duplicated/stale frames → smooth.
    const exportLoop = () => {
      drawFrame();
      if (canRequestFrame && vTrack) {
        try { (vTrack as any).requestFrame(); } catch { /* noop */ }
      }
      if (recorder.state === 'recording') requestAnimationFrame(exportLoop);
    };
    recorder.start();
    requestAnimationFrame(exportLoop);
    video.play().catch(() => {});
  };

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    studioRef.current?.dispose();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-[var(--cc-bg)] text-[var(--cc-text-1)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--cc-border)]">
        <button onClick={onBack} className="cc-btn cc-btn-ghost !px-2 !py-2" title="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-fuchsia-400" />
          <h1 className="text-lg font-black tracking-tight">AI Studio Mode</h1>
          <span className="px-2 py-0.5 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-[9px] font-black rounded-full uppercase tracking-widest">Auto Enhance</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Preview */}
        <div className="flex-1 flex items-center justify-center bg-[#030303] relative p-4 min-h-[40vh]">
          {!videoSrc ? (
            <label className="flex flex-col items-center gap-4 cursor-pointer group">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-fuchsia-600 to-violet-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload size={40} />
              </div>
              <div className="text-center">
                <div className="text-xl font-black">Upload a video to enhance</div>
                <div className="text-[var(--cc-text-3)] text-sm mt-1">AI auto-fixes color, noise, faces & audio</div>
              </div>
              <input type="file" accept="video/*" className="hidden" onChange={handleUpload} />
            </label>
          ) : (
            <>
              <video
                ref={videoRef}
                src={videoSrc}
                className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
                onLoadedData={onLoadedData}
                onEnded={() => setIsPlaying(false)}
                crossOrigin="anonymous"
                playsInline
                preload="auto"
                loop
              />
              {/* Canvas + before/after compare overlay (wrapper hugs the canvas) */}
              <div
                className="relative inline-flex max-w-full max-h-full z-10"
                onPointerDown={onComparePointerDown}
                onPointerMove={onComparePointerMove}
                onPointerUp={onComparePointerUp}
                onPointerCancel={onComparePointerUp}
                style={{ cursor: active ? 'ew-resize' : 'default' }}
              >
                <canvas ref={canvasRef} className="block max-w-full max-h-full object-contain rounded-lg" />

                {active && (
                  <>
                    {/* Tiny engine diagnostic (ground truth if anything looks off) */}
                    <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[9px] font-mono text-emerald-300/90">
                      path:{studioRef.current?.getGlInfo() ?? 'none'} · after:{after?.score ?? 'null'}
                    </div>
                    {/* BEFORE / AFTER labels */}
                    <div className="pointer-events-none absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[var(--cc-text-1)]/90">
                      Before
                    </div>
                    <div className="pointer-events-none absolute top-2 right-2 rounded-md bg-fuchsia-600/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[var(--cc-text-1)]">
                      After
                    </div>
                    {/* Divider + drag handle */}
                    <div
                      className="pointer-events-none absolute top-0 bottom-0"
                      style={{ left: `${comparePos * 100}%`, transform: 'translateX(-50%)' }}
                    >
                      <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/90 shadow-[0_0_6px_rgba(0,0,0,0.6)]" />
                      <div className="absolute top-1/2 left-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-fuchsia-600 text-[var(--cc-text-1)] shadow-lg">
                        <span className="text-[10px] font-black">↔</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Transport */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/70 backdrop-blur-md rounded-full px-4 py-2 border border-[var(--cc-border)]">
                <button onClick={togglePlay} className="text-[var(--cc-text-1)] hover:text-fuchsia-400 transition">
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center gap-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-[var(--cc-text-1)] text-sm font-bold px-3 py-1.5 rounded-full transition"
                >
                  {exporting ? <><Loader2 size={15} className="animate-spin" /> {exportProgress}%</> : <><Download size={15} /> Export</>}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Panel */}
        <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-[var(--cc-border)] p-4 overflow-y-auto bg-[var(--cc-surface)]">
          <StudioModePanel
            hasVideo={!!videoSrc}
            analyzing={analyzing}
            supported={studioRef.current?.isSupported() ?? false}
            mode={studioRef.current?.getMode() ?? 'none'}
            scene={scene}
            before={before}
            after={after}
            active={active}
            onToggle={handleToggleStudio}
            comparePos={comparePos}
            onComparePos={handleComparePos}
            params={params}
            onParamsChange={handleParamsChange}
            onResetParams={handleResetParams}
            audioEnabled={audioEnabled}
            onAudioToggle={setAudioEnabled}
            onPickPlatform={handlePickPlatform}
            activePlatform={platform}
          />
        </div>
      </div>
    </div>
  );
};

export default StudioModeStudio;
