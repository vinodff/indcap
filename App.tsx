import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Upload, Play, Pause, Download, Wand2, Type, Music, Video, Loader2, Grid, Zap, Smile, Sparkles, Maximize2, ArrowUpDown, Palette, ToggleLeft, ToggleRight, Camera, Move, Volume2, Scissors, Globe, AlignLeft, AlignCenter, AlignRight, Square, Layers, MousePointer2, RefreshCw, ChevronRight, Check, Image as ImageIcon, Share2, UploadCloud, Key, ChevronLeft, Smartphone, Undo, Redo, Menu, Settings2, ChevronDown, X, RotateCcw } from 'lucide-react';
import { Caption, CaptionStyle, ProcessingStatus, ProcessingStats, StyleConfig, DisplayMode, LanguageMode, TextAlign, EntryAnimation, ExitAnimation, WordHighlightMode, KineticMode, ExportOptions, StickerItem, AspectRatio } from './types';
import { STYLES_CONFIG } from './constants';

interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  defaultKey: string;
  category: 'playback' | 'editing' | 'navigation' | 'tools';
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  // Playback
  { id: 'toggle-play', name: 'Play/Pause', description: 'Toggle video playback', defaultKey: 'Space', category: 'playback' },
  { id: 'seek-backward', name: 'Seek Backward', description: 'Seek backward 5 seconds', defaultKey: 'ArrowLeft', category: 'playback' },
  { id: 'seek-forward', name: 'Seek Forward', description: 'Seek forward 5 seconds', defaultKey: 'ArrowRight', category: 'playback' },

  // Editing
  { id: 'split-caption', name: 'Split Caption', description: 'Split caption at playhead', defaultKey: 'S', category: 'editing' },
  { id: 'delete-caption', name: 'Delete Caption', description: 'Delete selected caption', defaultKey: 'Delete', category: 'editing' },
  { id: 'duplicate-caption', name: 'Duplicate Caption', description: 'Duplicate selected caption', defaultKey: 'D', category: 'editing' },
  { id: 'undo', name: 'Undo', description: 'Undo last action', defaultKey: 'Meta+Z', category: 'editing' },
  { id: 'redo', name: 'Redo', description: 'Redo last undone action', defaultKey: 'Meta+Shift+Z', category: 'editing' },

  // Navigation
  { id: 'select-previous', name: 'Select Previous Caption', description: 'Select previous caption in timeline', defaultKey: 'ArrowUp', category: 'navigation' },
  { id: 'select-next', name: 'Select Next Caption', description: 'Select next caption in timeline', defaultKey: 'ArrowDown', category: 'navigation' },
  { id: 'jump-to-start', name: 'Jump to Start', description: 'Jump to beginning of video', defaultKey: 'Home', category: 'navigation' },
  { id: 'jump-to-end', name: 'Jump to End', description: 'Jump to end of video', defaultKey: 'End', category: 'navigation' },

  // Tools
  { id: 'toggle-sticker-panel', name: 'Toggle Sticker Panel', description: 'Show/hide sticker panel', defaultKey: 'Shift+S', category: 'tools' },
  { id: 'toggle-style-customizer', name: 'Toggle Style Customizer', description: 'Show/hide style customizer panel', defaultKey: 'Shift+C', category: 'tools' },
  { id: 'toggle-transcript-editor', name: 'Toggle Transcript Editor', description: 'Show/hide transcript editor panel', defaultKey: 'Shift+T', category: 'tools' },
];
import { generateCaptionsFromVideo } from './services/geminiService';
import { extractAudioFromVideo } from './services/audioUtils';
import { CaptionRenderer } from './services/captionRenderer';
import { SoundEngine } from './services/soundEngine';
import ProjectSpecs from './components/ProjectSpecs';
import ProcessingChart from './components/ProcessingChart';
import SeoGenerator from './components/SeoGenerator';
import SocialPublisher from './components/SocialPublisher';
import ApiKeySelector from './components/ApiKeySelector';
import Header from './components/Header';
import FeatureSelector from './components/FeatureSelector';
import VideoPreviewArea from './components/VideoPreviewArea';
import InitialGenerationState from './components/InitialGenerationState';
import StyleCustomizer from './components/StyleCustomizer';
import EnhancedTimeline from './components/EnhancedTimeline';
import AnimationPanel from './components/AnimationPanel';
import ToolsPanel, { ActiveTool } from './components/ToolsPanel';
import ExportPanel from './components/ExportPanel';
import StickerPanel from './components/StickerPanel';
import KeyboardShortcutPanel from './components/KeyboardShortcutPanel';
import ThemePresetsPanel from './components/ThemePresetsPanel';
import { ThemePreset, AIStyleSuggestion, THEME_PRESETS } from './services/aiStyleService';
import { TemplateManager, CaptionTemplate } from './services/TemplateManager';
import { useUndoableState } from './hooks/useUndoableState';


