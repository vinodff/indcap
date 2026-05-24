import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { Upload, Play, Pause, Download, Wand2, Type, Music, Video, Loader2, Grid, Zap, Maximize2, ArrowUpDown, Palette, ToggleLeft, ToggleRight, Camera, Move, Volume2, Scissors, Globe, AlignLeft, AlignCenter, AlignRight, Square, Layers, MousePointer2, RefreshCw, ChevronRight, Check, Image as ImageIcon, Share2, UploadCloud, Key, ChevronLeft, Smartphone, Undo, Redo, Menu, Settings2, ChevronDown, X, RotateCcw, Youtube, Instagram } from 'lucide-react';
import { Caption, CaptionStyle, ProcessingStatus, ProcessingStats, StyleConfig, DisplayMode, LanguageMode, TextAlign, EntryAnimation, ExitAnimation, WordHighlightMode, KineticMode, ExportOptions, AspectRatio, ViralTypographyCaption } from './types';

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

  { id: 'toggle-style-customizer', name: 'Toggle Style Customizer', description: 'Show/hide style customizer panel', defaultKey: 'Shift+C', category: 'tools' },
  { id: 'toggle-transcript-editor', name: 'Toggle Transcript Editor', description: 'Show/hide transcript editor panel', defaultKey: 'Shift+T', category: 'tools' },
];
import { generateCaptionsFromVideo } from './services/geminiService';

import { extractAudioFromVideo } from './services/audioUtils';
import { CaptionRenderer } from './services/captionRenderer';
import { SoundEngine } from './services/soundEngine';
import ProjectSpecs from './components/ProjectSpecs';
import ProcessingChart from './components/ProcessingChart';
import ApiKeySelector from './components/ApiKeySelector';
import Header from './components/Header';
import FeatureSelector from './components/FeatureSelector';
import VideoPreviewArea from './components/VideoPreviewArea';
import InitialGenerationState from './components/InitialGenerationState';
import EnhancedTimeline from './components/EnhancedTimeline';

const SeoGenerator = lazy(() => import('./components/SeoGenerator'));
const SocialPublisher = lazy(() => import('./components/SocialPublisher'));
const StyleCustomizer = lazy(() => import('./components/StyleCustomizer'));
const AnimationPanel = lazy(() => import('./components/AnimationPanel'));
const ExportPanel = lazy(() => import('./components/ExportPanel'));
const KeyboardShortcutPanel = lazy(() => import('./components/KeyboardShortcutPanel'));
const ThemePresetsPanel = lazy(() => import('./components/ThemePresetsPanel'));
const AutomationDashboard = lazy(() => import('./components/AutomationDashboard'));
const AiThumbnailGenerator = lazy(() => import('./components/AiThumbnailGenerator'));
const MotionGraphicsPanel = lazy(() => import('./components/MotionGraphicsPanel').then(module => ({ default: module.MotionGraphicsPanel })));
const TypographyReelStudio = lazy(() => import('./components/TypographyReelStudio'));
import { ThemePreset, AIStyleSuggestion, THEME_PRESETS } from './services/aiStyleService';
import { TemplateManager, CaptionTemplate } from './services/TemplateManager';
import { applyAutoEmojis, removeAutoEmojis } from './services/emojiAutoMatcher';
import { useUndoableState } from './hooks/useUndoableState';




