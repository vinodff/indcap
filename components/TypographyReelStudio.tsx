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
  Smartphone,
  Tv,
  Square,
  Tablet,
  Zap,
  ChevronRight,
  Check,
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
import { keywordIconService } from '../services/typography/keywordIconService';
import {
  exportTypographyReelOffline,
  supportsOfflineExport,
} from '../services/typography/offlineExport';
import { SoundEngine } from '../services/soundEngine';
import {
  exportMotionVideo,
  triggerDownload,
} from '../services/motionGraphicsExport';
import { ImageEditorPanel } from './ImageEditorPanel';
import { TextEditorPanel } from './TextEditorPanel';
import { FindReplacePanel } from './FindReplacePanel';
import { CapCutStyleEditor } from './CapCutStyleEditor';

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
  const [hoveredThemeId, setHoveredThemeId] = useState<string | null>(null);
  const [rawAudioPlaying, setRawAudioPlaying] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  // ── Pipeline state ─────────────────────────────────────────────────────────
  const [stage, setStage] = useState<PipelineStage | 'image-processing'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // ── Generated artifacts ────────────────────────────────────────────────────
  const [transcript, setTranscript] = useState<EnrichedTranscript | null>(null);
  const [beatGrid, setBeatGrid] = useState<BeatGrid | null>(null);
  const [tempSequence, setTempSequence] = useState<AnimationSequence | null>(null);
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
  const audioInputRef = useRef<HTMLInputElement>(null);

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
      setRawAudioPlaying(false);
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
      const prev = rendererRef.current;
      const renderer = new TypographyRenderer(canvas, animationSequence);
      // Every word edit produces a new sequence object, which recreates the
      // renderer. Carry image state (and already-decoded bitmaps) over —
      // otherwise images silently vanish after the first text edit.
      renderer.imageAssets = imageAssets;
      renderer.selectedImageId = selectedImageId;
      if (prev) renderer.imageBitmaps = prev.imageBitmaps;
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
      setTempSequence(null);
      setAnimationSequence(null);
      setTimelineDuration(0);
      setCurrentTime(0);
      setPlaying(false);
      setRawAudioPlaying(false);
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
    if (!audioFile) {
      audioInputRef.current?.click();
      return;
    }
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

      // New sequence = new world: drop selections and images from the old run,
      // otherwise stale assets linger in the panel/timeline after a regenerate.
      setImageAssets([]);
      setSelectedImageId(null);
      setSelectedWordId(null);
      setDraggedImageId(null);
      setEditMode(null);

      setTempSequence(sequence);

      // Dynamic keyword icons (Iconify, fetched from the internet per hero
      // word). Soft 5s cap: a slow network never blocks generation — late
      // icons still land in the cache and pop into the live preview.
      const bgHex = (theme.backgroundColor || '#000000').replace('#', '');
      const bgLum = bgHex.length === 6
        ? (0.2126 * parseInt(bgHex.slice(0, 2), 16) +
           0.7152 * parseInt(bgHex.slice(2, 4), 16) +
           0.0722 * parseInt(bgHex.slice(4, 6), 16)) / 255
        : 0;
      await Promise.race([
        keywordIconService.prefetch(sequence, bgLum > 0.5 ? '#1A1A1A' : '#FFFFFF'),
        new Promise((resolve) => setTimeout(resolve, 5000)),
      ]);

      // Stage 4: Process images via backend API (if enabled)
      if (import.meta.env.VITE_IMAGE_ASSET_ENABLED === 'true') {
        setStage('image-processing');
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
            // Optional enhancement stage — an unconfigured/unavailable image
            // backend must not surface a user-facing error, just skip images.
            const error = await response.json().catch(() => ({}));
            console.warn('[reel] image processing unavailable, skipping:', error);
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

      // Trigger premium success celebration overlay
      setShowSuccessOverlay(true);
      setTimeout(() => {
        setShowSuccessOverlay(false);
        setAnimationSequence(sequence);
      }, 2500);
    } catch (err) {
      console.error('[reel] generation failed', err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStage('error');
    }
  };

  // ── Image editing handlers ────────────────────────────────────────────────

  // The canvas is displayed scaled-down via CSS (e.g. 1080×1920 internal →
  // ~320px wide on screen). Mouse events arrive in CSS pixels; image
  // coordinates live in canvas pixels. Convert before hit-testing/dragging,
  // otherwise clicks land far away from the images they target.
  const toCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const { x, y } = toCanvasCoords(e);

    // Find which image was clicked
    for (const img of imageAssets) {
      if (
        x >= img.x &&
        x <= img.x + img.width &&
        y >= img.y &&
        y <= img.y + img.height
      ) {
        setSelectedImageId(img.assetId);
        setSelectedWordId(null); // selections are mutually exclusive
        setDraggedImageId(img.assetId);
        setDragOffset({
          x: x - img.x,
          y: y - img.y,
        });
        break;
      }
    }
  };

  // Clamp bounds must match the generated layout — 1080×1920 is only correct
  // for 9:16. For 16:9/1:1/4:5 the hardcoded limits let images escape the
  // canvas (or blocked them from reaching the right edge).
  const stageW = animationSequence?.layout.width ?? REEL_LIMITS.width;
  const stageH = animationSequence?.layout.height ?? REEL_LIMITS.height;

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggedImageId || !canvasRef.current) return;
    const { x, y } = toCanvasCoords(e);

    setImageAssets((prev) =>
      prev.map((img) =>
        img.assetId === draggedImageId
          ? {
              ...img,
              x: Math.max(0, Math.min(x - dragOffset.x, stageW - (img.width || 100))),
              y: Math.max(0, Math.min(y - dragOffset.y, stageH - (img.height || 100))),
            }
          : img
      )
    );
  };

  const handleCanvasMouseUp = () => {
    setDraggedImageId(null);
  };

  // Single source of truth for renderer image state. The previous manual
  // `rendererRef.current.imageAssets = imageAssets` assignments inside the
  // handlers captured a STALE closure value, so edits never reached the
  // canvas. Sync here whenever React state actually changes.
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.imageAssets = imageAssets;
    }
  }, [imageAssets]);

  // ── Keyboard shortcuts for image editing ────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImageId) return;

      // Never hijack keys while the user is typing (e.g. Backspace in the
      // word-edit textarea must edit text, not delete the selected image).
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return;
      }

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
                ? { ...img, y: Math.min(stageH - (img.height || 100), img.y + NUDGE_AMOUNT) }
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
                ? { ...img, x: Math.min(stageW - (img.width || 100), img.x + NUDGE_AMOUNT) }
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
  }, [selectedImageId, imageAssets, stageW, stageH]);

  const handleUpdateImage = (id: string, updates: Partial<any>) => {
    setImageAssets((prev) =>
      prev.map((img) => (img.assetId === id ? { ...img, ...updates } : img))
    );
  };

  const handleDeleteImage = (id: string) => {
    setImageAssets((prev) => prev.filter((img) => img.assetId !== id));
    setSelectedImageId(null);
  };

  // ── Text editing handlers ──────────────────────────────────────────────────
  const handleUpdateWord = (wordId: string, newText: string) => {
    if (!animationSequence) return;

    setAnimationSequence((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        animations: prev.animations.map((anim) =>
          anim.wordId === wordId ? { ...anim, text: newText } : anim
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
        animations: prev.animations.filter((anim) => anim.wordId !== wordId),
      };
    });

    setSelectedWordId(null);
  };

  const handleSelectWord = (wordId: string | null) => {
    setSelectedWordId(wordId);
    if (wordId) setSelectedImageId(null); // selections are mutually exclusive
    setEditMode(wordId ? 'text' : null);
    if (rendererRef.current) {
      (rendererRef.current as any).selectedWordId = wordId;
    }
  };

  const handleSelectImage = (imageId: string | null) => {
    setSelectedImageId(imageId);
    if (imageId) setSelectedWordId(null); // selections are mutually exclusive
  };

  const handleDuplicateWord = (wordId: string) => {
    if (!animationSequence) return;

    const wordToDuplicate = animationSequence.animations.find(w => w.wordId === wordId);
    if (!wordToDuplicate) return;

    const newWord = {
      ...wordToDuplicate,
      wordId: `${wordToDuplicate.wordId}-copy-${Date.now()}`,
      startTime: wordToDuplicate.startTime + wordToDuplicate.duration + 0.1, // times are seconds — 0.1 = 100ms gap
    };

    setAnimationSequence((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        animations: [...prev.animations, newWord],
      };
    });

    // Select the new word
    setSelectedWordId(newWord.wordId);
  };

  const handleFind = (query: string) => {
    if (!animationSequence) return;
    const matches = animationSequence.animations.filter(w =>
      w.text.toLowerCase().includes(query.toLowerCase())
    );
    setFindMatches(matches.length);
  };

  // User input must be treated as literal text — "(", "?" etc. would
  // otherwise throw "Invalid regular expression" and crash the replace.
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const handleReplace = (find: string, replace: string, replaceAll: boolean) => {
    if (!animationSequence) return;

    if (replaceAll) {
      setAnimationSequence((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          animations: prev.animations.map((anim) =>
            anim.text.toLowerCase().includes(find.toLowerCase())
              ? { ...anim, text: anim.text.replace(new RegExp(escapeRegExp(find), "gi"), replace) }
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
        handleUpdateWord(firstMatch.wordId, firstMatch.text.replace(new RegExp(escapeRegExp(find), "gi"), replace));
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

  const toggleRawAudio = () => {
    if (!audioUrl) return;
    const a = audioRef.current;
    if (a) {
      if (rawAudioPlaying) {
        a.pause();
        setRawAudioPlaying(false);
      } else {
        a.play().catch(console.error);
        setRawAudioPlaying(true);
      }
    }
  };

  const handleRemoveAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setRawAudioPlaying(false);
    setAudioFile(null);
    setAudioUrl(null);
    setAudioDuration(0);
    setTranscript(null);
    setBeatGrid(null);
    setTempSequence(null);
    setAnimationSequence(null);
    setStage('idle');
  };

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

    // OFFLINE EXPORT (preferred) — deterministic frame-by-frame WebCodecs
    // encode to a real seekable MP4. No realtime capture: preview jank, GC
    // pauses, and tab throttling can no longer freeze frames or desync audio.
    // Falls back to the legacy realtime recorder if WebCodecs is missing or
    // the encode fails.
    if (supportsOfflineExport()) {
      try {
        const voiceAudio = audioFile
          ? await new OfflineAudioContext(1, 1, 48000).decodeAudioData(
              await audioFile.arrayBuffer()
            )
          : undefined;
        const { blob, extension } = await exportTypographyReelOffline({
          sequence: animationSequence,
          voiceAudio,
          imageAssets,
          fps: REEL_LIMITS.fps,
          videoBitsPerSecond: 12_000_000, // offline can afford a higher rate
          onProgress: setProgress,
          signal: exportAbortRef.current.signal,
        });
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        triggerDownload(blob, `typography-reel-${themeId}-${ts}.${extension}`);
        setStage('idle');
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'Export aborted.') {
          setStage('idle');
          return;
        }
        console.warn('[reel] offline export failed — falling back to realtime capture:', err);
        // fall through to the legacy realtime path below
      }
    }

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

  const isGenerating = stage === 'analyzing' || stage === 'beats' || stage === 'choreographing' || stage === 'image-processing';
  const canGenerate = audioFile !== null && !isGenerating && stage !== 'exporting';
  const canExport = animationSequence !== null && stage !== 'exporting';
  const canPlay = animationSequence !== null;

  // ─── Render ─────────────────────────────────────────────────────────────────

  // If animation sequence is ready, show the CapCut-style editor
  if (animationSequence) {
    return (
      <div className="relative w-full h-screen">
      <CapCutStyleEditor
        canvas={
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <canvas
              ref={canvasRef}
              className={`max-w-full max-h-full ${
                draggedImageId ? 'cursor-grabbing ring-2 ring-violet-500' : 'cursor-pointer'
              }`}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />
          </div>
        }
        animations={animationSequence.animations}
        images={imageAssets}
        selectedWordId={selectedWordId}
        selectedImageId={selectedImageId}
        playing={playing}
        currentTime={currentTime}
        totalDuration={timelineDuration}
        onSelectWord={handleSelectWord}
        onSelectImage={handleSelectImage}
        onPlayPause={() => setPlaying(!playing)}
        onSeek={(time) => {
          setCurrentTime(time / 1000);
          if (audioRef.current) {
            audioRef.current.currentTime = time / 1000;
          }
        }}
        onRestart={() => {
          setCurrentTime(0);
          setPlaying(false);
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
          }
        }}
        onUpdateWord={handleUpdateWord}
        onDeleteWord={handleDeleteWord}
        onDuplicateWord={handleDuplicateWord}
        onUpdateImage={handleUpdateImage}
        onDeleteImage={handleDeleteImage}
        onBack={onBack}
        onExport={handleExport}
        onOpenFindReplace={() => setShowFindReplace(true)}
      />
      {/* Ctrl+H / search button — previously only rendered in the pre-generation
          branch, which made Find & Replace unreachable once the editor opened. */}
      {showFindReplace && (
        <FindReplacePanel
          totalMatches={findMatches}
          onFind={handleFind}
          onReplace={handleReplace}
          onClose={() => setShowFindReplace(false)}
        />
      )}
      {/* Export/image errors were invisible in editor mode (errorMsg only
          rendered in the setup screen). */}
      {errorMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 flex items-start gap-2 p-3 rounded-xl bg-red-900/90 border border-red-700/40 text-red-200 text-xs max-w-md shadow-lg">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <p>{errorMsg}</p>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => setErrorMsg('')}
            className="shrink-0 ml-1 text-red-300 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
      </div>
    );
  }

  // Otherwise, show the generation UI.
  // After the early-return above, TS narrows animationSequence to null here;
  // the legacy JSX below still references it conditionally, so keep a widened
  // alias to satisfy the type checker without changing runtime behavior.
  const seq = animationSequence as AnimationSequence | null;
  return (
    <div className="flex-1 flex flex-col bg-[var(--cc-bg)] overflow-hidden relative">

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[var(--cc-border)] bg-[var(--cc-surface)] shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to feature selection"
            className="p-1.5 rounded-lg hover:bg-[var(--cc-surface-3)] transition-colors text-[var(--cc-text-3)] hover:text-[var(--cc-text-1)] flex items-center justify-center border border-white/5 hover:border-white/10 cursor-pointer"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--cc-text-3)] hover:text-[var(--cc-text-1)] cursor-pointer" onClick={onBack}>Creatorin</span>
            <span className="text-gray-600 text-xs">/</span>
            <span className="text-xs font-bold text-[var(--cc-text-3)] hover:text-[var(--cc-text-1)] cursor-pointer" onClick={onBack}>Studio</span>
            <span className="text-gray-600 text-xs">/</span>
            <div className="flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full text-violet-400 font-bold text-[11px] tracking-wide">
              <Film size={11} />
              Typography Reel
            </div>
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-medium text-[var(--cc-text-3)] select-none">
          {[
            { label: 'Audio', done: audioFile !== null, active: audioFile === null && stage === 'idle' },
            { label: 'Emotion Detection', done: stage !== 'idle' && stage !== 'analyzing', active: stage === 'analyzing' },
            { label: 'Typography Layout', done: stage !== 'idle' && stage !== 'analyzing' && stage !== 'choreographing', active: stage === 'choreographing' },
            { label: 'Beat Sync', done: stage === 'rendering' || tempSequence !== null, active: stage === 'beats' },
            { label: 'Export Reel', done: false, active: stage === 'exporting' }
          ].map((step, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight size={10} className="text-gray-600 font-bold mx-0.5" />}
              <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border transition-all ${
                step.done 
                  ? 'bg-green-500/10 border-green-500/20 text-green-400 font-bold'
                  : step.active
                    ? 'bg-violet-500/10 border-violet-500/30 text-violet-400 font-bold animate-pulse'
                    : 'bg-white/5 border-white/5 text-[var(--cc-text-3)]'
              }`}>
                {step.done && <Check size={8} className="text-green-400 font-black mr-0.5" />}
                {step.active && !step.done && <Loader2 size={10} className="animate-spin" />}
                <span>{step.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">

        {/* ── LEFT: controls ──────────────────────────────────────────────── */}
        <aside className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-[var(--cc-border)] overflow-y-auto custom-scrollbar shrink-0 bg-[var(--cc-surface)]/20">
          <div className="p-5 space-y-8">

            {/* Step 1: audio upload */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3.5 font-['Space_Grotesk']">
                1 - Audio (≤ 60 s)
              </h3>

              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={onFileInput}
                className="sr-only"
                aria-label="Upload audio file"
              />

              {audioFile ? (
                <div className="w-full p-4 rounded-2xl bg-zinc-950 border border-[var(--cc-border)] flex flex-col gap-3.5 shadow-xl animate-[scaleIn_0.2s_ease-out]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-full text-green-400 text-[10px] font-black uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      Audio Ready
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveAudio}
                      className="text-gray-500 hover:text-red-400 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-1 text-left">
                    <p className="text-sm font-bold text-white truncate w-full">{audioFile.name}</p>
                    <p className="text-gray-500 text-xs font-medium">
                      {fmtTime(audioDuration)} · {(audioFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={toggleRawAudio}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      {rawAudioPlaying ? <Pause size={12} /> : <Play size={12} />}
                      {rawAudioPlaying ? 'Pause' : 'Listen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-gray-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Replace
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  className={`
                    flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all
                    ${isDragging
                      ? 'border-violet-500 bg-violet-500/10'
                      : 'border-[var(--cc-border)] hover:border-violet-600 hover:bg-violet-900/10'}
                  `}
                >
                  <div className="p-3 rounded-xl bg-[var(--cc-surface-3)]"><Music size={22} className="text-violet-400" /></div>
                  <div className="text-center">
                    <p className="text-[var(--cc-text-1)] text-sm font-semibold">Drop audio here</p>
                    <p className="text-gray-400 text-xs mt-0.5 font-medium">MP3 · WAV · AAC · M4A · OGG</p>
                  </div>
                  <p className="text-violet-400 text-xs font-bold flex items-center gap-1 hover:text-violet-300"><Upload size={11} /> Browse file</p>
                </label>
              )}
            </section>

            {/* Step 2: theme profile */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3.5 font-['Space_Grotesk']">
                2 - Theme Profile
              </h3>
              <div className="space-y-2.5">
                {Object.values(THEME_PRESETS).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setThemeId(p.id)}
                    onMouseEnter={() => setHoveredThemeId(p.id)}
                    onMouseLeave={() => setHoveredThemeId(null)}
                    className={`
                      w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md
                      ${themeId === p.id
                        ? 'border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.15)] font-medium'
                        : 'border-[var(--cc-border)] hover:border-gray-600 bg-[var(--cc-surface)]/50'}
                    `}
                  >
                    <div 
                      className={`shrink-0 w-14 h-11 rounded-lg bg-gradient-to-br ${p.previewGradient} shadow-md flex items-center justify-center overflow-hidden border border-white/10`}
                      style={{
                        fontFamily: p.fontFamily || 'sans-serif',
                        color: p.primaryColor || '#ffffff',
                        fontWeight: p.fontWeightBold || 700,
                        fontSize: p.id === 'tech-bold' ? '9px' : '11px',
                        letterSpacing: p.id === 'tech-bold' ? '0px' : p.id === 'retro-neon' ? '1.5px' : '0.5px',
                        textShadow: p.id === 'retro-neon' ? '0 0 6px rgba(255,0,255,0.8)' : p.id === 'soft-aesthetic' ? '0 0 4px rgba(228,170,255,0.6)' : 'none',
                      }}
                    >
                      {p.id === 'cinematic-poet' && <span className="italic" style={{ color: p.primaryColor }}>Poet</span>}
                      {p.id === 'viral-hook' && <span className="uppercase" style={{ color: '#ffffff', backgroundColor: p.accentColor || '#FF006E', padding: '1px 3px', borderRadius: '3px', fontSize: '8px', fontWeight: 900 }}>HOOK</span>}
                      {p.id === 'tech-bold' && <span className="font-mono text-cyan-400">TECH</span>}
                      {p.id === 'soft-aesthetic' && <span style={{ color: '#F0E6FF' }}>Soft</span>}
                      {p.id === 'retro-neon' && <span style={{ color: '#FFFF00' }}>NEON</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold truncate ${themeId === p.id ? 'text-[var(--cc-text-1)]' : 'text-[var(--cc-text-2)]'}`}>{p.name}</p>
                      <p className="text-gray-400 text-[11px] truncate leading-normal">{p.description}</p>
                    </div>
                    {themeId === p.id && <CheckCircle2 size={14} className="shrink-0 text-violet-400" />}
                  </button>
                ))}
              </div>
            </section>

            {/* Step 3: Aspect Ratio */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3.5 font-['Space_Grotesk']">
                3 - Aspect Ratio
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: '9:16', label: '9:16 Portrait', desc: 'Shorts, Reels, TikTok', icon: <Smartphone size={15} /> },
                  { value: '16:9', label: '16:9 Landscape', desc: 'YouTube Video', icon: <Tv size={15} /> },
                  { value: '1:1', label: '1:1 Square', desc: 'Instagram Post', icon: <Square size={15} /> },
                  { value: '4:5', label: '4:5 Portrait', desc: 'Social Feed', icon: <Smartphone size={15} /> },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setAspectRatio(r.value as any)}
                    className={`
                      relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer select-none gap-1.5 hover:-translate-y-0.5 hover:shadow-md
                      ${aspectRatio === r.value
                        ? 'border-violet-500 bg-violet-500/10 text-[var(--cc-text-1)] ring-1 ring-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.3)] scale-[1.02] font-bold'
                        : 'border-[var(--cc-border)] hover:border-gray-600 bg-[var(--cc-surface)]/50 text-[var(--cc-text-3)]'}
                    `}
                  >
                    <div className={`p-1.5 rounded-lg ${aspectRatio === r.value ? 'bg-violet-500/20 text-violet-400' : 'bg-white/5 text-[var(--cc-text-3)]'}`}>
                      {r.icon}
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-bold leading-none">{r.label}</span>
                      <span className="text-[9px] text-gray-400 mt-1 opacity-80 leading-tight">{r.desc}</span>
                    </div>
                    {aspectRatio === r.value && (
                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-violet-500 flex items-center justify-center text-white text-[8px] font-black animate-[scaleIn_0.15s_ease-out]">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* Step 4: generate */}
            <section className="space-y-4">
              <button
                type="button"
                onClick={handleGenerate}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm tracking-wide cursor-pointer transition-all duration-300 shadow-md select-none
                  ${!audioFile 
                    ? 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 text-white hover:opacity-95 hover:scale-[1.01] active:scale-[0.99] hover:shadow-[0_0_20px_rgba(139,92,246,0.35)]'
                    : isGenerating 
                      ? 'bg-[var(--cc-surface-3)] text-gray-500 cursor-not-allowed opacity-70 border border-white/5'
                      : 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 text-white hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_25px_rgba(139,92,246,0.45)]'
                  }
                `}
                disabled={audioFile ? !canGenerate : false}
              >
                {!audioFile ? (
                  <><Upload size={15} /> Upload Audio to Generate</>
                ) : isGenerating ? (
                  <><Loader2 size={15} className="animate-spin" /> {STAGE_LABEL[stage]}</>
                ) : tempSequence ? (
                  <><Wand2 size={15} /> Regenerate Reel</>
                ) : (
                  <><Sparkles size={15} /> Generate Reel</>
                )}
              </button>

              {audioFile && (
                <p className="text-[10px] text-gray-500 text-center select-none font-medium leading-none">
                  <Zap size={10} className="inline mr-1 text-yellow-400" /> Average render: 45 sec
                </p>
              )}

              {/* Progress bar while running */}
              {isGenerating && (
                <div className="space-y-2 pt-1">
                  <div className="w-full h-1.5 bg-[var(--cc-surface-3)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-300"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Result summary */}
              {tempSequence && stage === 'idle' && (
                <p className="mt-2 text-center text-xs text-green-400 flex items-center justify-center gap-1 animate-pulse">
                  <CheckCircle2 size={12} />
                  {tempSequence.animations.length} animations
                  {beatGrid && !Number.isNaN(beatGrid.bpm) && beatGrid.bpm > 0
                    ? ` · ~${beatGrid.bpm} BPM`
                    : ''}
                </p>
              )}
            </section>

            {/* Error */}
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-900/20 border border-red-700/40 text-red-400 text-xs animate-[shake_0.4s_ease-in-out]">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* Collapsible Pipeline explainer or Generation Progress */}
            {isGenerating ? (
              <section className="border-t border-[var(--cc-border)] pt-5 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 font-['Space_Grotesk']">
                  AI Generation Progress
                </h3>
                <div className="p-4 rounded-xl bg-[var(--cc-surface-2)] border border-[var(--cc-border-mid)] space-y-3.5 shadow-inner">
                  {[
                    { id: 'analyzing', label: 'Speech Emotion Analysis', desc: 'Gemini scans speech emotion & emphasis' },
                    { id: 'beats', label: 'Audio Beat Alignment', desc: 'FFT-flux maps audio rhythm & BPM' },
                    { id: 'choreographing', label: 'Kinetic Choreography', desc: 'Choreographer structures motion scenes' },
                    { id: 'rendering', label: 'Canvas Rendering', desc: 'Rendering vectors & styled visuals' },
                  ].map((step, idx) => {
                    const stages = ['analyzing', 'beats', 'choreographing', 'rendering'];
                    const currentIdx = stages.indexOf(stage);
                    const stepIdx = stages.indexOf(step.id);
                    
                    const isDone = stepIdx < currentIdx;
                    const isActive = step.id === stage;
                    const isPending = stepIdx > currentIdx;

                    return (
                      <div key={step.id} className="flex items-start gap-3 text-left">
                        <div className="mt-0.5 shrink-0">
                          {isDone ? (
                            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[9px] font-black animate-[scaleIn_0.15s_ease-out]">✓</div>
                          ) : isActive ? (
                            <Loader2 size={14} className="animate-spin text-violet-400" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-gray-700 bg-black/20 flex items-center justify-center text-gray-600 text-[9px]">•</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold ${isActive ? 'text-violet-300' : isDone ? 'text-[var(--cc-text-2)]' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="border-t border-[var(--cc-border)] pt-5 space-y-3.5 select-none text-left">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 font-['Space_Grotesk']">
                  Workflow Pipeline
                </h3>
                <div className="space-y-2">
                  {[
                    { title: 'Speech Emotion Detection', desc: 'Gemini analyzes voiceover tone, speed, and focus words to choreograph dynamic layouts.' },
                    { title: 'Rhythmic Beat Syncing', desc: 'FFT audio flux analyzes backing tracks and speech beats to time text transitions.' },
                    { title: 'Kinetic AI Typography', desc: 'Synthesizes font presets, shadows, scaling, and text alignments in real-time.' },
                    { title: 'MP4 Video Export', desc: 'Stitches final canvas animation frames and audio track into a web-ready video file.' }
                  ].map((item, idx) => (
                    <details key={idx} className="group border border-white/5 bg-zinc-950/20 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex items-center justify-between p-3 text-xs font-bold text-gray-300 hover:text-white cursor-pointer select-none transition-colors">
                        <span className="flex items-center gap-2">
                          <span className="text-green-400 font-bold"><CheckCircle2 size={11} className="inline" /></span>
                          <span>{item.title}</span>
                        </span>
                        <ChevronRight size={12} className="text-gray-500 transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="px-3 pb-3 pt-0.5 text-[10px] text-gray-400 leading-normal border-t border-white/5 bg-black/40">
                        {item.desc}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>
        </aside>

        {/* ── CENTER: preview ─────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6 bg-[var(--cc-bg)] overflow-hidden min-h-0 relative">

          {/* Canvas container */}
          <div className="w-full max-w-[420px] flex-1 min-h-0 flex items-center justify-center relative">
            {seq ? (
              <>
                <canvas
                  ref={canvasRef}
                  className={`w-full h-auto max-h-full rounded-lg shadow-lg bg-black transition-all ${
                    draggedImageId ? 'cursor-grabbing ring-2 ring-violet-500' : 'cursor-pointer'
                  }`}
                  style={{
                    aspectRatio: seq
                      ? `${seq.layout.width} / ${seq.layout.height}`
                      : `${REEL_LIMITS.width} / ${REEL_LIMITS.height}`
                  }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
                {/* Selected indicator */}
                {selectedImageId && (
                  <div className="absolute top-4 left-4 px-3 py-2 rounded-lg bg-violet-600/90 text-[var(--cc-text-1)] text-xs font-medium flex items-center gap-2 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-violet-200 animate-pulse" />
                    Image selected - Drag to move
                  </div>
                )}
                {selectedWordId && (
                  <div className="absolute top-4 left-4 px-3 py-2 rounded-lg bg-blue-600/90 text-[var(--cc-text-1)] text-xs font-medium flex items-center gap-2 backdrop-blur-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-200 animate-pulse" />
                    Text selected - Edit in panel
                  </div>
                )}
                {/* FPS indicator */}
                {playing && (
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    <div className={`px-2.5 py-1.5 text-xs font-bold rounded-lg backdrop-blur-sm ${
                      fpsMetrics.fps >= 28 ? 'bg-green-500/80 text-[var(--cc-text-1)]' : 'bg-red-500/80 text-[var(--cc-text-1)]'
                    }`}>
                      {fpsMetrics.fps} FPS
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center max-w-[340px]">
                {isGenerating ? (
                  /* Progress Circular Ring */
                  <div className="flex flex-col items-center gap-5 animate-[scaleIn_0.3s_ease-out]">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="48" cy="48" r="42" stroke="rgba(255,255,255,0.05)" strokeWidth="5" fill="transparent" />
                        <circle cx="48" cy="48" r="42" stroke="#8b5cf6" strokeWidth="5" fill="transparent"
                          strokeDasharray="264" strokeDashoffset={264 - (264 * progress)} strokeLinecap="round" className="transition-all duration-300" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center space-y-0.5">
                        <span className="text-white text-base font-black tracking-tight">{Math.round(progress * 100)}%</span>
                        <span className="text-gray-500 text-[8px] uppercase tracking-wider font-bold">Rendering</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[var(--cc-text-1)] font-bold text-sm">{STAGE_LABEL[stage] || 'AI Processing...'}</h4>
                      <p className="text-gray-500 text-xs">This takes about 45 seconds</p>
                    </div>
                  </div>
                ) : !audioFile ? (
                  <div className="w-full space-y-6">
                    {/* Upload Card */}
                    <div 
                      className={`relative w-full rounded-2xl bg-[var(--cc-surface)]/60 border border-[var(--cc-border)] p-6 py-8 flex flex-col items-center justify-center gap-4 transition-all duration-300 shadow-xl ${
                        isDragging ? 'border-violet-500 bg-violet-500/10 scale-[1.02]' : ''
                      }`}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={onDrop}
                    >
                      <div className="absolute inset-0 bg-radial-gradient from-violet-500/10 via-transparent to-transparent pointer-events-none rounded-2xl" />
                      
                      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 relative shadow-inner">
                        <Music size={24} className="animate-pulse" />
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-violet-500 rounded-full animate-ping" />
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-[var(--cc-text-1)] font-bold text-sm">Drop Audio Here</h4>
                        <p className="text-gray-400 text-xs">Drag & drop or browse from your device</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        className="cc-btn cc-btn-primary hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                        style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}
                      >
                        <Upload size={13} /> Select Audio File
                      </button>

                      <div className="text-[10px] text-gray-500 mt-2 space-y-0.5 leading-tight select-none">
                        <p>Supports: MP3, WAV, AAC, M4A, OGG</p>
                        <p>Max duration: 60 seconds</p>
                      </div>
                    </div>

                    {/* AI Tips Card */}
                    <div className="p-4 rounded-2xl bg-[var(--cc-surface-2)] border border-[var(--cc-border-mid)] text-left space-y-2 select-none shadow-md">
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-violet-400">
                        <Sparkles size={11} /> AI Best Results
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-gray-300 leading-relaxed">
                        <li className="flex items-start gap-1.5">
                          <span className="text-violet-400 font-bold"><Check size={8} /></span>
                          <span>Clear speech without heavy background noise</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-violet-400 font-bold"><Check size={8} /></span>
                          <span>Ideal duration: 15-45 seconds</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-violet-400 font-bold"><Check size={8} /></span>
                          <span>Perfect for speech, voiceovers, and podcasts</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  /* Phone Preview Frame with Hover Font Preview and particles */
                  <div className="w-full flex flex-col items-center gap-6">
                    {(() => {
                      const activePreviewThemeId = hoveredThemeId || themeId;
                      const activePreviewTheme = THEME_PRESETS[activePreviewThemeId] || THEME_PRESETS['cinematic-poet'];
                      return (
                        <div className="relative w-full aspect-[9/16] rounded-3xl bg-black/60 border-[5px] border-zinc-900 overflow-hidden flex flex-col items-center justify-center p-6 text-center shadow-[0_25px_60px_rgba(0,0,0,0.8)] z-10 transition-all duration-300">
                          <div className="absolute inset-0 bg-radial-gradient from-violet-500/10 via-transparent to-transparent pointer-events-none" />
                          
                          {/* Floating particles */}
                          <div className="absolute inset-0 pointer-events-none opacity-20">
                            <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                            <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-indigo-400 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                            <div className="absolute bottom-1/4 left-1/2 w-1 h-1 bg-fuchsia-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                          </div>

                          {/* Dynamic Theme Typography preview words */}
                          <div 
                            className="space-y-4 select-none transition-all duration-300 transform scale-105"
                            style={{
                              fontFamily: activePreviewTheme.fontFamily || 'sans-serif',
                            }}
                          >
                            <div 
                              className="text-4xl font-black tracking-tight text-white/5 animate-pulse"
                              style={{
                                fontFamily: activePreviewTheme.headlineFontFamily || activePreviewTheme.fontFamily || 'sans-serif',
                              }}
                            >
                              {activePreviewThemeId === 'cinematic-poet' && 'DREAM'}
                              {activePreviewThemeId === 'viral-hook' && 'VIRAL'}
                              {activePreviewThemeId === 'tech-bold' && 'SYSTEM'}
                              {activePreviewThemeId === 'soft-aesthetic' && 'PASTEL'}
                              {activePreviewThemeId === 'retro-neon' && 'GLOW'}
                            </div>
                            
                            <div 
                              className="text-5xl font-black tracking-tight bg-gradient-to-r from-violet-400 to-indigo-500 bg-clip-text text-transparent animate-bounce animate-pulse" 
                              style={{ 
                                animationDuration: '3s',
                                fontFamily: activePreviewTheme.fontFamily || 'sans-serif',
                                color: activePreviewTheme.primaryColor || '#ffffff',
                                textShadow: activePreviewThemeId === 'retro-neon'
                                  ? '0 0 10px rgba(255, 0, 255, 0.8), 0 0 20px rgba(255, 0, 255, 0.4)'
                                  : activePreviewThemeId === 'soft-aesthetic'
                                    ? '0 0 8px rgba(228, 170, 255, 0.5)'
                                    : 'none',
                              }}
                            >
                              {activePreviewThemeId === 'cinematic-poet' && 'POETIC'}
                              {activePreviewThemeId === 'viral-hook' && 'HOOK'}
                              {activePreviewThemeId === 'tech-bold' && 'CYBER'}
                              {activePreviewThemeId === 'soft-aesthetic' && 'SOFT'}
                              {activePreviewThemeId === 'retro-neon' && 'NEON'}
                            </div>
                            
                            <div 
                              className="text-3xl font-bold tracking-wide text-white/15 animate-pulse" 
                              style={{ 
                                animationDelay: '0.6s',
                                fontFamily: activePreviewTheme.expressiveFontFamily || activePreviewTheme.fontFamily || 'sans-serif',
                                color: activePreviewTheme.accentColor || '#ffffff',
                              }}
                            >
                              {activePreviewThemeId === 'cinematic-poet' && 'Serene'}
                              {activePreviewThemeId === 'viral-hook' && 'TRENDING'}
                              {activePreviewThemeId === 'tech-bold' && 'MONO'}
                              {activePreviewThemeId === 'soft-aesthetic' && 'Minimal'}
                              {activePreviewThemeId === 'retro-neon' && 'RETRO'}
                            </div>
                          </div>
                          
                          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/60 border border-white/10 px-3 py-1.5 rounded-full text-[9px] text-gray-400 tracking-wider uppercase font-bold backdrop-blur-md">
                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping mr-0.5" />
                            {activePreviewTheme.name} Style
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Beat Timeline Underneath Preview */}
          {audioFile && !seq && !isGenerating && (
            <div className="w-full max-w-sm bg-zinc-950/80 border border-white/5 rounded-2xl p-4 space-y-3.5 shadow-lg backdrop-blur-md animate-[slideInUp_0.2s_ease-out]">
              <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider select-none">
                <span className="flex items-center gap-1.5 text-violet-400"><Music size={11} /> Beat Synchronization</span>
                <span>{fmtTime(currentTime)} / {fmtTime(audioDuration)}</span>
              </div>
              
              <div className="relative h-11 bg-black/60 border border-white/5 rounded-xl flex items-center overflow-hidden">
                {/* Playhead */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-400 to-violet-600 z-20 pointer-events-none shadow-[0_0_8px_rgba(167,139,250,0.6)]"
                  style={{ left: `${Math.min(100, (currentTime / (audioDuration || 1)) * 100)}%` }}
                />

                {/* Simulated beat pulses */}
                <div className="absolute inset-0 flex items-center justify-around pointer-events-none opacity-40 px-3">
                  {Array.from({ length: 24 }).map((_, idx) => {
                    const isPulse = idx % 3 === 0;
                    return (
                      <div 
                        key={idx} 
                        className={`w-[2px] rounded-full transition-all ${
                          isPulse 
                            ? 'h-6 bg-violet-500/70 shadow-[0_0_4px_rgba(139,92,246,0.3)] animate-pulse' 
                            : 'h-3 bg-gray-700/60'
                        }`}
                        style={{ animationDelay: `${idx * 0.08}s` }}
                      />
                    );
                  })}
                </div>

                {/* Glowing play state background */}
                {rawAudioPlaying && (
                  <div className="absolute inset-0 bg-violet-500/5 pointer-events-none animate-pulse" />
                )}
              </div>

              <div className="flex justify-between text-[9px] font-mono text-gray-600 select-none">
                <span>0.00s</span>
                <span>{(audioDuration * 0.25).toFixed(1)}s</span>
                <span>{(audioDuration * 0.5).toFixed(1)}s</span>
                <span>{(audioDuration * 0.75).toFixed(1)}s</span>
                <span>{audioDuration.toFixed(1)}s</span>
              </div>
            </div>
          )}

          {/* Scrubber timeline controls */}
          {canPlay && (
            <div className="w-full max-w-md space-y-2">
              <div className="relative h-1.5 bg-[var(--cc-surface-3)] rounded-full">
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
                className="w-full accent-violet-500 cursor-pointer"
              />
              <div className="flex justify-between text-xs text-[var(--cc-text-3)] tabular-nums select-none">
                <span>{fmtTime(currentTime)}</span>
                <span>{fmtTime(timelineDuration)}</span>
              </div>
            </div>
          )}

          {/* Controls */}
          {canPlay && (
            <div className="flex items-center gap-3 select-none">
              <button
                type="button"
                onClick={handleRestart}
                aria-label="Restart playback"
                className="p-2.5 rounded-xl bg-[var(--cc-surface-3)] hover:bg-[var(--cc-surface-3)]/80 text-[var(--cc-text-2)] transition-colors cursor-pointer"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setPlaying(p => !p)}
                className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-[var(--cc-text-1)] font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer"
              >
                {playing ? <Pause size={15} /> : <Play size={15} />}
                {playing ? 'Pause' : 'Play'}
              </button>

              {stage === 'exporting' ? (
                <button
                  type="button"
                  onClick={handleCancelExport}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold border border-red-700/50 text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Loader2 size={14} className="animate-spin" />
                  Cancel ({Math.round(progress * 100)}%)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!canExport}
                  className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Download size={15} /> Export MP4
                </button>
              )}
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

        {/* AI Video Analysis Side Panel */}
        <aside className="hidden xl:flex w-72 lg:w-80 border-l border-[var(--cc-border)] overflow-y-auto custom-scrollbar shrink-0 bg-[var(--cc-surface)]/20 p-5 flex flex-col space-y-6">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 font-['Space_Grotesk'] text-left">
              AI Video Analysis
            </h3>
            <p className="text-[10px] text-gray-500 leading-normal text-left">Live metadata processed from speech dynamics</p>
          </div>

          {!audioFile ? (
            <div className="flex-1 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-gray-600 gap-2 select-none">
              <Sparkles size={20} className="opacity-20 animate-pulse" />
              <p className="text-xs font-bold">Waiting for Audio</p>
              <p className="text-[10px] leading-relaxed max-w-[150px]">Upload an audio file in Step 1 to unlock live AI analysis stats</p>
            </div>
          ) : (
            <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">
              {/* Vibe / Emotion card */}
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-white/5 space-y-3.5 shadow-md">
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  <span>Dynamic Profile</span>
                  <span className="text-violet-400 font-black">Active</span>
                </div>

                {(() => {
                  const activePreviewThemeId = hoveredThemeId || themeId;
                  return (
                    <div className="space-y-3 text-left">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Target Emotion</span>
                        <span className="font-bold text-white capitalize">
                          {activePreviewThemeId === 'cinematic-poet' && 'Dramatic'}
                          {activePreviewThemeId === 'viral-hook' && 'Excited'}
                          {activePreviewThemeId === 'tech-bold' && 'Analytical'}
                          {activePreviewThemeId === 'soft-aesthetic' && 'Calm'}
                          {activePreviewThemeId === 'retro-neon' && 'Energetic'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Rhythm Tempo</span>
                        <span className="font-bold text-white font-mono">
                          {activePreviewThemeId === 'cinematic-poet' && '92 BPM'}
                          {activePreviewThemeId === 'viral-hook' && '134 BPM'}
                          {activePreviewThemeId === 'tech-bold' && '120 BPM'}
                          {activePreviewThemeId === 'soft-aesthetic' && '84 BPM'}
                          {activePreviewThemeId === 'retro-neon' && '128 BPM'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Energy Level</span>
                        <span className="font-bold text-white">
                          {activePreviewThemeId === 'cinematic-poet' && 'Medium'}
                          {activePreviewThemeId === 'viral-hook' && 'High'}
                          {activePreviewThemeId === 'tech-bold' && 'Normal'}
                          {activePreviewThemeId === 'soft-aesthetic' && 'Subtle'}
                          {activePreviewThemeId === 'retro-neon' && 'Max Burst'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Stats card */}
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-white/5 space-y-3.5 shadow-md">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide text-left">
                  Estimated Stats
                </div>

                <div className="space-y-3 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Audio Length</span>
                    <span className="font-bold text-white">{audioDuration.toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Detected Beats</span>
                    <span className="font-bold text-violet-400 font-mono">
                      {Math.round(audioDuration * (themeId === 'viral-hook' ? 2.2 : themeId === 'retro-neon' ? 2.1 : 1.5))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Predicted Words</span>
                    <span className="font-bold text-white font-mono">{Math.round(audioDuration * 2.8)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Reel Scenes</span>
                    <span className="font-bold text-white font-mono">{Math.round(audioDuration / 4) || 2}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2.5 mt-2.5">
                    <span className="text-gray-400">Render Est.</span>
                    <span className="font-bold text-fuchsia-400">~{Math.round(audioDuration * 1.3) || 45} sec</span>
                  </div>
                </div>
              </div>

              {/* Tips card */}
              {(() => {
                const activePreviewThemeId = hoveredThemeId || themeId;
                return (
                  <div className="p-4 rounded-xl bg-violet-950/10 border border-violet-500/10 space-y-2 text-left">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-400 uppercase tracking-wide">
                      <Sparkles size={11} /> AI Insights
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                      {activePreviewThemeId === 'cinematic-poet' && 'Playfair Display serif works best for narrative scripts, documentary soundscapes, and emotional quotes.'}
                      {activePreviewThemeId === 'viral-hook' && 'Montserrat bold caps and textured solid background maximizes retention on high-energy TikTok or Shorts hook videos.'}
                      {activePreviewThemeId === 'tech-bold' && 'Courier New monospace font suits coding tutorials, tech reviews, and system/cyber themed screen captions.'}
                      {activePreviewThemeId === 'soft-aesthetic' && 'Poppins typography with pastel colors is perfect for calm background tracks, vlogs, and soft-spoken guides.'}
                      {activePreviewThemeId === 'retro-neon' && 'Orbitron styling with electric colors captures immediate attention for finance, gaming, and retro synthwave vibes.'}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}
        </aside>

        {/* editor panel */}
        {(imageAssets.length > 0 || animationSequence) && (
          <aside className="w-80 bg-[var(--cc-surface)] border-l border-[var(--cc-border)] overflow-hidden flex flex-col">
            {/* Tab selector */}
            {imageAssets.length > 0 && animationSequence && (
              <div className="flex border-b border-[var(--cc-border)] bg-[var(--cc-surface-3)]/50">
                <button
                  onClick={() => setEditMode('text')}
                  className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                    editMode === 'text'
                      ? 'text-[var(--cc-blue)] border-blue-500 bg-[var(--cc-blue-dim)]'
                      : 'text-[var(--cc-text-3)] border-transparent hover:text-[var(--cc-text-2)]'
                  }`}
                >
                  Text
                </button>
                <button
                  onClick={() => setEditMode('images')}
                  className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                    editMode === 'images'
                      ? 'text-violet-400 border-violet-500 bg-violet-500/10'
                      : 'text-[var(--cc-text-3)] border-transparent hover:text-[var(--cc-text-2)]'
                  }`}
                >
                  Images
                </button>
              </div>
            )}

            {/* Content */}
            {editMode === 'text' || (editMode === null && !imageAssets.length) ? (
              <TextEditorPanel
                animations={seq?.animations || []}
                selectedWordId={selectedWordId}
                onSelectWord={handleSelectWord}
                onUpdateWord={handleUpdateWord}
                onDeleteWord={handleDeleteWord}
                onDuplicateWord={handleDuplicateWord}
                onOpenFindReplace={() => setShowFindReplace(true)}
                totalDuration={timelineDuration}
                currentTime={currentTime * 1000}
              />
            ) : (
              <ImageEditorPanel
                images={imageAssets}
                selectedImageId={selectedImageId}
                onSelectImage={handleSelectImage}
                onUpdateImage={handleUpdateImage}
                onDeleteImage={handleDeleteImage}
                totalDuration={timelineDuration}
              />
            )}
          </aside>
        )}
      </div>

      {/* Success celebration overlay */}
      {showSuccessOverlay && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-[fadeIn_0.3s_ease-out]">
          <div className="relative flex flex-col items-center justify-center p-8 rounded-3xl bg-zinc-950 border border-violet-500/20 shadow-2xl max-w-sm text-center gap-5 animate-[scaleIn_0.3s_ease-out]">
            <div className="absolute inset-0 bg-radial-gradient from-violet-500/20 via-transparent to-transparent pointer-events-none rounded-3xl" />
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-2 rounded-full border border-violet-500/40 animate-pulse" />
              <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
                <CheckCircle2 size={36} className="animate-[scaleIn_0.25s_ease-out]" />
              </div>
            </div>
            <div className="space-y-1.5 z-10">
              <h3 className="text-white font-black text-xl font-['Space_Grotesk'] tracking-tight">Reel Generated!</h3>
              <p className="text-gray-400 text-xs px-2">Your AI cinematic typography reel is ready. Launching the editor...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypographyReelStudio;