const App: React.FC = () => {
  // API Key State
  const [apiKey, setApiKey] = useState<string | null>(() => {
    // Prioritize environment key
    const envKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (envKey) return envKey;
    return localStorage.getItem('createrin_api_key');
  });

  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  // Bug 14 Fix: In-app toast notification state instead of alert()
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null);
  const showToast = useCallback((message: string, type: 'error' | 'info' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Video & Process States
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [captions, setCaptions, undoCaptions, redoCaptions, resetCaptionsHistory, canUndo, canRedo] = useUndoableState<Caption[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>('IDLE');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [exportProgress, setExportProgress] = useState(0);

  // UI Tabs & Modals
  const [activeTab, setActiveTab] = useState<'PRESETS' | 'DESIGN' | 'TRANSCRIPT' | 'ANIMATE' | 'THEMES'>('PRESETS');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [isPublisherOpen, setIsPublisherOpen] = useState(false);

  // Feature Toggles
  const [autoAdjustEnabled, setAutoAdjustEnabled] = useState(true);
  const [autoMotionEnabled, setAutoMotionEnabled] = useState(false);
  const [autoSfxEnabled, setAutoSfxEnabled] = useState(false);
  const [smartCompressionEnabled, setSmartCompressionEnabled] = useState(false);
  const [languageMode, setLanguageMode] = useState<LanguageMode>('AUTO');
  const [sfxVolume, setSfxVolume] = useState<'LOW' | 'MED' | 'HIGH'>('MED');
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // CUSTOM DESIGN OVERRIDES
  const [currentStyle, setCurrentStyle] = useState<CaptionStyle>(CaptionStyle.DEFAULT);
  const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
  const [fontWeight, setFontWeight] = useState<string | number>(800);
  const [fontScale, setFontScale] = useState(0.85);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textAlign, setTextAlign] = useState<TextAlign>('center');
  const [verticalPos, setVerticalPos] = useState(75); // Moved slightly up to avoid UI overlap
  const [horizontalPos, setHorizontalPos] = useState(50);
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [shadowBlur, setShadowBlur] = useState(4);
  const [shadowOffset, setShadowOffset] = useState(2);
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgColor, setBgColor] = useState('rgba(0,0,0,0.5)');
  const [bgPadding, setBgPadding] = useState(12);
  const [bgRadius, setBgRadius] = useState(8);
  const [uppercase, setUppercase] = useState(false);

  // Phase 3: Animation Engine State
  const [entryAnimation, setEntryAnimation] = useState<EntryAnimation>('NONE');
  const [exitAnimation, setExitAnimation] = useState<ExitAnimation>('NONE');
  const [wordHighlight, setWordHighlight] = useState<WordHighlightMode>('NONE');
  const [animationSpeed, setAnimationSpeed] = useState<'FAST' | 'MEDIUM' | 'SLOW'>('MEDIUM');
  const [kineticMode, setKineticMode] = useState<KineticMode>('NONE');

  // Phase 1: CapCut-style UI State
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);

  // Phase 5: Sticker & Emoji Overlay State
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [isStickerPanelOpen, setIsStickerPanelOpen] = useState(false);
  const [isShortcutPanelOpen, setIsShortcutPanelOpen] = useState(false);
  const [keyboardShortcuts, setKeyboardShortcuts] = useState<Record<string, string>>({});
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [aspectRatioMenuOpen, setAspectRatioMenuOpen] = useState(false);

  const updateCaption = useCallback((id: string, updates: Partial<Caption>) => {
    setCaptions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  // Phase 2: Caption split/delete/duplicate handlers
  const deleteCaption = useCallback((id: string) => {
    setCaptions(prev => prev.filter(c => c.id !== id));
  }, []);

  const splitCaption = useCallback((id: string, time: number) => {
    setCaptions(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      const cap = prev[idx];
      if (time <= cap.startTime || time >= cap.endTime) return prev;
      const firstHalf: Caption = { ...cap, id: `${cap.id}_a`, endTime: time };
      const secondHalf: Caption = { ...cap, id: `${cap.id}_b`, startTime: time };
      const newCaptions = [...prev];
      newCaptions.splice(idx, 1, firstHalf, secondHalf);
      return newCaptions;
    });
  }, []);

  const duplicateCaption = useCallback((id: string) => {
    setCaptions(prev => {
      const cap = prev.find(c => c.id === id);
      if (!cap) return prev;
      const duration = cap.endTime - cap.startTime;
      const newCap: Caption = { ...cap, id: `${cap.id}_dup_${Date.now()}`, startTime: cap.endTime, endTime: cap.endTime + duration };
      return [...prev, newCap].sort((a, b) => a.startTime - b.startTime);
    });
  }, []);

  // Sticker functions
  const updateSticker = useCallback((id: string, updates: Partial<StickerItem>) => {
    setStickers(prev => prev.map(sticker => sticker.id === id ? { ...sticker, ...updates } : sticker));
  }, []);

  const deleteSticker = useCallback((id: string) => {
    setStickers(prev => prev.filter(sticker => sticker.id !== id));
  }, []);

  const addSticker = useCallback((sticker: StickerItem) => {
    setStickers(prev => [...prev, sticker]);
  }, []);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundEngineRef = useRef(new SoundEngine());
  const captionRendererRef = useRef(new CaptionRenderer());
  const videoObjectUrlRef = useRef<string | null>(null);

  // Cleanup Object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
      }
    };
  }, []);

  // Sync playback rate 
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, videoSrc, isPlaying]);

  const resetApiKey = () => {
    localStorage.removeItem('createrin_api_key');
    setApiKey(null);
  };

  // Memoized Active Configuration (Preset + Overrides)
  const activeConfig = useMemo(() => {
    const preset = STYLES_CONFIG[currentStyle] || STYLES_CONFIG[CaptionStyle.DEFAULT];
    // If not in AUTO ADJUST mode, we prioritize user overrides
    if (!autoAdjustEnabled || currentStyle === CaptionStyle.CUSTOM) {
      return {
        ...preset,
        fontFamily,
        fontWeight,
        textColor,
        textAlign,
        strokeWidth,
        strokeColor,
        shadowBlur,
        shadowOffsetY: shadowOffset,
        shadowColor: 'rgba(0,0,0,0.8)',
        backgroundColor: bgEnabled ? bgColor : undefined,
        backgroundPadding: bgPadding,
        backgroundBorderRadius: bgRadius,
        uppercase
      };
    }
    return preset;
  }, [currentStyle, autoAdjustEnabled, fontFamily, fontWeight, textColor, textAlign, strokeWidth, strokeColor, shadowBlur, shadowOffset, bgEnabled, bgColor, bgPadding, bgRadius, uppercase]);

  // Sync design state when a preset is selected
  const selectPreset = (key: CaptionStyle) => {
    const p = STYLES_CONFIG[key];
    setCurrentStyle(key);
    setFontFamily(p.fontFamily);
    setFontWeight(p.fontWeight);
    setTextColor(p.textColor);
    setStrokeWidth(p.strokeWidth || 0);
    setStrokeColor(p.strokeColor || '#000000');
    setBgEnabled(!!p.backgroundColor);
    if (p.backgroundColor) setBgColor(p.backgroundColor);
    setBgPadding(p.backgroundPadding || 12);
    setBgRadius(p.backgroundBorderRadius || 8);
    setUppercase(!!p.uppercase);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Revoke previous Object URL to prevent memory leak
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      videoObjectUrlRef.current = url;
      setVideoSrc(url);
      setVideoFile(file);
      resetCaptionsHistory([]); setStatus('IDLE'); setStats(null);
      setExportProgress(0);
      setPlaybackRate(1);

      // Reset defaults on new video
      setFontScale(1);
      setVerticalPos(82);
      setHorizontalPos(50);
      setCurrentStyle(CaptionStyle.DEFAULT);
    }
  };

  const handleGenerateCaptions = async () => {
    if (!videoFile) return;
    setStatus('UPLOADING');
    const startTime = Date.now();

    try {
      // Extract audio to reduce payload size and avoid 500 RPC errors
      const { base64: audioBase64, mimeType: audioMimeType } = await extractAudioFromVideo(videoFile);

      setStatus('TRANSCRIBING');
      const { captions: genCaps, language } = await generateCaptionsFromVideo(
        audioBase64,
        audioMimeType,
        autoAdjustEnabled,
        smartCompressionEnabled,
        languageMode,
        currentStyle
      );

      resetCaptionsHistory(genCaps);
      const avgConfidence = genCaps.length > 0
        ? Math.round(genCaps.reduce((acc, c) => acc + (c.confidence || 0), 0) / genCaps.length)
        : 0;
      setStats({
        transcriptionTime: Date.now() - startTime,
        wordCount: genCaps.reduce((acc, c) => acc + c.text.split(' ').length, 0),
        confidenceScore: avgConfidence,
        languageDetected: language
      });
      setStatus('READY');
      soundEngineRef.current.init();
    } catch (error) {
      console.error("Processing Error:", error);
      setStatus('IDLE');
      showToast("Processing Failed. The video might be too large or the API is temporarily unavailable.");
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.error(e));
        soundEngineRef.current.resume();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (status === 'EXPORTING' && videoRef.current.duration > 0) {
        setExportProgress(Math.round((videoRef.current.currentTime / videoRef.current.duration) * 100));
      }
    }
  };

  const handleExport = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // 1. Setup State
    setStatus('EXPORTING');
    setIsPlaying(false);
    setExportProgress(0);

    // 2. Prepare Video - Force Seek to Start
    video.pause();

    // Explicitly wait for seek to complete
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = 0;
    });

    // Small buffer to ensure canvas is ready
    await new Promise(r => setTimeout(r, 200));

    // 3. Capture Streams
    const canvasStream = canvas.captureStream(30); // 30 FPS

    let audioStream: MediaStream | null = null;
    try {
      const vidAny = video as any;
      if (vidAny.captureStream) {
        audioStream = vidAny.captureStream();
      } else if (vidAny.mozCaptureStream) {
        audioStream = vidAny.mozCaptureStream();
      }
    } catch (e) {
      console.warn("Audio capture not supported on this browser:", e);
    }

    // Compose final stream
    const finalStream = new MediaStream();
    canvasStream.getVideoTracks().forEach(track => finalStream.addTrack(track));
    if (audioStream) {
      audioStream.getAudioTracks().forEach(track => finalStream.addTrack(track));
    }

    // 4. Determine Codec
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));

    if (!mimeType) {
      showToast("Your browser does not support video export. Please use Chrome or Edge.");
      setStatus('READY');
      return;
    }

    // 5. Setup Recorder
    const mediaRecorder = new MediaRecorder(finalStream, {
      mimeType,
      videoBitsPerSecond: 8000000 // 8 Mbps
    });

    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      a.download = `createrin-export-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();

      // Bug 8 Fix: stop all audio stream tracks to avoid media stream memory leak
      if (audioStream) {
        audioStream.getTracks().forEach(t => t.stop());
      }

      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      setStatus('READY');
      video.currentTime = 0;
      setIsPlaying(false);
    };

    mediaRecorder.onerror = (e) => {
      console.error("Recording failed", e);
      setStatus('READY');
      showToast("Export failed. Please reload and try again.");
    };

    // Bug 7 Fix: guard against video not being buffered before playing
    if (video.readyState < 2) {
      showToast("Video not ready. Please wait a moment and try again.", 'info');
      setStatus('READY');
      return;
    }

    // 6. Start Recording
    mediaRecorder.start();

    // 7. Play Video
    video.onended = () => {
      mediaRecorder.stop();
      video.onended = null;
    };

    try {
      await video.play();
    } catch (e) {
      console.error("Export playback failed", e);
      mediaRecorder.stop();
      setStatus('READY');
    }
  };

  // --- CAPTION RENDERER (replaces the old 650-line drawCanvas) ---
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    captionRendererRef.current.render(video, canvas, {
      captions,
      activeConfig,
      currentStyle,
      fontScale,
      verticalPos,
      horizontalPos,
      autoAdjustEnabled,
      autoMotionEnabled,
      autoSfxEnabled,
      isPlaying,
      entryAnimation,
      exitAnimation,
      wordHighlight,
      animationSpeed,
      stickers
    }, {
      onNewCaption: (caption) => {
        soundEngineRef.current.playWhoosh();
        if ((caption.customScale ?? 0) > 1.2) {
          setTimeout(() => soundEngineRef.current.playPop(), 100);
        }
      }
    });
  }, [captions, activeConfig, fontScale, verticalPos, horizontalPos, autoAdjustEnabled, autoMotionEnabled, autoSfxEnabled, currentStyle, isPlaying, entryAnimation, exitAnimation, wordHighlight, animationSpeed, stickers]);

  // --- ANIMATION LOOP: only run when playing or exporting ---
  useEffect(() => {
    let rafId: number;
    const loop = () => {
      renderFrame();
      rafId = requestAnimationFrame(loop);
    };

    if (isPlaying || status === 'EXPORTING') {
      rafId = requestAnimationFrame(loop);
    } else {
      // Draw a single frame when paused so the canvas isn't blank
      renderFrame();
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [renderFrame, isPlaying, status]);

  // --- SEEK HANDLER (for TimelineScrubber) ---
  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Handle custom keyboard shortcuts
      const handleCustomShortcut = () => {
        // Space - Play/Pause
        if (e.code === getShortcut('toggle-play')) {
          e.preventDefault();
          togglePlay();
          return;
        }

        // ArrowLeft - Seek Backward
        if (e.code === getShortcut('seek-backward')) {
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
            setCurrentTime(videoRef.current.currentTime);
          }
          return;
        }

        // ArrowRight - Seek Forward
        if (e.code === getShortcut('seek-forward')) {
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(
              videoRef.current.duration || 0,
              videoRef.current.currentTime + 5
            );
            setCurrentTime(videoRef.current.currentTime);
          }
          return;
        }

        // S - Split Caption
        if (e.code === getShortcut('split-caption') && selectedCaptionId) {
          e.preventDefault();
          splitCaption(selectedCaptionId, currentTime);
          return;
        }

        // Delete - Delete Caption
        if (e.code === getShortcut('delete-caption') && selectedCaptionId) {
          e.preventDefault();
          deleteCaption(selectedCaptionId);
          setSelectedCaptionId(null);
          return;
        }

        // D - Duplicate Caption
        if (e.code === getShortcut('duplicate-caption') && selectedCaptionId) {
          e.preventDefault();
          duplicateCaption(selectedCaptionId);
          return;
        }

        // Meta+Z - Undo
        if (e.code === 'Z' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          undoCaptions();
          return;
        }

        // Meta+Shift+Z - Redo
        if (e.code === 'Z' && (e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey) {
          e.preventDefault();
          redoCaptions();
          return;
        }

        // ArrowUp - Select Previous Caption
        if (e.code === getShortcut('select-previous')) {
          e.preventDefault();
          if (captions.length === 0) return;
          const sorted = [...captions].sort((a, b) => a.startTime - b.startTime);
          const idx = sorted.findIndex(c => c.id === selectedCaptionId);
          const prev = idx > 0 ? sorted[idx - 1] : sorted[sorted.length - 1];
          setSelectedCaptionId(prev.id);
          if (videoRef.current) videoRef.current.currentTime = prev.startTime;
          return;
        }

        // ArrowDown - Select Next Caption
        if (e.code === getShortcut('select-next')) {
          e.preventDefault();
          if (captions.length === 0) return;
          const sorted = [...captions].sort((a, b) => a.startTime - b.startTime);
          const idx = sorted.findIndex(c => c.id === selectedCaptionId);
          const next = idx < sorted.length - 1 ? sorted[idx + 1] : sorted[0];
          setSelectedCaptionId(next.id);
          if (videoRef.current) videoRef.current.currentTime = next.startTime;
          return;
        }

        // Home - Jump to Start
        if (e.code === getShortcut('jump-to-start')) {
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            setCurrentTime(0);
          }
          return;
        }

        // End - Jump to End
        if (e.code === getShortcut('jump-to-end')) {
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = videoRef.current.duration || 0;
            setCurrentTime(videoRef.current.duration || 0);
          }
          return;
        }

        // Shift+S - Toggle Sticker Panel
        if (e.code === getShortcut('toggle-sticker-panel')) {
          e.preventDefault();
          setIsStickerPanelOpen(!isStickerPanelOpen);
          return;
        }

        // Shift+C - Toggle Style Customizer
        if (e.code === getShortcut('toggle-style-customizer')) {
          e.preventDefault();
          setActiveTab('DESIGN');
          return;
        }

        // Shift+T - Toggle Transcript Editor
        if (e.code === getShortcut('toggle-transcript-editor')) {
          e.preventDefault();
          setActiveTab('TRANSCRIPT');
          return;
        }
      };

      handleCustomShortcut();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // Bug 2 Fix: added all closed-over callbacks to dependency list
  // Bug 13 Fix: added keyboardShortcuts so custom remaps apply immediately
  }, [togglePlay, selectedCaptionId, currentTime, isStickerPanelOpen, activeTab,
      undoCaptions, redoCaptions, splitCaption, deleteCaption, duplicateCaption, keyboardShortcuts, captions]);

  // Helper function to get shortcut (custom or default)
  const getShortcut = (id: string): string => {
    return keyboardShortcuts[id] || DEFAULT_SHORTCUTS.find(s => s.id === id)?.defaultKey || '';
  };

  if (!apiKey && !process.env.GEMINI_API_KEY && !process.env.API_KEY) {
    return <ApiKeySelector onSelect={(k) => {
      localStorage.setItem('createrin_api_key', k);
      setApiKey(k);
    }} />;
  }

  // Phase 10: Enhanced export with quality options
  const handleExportWithOptions = async (options: ExportOptions) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setStatus('EXPORTING');
    setIsPlaying(false);
    setExportProgress(0);

    video.pause();
    await new Promise<void>((resolve) => {
      const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = 0;
    });
    await new Promise(r => setTimeout(r, 200));

    const canvasStream = canvas.captureStream(options.fps);
    let audioStream: MediaStream | null = null;
    try {
      const vidAny = video as any;
      if (vidAny.captureStream) audioStream = vidAny.captureStream();
      else if (vidAny.mozCaptureStream) audioStream = vidAny.mozCaptureStream();
    } catch (e) { console.warn("Audio capture not supported:", e); }

    const finalStream = new MediaStream();
    canvasStream.getVideoTracks().forEach(track => finalStream.addTrack(track));
    if (audioStream) audioStream.getAudioTracks().forEach(track => finalStream.addTrack(track));

    const bitrateMap = { LOW: 2000000, MEDIUM: 5000000, HIGH: 8000000, ULTRA: 15000000 };
    const mimeTypes = options.format === 'mp4'
      ? ['video/mp4', 'video/webm;codecs=h264,opus', 'video/webm']
      : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';

    const mediaRecorder = new MediaRecorder(finalStream, { mimeType, videoBitsPerSecond: bitrateMap[options.bitrate] });
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `createrin-${options.resolution}-${Date.now()}.${options.format}`;
      document.body.appendChild(a);
      a.click();
      // Bug 8 Fix: stop audio tracks to prevent memory leak
      if (audioStream) audioStream.getTracks().forEach(t => t.stop());
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      setStatus('READY');
      video.currentTime = 0;
      setIsPlaying(false);
      setIsExportPanelOpen(false);
    };
    // Bug 14 Fix: replace alert with showToast
    mediaRecorder.onerror = () => { setStatus('READY'); showToast("Export failed. Please try again."); };
    mediaRecorder.start();
    video.onended = () => { mediaRecorder.stop(); video.onended = null; };
    // Bug 7 Fix: readyState guard
    if (video.readyState < 2) {
      showToast("Video not ready. Please wait a moment and try again.", 'info');
      setStatus('READY');
      return;
    }
    try { await video.play(); } catch (e) { mediaRecorder.stop(); setStatus('READY'); }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-white font-sans overflow-hidden">

      {/* Bug 14 Fix: In-app Toast Notification (replaces alert()) */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-sm font-bold transition-all animate-in slide-in-from-top-2 ${
          toast.type === 'error'
            ? 'bg-red-900/90 border-red-700 text-red-200'
            : 'bg-blue-900/90 border-blue-700 text-blue-200'
        }`}>
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* MODALS */}
      {isSeoModalOpen && (
        <SeoGenerator captions={captions} onClose={() => setIsSeoModalOpen(false)} />
      )}
      {isPublisherOpen && videoSrc && (
        <SocialPublisher videoSrc={videoSrc} onClose={() => setIsPublisherOpen(false)} captions={captions} />
      )}
      {isExportPanelOpen && (
        <ExportPanel
          onExport={handleExportWithOptions}
          onClose={() => setIsExportPanelOpen(false)}
          isExporting={status === 'EXPORTING'}
          exportProgress={exportProgress}
        />
      )}
      {isShortcutPanelOpen && (
        <KeyboardShortcutPanel
          isOpen={isShortcutPanelOpen}
          onClose={() => setIsShortcutPanelOpen(false)}
          onShortcutChange={setKeyboardShortcuts}
        />
      )}

      {/* CapCut-style Header */}
      <header className="h-12 border-b border-gray-800/80 flex items-center justify-between px-4 bg-[#141414] z-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          {activeFeature && (
            <button onClick={() => setActiveFeature(null)} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-white">
              <ChevronLeft size={18} />
            </button>
          )}
          <img
            src="https://createrin.com/wp-content/uploads/2025/03/createrin_logo.jpg"
            alt="Createrin"
            className="h-7 w-auto rounded object-contain bg-white"
            onError={(e) => { e.currentTarget.style.display = 'none'; const f = document.getElementById('logo-fallback'); if (f) f.classList.remove('hidden'); }}
          />
          <h1 id="logo-fallback" className="hidden text-xl font-black text-[#009ca6]">createrin</h1>
          <div className="h-4 w-px bg-gray-700 mx-1" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Caption Studio</span>
        </div>

        {/* Center: Undo/Redo/Speed */}
        {status === 'READY' && (
          <div className="flex items-center gap-2">
            <button onClick={undoCaptions} disabled={!canUndo} title="Undo" className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 transition-all text-gray-400 hover:text-white">
              <Undo size={14} />
            </button>
            <button onClick={redoCaptions} disabled={!canRedo} title="Redo" className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 transition-all text-gray-400 hover:text-white">
              <Redo size={14} />
            </button>
            <div className="h-4 w-px bg-gray-700 mx-1" />
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              className="bg-gray-800 text-xs text-white rounded-lg outline-none border border-gray-700 py-1 px-2 cursor-pointer"
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1.0×</option>
              <option value={1.5}>1.5×</option>
              <option value={2}>2.0×</option>
            </select>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button onClick={resetApiKey} className="p-1.5 bg-gray-800 hover:bg-red-900/50 rounded-lg text-gray-500 hover:text-red-400 transition-colors" title="Reset API Key">
            <Key size={12} />
          </button>
          {status === 'READY' && (
            <>
              <button onClick={() => setIsSeoModalOpen(true)} className="flex items-center gap-1.5 bg-gray-800 text-white hover:bg-gray-700 px-3 py-1.5 rounded-lg font-bold transition-all text-xs border border-gray-700">
                <Share2 size={13} /> SEO
              </button>
              <button onClick={() => setIsPublisherOpen(true)} className="flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-500 px-3 py-1.5 rounded-lg font-bold transition-all text-xs border border-blue-500">
                <UploadCloud size={13} /> Publish
              </button>
              <button onClick={() => setIsExportPanelOpen(true)} className="flex items-center gap-1.5 bg-white text-black hover:bg-gray-200 px-4 py-1.5 rounded-lg font-black transition-all text-xs shadow-lg active:scale-95">
                <Download size={14} /> Export
              </button>
              <button onClick={() => setIsShortcutPanelOpen(true)} className="flex items-center gap-1.5 bg-gray-800 text-white hover:bg-gray-700 px-3 py-1.5 rounded-lg font-bold transition-all text-xs border border-gray-700">
                <Menu size={13} /> Shortcuts
              </button>
              <div className="relative">
                <button onClick={() => setAspectRatioMenuOpen(!aspectRatioMenuOpen)} className="flex items-center gap-1.5 bg-gray-800 text-white hover:bg-gray-700 px-3 py-1.5 rounded-lg font-bold transition-all text-xs border border-gray-700">
                  <Square size={13} /> {aspectRatio}
                  <ChevronDown size={10} className="ml-1" />
                </button>
                {aspectRatioMenuOpen && (
                  <div className="absolute right-0 mt-2 w-32 bg-gray-800 border border-gray-700 rounded-xl shadow-lg z-20">
                    {[
                      ['9:16', 'Portrait'],
                      ['16:9', 'Landscape'],
                      ['1:1', 'Square'],
                      ['4:5', 'Portrait Tall']
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => { setAspectRatio(value as AspectRatio); setAspectRatioMenuOpen(false); }}
                        className={`w-full px-3 py-2 text-left text-sm font-medium ${aspectRatio === value ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      {!activeFeature ? (
        <FeatureSelector setActiveFeature={setActiveFeature} />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Tools Panel (CapCut-style) */}
          <ToolsPanel
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            hasVideo={!!videoSrc}
            hasCaptions={captions.length > 0}
          />

          {/* Center: Video + Timeline */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Video Preview Area */}
            <div className="flex-1 flex items-center justify-center bg-[#050505] relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

              <div className="relative flex items-center justify-center w-full h-full">
                <VideoPreviewArea
                  videoSrc={videoSrc}
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  handleFileUpload={handleFileUpload}
                  setVideoSrc={setVideoSrc}
                  setVideoFile={setVideoFile}
                  setStatus={setStatus}
                  handleTimeUpdate={handleTimeUpdate}
                  isPlaying={isPlaying}
                  togglePlay={togglePlay}
                  status={status}
                  exportProgress={exportProgress}
                  captions={captions}
                  updateCaption={updateCaption}
                  showSafeZones={showSafeZones}
                  aspectRatio={aspectRatio}
                  stickers={stickers}
                  updateSticker={updateSticker}
                  activeTool={activeTool}
                />

                {/* Safe Zones Toggle */}
                {videoSrc && status === 'READY' && (
                  <div className="absolute top-3 right-3 z-40">
                    <button
                      onClick={() => setShowSafeZones(!showSafeZones)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors border shadow-lg ${showSafeZones ? 'bg-yellow-400 text-black border-yellow-500' : 'bg-black/60 text-white hover:bg-black/80 border-white/10 backdrop-blur-md'}`}
                    >
                      <Smartphone size={13} /> Safe Zones
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Timeline (Phase 2) */}
            {videoSrc && status === 'READY' && (
              <EnhancedTimeline
                videoRef={videoRef}
                captions={captions}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onSeek={handleSeek}
                onUpdateCaption={updateCaption}
                onDeleteCaption={deleteCaption}
                onSplitCaption={splitCaption}
                onDuplicateCaption={duplicateCaption}
                selectedCaptionId={selectedCaptionId}
                onSelectCaption={setSelectedCaptionId}
                stickers={stickers}
                onUpdateSticker={updateSticker}
                onDeleteSticker={deleteSticker}
                selectedStickerId={selectedStickerId}
                onSelectSticker={setSelectedStickerId}
                activeTool={activeTool || undefined}
              />
            )}
          </div>

          {/* Right Panel: Context-sensitive (CapCut-style) */}
          <div className="w-[380px] bg-[#141414] border-l border-gray-800 flex flex-col z-20 flex-shrink-0 overflow-hidden">

            {/* Initial Generation State */}
            {videoSrc && status === 'IDLE' && (
              <InitialGenerationState
                languageMode={languageMode}
                setLanguageMode={setLanguageMode}
                autoAdjustEnabled={autoAdjustEnabled}
                setAutoAdjustEnabled={setAutoAdjustEnabled}
                smartCompressionEnabled={smartCompressionEnabled}
                setSmartCompressionEnabled={setSmartCompressionEnabled}
                handleGenerateCaptions={handleGenerateCaptions}
              />
            )}

            {status === 'READY' && (
              <>
                {/* Tab bar for right panel */}
                <div className="flex border-b border-gray-800 bg-[#141414] flex-shrink-0">
                  {activeTool === 'STICKERS' ? (
                    <div className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-center text-white bg-gray-800/50">
                      Stickers & Overlay
                    </div>
                  ) : (
                    [
                      { id: 'PRESETS', label: 'Styles' },
                      { id: 'DESIGN', label: 'Design' },
                      { id: 'ANIMATE', label: 'Animate' },
                      { id: 'THEMES', label: 'Themes' },
                      { id: 'TRANSCRIPT', label: 'Text' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab.id ? 'text-white border-blue-500 bg-gray-800/50' : 'text-gray-600 border-transparent hover:text-gray-400'}`}
                      >
                        {tab.label}
                      </button>
                    ))
                  )}
                </div>

                {/* Panel content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {activeTool === 'STICKERS' ? (
                    <StickerPanel
                      stickers={stickers}
                      setStickers={setStickers}
                      selectedStickerId={selectedStickerId}
                      setSelectedStickerId={setSelectedStickerId}
                      videoRef={videoRef}
                      canvasRef={canvasRef}
                      updateSticker={updateSticker}
                      deleteSticker={deleteSticker}
                      addSticker={addSticker}
                    />
                  ) : activeTab === 'ANIMATE' ? (
                    <AnimationPanel
                      entryAnimation={entryAnimation}
                      setEntryAnimation={setEntryAnimation}
                      exitAnimation={exitAnimation}
                      setExitAnimation={setExitAnimation}
                      wordHighlight={wordHighlight}
                      setWordHighlight={setWordHighlight}
                      animationSpeed={animationSpeed}
                      setAnimationSpeed={setAnimationSpeed}
                      kineticMode={kineticMode}
                      setKineticMode={setKineticMode}
                    />
                  ) : activeTab === 'THEMES' ? (
                    <ThemePresetsPanel
                      captions={captions}
                      onApplyTheme={(preset: ThemePreset) => {
                        setCurrentStyle(preset.captionStyle);
                        setFontFamily(preset.fontFamily);
                        setFontWeight(preset.fontWeight);
                        setTextColor(preset.textColor);
                        setBgEnabled(preset.bgEnabled);
                        setBgColor(preset.bgColor);
                        setBgPadding(preset.bgPadding);
                        setBgRadius(preset.bgRadius);
                        setStrokeWidth(preset.strokeWidth);
                        setStrokeColor(preset.strokeColor);
                        setUppercase(preset.uppercase);
                        setEntryAnimation(preset.entryAnimation);
                        setExitAnimation(preset.exitAnimation as ExitAnimation);
                        setWordHighlight(preset.wordHighlight);
                        setAnimationSpeed(preset.animationSpeed);
                      }}
                      onApplyAIStyle={(suggestion: AIStyleSuggestion) => {
                        const matchingTheme = THEME_PRESETS.find(t => t.id === suggestion.theme);
                        if (matchingTheme) {
                          setCurrentStyle(matchingTheme.captionStyle);
                          setFontFamily(matchingTheme.fontFamily);
                          setFontWeight(matchingTheme.fontWeight);
                          setBgEnabled(matchingTheme.bgEnabled);
                          setEntryAnimation(matchingTheme.entryAnimation);
                          setAnimationSpeed(matchingTheme.animationSpeed);
                        }
                        setTextColor(suggestion.textColor);
                        if (suggestion.entryAnimation) setEntryAnimation(suggestion.entryAnimation as EntryAnimation);
                        if (suggestion.wordHighlight) setWordHighlight(suggestion.wordHighlight as WordHighlightMode);
                      }}
                      currentConfig={{
                        captionStyle: currentStyle,
                        fontFamily,
                        fontWeight,
                        fontScale,
                        textColor,
                        textAlign,
                        uppercase,
                        strokeWidth,
                        strokeColor,
                        bgEnabled,
                        bgColor,
                        bgPadding,
                        bgRadius,
                        verticalPos,
                        horizontalPos,
                        entryAnimation,
                        exitAnimation,
                        wordHighlight,
                        animationSpeed,
                      }}
                      onApplyTemplate={(template: CaptionTemplate) => {
                        setCurrentStyle(template.captionStyle);
                        setFontFamily(template.fontFamily);
                        setFontWeight(template.fontWeight);
                        setFontScale(template.fontScale);
                        setTextColor(template.textColor);
                        setTextAlign(template.textAlign);
                        setUppercase(template.uppercase);
                        setStrokeWidth(template.strokeWidth);
                        setStrokeColor(template.strokeColor);
                        setBgEnabled(template.bgEnabled);
                        setBgColor(template.bgColor);
                        setBgPadding(template.bgPadding);
                        setBgRadius(template.bgRadius);
                        setVerticalPos(template.verticalPos);
                        setHorizontalPos(template.horizontalPos);
                        setEntryAnimation(template.entryAnimation);
                        setExitAnimation(template.exitAnimation);
                        setWordHighlight(template.wordHighlight);
                        setAnimationSpeed(template.animationSpeed);
                      }}
                    />
                  ) : (
                    <StyleCustomizer
                      activeTab={activeTab as 'PRESETS' | 'DESIGN' | 'TRANSCRIPT'}
                      setActiveTab={(t) => setActiveTab(t)}
                      filterCategory={filterCategory}
                      setFilterCategory={setFilterCategory}
                      currentStyle={currentStyle}
                      selectPreset={selectPreset as any}
                      fontFamily={fontFamily}
                      setFontFamily={setFontFamily}
                      fontScale={fontScale}
                      setFontScale={setFontScale}
                      fontWeight={fontWeight}
                      setFontWeight={setFontWeight}
                      uppercase={uppercase}
                      setUppercase={setUppercase}
                      textAlign={textAlign}
                      setTextAlign={setTextAlign as any}
                      textColor={textColor}
                      setTextColor={setTextColor}
                      strokeWidth={strokeWidth}
                      setStrokeWidth={setStrokeWidth}
                      strokeColor={strokeColor}
                      setStrokeColor={setStrokeColor}
                      bgEnabled={bgEnabled}
                      setBgEnabled={setBgEnabled}
                      bgColor={bgColor}
                      setBgColor={setBgColor}
                      bgPadding={bgPadding}
                      setBgPadding={setBgPadding}
                      bgRadius={bgRadius}
                      setBgRadius={setBgRadius}
                      verticalPos={verticalPos}
                      setVerticalPos={setVerticalPos}
                      horizontalPos={horizontalPos}
                      setHorizontalPos={setHorizontalPos}
                      captions={captions}
                      updateCaption={updateCaption}
                      videoRef={videoRef}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;