const App: React.FC = () => {
  // API Key State
  const [apiKey, setApiKey] = useState<string | null>(() => {
    return import.meta.env.VITE_GEMINI_API_KEY
      || import.meta.env.VITE_API_KEY
      || process.env.GEMINI_API_KEY
      || localStorage.getItem('createrin_api_key');
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
  const currentTimeRef = useRef(0);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [exportProgress, setExportProgress] = useState(0);

  // UI Tabs & Modals
  // UI Tabs & Modals
  const [activeTab, setActiveTab] = useState<'PRESETS' | 'DESIGN' | 'TRANSCRIPT' | 'ANIMATE'>('PRESETS');
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
  // Bug 4 Fix: Add FACEBOOK to type union — VideoPreviewArea already has Facebook overlay built
  const [safeZonePlatform, setSafeZonePlatform] = useState<'SHORTS' | 'TIKTOK' | 'INSTAGRAM' | 'FACEBOOK'>('SHORTS');
  const [playbackRate, setPlaybackRate] = useState(1);

  // CUSTOM DESIGN OVERRIDES
  const [currentStyle, setCurrentStyle] = useState<CaptionStyle>(CaptionStyle.CLEAN_WHITE);
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

  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const [isShortcutPanelOpen, setIsShortcutPanelOpen] = useState(false);
  const [keyboardShortcuts, setKeyboardShortcuts] = useState<Record<string, string>>({});
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('ORIGINAL');
  const [videoIntrinsicRatio, setVideoIntrinsicRatio] = useState<number | null>(null);
  const [aspectRatioMenuOpen, setAspectRatioMenuOpen] = useState(false);
  // Stores the detected language from the last generation (e.g. 'Hindi', 'Telugu') used to filter language options
  const [detectedLanguage, setDetectedLanguage] = useState<string | undefined>(undefined);

  const updateCaption = useCallback((id: string, updates: Partial<Caption>) => {
    setCaptions(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newCaption = { ...c, ...updates };

      // If we are updating text but not explicitly updating words, 
      // we need to recalculate the words array to match the new text
      if (updates.text !== undefined && updates.words === undefined) {
        const newText = updates.text;
        const newWordsList = newText.trim().split(/\s+/).filter(w => w.length > 0);
        const duration = newCaption.endTime - newCaption.startTime;
        const wordDuration = newWordsList.length > 0 ? duration / newWordsList.length : 0;

        newCaption.words = newWordsList.map((wordText, i) => ({
          text: wordText,
          word: wordText, // Just in case some templates still expect .word
          start: newCaption.startTime + (i * wordDuration),
          end: newCaption.startTime + ((i + 1) * wordDuration),
          confidence: 1
        }));
      }

      return newCaption;
    }));
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

  // Sync SFX volume
  useEffect(() => {
    const volumeMap = { 'LOW': 0.1, 'MED': 0.3, 'HIGH': 0.6 };
    soundEngineRef.current.setVolume(volumeMap[sfxVolume] || 0.3);
  }, [sfxVolume]);

  const startPreviewMode = async () => {
    // 1. Load sample video if none exists
    if (!videoSrc) {
      // Revoke old URL if it exists
      if (videoObjectUrlRef.current) {
        URL.revokeObjectURL(videoObjectUrlRef.current);
      }
      try {
        setStatus('IDLE');
        let response = await fetch('/test video.mp4');
        if (!response.ok) throw new Error('Local sample not found');
        const blob = await response.blob();
        const file = new File([blob], "test video.mp4", { type: "video/mp4" });
        setVideoFile(file);
        const url = URL.createObjectURL(file);
        videoObjectUrlRef.current = url;
        setVideoSrc(url);
      } catch (e) {
        console.error("Local sample failed, trying remote", e);
        try {
          const response = await fetch('https://storage.googleapis.com/generativeai-downloads/images/test%20video.mp4');
          if (response.ok) {
            const blob = await response.blob();
            const file = new File([blob], "test video.mp4", { type: "video/mp4" });
            setVideoFile(file);
            const url = URL.createObjectURL(file);
            videoObjectUrlRef.current = url;
            setVideoSrc(url);
          }
        } catch (err) {
          console.error("Sample video load failed completely", err);
        }
      }
    }

    // 2. Add sample captions if empty
    if (captions.length === 0) {
      setCaptions([
        {
          id: 'preview-1',
          startTime: 0,
          endTime: 3,
          text: "Live preview activated! Look at these captions.",
          words: [
            { text: "Live", start: 0, end: 0.5 },
            { text: "preview", start: 0.5, end: 1.0 },
            { text: "activated!", start: 1.0, end: 1.6 },
            { text: "Look", start: 1.6, end: 2.0 },
            { text: "at", start: 2.0, end: 2.3 },
            { text: "these", start: 2.3, end: 2.6 },
            { text: "captions.", start: 2.6, end: 3.0 }
          ]
        }
      ]);
    }

    // 3. Play video
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
    }
    setActiveTab('PRESETS');
  };

  const resetApiKey = () => {
    localStorage.removeItem('createrin_api_key');
    setApiKey(null);
  };

  // Memoized Active Configuration (Preset + Overrides)
  const activeConfig = useMemo(() => {
    const preset = STYLES_CONFIG[currentStyle] || STYLES_CONFIG[CaptionStyle.CLEAN_WHITE];
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
    if (key === CaptionStyle.EMOJI_AUTO) {
      setCaptions(prev => applyAutoEmojis(prev));
    } else if (currentStyle === CaptionStyle.EMOJI_AUTO) {
      setCaptions(prev => removeAutoEmojis(prev));
    }

    const p = STYLES_CONFIG[key];

    // Debug logging to validate style configurations exist
    console.log(`🎨 Style Selected: ${key}`);
    console.log(`✅ Config Exists: ${!!p}`);
    if (p) {
      console.log(`📝 Style Name: ${p.name}`);
      console.log(`🎭 Animation: ${p.animation}`);
      console.log(`🎨 Text Color: ${p.textColor}`);
      console.log(`🔤 Font Family: ${p.fontFamily}`);
    } else {
      console.warn(`❌ Missing config for style: ${key} - Will fallback to CLEAN_WHITE`);
    }

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
      setAspectRatio('ORIGINAL'); // Automatically match the video

      // Reset defaults on new video
      setFontScale(1);
      setVerticalPos(82);
      setHorizontalPos(50);
      setCurrentStyle(CaptionStyle.CLEAN_WHITE);
    }
  };

  const handleTestWithSampleText = async () => {
    // Load sample video without calling Gemini at all
    if (!videoSrc) {
      try {
        setStatus('UPLOADING');
        let blob: Blob | null = null;
        try {
          const r = await fetch('/test video.mp4');
          if (r.ok) blob = await r.blob();
        } catch {/* fallback below */}
        if (!blob) {
          const r = await fetch('https://storage.googleapis.com/generativeai-downloads/images/test%20video.mp4');
          if (r.ok) blob = await r.blob();
        }
        if (blob) {
          const file = new File([blob], 'test video.mp4', { type: 'video/mp4' });
          if (videoObjectUrlRef.current) URL.revokeObjectURL(videoObjectUrlRef.current);
          const url = URL.createObjectURL(file);
          videoObjectUrlRef.current = url;
          setVideoFile(file);
          setVideoSrc(url);
        }
      } catch {/* proceed with no video — captions still work on canvas */}
    }

    // Predefined sample captions — no API call needed
    const sampleCaptions: Caption[] = [
      { id: 's1',  startTime: 0.0,  endTime: 2.5,  text: "Welcome to Createrin",            confidence: 98, words: [{ text: "Welcome",   start: 0.0,  end: 0.7  }, { text: "to",       start: 0.7,  end: 0.9  }, { text: "Createrin", start: 0.9,  end: 2.5  }] },
      { id: 's2',  startTime: 2.6,  endTime: 5.0,  text: "The ultimate caption tool",        confidence: 97, words: [{ text: "The",       start: 2.6,  end: 2.9  }, { text: "ultimate", start: 2.9,  end: 3.5  }, { text: "caption",  start: 3.5,  end: 4.0  }, { text: "tool",     start: 4.0,  end: 5.0  }] },
      { id: 's3',  startTime: 5.1,  endTime: 7.5,  text: "Create viral captions in seconds", confidence: 96, words: [{ text: "Create",   start: 5.1,  end: 5.6  }, { text: "viral",    start: 5.6,  end: 6.1  }, { text: "captions", start: 6.1,  end: 6.7  }, { text: "in",       start: 6.7,  end: 6.9  }, { text: "seconds",  start: 6.9,  end: 7.5  }] },
      { id: 's4',  startTime: 7.6,  endTime: 10.0, text: "No more manual typing ever",       confidence: 95, words: [{ text: "No",       start: 7.6,  end: 7.9  }, { text: "more",     start: 7.9,  end: 8.2  }, { text: "manual",   start: 8.2,  end: 8.7  }, { text: "typing",   start: 8.7,  end: 9.3  }, { text: "ever",     start: 9.3,  end: 10.0 }] },
      { id: 's5',  startTime: 10.1, endTime: 13.0, text: "AI-powered captions that match your style", confidence: 97, words: [{ text: "AI-powered", start: 10.1, end: 10.8 }, { text: "captions", start: 10.8, end: 11.3 }, { text: "that",     start: 11.3, end: 11.5 }, { text: "match",    start: 11.5, end: 11.9 }, { text: "your",     start: 11.9, end: 12.2 }, { text: "style",    start: 12.2, end: 13.0 }] },
      { id: 's6',  startTime: 13.1, endTime: 15.5, text: "Transform your content",           confidence: 96, words: [{ text: "Transform", start: 13.1, end: 13.8 }, { text: "your",     start: 13.8, end: 14.1 }, { text: "content",  start: 14.1, end: 15.5 }] },
      { id: 's7',  startTime: 15.6, endTime: 18.0, text: "With just one click",              confidence: 98, words: [{ text: "With",     start: 15.6, end: 15.9 }, { text: "just",     start: 15.9, end: 16.2 }, { text: "one",      start: 16.2, end: 16.6 }, { text: "click",    start: 16.6, end: 18.0 }] },
      { id: 's8',  startTime: 18.1, endTime: 21.0, text: "Beautiful animations included",    confidence: 95, words: [{ text: "Beautiful",  start: 18.1, end: 18.8 }, { text: "animations", start: 18.8, end: 19.6 }, { text: "included",   start: 19.6, end: 21.0 }] },
      { id: 's9',  startTime: 21.1, endTime: 24.0, text: "Every word perfectly timed",       confidence: 97, words: [{ text: "Every",     start: 21.1, end: 21.6 }, { text: "word",     start: 21.6, end: 22.0 }, { text: "perfectly", start: 22.0, end: 22.7 }, { text: "timed",    start: 22.7, end: 24.0 }] },
      { id: 's10', startTime: 24.1, endTime: 27.0, text: "Your audience will love it",       confidence: 96, words: [{ text: "Your",     start: 24.1, end: 24.5 }, { text: "audience",  start: 24.5, end: 25.1 }, { text: "will",     start: 25.1, end: 25.4 }, { text: "love",     start: 25.4, end: 25.8 }, { text: "it",       start: 25.8, end: 27.0 }] },
      { id: 's11', startTime: 27.1, endTime: 30.0, text: "Start creating amazing videos today", confidence: 98, words: [{ text: "Start",    start: 27.1, end: 27.5 }, { text: "creating",  start: 27.5, end: 28.1 }, { text: "amazing",   start: 28.1, end: 28.6 }, { text: "videos",    start: 28.6, end: 29.1 }, { text: "today",     start: 29.1, end: 30.0 }] },
    ];

    resetCaptionsHistory(sampleCaptions);
    setStats({ transcriptionTime: 0, wordCount: 47, confidenceScore: 97, languageDetected: 'English' });
    setAspectRatio('9:16');
    setVerticalPos(78);
    setStatus('READY');
    setActiveTab('PRESETS');
    showToast('Sample text loaded — try any caption template!', 'info');
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

      let finalCaps = genCaps;
      if (currentStyle === CaptionStyle.EMOJI_AUTO) {
        finalCaps = applyAutoEmojis(genCaps);
      }

      resetCaptionsHistory(finalCaps);
      const avgConfidence = finalCaps.length > 0
        ? Math.round(finalCaps.reduce((acc, c) => acc + (c.confidence || 0), 0) / finalCaps.length)
        : 0;
      setStats({
        transcriptionTime: Date.now() - startTime,
        wordCount: genCaps.reduce((acc, c) => acc + c.text.split(' ').length, 0),
        confidenceScore: avgConfidence,
        languageDetected: language
      });
      // Store detected language for smart language filtering on next generation attempt
      if (language) setDetectedLanguage(language);
      setStatus('READY');
      soundEngineRef.current.init();
    } catch (error) {
      console.error("Processing Error:", error);
      setStatus('IDLE');
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      showToast(`Processing Failed: ${errorMessage}`);
    }
  };

  /**
   * Called when the user clicks "Generate Viral Captions" in ThemePresetsPanel.
   * Maps ViralTypographyCaption[] → Caption[] by preserving IDs, merging timing
   * and text, and attaching the AI style payload as extra metadata.
   */
  const handleApplyViralTypography = useCallback((viralCaptions: ViralTypographyCaption[]) => {
    if (!viralCaptions || viralCaptions.length === 0) return;

    setCaptions(prev => {
      const updated = [...prev];

      viralCaptions.forEach((vc) => {
        if (updated.length === 0) return;
        // Find the existing caption whose startTime is closest to vc.start
        const closest = updated.reduce((best, c) =>
          Math.abs(c.startTime - vc.start) < Math.abs(best.startTime - vc.start) ? c : best
          , updated[0]);

        const idx = updated.findIndex(c => c.id === closest.id);
        if (idx !== -1) {
          updated[idx] = Object.assign({}, updated[idx], {
            text: vc.text,
            startTime: vc.start,
            endTime: vc.end,
            viralStyle: vc.style,
          });
        }
      });

      return updated;
    });
  }, [setCaptions]);

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
      currentTimeRef.current = videoRef.current.currentTime;
      if (status === 'EXPORTING' && videoRef.current.duration > 0) {
        setExportProgress(Math.round((videoRef.current.currentTime / videoRef.current.duration) * 100));
      }
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
      kineticMode,
      isPlaying,
      entryAnimation,
      exitAnimation,
      wordHighlight,
      animationSpeed,
      aspectRatio,
      // Skip canvas caption draw when HTML overlay is handling it
      skipCaptionDraw: activeConfig?.isHyperStyle === true,
    }, {
      onNewCaption: (caption) => {
        soundEngineRef.current.playWhoosh();
        if ((caption.customScale ?? 0) > 1.2) {
          setTimeout(() => soundEngineRef.current.playPop(), 100);
        }
      }
    });
  }, [captions, activeConfig, fontScale, verticalPos, horizontalPos, autoAdjustEnabled, autoMotionEnabled, autoSfxEnabled, kineticMode, currentStyle, isPlaying, entryAnimation, exitAnimation, wordHighlight, animationSpeed, aspectRatio]);

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

    // Force re-render triggered by captionRenderer (e.g. when an animated GIF finishes loading)
    const handleForceRender = () => {
      if (!isPlaying && status !== 'EXPORTING') {
        renderFrame();
      }
    };
    window.addEventListener('createrin-force-render', handleForceRender);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('createrin-force-render', handleForceRender);
    };
  }, [renderFrame, isPlaying, status]);

  // --- SEEK HANDLER (for TimelineScrubber) ---
  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      currentTimeRef.current = time;
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
            currentTimeRef.current = videoRef.current.currentTime;
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
            currentTimeRef.current = videoRef.current.currentTime;
          }
          return;
        }

        // S - Split Caption
        if (e.code === getShortcut('split-caption') && selectedCaptionId) {
          e.preventDefault();
          splitCaption(selectedCaptionId, currentTimeRef.current);
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
        if ((e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          undoCaptions();
          return;
        }

        // Meta+Shift+Z - Redo
        if ((e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey) {
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
            currentTimeRef.current = 0;
          }
          return;
        }

        // End - Jump to End
        if (e.code === getShortcut('jump-to-end')) {
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = videoRef.current.duration || 0;
            currentTimeRef.current = videoRef.current.duration || 0;
          }
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
  }, [togglePlay, selectedCaptionId, activeTab,
    undoCaptions, redoCaptions, splitCaption, deleteCaption, duplicateCaption, keyboardShortcuts, captions]);

  // Helper function to get shortcut (custom or default)
  const getShortcut = (id: string): string => {
    let key = keyboardShortcuts[id] || DEFAULT_SHORTCUTS.find(s => s.id === id)?.defaultKey || '';
    if (key.length === 1 && /[A-Za-z]/.test(key)) {
      key = `Key${key.toUpperCase()}`;
    }
    return key;
  };

  if (!apiKey && !import.meta.env.VITE_GEMINI_API_KEY && !import.meta.env.VITE_API_KEY && !process.env.GEMINI_API_KEY) {
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

    // Resize canvas to target export resolution before capture
    const origCanvasWidth = canvas.width;
    const origCanvasHeight = canvas.height;
    const resolutionHeightMap: Record<string, number> = { '720p': 720, '1080p': 1080, '4K': 2160 };
    const targetHeight = resolutionHeightMap[options.resolution] ?? origCanvasHeight;
    if (targetHeight !== origCanvasHeight && origCanvasHeight > 0) {
      const scale = targetHeight / origCanvasHeight;
      canvas.width = Math.round(origCanvasWidth * scale);
      canvas.height = targetHeight;
    }

    const canvasStream = canvas.captureStream(options.fps);
    let audioStream: MediaStream | null = null;
    try {
      const vidAny = video as any;
      if (vidAny.captureStream) audioStream = vidAny.captureStream();
      else if (vidAny.mozCaptureStream) audioStream = vidAny.mozCaptureStream();

      if (!audioStream || audioStream.getAudioTracks().length === 0) {
        // Must create or reuse a shared AudioContext established during user interaction if possible, 
        // but creating here is usually okay if we immediately resume it.
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Ensure the context is running (fixes silent audio if context starts suspended)
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(console.error);
        }

        const destNode = audioCtx.createMediaStreamDestination();
        if (!vidAny.__audioSourceNode) {
          vidAny.__audioSourceNode = audioCtx.createMediaElementSource(video);
          // Connect to destination so the user can hear it while exporting (optional, but good)
          vidAny.__audioSourceNode.connect(audioCtx.destination);
        }
        vidAny.__audioSourceNode.connect(destNode);
        audioStream = destNode.stream;
      }
    } catch (e) {
      console.warn("Audio capture fallback failed, exporting video-only:", e);
    }

    const finalStream = new MediaStream();
    canvasStream.getVideoTracks().forEach(track => finalStream.addTrack(track));
    if (audioStream) {
      audioStream.getAudioTracks().forEach(track => finalStream.addTrack(track));
    }

    const bitrateMap = { LOW: 2000000, MEDIUM: 5000000, HIGH: 8000000, ULTRA: 15000000 };

    // Better codec prioritization for broad compatibility
    const baseMimeTypes = [
      'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', // Standard MP4 with H.264 & AAC
      'video/webm;codecs="h264,opus"', // WebM with H264 is heavily supported in Chromium browsers
      'video/webm;codecs="vp9,opus"',  // WebM with VP9
      'video/webm;codecs="vp8,opus"',  // WebM with VP8
      'video/mp4',
      'video/webm;codecs="h264"',
      'video/webm;codecs="vp9"',
      'video/webm;codecs="vp8"',
      'video/webm'
    ];

    let mimeTypes = baseMimeTypes;
    if (options.format === 'mp4') {
      mimeTypes = [
        'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
        'video/mp4',
        ...baseMimeTypes
      ];
    }

    // Fallback to empty string if none matched, browser will use default
    const mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';

    const mediaRecorder = new MediaRecorder(finalStream, { mimeType, videoBitsPerSecond: bitrateMap[options.bitrate] });
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data?.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      // Restore canvas to display resolution
      canvas.width = origCanvasWidth;
      canvas.height = origCanvasHeight;

      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      let ext = options.format;
      if (mimeType.includes('webm')) ext = 'webm';
      a.download = `createrin-${options.resolution}-${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      showToast('Export complete! Open with VLC or Chrome if your default player shows a codec error.', 'info');
      // Stop audio tracks to prevent memory leak
      if (audioStream) audioStream.getTracks().forEach(t => t.stop());
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      setStatus('READY');
      video.currentTime = 0;
      setIsPlaying(false);
      setIsExportPanelOpen(false);
    };
    mediaRecorder.onerror = () => {
      canvas.width = origCanvasWidth;
      canvas.height = origCanvasHeight;
      setStatus('READY');
      showToast("Export failed. Please try again.");
    };
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
        <div className={`cc-toast flex items-center gap-3 ${toast.type === 'error'
            ? 'bg-red-900/90 border-red-700 text-red-200'
            : 'bg-blue-900/90 border-blue-700 text-blue-200'
          }`}>
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* MODALS */}
      {isSeoModalOpen && (
        <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"><Loader2 className="animate-spin text-blue-500" /></div>}>
          <SeoGenerator captions={captions} onClose={() => setIsSeoModalOpen(false)} />
        </Suspense>
      )}
      {isPublisherOpen && videoSrc && (
        <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"><Loader2 className="animate-spin text-blue-500" /></div>}>
          <SocialPublisher videoSrc={videoSrc} onClose={() => setIsPublisherOpen(false)} captions={captions} />
        </Suspense>
      )}


      {isExportPanelOpen && (
        <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"><Loader2 className="animate-spin text-blue-500" /></div>}>
          <ExportPanel
            onExport={handleExportWithOptions}
            onClose={() => setIsExportPanelOpen(false)}
            isExporting={status === 'EXPORTING'}
            exportProgress={exportProgress}
          />
        </Suspense>
      )}
      {isShortcutPanelOpen && (
        <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"><Loader2 className="animate-spin text-blue-500" /></div>}>
          <KeyboardShortcutPanel
            isOpen={isShortcutPanelOpen}
            onClose={() => setIsShortcutPanelOpen(false)}
            onShortcutChange={setKeyboardShortcuts}
          />
        </Suspense>
      )}

      {/* CapCut-style Header (App-level — has undo/redo/speed) */}
      <header className="cc-header">
        <div className="flex items-center gap-3">
          {activeFeature && (
            <button onClick={() => setActiveFeature(null)} className="cc-btn cc-btn-ghost !px-2 !py-2">
              <ChevronLeft size={16} />
            </button>
          )}
          <img
            src="https://createrin.com/wp-content/uploads/2025/03/createrin_logo.jpg"
            alt="Createrin"
            className="h-7 w-auto rounded object-contain bg-white"
            onError={(e) => { e.currentTarget.style.display = 'none'; const f = document.getElementById('logo-fallback'); if (f) f.classList.remove('hidden'); }}
          />
          <h1 id="logo-fallback" className="hidden text-lg font-black" style={{ color: '#009ca6' }}>createrin</h1>

          {/* Status pill */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest"
            style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Caption Studio
          </div>
        </div>

        {/* Center: Undo/Redo/Speed */}
        {status === 'READY' && (
          <div className="flex items-center gap-1.5">
            <button onClick={undoCaptions} disabled={!canUndo} title="Undo"
              className="cc-btn cc-btn-ghost !px-2 !py-2 disabled:opacity-25"
            >
              <Undo size={14} />
            </button>
            <button onClick={redoCaptions} disabled={!canRedo} title="Redo"
              className="cc-btn cc-btn-ghost !px-2 !py-2 disabled:opacity-25"
            >
              <Redo size={14} />
            </button>
            <div className="h-4 w-px mx-1" style={{ background: 'var(--cc-border-mid)' }} />
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              style={{
                background: 'var(--cc-surface-3)', border: '1px solid var(--cc-border)',
                borderRadius: 8, padding: '4px 8px', fontSize: 11,
                color: 'var(--cc-text-2)', outline: 'none', cursor: 'pointer',
              }}
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
          <button onClick={resetApiKey} className="cc-btn cc-btn-ghost !px-2 !py-2" title="Reset API Key">
            <Key size={12} style={{ color: 'var(--cc-text-3)' }} />
          </button>
          {status === 'READY' && (
            <>
              <button onClick={() => setIsSeoModalOpen(true)} className="cc-btn cc-btn-ghost hidden xl:inline-flex">
                <Share2 size={13} /> SEO
              </button>
              <button onClick={() => setIsPublisherOpen(true)} className="cc-btn cc-btn-primary hidden md:inline-flex">
                <UploadCloud size={13} /> Publish
              </button>
              <button onClick={() => setIsExportPanelOpen(true)} className="cc-btn cc-btn-white">
                <Download size={14} /> <span className="hidden sm:inline">Export</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setAspectRatioMenuOpen(!aspectRatioMenuOpen)}
                  className="cc-btn cc-btn-ghost"
                >
                  <Square size={12} />
                  <span className="hidden sm:inline">{aspectRatio}</span>
                  <ChevronDown size={10} />
                </button>
                {aspectRatioMenuOpen && (
                  <div className="absolute right-0 mt-2 w-36 rounded-xl shadow-2xl z-20 overflow-hidden"
                    style={{ background: 'var(--cc-surface-2)', border: '1px solid var(--cc-border-mid)' }}
                  >
                    {[
                      ['ORIGINAL', 'Original'],
                      ['9:16', 'Portrait 9:16'],
                      ['16:9', 'Landscape 16:9'],
                      ['1:1', 'Square 1:1'],
                      ['4:5', 'Portrait 4:5']
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => { setAspectRatio(value as AspectRatio); setAspectRatioMenuOpen(false); }}
                        style={{
                          width: '100%', padding: '8px 14px', textAlign: 'left',
                          fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none',
                          background: aspectRatio === value ? 'var(--cc-blue-dim)' : 'transparent',
                          color: aspectRatio === value ? 'var(--cc-blue-light)' : 'var(--cc-text-2)',
                          transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { if (aspectRatio !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = aspectRatio === value ? 'var(--cc-blue-dim)' : 'transparent'; }}
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

      {/* Bug 1 Fix: Route each feature to its dedicated fullscreen component */}
      {activeFeature === 'THUMBNAIL' && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[#0a0a0a]"><Loader2 className="animate-spin text-fuchsia-500 w-8 h-8" /></div>}>
          <AiThumbnailGenerator onBack={() => setActiveFeature(null)} />
        </Suspense>
      )}
      {activeFeature === 'MOTION' && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[#0a0a0a]"><Loader2 className="animate-spin text-fuchsia-500 w-8 h-8" /></div>}>
          <MotionGraphicsPanel onBack={() => setActiveFeature(null)} />
        </Suspense>
      )}
      {activeFeature === 'TYPOGRAPHY_REEL' && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[#0a0a0a]"><Loader2 className="animate-spin text-violet-500 w-8 h-8" /></div>}>
          <TypographyReelStudio onBack={() => setActiveFeature(null)} />
        </Suspense>
      )}
      {activeFeature === 'SEO' && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[#0a0a0a]"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>}>
          <SeoGenerator captions={captions} onClose={() => setActiveFeature(null)} />
        </Suspense>
      )}
      {activeFeature === 'PUBLISH' && (
        videoSrc
          ? <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[#0a0a0a]"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>}><SocialPublisher videoSrc={videoSrc} captions={captions} onClose={() => setActiveFeature(null)} /></Suspense>
          : <div className="flex-1 flex items-center justify-center flex-col gap-4 bg-[#0a0a0a]">
            <div className="text-4xl">🎬</div>
            <h2 className="text-xl font-black text-white">Upload a video first</h2>
            <p className="text-gray-500 text-sm">You need to generate captions before publishing.</p>
            <button onClick={() => setActiveFeature(null)} className="mt-4 px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-sm transition-colors">← Back</button>
          </div>
      )}
      {activeFeature === 'AUTOMATION' && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[#0a0a0a]"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>}>
          <AutomationDashboard onClose={() => setActiveFeature(null)} />
        </Suspense>
      )}
      {!activeFeature ? (
        <FeatureSelector setActiveFeature={(id: string) => {
          setActiveFeature(id);
        }} />
      ) : activeFeature === 'CAPTIONS' ? (
        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden overflow-x-hidden bg-[var(--cc-bg)]">

          {/* Center: Video + Timeline */}
          <div className="shrink-0 md:flex-1 flex flex-col overflow-visible md:overflow-hidden relative z-10 w-full h-auto md:h-full md:min-h-0">
            {/* Video canvas area */}
            <div className="w-full relative bg-[#030303] overflow-hidden flex items-center justify-center h-[55vh] md:h-0 md:flex-1">
              <div className="cc-dot-grid" style={{ position: 'absolute', inset: 0, opacity: 0.6, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                <VideoPreviewArea
                  videoSrc={videoSrc}
                  videoRef={videoRef}
                  canvasRef={canvasRef}
                  handleFileUpload={handleFileUpload}
                  onLoadSampleVideo={startPreviewMode}
                  onTestWithSampleText={handleTestWithSampleText}
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
                  safeZonePlatform={safeZonePlatform}
                  aspectRatio={aspectRatio}
                  videoIntrinsicRatio={videoIntrinsicRatio}
                  setVideoIntrinsicRatio={setVideoIntrinsicRatio}
                  isHyperStyle={activeConfig?.isHyperStyle === true}
                  activeConfig={activeConfig}
                  currentStyle={currentStyle}
                  fontScale={fontScale}
                  verticalPos={verticalPos}
                  horizontalPos={horizontalPos}
                />

                {/* Safe Zones Toggle */}
                {videoSrc && status === 'READY' && (
                  <div className="absolute top-3 right-3 z-40 flex items-center shadow-lg rounded-lg border border-white/10 overflow-hidden backdrop-blur-md">
                    <button
                      onClick={() => setShowSafeZones(!showSafeZones)}
                      title="Toggle Social Media Safe Zones"
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors ${showSafeZones ? 'bg-yellow-400 text-black' : 'bg-black/60 text-white hover:bg-black/80'}`}
                    >
                      <Smartphone size={13} /> {showSafeZones ? 'Safe Zones ON' : 'Safe Zones'}
                    </button>
                    {showSafeZones && (
                      <div className="flex bg-black/80 items-center px-1 border-l border-white/10">
                        {(['SHORTS', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => setSafeZonePlatform(p)}
                            className={`p-1.5 rounded transition-colors ${safeZonePlatform === p ? 'text-yellow-400 bg-white/10' : 'text-gray-400 hover:text-white'}`}
                            title={p === 'SHORTS' ? 'YouTube Shorts' : p === 'TIKTOK' ? 'TikTok' : p === 'INSTAGRAM' ? 'Instagram Reels' : 'Facebook Reels'}
                          >
                            {p === 'SHORTS' ? <Youtube size={14} /> : p === 'TIKTOK' ? <Video size={14} /> : p === 'INSTAGRAM' ? <Instagram size={14} /> : <span className="text-[11px] font-black">FB</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Timeline (Phase 2) */}
            {videoSrc && status === 'READY' && (
              <EnhancedTimeline
                videoRef={videoRef}
                captions={captions}
                isPlaying={isPlaying}
                onSeek={handleSeek}
                onUpdateCaption={updateCaption}
                onDeleteCaption={deleteCaption}
                onSplitCaption={splitCaption}
                onDuplicateCaption={duplicateCaption}
                selectedCaptionId={selectedCaptionId}
                onSelectCaption={setSelectedCaptionId}

              />
            )}
          </div>

          {/* Right Panel: Context-sensitive */}
          <div className="w-full h-auto md:h-full flex-shrink-0 z-20 flex flex-col bg-[var(--cc-surface)] md:overflow-hidden border-t md:border-t-0 md:border-l border-[var(--cc-border)] md:w-[var(--panel-width)]">

            {/* Bug 2 Fix: Upload prompt when no video is loaded */}
            {!videoSrc && (status === 'IDLE') && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Upload size={28} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-black text-base">Upload a Video</h3>
                  <p className="text-gray-500 text-xs mt-1 leading-relaxed">Drop a vertical video on the left to start generating viral captions.</p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-left">
                    <span className="text-lg">🎬</span>
                    <div>
                      <p className="text-xs font-bold text-gray-300">9:16 Vertical</p>
                      <p className="text-[10px] text-gray-600">TikTok, Reels, Shorts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 text-left">
                    <span className="text-lg">✨</span>
                    <div>
                      <p className="text-xs font-bold text-gray-300">100+ Languages</p>
                      <p className="text-[10px] text-gray-600">Auto-detect or pick manually</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10 text-left">
                    <span className="text-lg">🚀</span>
                    <div>
                      <p className="text-xs font-bold text-gray-300">Viral Templates</p>
                      <p className="text-[10px] text-gray-600">12 trending caption styles</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                detectedLanguage={detectedLanguage}
              />
            )}

            {/* Bug 10 Fix: Processing state in right panel */}
            {(status === 'UPLOADING' || status === 'TRANSCRIBING') && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wand2 size={24} className="text-blue-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-black text-base">
                    {status === 'UPLOADING' ? 'Uploading Video…' : status === 'TRANSCRIBING' ? 'Transcribing Audio…' : 'Processing…'}
                  </h3>
                  <p className="text-gray-500 text-xs mt-1">
                    {status === 'UPLOADING' ? 'Sending to Gemini AI' : status === 'TRANSCRIBING' ? 'Reading every word with AI' : 'Almost done'}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            {status === 'READY' && (
              <>
                {/* Tab bar for right panel */}
                <div style={{
                  display: 'flex',
                  borderBottom: '1px solid var(--cc-border)',
                  background: 'var(--cc-surface)',
                  flexShrink: 0, overflowX: 'auto',
                }}>
                  {
                    [
                      { id: 'PRESETS', label: 'Templates' },
                      { id: 'DESIGN', label: 'Customize' },
                      { id: 'ANIMATE', label: 'Animate' },
                      { id: 'TRANSCRIPT', label: 'Transcript' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`cc-tab ${activeTab === tab.id ? 'active' : ''}`}
                      >
                        {tab.label}
                      </button>
                    ))
                  }
                </div>


                {/* Panel content */}
                <div className="flex-1 md:overflow-y-auto custom-scrollbar">
                  {activeTab === 'ANIMATE' ? (
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center p-6"><Loader2 className="animate-spin text-blue-500" /></div>}>
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
                    </Suspense>
                  ) : activeTab === 'PRESETS' ? (
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center p-6"><Loader2 className="animate-spin text-blue-500" /></div>}>
                    <ThemePresetsPanel
                      captions={captions}
                      onApplyTheme={(preset: ThemePreset) => {
                        if (preset.captionStyle === CaptionStyle.EMOJI_AUTO) {
                          setCaptions(prev => applyAutoEmojis(prev));
                        } else if (currentStyle === CaptionStyle.EMOJI_AUTO) {
                          setCaptions(prev => removeAutoEmojis(prev));
                        }
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
                          if (matchingTheme.captionStyle === CaptionStyle.EMOJI_AUTO) {
                            setCaptions(prev => applyAutoEmojis(prev));
                          } else if (currentStyle === CaptionStyle.EMOJI_AUTO) {
                            setCaptions(prev => removeAutoEmojis(prev));
                          }
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
                        if (template.captionStyle === CaptionStyle.EMOJI_AUTO) {
                          setCaptions(prev => applyAutoEmojis(prev));
                        } else if (currentStyle === CaptionStyle.EMOJI_AUTO) {
                          setCaptions(prev => removeAutoEmojis(prev));
                        }
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
                      onApplyViralTypography={handleApplyViralTypography}
                    />
                    </Suspense>
                  ) : (
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center p-6"><Loader2 className="animate-spin text-blue-500" /></div>}>
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
                      onPreviewMode={startPreviewMode}
                    />
                    </Suspense>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default App;