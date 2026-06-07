/**
 * TypographyReelStudio — the AI cinematic typography reel editor.
 *
 * Replaces the simple TypographyReelPanel with a 2-pane studio:
 *
 *   ┌─ header ─────────────────────────────────────────────────────────┐
 *   │ left: input + theme + layout + generate                          │
 *   │ center: live preview canvas + playback + scene markers + export  │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Flow:
 *   1. Drop audio (≤ 60 s).
 *   2. Pick theme + layout.
 *   3. Click "Generate Reel" → analyze (Gemini) → detect beats (FFT) →
 *      choreograph → render.
 *   4. Preview plays canvas + audio in sync via MotionStage's RAF loop.
 *   5. Click Export → MP4 with audio baked in.
 *
 * Per approved scope: no per-beat editor in v1. User regenerates by changing
 * theme/layout and clicking again.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Loader2,
  Upload,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Download,
  Music,
  CheckCircle2,
  AlertCircle,
  Film,
  Wand2,
} from 'lucide-react';

import {
  choreograph,
  analyzeTranscript,
  analyzeBeats,
  createCanvasRenderer,
  THEME_PRESETS,
} from '../services/typography';
import type {
  AnimationSequence,
  EnrichedTranscript,
  BeatGrid,
  ThemeProfile,
  PipelineStage,
} from '../services/typography';
import { TypographyRenderer } from '../services/typography/typographyRenderer';
import { SoundEngine } from '../services/soundEngine';
import {
  exportMotionVideo,
  triggerDownload,
} from '../services/motionGraphicsExport';
import { ImageEditorPanel } from './ImageEditorPanel';
import { TextEditorPanel } from './TextEditorPanel';
import { FindReplacePanel } from './FindReplacePanel';

// ─── Constants ────────────────────────────────────────────────────────────────

const REEL_LIMITS = {
  maxAudioSeconds: 60,
  maxFileBytes: 50 * 1024 * 1024,
  width: 1080,
  height: 1920,
  fps: 30,
  videoBitsPerSecond: 8_000_000,
} as const;

const STAGE_LABEL: Record<PipelineStage | 'image-processing', string> = {
  idle:          '',
  analyzing:     'Analyzing script with Gemini…',
  beats:         'Detecting audio beats…',
  choreographing: 'Choreographing scenes…',
  'image-processing': 'Processing images…',
  rendering:     'Rendering…',
  exporting:     'Exporting MP4…',
  error:         'Error',
};

interface Props {
  onBack: () => void;
}

const TypographyReelStudio: React.FC<Props> = ({ onBack }) => {
  // ── Inputs ─────────────────────────────────────────────────────────────────
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [themeId, setThemeId] = useState<string>('cinematic-poet');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5'>('9:16');
  const [isDragging, setIsDragging] = useState(false);

  // ── Pipeline state ─────────────────────────────────────────────────────────
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // ── Generated artifacts ────────────────────────────────────────────────────
  const [transcript, setTranscript] = useState<EnrichedTranscript | null>(null);
  const [beatGrid, setBeatGrid] = useState<BeatGrid | null>(null);
  const [animationSequence, setAnimationSequence] = useState<AnimationSequence | null>(null);
  const [timelineDuration, setTimelineDuration] = useState(0);

  // ── Image editing state ─────────────────────────────────────────────────────
  const [imageAssets, setImageAssets] = useState<any[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // ── Text editing state ───────────────────────────────────────────────────────
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'images' | 'text' | null>(null);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findMatches, setFindMatches] = useState(0);

  // ── Playback ───────────────────────────────────────────────────────────────
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [fpsMetrics, setFpsMetrics] = useState({ fps: 60, droppedFrames: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<TypographyRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);
  const metricsCheckRef = useRef<any>(null);
  const soundEngineRef = useRef<SoundEngine | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Initialize SoundEngine on mount
  useEffect(() => {
    const se = new SoundEngine();
    soundEngineRef.current = se;
    se.init();
    return () => {
      se.destroy();
      soundEngineRef.current = null;
    };
  }, []);

  // ── Audio element lifecycle ───────────────────────────────────────────────
  useEffect(() => {
    if (!audioUrl) return;
    const a = new Audio(audioUrl);
    a.preload = 'auto';
    a.onloadedmetadata = () => setAudioDuration(a.duration);
    a.ontimeupdate = () => {
      setCurrentTime(a.currentTime);
    };
    a.onended = () => {
      setPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) audioRef.current.currentTime = 0;
    };
    audioRef.current = a;
    return () => {
      a.pause();
      a.src = '';
      audioRef.current = null;
    };
  }, [audioUrl]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      exportAbortRef.current?.abort();
    };
  }, [audioUrl]);

  // Keep audio.currentTime in sync with the canvas-driven currentTime when paused
  useEffect(() => {
    const a = audioRef.current;
    if (!a || playing) return;
    if (Math.abs(a.currentTime - currentTime) > 0.08) {
      a.currentTime = Math.min(currentTime, audioDuration);
    }
  }, [currentTime, playing, audioDuration]);

  // Play/pause audio with the same toggle MotionStage uses
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.play().catch(() => undefined);
    } else {
      a.pause();
    }
  }, [playing]);

  // Initialize renderer when animation sequence is ready
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !animationSequence) return;

    try {
      const renderer = new TypographyRenderer(canvas, animationSequence);
      rendererRef.current = renderer;
    } catch (err) {
      console.error('[reel] renderer init failed', err);
    }

    return () => {
      rendererRef.current = null;
    };
  }, [animationSequence]);

  // Sync selected image ID to renderer for selection box drawing
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.selectedImageId = selectedImageId;
    }
  }, [selectedImageId]);

  // Animation render loop
  useEffect(() => {
    const animate = () => {
      const renderer = rendererRef.current;
      const audio = audioRef.current;
      if (renderer && audio) {
        renderer.render(0, audio, (word) => {
          if (soundEngineRef.current && !audio.paused) {
            const isHero = word.style.fontSize >= 80 || word.intensity === 3;
            const isPop = word.type === 'pop-slide-up' || word.type === 'bounce-in' || word.type === 'scale-pop';
            if (isHero || isPop) {
              soundEngineRef.current.playPop();
            } else {
              soundEngineRef.current.playWhoosh();
            }
          }
        });
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Monitor FPS metrics and display warnings
  useEffect(() => {
    const checkMetrics = () => {
      const renderer = rendererRef.current;
      if (renderer && playing) {
        const metrics = renderer.getMetrics();
        setFpsMetrics({ fps: metrics.fps, droppedFrames: metrics.droppedFrames });
      }
      metricsCheckRef.current = setTimeout(checkMetrics, 500);
    };

    if (playing) {
      metricsCheckRef.current = setTimeout(checkMetrics, 500);
    }

    return () => {
      if (metricsCheckRef.current) clearTimeout(metricsCheckRef.current);
    };
  }, [playing]);

  // ── File handling ──────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    setErrorMsg('');

    if (!file.type.startsWith('audio/')) {
      setErrorMsg('Please upload an audio file (MP3, WAV, M4A, AAC, OGG).');
      return;
    }
    if (file.size > REEL_LIMITS.maxFileBytes) {
      setErrorMsg(`File too large. Max ${REEL_LIMITS.maxFileBytes / 1024 / 1024} MB.`);
      return;
    }

    // Probe duration before accepting
    const probeUrl = URL.createObjectURL(file);
    const probe = new Audio(probeUrl);
    probe.onloadedmetadata = () => {
      if (probe.duration > REEL_LIMITS.maxAudioSeconds) {
        setErrorMsg(`Audio must be ≤ ${REEL_LIMITS.maxAudioSeconds} seconds. Yours is ${Math.round(probe.duration)} s.`);
        URL.revokeObjectURL(probeUrl);
        return;
      }
      // Accept
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioFile(file);
      setAudioUrl(probeUrl);
      setAudioDuration(probe.duration);
      // Reset generated state
      setTranscript(null);
      setBeatGrid(null);
      setAnimationSequence(null);
      setTimelineDuration(0);
      setCurrentTime(0);
      setPlaying(false);
      setStage('idle');
    };
    probe.onerror = () => {
      setErrorMsg('Could not read audio file.');
      URL.revokeObjectURL(probeUrl);
    };
  }, [audioUrl]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // ── Generate pipeline (Stage 1 → 2 → 3) ────────────────────────────────────
  const handleGenerate = async () => {
    if (!audioFile) return;
    setErrorMsg('');
    setProgress(0);

    try {
      // Stage 1: AI script analyzer
      setStage('analyzing');
      setProgress(0.2);
      const enriched = await analyzeTranscript(audioFile);
      if (!enriched || enriched.segments.length === 0) {
        throw new Error('No speech detected in the audio.');
      }
      setTranscript(enriched);
      setProgress(0.5);

      // Stage 2: beat analyzer
      setStage('beats');
      const grid = await analyzeBeats(audioFile);
      setBeatGrid(grid);
      setProgress(0.8);

      // Stage 3: choreography
      setStage('choreographing');
      const theme: ThemeProfile = THEME_PRESETS[themeId] as ThemeProfile;
      if (!theme) throw new Error(`Theme ${themeId} not found`);

      let width = 1080;
      let height = 1920;
      if (aspectRatio === '16:9') {
        width = 1920;
        height = 1080;
      } else if (aspectRatio === '1:1') {
        width = 1080;
        height = 1080;
      } else if (aspectRatio === '4:5') {
        width = 1080;
        height = 1350;
      }

      const sequence = choreograph({
        transcript: enriched,
        beatGrid: grid,
        theme,
        layout: { width, height },
      });

      setAnimationSequence(sequence);

      // Stage 4: Process images via backend API (if enabled)
      if (import.meta.env.VITE_IMAGE_ASSET_ENABLED === 'true') {
        setStage('image-processing' as any);
        setProgress(0.85);

        try {
          const transcriptText = enriched.segments
            .map((s) => s.text)
            .join(' ');

          console.log('[reel] image processing: transcript text =', transcriptText.substring(0, 100) + '...');

          // Call backend API for image processing
          const response = await fetch('/api/imageAssets/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcriptText,
              animationSequence: sequence,
            }),
          });

          console.log('[reel] image API response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('[reel] image API response data:', data);

            if (data.success && data.reelWithImages) {
              console.log(
                `[reel] ${data.imagesCount} images processed (${data.coverage.toFixed(1)}% coverage)`
              );
              setProgress(0.95);

              // Store images for editing
              setImageAssets(data.reelWithImages.imageAssets || []);
              console.log('[reel] image assets stored:', data.reelWithImages.imageAssets);

              // Load images into renderer if available
              if (rendererRef.current && data.reelWithImages.imageAssets.length > 0) {
                try {
                  await rendererRef.current.loadImageAssets(
                    data.reelWithImages.imageAssets
                  );
                  console.log('[reel] images loaded into renderer');
                } catch (imgError) {
                  console.warn('[reel] failed to load image assets:', imgError);
                }
              } else {
                console.warn('[reel] no image assets returned or renderer not ready');
              }
            } else {
              console.warn('[reel] image processing response not successful:', data);
            }
          } else {
            const error = await response.json();
            console.error('[reel] image processing failed:', error);
            setErrorMsg(`Image processing failed: ${error.error}`);
          }
        } catch (imgError) {
          console.error('[reel] image API call error:', imgError);
          // Don't fail the whole pipeline for image processing
        }
      } else {
        console.log('[reel] image processing disabled (VITE_IMAGE_ASSET_ENABLED not set)');
      }

      // Re-add the image processing stage label
      setTimelineDuration(sequence.durationMs / 1000);
      setCurrentTime(0);
      setPlaying(false);
      setStage('idle');
      setProgress(1);
    } catch (err) {
      console.error('[reel] generation failed', err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStage('error');
    }
  };

  // ── Image editing handlers ────────────────────────────────────────────────
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find which image was clicked
    for (const img of imageAssets) {
      if (
        x >= img.x &&
        x <= img.x + img.width &&
        y >= img.y &&
        y <= img.y + img.height
      ) {
        setSelectedImageId(img.assetId);
        setDraggedImageId(img.assetId);
        setDragOffset({
          x: x - img.x,
          y: y - img.y,
        });
        break;
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggedImageId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setImageAssets((prev) =>
      prev.map((img) =>
        img.assetId === draggedImageId
          ? {
              ...img,
              x: Math.max(0, Math.min(x - dragOffset.x, REEL_LIMITS.width - (img.width || 100))),
              y: Math.max(0, Math.min(y - dragOffset.y, REEL_LIMITS.height - (img.height || 100))),
            }
          : img
      )
    );

    // Update renderer
    if (rendererRef.current) {
      rendererRef.current.imageAssets = imageAssets;
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggedImageId(null);
  };

  // ── Keyboard shortcuts for image editing ────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImageId) return;

      const NUDGE_AMOUNT = e.shiftKey ? 1 : 5;

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          handleDeleteImage(selectedImageId);
          break;

        case 'ArrowUp':
          e.preventDefault();
          setImageAssets((prev) =>
            prev.map((img) =>
              img.assetId === selectedImageId
                ? { ...img, y: Math.max(0, img.y - NUDGE_AMOUNT) }
                : img
            )
          );
          break;

        case 'ArrowDown':
          e.preventDefault();
          setImageAssets((prev) =>
            prev.map((img) =>
              img.assetId === selectedImageId
                ? { ...img, y: Math.min(REEL_LIMITS.height - (img.height || 100), img.y + NUDGE_AMOUNT) }
                : img
            )
          );
          break;

        case 'ArrowLeft':
          e.preventDefault();
          setImageAssets((prev) =>
            prev.map((img) =>
              img.assetId === selectedImageId
                ? { ...img, x: Math.max(0, img.x - NUDGE_AMOUNT) }
                : img
            )
          );
          break;

        case 'ArrowRight':
          e.preventDefault();
          setImageAssets((prev) =>
            prev.map((img) =>
              img.assetId === selectedImageId
                ? { ...img, x: Math.min(REEL_LIMITS.width - (img.width || 100), img.x + NUDGE_AMOUNT) }
                : img
            )
          );
          break;

        case 'Escape':
          setSelectedImageId(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageId, imageAssets]);

  const handleUpdateImage = (id: string, updates: Partial<any>) => {
    setImageAssets((prev) =>
      prev.map((img) => (img.assetId === id ? { ...img, ...updates } : img))
    );

    // Update in renderer if it has the method
    if (rendererRef.current) {
      rendererRef.current.imageAssets = imageAssets;
    }
  };

  const handleDeleteImage = (id: string) => {
    setImageAssets((prev) => prev.filter((img) => img.assetId !== id));
    setSelectedImageId(null);

    // Update in renderer
    if (rendererRef.current) {
      rendererRef.current.imageAssets = imageAssets.filter((img) => img.assetId !== id);
    }
  };

  // ── Text editing handlers ──────────────────────────────────────────────────
  const handleUpdateWord = (wordId: string, newText: string) => {
    if (!animationSequence) return;

    setAnimationSequence((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        animations: prev.animations.map((anim) =>
          anim.id === wordId ? { ...anim, text: newText } : anim
        ),
      };
    });
  };

  const handleDeleteWord = (wordId: string) => {
    if (!animationSequence) return;

    setAnimationSequence((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        animations: prev.animations.filter((anim) => anim.id !== wordId),
      };
    });

    setSelectedWordId(null);
  };

  const handleSelectWord = (wordId: string | null) => {
    setSelectedWordId(wordId);
    setEditMode(wordId ? 'text' : null);
    if (rendererRef.current) {
      (rendererRef.current as any).selectedWordId = wordId;
    }
  };

  const handleDuplicateWord = (wordId: string) => {
    if (!animationSequence) return;

    const wordToDuplicate = animationSequence.animations.find(w => w.id === wordId);
    if (!wordToDuplicate) return;

    const newWord = {
      ...wordToDuplicate,
      id: `${wordToDuplicate.id}-copy-${Date.now()}`,
      startTime: wordToDuplicate.startTime + wordToDuplicate.duration + 100, // Add 100ms gap
    };

    setAnimationSequence((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        animations: [...prev.animations, newWord],
      };
    });

    // Select the new word
    setSelectedWordId(newWord.id);
  };

  const handleFind = (query: string) => {
    if (!animationSequence) return;
    const matches = animationSequence.animations.filter(w =>
      w.text.toLowerCase().includes(query.toLowerCase())
    );
    setFindMatches(matches.length);
  };

  const handleReplace = (find: string, replace: string, replaceAll: boolean) => {
    if (!animationSequence) return;

    if (replaceAll) {
      setAnimationSequence((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          animations: prev.animations.map((anim) =>
            anim.text.toLowerCase().includes(find.toLowerCase())
              ? { ...anim, text: anim.text.replace(new RegExp(find, 'gi'), replace) }
              : anim
          ),
        };
      });
      setShowFindReplace(false);
    } else {
      // Replace next match
      const firstMatch = animationSequence.animations.find(anim =>
        anim.text.toLowerCase().includes(find.toLowerCase())
      );
      if (firstMatch) {
        onUpdateWord(firstMatch.id, firstMatch.text.replace(new RegExp(find, 'gi'), replace));
      }
    }
  };

  // Keyboard shortcut for Find & Replace
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowFindReplace(!showFindReplace);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFindReplace]);

  // ── Playback controls ──────────────────────────────────────────────────────
  const handleRestart = () => {
    setCurrentTime(0);
    setPlaying(false);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = Math.min(t, audioDuration);
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || !animationSequence) return;

    setStage('exporting');
    setProgress(0);
    exportAbortRef.current = new AbortController();

    audio.currentTime = 0;

    let destStream: MediaStream | undefined;
    let sourceNode: MediaElementAudioSourceNode | null = null;
    let audioCtx: AudioContext | null = null;

    try {
      // Set up audio mixer using SoundEngine's AudioContext
      if (soundEngineRef.current) {
        soundEngineRef.current.init();
        audioCtx = soundEngineRef.current.getAudioContext();

        if (audioCtx) {
          if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }

          if (!mediaSourceRef.current || mediaSourceRef.current.mediaElement !== audio) {
            mediaSourceRef.current = audioCtx.createMediaElementSource(audio);
          }
          sourceNode = mediaSourceRef.current;

          const destNode = audioCtx.createMediaStreamDestination();
          destStream = destNode.stream;

          // Connect voice audio element to both speakers and recording stream
          sourceNode.disconnect();
          sourceNode.connect(audioCtx.destination);
          sourceNode.connect(destNode);

          // Connect SoundEngine masterGain to the recording stream
          soundEngineRef.current.connectToNode(destNode);
        }
      }

      const { blob, extension } = await exportMotionVideo({
        canvas,
        videoEl: audio as unknown as HTMLVideoElement, // export helper uses captureStream() — works on <audio> too
        audioStream: destStream, // Pass the custom mixed audio stream!
        durationSec: Math.min(timelineDuration, audioDuration),
        fps: REEL_LIMITS.fps,
        videoBitsPerSecond: REEL_LIMITS.videoBitsPerSecond,
        signal: exportAbortRef.current.signal,
        onStart: () => {
          setPlaying(true);
          setCurrentTime(0);
        },
        onStop: () => {
          setPlaying(false);
        },
        getCurrentTime: () => audio.currentTime,
        onProgress: (t01) => setProgress(t01),
      });

      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      triggerDownload(blob, `typography-reel-${themeId}-${ts}.${extension}`);
      setStage('idle');
    } catch (err) {
      console.error('[reel] export failed', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg !== 'Export aborted.') setErrorMsg('Export failed: ' + msg);
      setStage('idle');
    } finally {
      // Revert connections to restore normal playback defaults
      if (soundEngineRef.current) {
        soundEngineRef.current.disconnectFromNode();
      }
      if (sourceNode && audioCtx) {
        sourceNode.disconnect();
        sourceNode.connect(audioCtx.destination);
      }
    }
  };

  const handleCancelExport = () => {
    exportAbortRef.current?.abort();
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const fmtTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const canGenerate = audioFile !== null && stage !== 'analyzing' && stage !== 'beats' && stage !== 'choreographing' && stage !== 'exporting';
  const canExport = animationSequence !== null && stage !== 'exporting';
  const canPlay = animationSequence !== null;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">

      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-3 border-b border-gray-800 shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to feature selection"
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <Film size={18} className="text-violet-400" />
          <h2 className="text-white font-black text-lg tracking-tight">Typography Reel Studio</h2>
          <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
            AI Cinematic
          </span>
        </div>
        <p className="hidden md:block text-gray-500 text-xs ml-2 truncate">
          Audio → emotion-aware scenes → beat-synced typography → MP4
        </p>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

        {/* ── LEFT: controls ──────────────────────────────────────────────── */}
        <aside className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-gray-800 overflow-y-auto custom-scrollbar shrink-0">
          <div className="p-5 space-y-6">

            {/* Step 1: audio upload */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
                1 — Audio (≤ 60 s)
              </h3>

              <label
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                className={`
                  flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all
                  ${isDragging
                    ? 'border-violet-500 bg-violet-500/10'
                    : audioFile
                      ? 'border-green-600/50 bg-green-900/10'
                      : 'border-gray-700 hover:border-violet-600 hover:bg-violet-900/10'}
                `}
              >
                <input
                  type="file"
                  accept="audio/*"
                  onChange={onFileInput}
                  className="sr-only"
                  aria-label="Upload audio file"
                />
                {audioFile ? (
                  <>
                    <CheckCircle2 size={26} className="text-green-400" />
                    <div className="text-center">
                      <p className="text-white text-sm font-semibold truncate max-w-[200px]">{audioFile.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {fmtTime(audioDuration)} · {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                    <p className="text-gray-600 text-[11px]">Click to replace</p>
                  </>
                ) : (
                  <>
                    <div className="p-3 rounded-xl bg-gray-800"><Music size={22} className="text-violet-400" /></div>
                    <div className="text-center">
                      <p className="text-white text-sm font-semibold">Drop audio here</p>
                      <p className="text-gray-500 text-xs mt-0.5">MP3 · WAV · AAC · M4A · OGG</p>
                    </div>
                    <p className="text-violet-400 text-xs font-bold flex items-center gap-1"><Upload size={11} /> Browse file</p>
                  </>
                )}
              </label>
            </section>

            {/* Step 2: theme profile */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
                2 — Theme Profile
              </h3>
              <div className="space-y-2">
                {Object.values(THEME_PRESETS).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setThemeId(p.id)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                      ${themeId === p.id
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-gray-800 hover:border-gray-600 bg-gray-900/50'}
                    `}
                  >
                    <div className={`shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${p.previewGradient} shadow-sm`} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold truncate ${themeId === p.id ? 'text-white' : 'text-gray-300'}`}>{p.name}</p>
                      <p className="text-gray-500 text-[11px] truncate">{p.description}</p>
                    </div>
                    {themeId === p.id && <CheckCircle2 size={14} className="shrink-0 text-violet-400" />}
                  </button>
                ))}
              </div>
            </section>

            {/* Step 3: Aspect Ratio */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
                3 — Aspect Ratio
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: '9:16', label: '9:16 (Portrait)', desc: '1080 × 1920' },
                  { value: '16:9', label: '16:9 (Landscape)', desc: '1920 × 1080' },
                  { value: '1:1', label: '1:1 (Square)', desc: '1080 × 1080' },
                  { value: '4:5', label: '4:5 (Vertical)', desc: '1080 × 1350' },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setAspectRatio(r.value as any)}
                    className={`
                      flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all
                      ${aspectRatio === r.value
                        ? 'border-violet-500 bg-violet-500/10 text-white font-bold'
                        : 'border-gray-800 hover:border-gray-600 bg-gray-900/50 text-gray-400'}
                    `}
                  >
                    <span className="text-xs">{r.label}</span>
                    <span className="text-[9px] text-gray-500 mt-0.5">{r.desc}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Step 4: generate */}
            <section>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all
                  bg-gradient-to-r from-violet-600 to-indigo-600 text-white
                  hover:from-violet-500 hover:to-indigo-500
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {stage === 'analyzing' || stage === 'beats' || stage === 'choreographing' ? (
                  <><Loader2 size={15} className="animate-spin" /> {STAGE_LABEL[stage]}</>
                ) : animationSequence ? (
                  <><Wand2 size={15} /> Regenerate Reel</>
                ) : (
                  <><Sparkles size={15} /> Generate Reel</>
                )}
              </button>

              {/* Progress bar while running */}
              {(stage === 'analyzing' || stage === 'beats' || stage === 'choreographing') && (
                <div className="mt-3">
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Result summary */}
              {animationSequence && stage === 'idle' && (
                <p className="mt-2 text-center text-xs text-green-400 flex items-center justify-center gap-1">
                  <CheckCircle2 size={12} />
                  {animationSequence.animations.length} animations
                  {beatGrid && !Number.isNaN(beatGrid.bpm) && beatGrid.bpm > 0
                    ? ` · ~${beatGrid.bpm} BPM`
                    : ''}
                </p>
              )}
            </section>

            {/* Error */}
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 text-xs">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* Pipeline explainer */}
            <section className="border-t border-gray-800 pt-5">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">
                Pipeline
              </h3>
              <ol className="space-y-2 text-xs text-gray-500">
                {[
                  ['🤖', 'Gemini reads emotion, emphasis, scene boundaries per word'],
                  ['🎵', 'FFT detects audio onsets — words snap to beats'],
                  ['🎬', 'Choreographer picks the right primitive per emotion'],
                  [import.meta.env.VITE_IMAGE_ASSET_ENABLED === 'true' ? '🖼️' : '○', 'AI image search & background removal'],
                  ['📥', 'MediaRecorder exports MP4 with audio baked in'],
                ].map(([icon, text], i) => (
                  <li key={i} className={`flex items-start gap-2 ${import.meta.env.VITE_IMAGE_ASSET_ENABLED === 'true' && icon === '🖼️' ? 'text-green-500' : ''}`}>
                    <span>{icon}</span><span>{text}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </aside>

        {/* ── CENTER: preview ─────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col items-center justify-center gap-4 p-6 bg-[#080808] overflow-hidden min-h-0">

          {/* Canvas container */}
          <div className="w-full max-w-[360px] flex-1 min-h-0 flex items-center justify-center relative">
            {animationSequence ? (
              <>
                <canvas
                  ref={canvasRef}
                  className={`w-full h-auto max-h-full rounded-lg shadow-lg bg-black transition-all ${
                    draggedImageId ? 'cursor-grabbing ring-2 ring-violet-500' : 'cursor-pointer'
                  }`}
                  style={{
                    aspectRatio: animationSequence
                      ? `${animationSequence.layout.width} / ${animationSequence.layout.height}`
                      : `${REEL_LIMITS.width} / ${REEL_LIMITS.height}`
                  }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
                {/* Selected indicator */}
                {selectedImageId && (
                  <div className="absolute top-4 left-4 px-3 py-2 rounded-lg bg-violet-600/90 text-white text-xs font-medium flex items-center gap-2 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-violet-200 animate-pulse" />
                    Image selected • Drag to move
                  </div>
                )}
                {selectedWordId && (
                  <div className="absolute top-4 left-4 px-3 py-2 rounded-lg bg-blue-600/90 text-white text-xs font-medium flex items-center gap-2 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-200 animate-pulse" />
                    Text selected • Edit in panel
                  </div>
                )}
                {/* FPS indicator and frame drop warning */}
                {playing && (
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    {/* FPS display */}
                    <div className={`px-2.5 py-1.5 text-xs font-bold rounded-lg backdrop-blur-sm ${
                      fpsMetrics.fps >= 28 ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'
                    }`}>
                      {fpsMetrics.fps} FPS
                    </div>
                    {/* Frame drop warning */}
                    {fpsMetrics.fps < 30 && fpsMetrics.droppedFrames > 0 && (
                      <div className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-yellow-500/80 text-black flex items-center gap-1.5">
                        <AlertCircle size={12} />
                        {fpsMetrics.droppedFrames} drops
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <div className="text-6xl mb-3">🎬</div>
                <p className="text-gray-500">{audioFile ? 'Click Generate to start' : 'Upload audio to begin'}</p>
              </div>
            )}
          </div>

          {/* Timeline scrubber */}
          {canPlay && (
            <div className="w-full max-w-md space-y-2">
              <div className="relative h-1.5 bg-gray-800 rounded-full">
                {/* Progress */}
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full pointer-events-none"
                  style={{ width: `${Math.min(100, (currentTime / timelineDuration) * 100)}%` }}
                />
              </div>
              <input
                type="range"
                aria-label="Seek playback position"
                min={0}
                max={timelineDuration || 1}
                step={0.05}
                value={currentTime}
                onChange={handleSeek}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-xs text-gray-500 tabular-nums">
                <span>{fmtTime(currentTime)}</span>
                <span>{fmtTime(timelineDuration)}</span>
              </div>
            </div>
          )}

          {/* Playback + export controls */}
          {canPlay && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRestart}
                aria-label="Restart playback"
                className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setPlaying(p => !p)}
                className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm flex items-center gap-2 transition-colors"
              >
                {playing ? <Pause size={15} /> : <Play size={15} />}
                {playing ? 'Pause' : 'Play'}
              </button>

              {stage === 'exporting' ? (
                <button
                  type="button"
                  onClick={handleCancelExport}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold border border-red-700/50 text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2"
                >
                  <Loader2 size={14} className="animate-spin" />
                  Cancel ({Math.round(progress * 100)}%)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!canExport}
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  <Download size={15} /> Export MP4
                </button>
              )}
            </div>
          )}

          {/* Empty state */}
          {!canPlay && stage === 'idle' && (
            <div className="text-center text-gray-500 text-sm space-y-2">
              <div className="text-4xl">🎬</div>
              <p>Upload audio and click <span className="text-white font-bold">Generate Reel</span></p>
            </div>
          )}

          {/* Find & Replace Panel */}
          {showFindReplace && (
            <FindReplacePanel
              totalMatches={findMatches}
              onFind={handleFind}
              onReplace={handleReplace}
              onClose={() => setShowFindReplace(false)}
            />
          )}

        </main>

        {/* ── RIGHT: editor panel (images or text) ──────────────────────────── */}
        {(imageAssets.length > 0 || animationSequence) && (
          <aside className="w-80 bg-gray-900 border-l border-gray-800 overflow-hidden flex flex-col">
            {/* Tab selector */}
            {imageAssets.length > 0 && animationSequence && (
              <div className="flex border-b border-gray-800 bg-gray-800/50">
                <button
                  onClick={() => setEditMode('text')}
                  className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                    editMode === 'text'
                      ? 'text-blue-400 border-blue-500 bg-blue-500/10'
                      : 'text-gray-400 border-transparent hover:text-gray-300'
                  }`}
                >
                  ✏️ Text
                </button>
                <button
                  onClick={() => setEditMode('images')}
                  className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                    editMode === 'images'
                      ? 'text-violet-400 border-violet-500 bg-violet-500/10'
                      : 'text-gray-400 border-transparent hover:text-gray-300'
                  }`}
                >
                  🖼️ Images
                </button>
              </div>
            )}

            {/* Content */}
            {editMode === 'text' || (editMode === null && !imageAssets.length) ? (
              <TextEditorPanel
                animations={animationSequence?.animations || []}
                selectedWordId={selectedWordId}
                onSelectWord={handleSelectWord}
                onUpdateWord={handleUpdateWord}
                onDeleteWord={handleDeleteWord}
                onDuplicateWord={handleDuplicateWord}
                onOpenFindReplace={() => setShowFindReplace(true)}
                totalDuration={timelineDuration}
                currentTime={currentTime}
              />
            ) : (
              <ImageEditorPanel
                images={imageAssets}
                selectedImageId={selectedImageId}
                onSelectImage={setSelectedImageId}
                onUpdateImage={handleUpdateImage}
                onDeleteImage={handleDeleteImage}
                totalDuration={timelineDuration}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
};

export default TypographyReelStudio;
