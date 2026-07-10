import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { Upload, Play, Pause, Download, Wand2, Type, Music, Video, Loader2, Grid, Zap, Maximize2, ArrowUpDown, Palette, ToggleLeft, ToggleRight, Camera, Move, Volume2, Scissors, Globe, AlignLeft, AlignCenter, AlignRight, Square, Layers, MousePointer2, RefreshCw, ChevronRight, Check, Image as ImageIcon, Share2, UploadCloud, Key, ChevronLeft, Smartphone, Undo, Redo, Menu, Settings2, ChevronDown, X, RotateCcw, Youtube, Instagram, MessageSquare, Diamond, Sparkles } from 'lucide-react';
import { Caption, CaptionStyle, ProcessingStatus, ProcessingStats, StyleConfig, DisplayMode, LanguageMode, TextAlign, EntryAnimation, ExitAnimation, WordHighlightMode, KineticMode, ExportOptions, AspectRatio, ViralTypographyCaption, KeyframeMap, StickerItem } from './types';

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
import { nextPlayheadTime } from './services/playbackClock';
import { resolveDemoVideoUrl, getDemoCaptions, captureDemoCaptions, getCachedTranscript, cacheTranscript } from './services/demoProject';
import { FlaskConical } from 'lucide-react';
import { SoundEngine } from './services/soundEngine';
import { SoundEffectsLibrary } from './services/audio/soundEffectsLibrary';
import { SfxPlayer } from './services/audio/sfxPlayer';
import { runSoundDesign, type SfxTrack, type SfxVibe } from './services/audio/soundDesign';
import { swapCueSound, setCueGain, toggleCueMuted, createManualCue } from './services/audio/soundDesign/cueEdits';
import { runAutoCamera, sampleFaceTrack, type CameraTrack, type FaceSample, type CameraStyle } from './services/camera';
import InspectorPanel from './components/InspectorPanel';
import { type TimelineSelection } from './components/timeline/trackModel';
import ProjectSpecs from './components/ProjectSpecs';
import ProcessingChart from './components/ProcessingChart';
import ApiKeySelector from './components/ApiKeySelector';
import Header from './components/Header';
import FeatureSelector from './components/FeatureSelector';
import VideoPreviewArea from './components/VideoPreviewArea';
import InitialGenerationState from './components/InitialGenerationState';
import EnhancedTimeline from './components/EnhancedTimeline';
import SfxControlPanel from './components/SfxControlPanel';
import StudioModePanel from './components/StudioModePanel';
import { StudioController } from './services/enhance/studioController';
import type { EnhanceParams, QualityResult, SceneType } from './services/enhance/types';
import { PLATFORM_PRESETS, type SocialTarget } from './services/enhance/exportPresets';
import { insertAudioEnhancer } from './services/enhance/audioEnhancer';

const SeoGenerator = lazy(() => import('./components/SeoGenerator'));
const SocialPublisher = lazy(() => import('./components/SocialPublisher'));
const StudioModeStudio = lazy(() => import('./components/StudioModeStudio'));
const StyleCustomizer = lazy(() => import('./components/StyleCustomizer'));
const AnimationPanel = lazy(() => import('./components/AnimationPanel'));
const ExportPanel = lazy(() => import('./components/ExportPanel'));
const ChatEditPanel = lazy(() => import('./components/ChatEditPanel').then(m => ({ default: m.ChatEditPanel })));
const ClipPickerPanel = lazy(() => import('./components/ClipPickerPanel').then(m => ({ default: m.ClipPickerPanel })));
const KeyframeEditor = lazy(() => import('./components/KeyframeEditor').then(m => ({ default: m.KeyframeEditor })));
const KeyboardShortcutPanel = lazy(() => import('./components/KeyboardShortcutPanel'));
const ThemePresetsPanel = lazy(() => import('./components/ThemePresetsPanel'));
const AutomationDashboard = lazy(() => import('./components/AutomationDashboard'));
const AiThumbnailGenerator = lazy(() => import('./components/AiThumbnailGenerator'));
const MotionGraphicsPanel = lazy(() => import('./components/MotionGraphicsPanel').then(module => ({ default: module.MotionGraphicsPanel })));
const TypographyReelStudio = lazy(() => import('./components/TypographyReelStudio'));
const StickersPanel = lazy(() => import('./components/StickersPanel').then(m => ({ default: m.StickersPanel })));
import { ThemePreset, AIStyleSuggestion, THEME_PRESETS } from './services/aiStyleService';
import { TemplateManager, CaptionTemplate } from './services/TemplateManager';
import { applyAutoEmojis, removeAutoEmojis } from './services/emojiAutoMatcher';
import { useUndoableState } from './hooks/useUndoableState';
import { mapIconWords, removeIconWords } from './services/iconWordMapper';
import { applySmartBrevity } from './services/smartBrevity';
import { removeFillerWords } from './services/fillerWordRemover';
import { annotateWordEmphasis } from './services/caption/zoomEffect';
import { annotateSpeakers } from './services/caption/speakerColorMap';
import { initFaceDetector, detectSafeZone } from './services/autoFraming';
import { analyzeBeats } from './services/typographyReel/beatAnalyzer';
import type { BeatGrid } from './services/typographyReel/types';

// ─── Sentiment heuristic — assigns B-roll emotion to every caption ────────────
// Runs on every processedCaptions update so B-roll always has a valid sentiment.
const ENERGETIC_WORDS = new Set([
  'run','fight','power','win','victory','strong','fast','speed','energy','hustle',
  'grind','fire','explosive','maximum','boost','destroy','dominate','crush','action',
  'go','push','beast','epic','insane','crazy','massive','huge','unbelievable','shock',
]);
const JOYFUL_WORDS = new Set([
  'happy','love','great','awesome','fun','laugh','smile','celebrate','best','amazing',
  'wonderful','joy','excited','blessed','beautiful','perfect','fantastic','enjoy',
  'incredible','brilliant','super','yes','yes!','wow','haha','lol','yay',
]);
const SERIOUS_WORDS = new Set([
  'problem','issue','serious','important','need','must','critical','warning','danger',
  'risk','fail','mistake','wrong','never','stop','attention','urgent','key','truth',
  'reality','fact','real','careful','think','know','understand','reason','because',
]);

function assignSentiment(text: string): Caption['sentiment'] {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  let e = 0, j = 0, s = 0;
  for (const w of words) {
    if (ENERGETIC_WORDS.has(w)) e++;
    else if (JOYFUL_WORDS.has(w)) j++;
    else if (SERIOUS_WORDS.has(w)) s++;
  }
  const max = Math.max(e, j, s);
  if (max === 0) return 'calm';
  if (max === e) return 'energetic';
  if (max === j) return 'joyful';
  return 'serious';
}

const App: React.FC = () => {
  // API Key State
  const [apiKey, setApiKey] = useState<string | null>(() => {
    // Read only from VITE_* env vars (safe — Vite never embeds these as string
    // literals in the bundle; they're resolved at load time) and localStorage.
    // process.env.GEMINI_API_KEY was previously injected via vite.config define
    // which hard-coded the key value into the JS bundle (a security risk).
    return import.meta.env.VITE_GEMINI_API_KEY
      || import.meta.env.VITE_API_KEY
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
  const [activeTab, setActiveTab] = useState<'PRESETS' | 'DESIGN' | 'TRANSCRIPT' | 'ANIMATE' | 'STICKERS'>('PRESETS');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [isSeoModalOpen, setIsSeoModalOpen] = useState(false);
  const [isPublisherOpen, setIsPublisherOpen] = useState(false);



  // Feature Toggles
  const [autoAdjustEnabled, setAutoAdjustEnabled] = useState(true);
  const [autoMotionEnabled, setAutoMotionEnabled] = useState(true);
  const [autoSfxEnabled, setAutoSfxEnabled] = useState(true);
  const [smartCompressionEnabled, setSmartCompressionEnabled] = useState(true);
  const [iconCaptionsEnabled, setIconCaptionsEnabled] = useState(true);
  const [autoFrameSafeY, setAutoFrameSafeY] = useState<{ min: number; max: number } | null>(null);

  const processedCaptions = useMemo(() => {
    let result = captions;
    if (smartCompressionEnabled) {
      result = applySmartBrevity(result);
    }
    if (iconCaptionsEnabled) {
      result = mapIconWords(result);
    }
    // Assign sentiment to every caption that doesn't already have one.
    // Skip brollDisabled captions — user explicitly removed B-roll for those.
    result = result.map(c => (c.sentiment || c.brollDisabled) ? c : { ...c, sentiment: assignSentiment(c.text) });
    return result;
  }, [captions, smartCompressionEnabled, iconCaptionsEnabled]);

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
  const [entryAnimation, setEntryAnimation] = useState<EntryAnimation>('SLIDE_UP');
  const [exitAnimation, setExitAnimation] = useState<ExitAnimation>('FADE_OUT');
  const [wordHighlight, setWordHighlight] = useState<WordHighlightMode>('COLOR_POP');
  const [animationSpeed, setAnimationSpeed] = useState<'FAST' | 'MEDIUM' | 'SLOW'>('MEDIUM');
  const [kineticMode, setKineticMode] = useState<KineticMode>('NONE');

  const [keyframeMap, setKeyframeMap] = useState<KeyframeMap>(new Map());
  const [beatGrid, setBeatGrid] = useState<BeatGrid | null>(null);

  // Dynamic Sound Effects — the auto-generated SFX track for the current captions.
  const [sfxTrack, setSfxTrack] = useState<SfxTrack>([]);
  // Sound-design personality + density. Adjustable from the SFX control panel.
  const [sfxVibe, setSfxVibe] = useState<SfxVibe>('CLEAN');
  const [sfxIntensity, setSfxIntensity] = useState(1); // 0.4..1.6 (1 = balanced)
  // Mirror of the track so the regen effect can preserve user-locked/manual cues
  // without taking sfxTrack as a dependency (which would loop).
  const sfxTrackRef = useRef<SfxTrack>([]);
  useEffect(() => { sfxTrackRef.current = sfxTrack; }, [sfxTrack]);

  // AI Auto-Camera — virtual zoom/pan track + cached face trajectory.
  const [autoCameraEnabled, setAutoCameraEnabled] = useState(false);
  const [cameraTrack, setCameraTrack] = useState<CameraTrack>([]);
  const faceTrackRef = useRef<FaceSample[]>([]);
  const [cameraAnalyzing, setCameraAnalyzing] = useState(false);
  // Adjustable camera direction (style preset + strength controls).
  const [cameraStyle, setCameraStyle] = useState<CameraStyle>('dynamic');
  const [cameraIntensity, setCameraIntensity] = useState(1);   // 0.3..1.6
  const [cameraShake, setCameraShake] = useState(1);           // 0..2 multiplier
  const [cameraMaxZoom, setCameraMaxZoom] = useState(1.45);    // 1.2..1.8
  const [cameraTrackFaces, setCameraTrackFaces] = useState(true);
  const [cameraSettingsOpen, setCameraSettingsOpen] = useState(false);

  // AI Auto Video Enhancement (Studio Mode). The controller owns the WebGL
  // engine + scene classifier; React state mirrors it for the panel UI.
  const studioRef = useRef<StudioController | null>(null);
  if (!studioRef.current && typeof window !== 'undefined') studioRef.current = new StudioController();
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioActive, setStudioActive] = useState(false);
  const [studioAnalyzing, setStudioAnalyzing] = useState(false);
  const [studioScene, setStudioScene] = useState<SceneType | null>(null);
  const [studioBefore, setStudioBefore] = useState<QualityResult | null>(null);
  const [studioAfter, setStudioAfter] = useState<QualityResult | null>(null);
  const [studioComparePos, setStudioComparePos] = useState(1); // 1 = fully enhanced
  const [studioParams, setStudioParams] = useState<EnhanceParams | null>(null);
  const [studioAudioEnabled, setStudioAudioEnabled] = useState(true);
  const [studioPlatform, setStudioPlatform] = useState<SocialTarget | null>(null);
  const studioAudioEnabledRef = useRef(true);
  useEffect(() => { studioAudioEnabledRef.current = studioActive && studioAudioEnabled; }, [studioActive, studioAudioEnabled]);
  const studioActiveRef = useRef(false);
  useEffect(() => { studioActiveRef.current = studioActive; }, [studioActive]);
  // Set during export when the capture track supports manual frame pushing.
  const exportVideoTrackRef = useRef<CanvasCaptureMediaStreamTrack | null>(null);

  // Auto-analyze each newly loaded clip: scene classify + auto-levels + before
  // score. Resets Studio Mode state so a new upload starts clean. Fault tolerant
  // (analyze() never rejects) so a failed Gemini call still yields a usable look.
  const runStudioAnalysis = useCallback(async (video: HTMLVideoElement) => {
    const ctrl = studioRef.current;
    if (!ctrl) return;
    setStudioActive(false);
    setStudioComparePos(1);
    setStudioPlatform(null);
    setStudioAfter(null);
    setStudioAnalyzing(true);
    const res = await ctrl.analyze(video);
    setStudioScene(res.scene);
    setStudioBefore(res.before);
    setStudioParams(res.params);
    setStudioAnalyzing(false);
  }, []);

  const handleStudioParamsChange = useCallback((p: EnhanceParams) => {
    studioRef.current?.setParams(p);
    setStudioParams(p);
    studioActiveRef.current = true; // sync now so the next renderFrame enhances
    setStudioActive(true);
  }, []);

  const handleStudioResetParams = useCallback(() => {
    const p = studioRef.current?.resetToAuto();
    if (p) setStudioParams({ ...p });
  }, []);

  const handleStudioToggle = useCallback((next: boolean) => {
    studioActiveRef.current = next; // sync now so the synchronous afterScore/render path is correct
    setStudioActive(next);
    setStudioComparePos(next ? 0.5 : 1);
    if (next) {
      const video = videoRef.current;
      const ctrl = studioRef.current;
      if (video && ctrl) {
        const after = ctrl.afterScore(video, currentTimeRef.current);
        if (after) setStudioAfter(after);
      }
    }
  }, []);

  const handleStudioPlatform = useCallback((target: SocialTarget) => {
    setStudioPlatform(target);
    setAspectRatio(PLATFORM_PRESETS[target].aspectRatio);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) {
      setStudioScene(null); setStudioBefore(null); setStudioAfter(null);
      setStudioActive(false);
      return;
    }
    let cancelled = false;
    const onReady = () => {
      if (cancelled || !video.videoWidth) return;
      runStudioAnalysis(video);
    };
    if (video.readyState >= 2 && video.videoWidth) {
      onReady();
    } else {
      video.addEventListener('loadeddata', onReady, { once: true });
    }
    return () => { cancelled = true; video.removeEventListener('loadeddata', onReady); };
  }, [videoSrc, runStudioAnalysis]);

  // Stickers State & Handlers
  const [stickers, setStickers] = useState<StickerItem[]>([]);

  const handleAddSticker = useCallback((sticker: StickerItem) => {
    setStickers(prev => [...prev, sticker]);
  }, []);

  const handleUpdateSticker = useCallback((id: string, updates: Partial<StickerItem>) => {
    setStickers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const handleRemoveSticker = useCallback((id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  }, []);

  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);
  const [isChatEditOpen, setIsChatEditOpen] = useState(false);
  const [isClipPickerOpen, setIsClipPickerOpen] = useState(false);
  const [isKeyframeEditorOpen, setIsKeyframeEditorOpen] = useState(false);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  // CapCut-style unified selection: clicking any timeline clip routes the right
  // panel to that object's inspector. Captions also open the Customize tab.
  const [selection, setSelection] = useState<TimelineSelection | null>(null);
  const selectTimelineObject = useCallback((sel: TimelineSelection | null) => {
    setSelection(sel);
    if (sel?.kind === 'caption') {
      setSelectedCaptionId(sel.id);
      setActiveTab('DESIGN');
    } else if (sel) {
      setSelectedCaptionId(null);
    }
  }, []);
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
  const soundLibraryRef = useRef<SoundEffectsLibrary | null>(null);
  if (!soundLibraryRef.current) {
    soundLibraryRef.current = new SoundEffectsLibrary(soundEngineRef.current);
  }
  const captionRendererRef = useRef(new CaptionRenderer());
  // Real-sample SFX engine (replaces the synthetic SoundEngine for the actual
  // dynamic sound-effects feature; SoundEngine is left only as a legacy no-op).
  const sfxPlayerRef = useRef<SfxPlayer | null>(null);
  if (!sfxPlayerRef.current) sfxPlayerRef.current = new SfxPlayer();
  // Persistent AudioContext for export. Reused across exports because
  // createMediaElementSource(video) may be called at most once per element, and
  // the resulting node is bound to the context that created it.
  const exportAudioCtxRef = useRef<AudioContext | null>(null);
  const videoObjectUrlRef = useRef<string | null>(null);
  // Increments on every generation start AND on cancel; a finishing run only
  // applies its results if its id is still current (prevents a stale in-flight
  // request from clobbering state after the user hits Cancel or regenerates).
  const generationRunRef = useRef(0);

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

  // Ensure the <video> actually starts when playback is requested but the
  // element wasn't mounted yet when play() was first called. startPreviewMode
  // sets videoSrc + isPlaying in the same tick, so videoRef.current is still
  // null at that point; this runs after the element commits.
  useEffect(() => {
    const video = videoRef.current;
    if (video && isPlaying && video.paused) {
      video.play().catch(() => {});
    }
  }, [videoSrc, isPlaying]);

  // Sync SFX volume
  useEffect(() => {
    const volumeMap = { 'LOW': 0.1, 'MED': 0.3, 'HIGH': 0.6 };
    soundEngineRef.current.setVolume(volumeMap[sfxVolume] || 0.3);
    // Real-sample player uses a slightly hotter base so SFX read clearly over speech.
    const sfxMap = { 'LOW': 0.4, 'MED': 0.65, 'HIGH': 0.9 };
    sfxPlayerRef.current?.setVolume(sfxMap[sfxVolume] || 0.65);
  }, [sfxVolume]);

  // Generate the dynamic SFX track whenever the captions, beats, animation
  // settings, or the SFX toggle change. Cheap: the design pass is synchronous and
  // decoded samples are cached by asset id, so re-runs after the first are fast.
  useEffect(() => {
    const player = sfxPlayerRef.current;
    if (!player) return;
    if (status !== 'READY' || !autoSfxEnabled || processedCaptions.length === 0) {
      player.stopAll();
      setSfxTrack([]);
      return;
    }
    let cancelled = false;
    const duration = Math.max(0, ...processedCaptions.map(c => c.endTime));
    // Carry the user's hand-tuned cues (locked or manually placed) across regen.
    const preserve = sfxTrackRef.current.filter(c => c.locked || c.source === 'manual');
    const track = runSoundDesign({
      captions: processedCaptions,
      duration,
      beats: beatGrid?.beats,
      energy: beatGrid?.energy,
      energyHz: beatGrid?.energyHz,
      entryAnimation,
      exitAnimation,
      hasIcons: iconCaptionsEnabled,
      stickers,
    }, { vibe: sfxVibe, intensity: sfxIntensity, preserve });
    player.setDuckEnabled(true);
    player.setDuckEnvelope(beatGrid?.energy, beatGrid?.energyHz ?? 100);
    setSfxTrack(track);
    return () => { cancelled = true; };
  }, [processedCaptions, beatGrid, autoSfxEnabled, entryAnimation, exitAnimation, iconCaptionsEnabled, stickers, status, sfxVibe, sfxIntensity]);

  // Load the active SFX track into the player whenever it changes — from a fresh
  // generation OR a manual timeline edit (delete cue). Decoded samples are cached.
  useEffect(() => {
    const player = sfxPlayerRef.current;
    if (!player) return;
    let cancelled = false;
    player.loadTrack(sfxTrack).then(() => {
      if (!cancelled) player.resetSchedule(currentTimeRef.current);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [sfxTrack]);

  const deleteSfxCue = useCallback((id: string) => {
    setSfxTrack(prev => prev.filter(c => c.id !== id));
  }, []);

  // Per-cue adjustments — each marks the cue `locked` so it survives regeneration.
  const swapSfxCue = useCallback((id: string, dir: 1 | -1) => {
    setSfxTrack(prev => prev.map(c => c.id === id ? swapCueSound(c, dir) : c));
  }, []);
  const adjustSfxCueGain = useCallback((id: string, gain: number) => {
    setSfxTrack(prev => prev.map(c => c.id === id ? setCueGain(c, gain) : c));
  }, []);
  const toggleSfxCueMuted = useCallback((id: string) => {
    setSfxTrack(prev => prev.map(c => c.id === id ? toggleCueMuted(c) : c));
  }, []);
  const addManualSfxCue = useCallback((time: number, category: Parameters<typeof createManualCue>[1]) => {
    const cue = createManualCue(time, category);
    if (cue) setSfxTrack(prev => [...prev, cue].sort((a, b) => a.time - b.time));
  }, []);
  // Preview a single cue's sound immediately (used by the edit popover).
  const previewSfxCue = useCallback((id: string) => {
    const cue = sfxTrackRef.current.find(c => c.id === id);
    const player = sfxPlayerRef.current;
    if (cue && player) { player.resume(); player.previewCue?.(cue); }
  }, []);

  // ── AI Auto-Camera ──
  const regenCamera = useCallback(() => {
    if (status !== 'READY' || !autoCameraEnabled || processedCaptions.length === 0) {
      setCameraTrack([]);
      return;
    }
    const duration = Math.max(0, ...processedCaptions.map(c => c.endTime), videoRef.current?.duration || 0);
    const track = runAutoCamera({
      captions: processedCaptions,
      duration,
      beats: beatGrid?.beats,
      faces: faceTrackRef.current,
    }, {
      intensity: cameraIntensity,
      maxZoom: cameraMaxZoom,
      trackFaces: cameraTrackFaces,
      style: cameraStyle,
      shake: cameraShake,
    });
    setCameraTrack(track);
  }, [status, autoCameraEnabled, processedCaptions, beatGrid, cameraIntensity, cameraMaxZoom, cameraTrackFaces, cameraStyle, cameraShake]);

  // Deterministic regen whenever captions/beats/toggle change (uses cached faces).
  useEffect(() => { regenCamera(); }, [regenCamera]);

  // Face-tracking pre-pass — runs once when Auto-Camera is enabled or the video
  // changes. It briefly scrubs the video to sample face positions, then restores.
  useEffect(() => {
    if (!autoCameraEnabled || status !== 'READY') return;
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    let cancelled = false;
    setCameraAnalyzing(true);
    (async () => {
      try {
        const duration = video.duration || Math.max(0, ...processedCaptions.map(c => c.endTime));
        const faces = await sampleFaceTrack(video, duration, { intervalSec: 0.6, maxSamples: 100 });
        if (cancelled) return;
        faceTrackRef.current = faces;
        regenCamera();
      } finally {
        if (!cancelled) setCameraAnalyzing(false);
      }
    })();
    return () => { cancelled = true; };
    // Only re-scan on toggle / new video — not on every caption edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCameraEnabled, videoSrc, status]);

  const deleteCameraKeyframe = useCallback((id: string) => {
    setCameraTrack(prev => prev.filter(k => k.id !== id));
  }, []);

  // Esc deselects the active timeline object (returns the panel to the tabs).
  useEffect(() => {
    if (!selection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selectTimelineObject(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection, selectTimelineObject]);

  // Demo project: bundled clip + pre-generated captions → READY instantly.
  // No upload, no Gemini call. Same resets as a real upload so templates and
  // features behave identically to the production flow.
  const loadDemoProject = async () => {
    const url = await resolveDemoVideoUrl();
    if (videoObjectUrlRef.current) {
      URL.revokeObjectURL(videoObjectUrlRef.current);
      videoObjectUrlRef.current = null;
    }
    setVideoSrc(url);
    setVideoFile(null);
    setStats(null);
    setExportProgress(0);
    setPlaybackRate(1);
    setAspectRatio('ORIGINAL');
    setFontScale(1);
    setVerticalPos(82);
    setHorizontalPos(50);
    setCurrentStyle(CaptionStyle.CLEAN_WHITE);
    resetCaptionsHistory(getDemoCaptions());
    setStatus('READY');
    soundEngineRef.current.init();
  };

  const startPreviewMode = () => {
    // Play video
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

  // handleTestWithSampleText removed per user request

  const handleGenerateCaptions = async () => {
    if (!videoFile) return;

    // Transcript cache: same file already transcribed → load instantly, zero
    // Gemini tokens. Cached AFTER post-processing, so hits skip that too.
    const cached = getCachedTranscript(videoFile);
    if (cached) {
      resetCaptionsHistory(cached.captions);
      if (cached.language) setDetectedLanguage(cached.language);
      setStats(null);
      setStatus('READY');
      soundEngineRef.current.init();
      showToast('Loaded cached transcript — no tokens used', 'info');
      if (videoFile.size < 50 * 1024 * 1024) {
        analyzeBeats(videoFile)
          .then(grid => {
            soundLibraryRef.current?.setBeatGrid(grid);
            setBeatGrid(grid);
          })
          .catch(() => { /* beat analysis is optional */ });
      }
      return;
    }

    const runId = ++generationRunRef.current;
    setStatus('UPLOADING');
    const startTime = Date.now();

    try {
      // Extract audio to reduce payload size and avoid 500 RPC errors
      const { base64: audioBase64, mimeType: audioMimeType } = await extractAudioFromVideo(videoFile);
      if (generationRunRef.current !== runId) return; // cancelled while extracting

      setStatus('TRANSCRIBING');
      const videoDuration = videoRef.current?.duration || 0;
      const { captions: genCaps, language } = await generateCaptionsFromVideo(
        audioBase64,
        audioMimeType,
        autoAdjustEnabled,
        smartCompressionEnabled,
        languageMode,
        currentStyle,
        videoDuration
      );
      if (generationRunRef.current !== runId) return; // cancelled while transcribing

      let finalCaps = genCaps;

      // Strip filler words, annotate per-word emphasis + speaker turns
      finalCaps = removeFillerWords(finalCaps);
      finalCaps = annotateWordEmphasis(finalCaps);
      finalCaps = annotateSpeakers(finalCaps);

      if (currentStyle === CaptionStyle.EMOJI_AUTO) {
        finalCaps = applyAutoEmojis(finalCaps);
      }

      resetCaptionsHistory(finalCaps);
      cacheTranscript(videoFile, finalCaps, language);
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

      // Beat analysis — runs async in background, wires into SFX library when done.
      // Guard: skip for very large files (>50MB) to avoid OOM on decode.
      if (videoFile && videoFile.size < 50 * 1024 * 1024) {
        analyzeBeats(videoFile)
          .then(grid => {
            soundLibraryRef.current?.setBeatGrid(grid);
            setBeatGrid(grid);
          })
          .catch(() => { /* beat analysis is optional */ });
      }
    } catch (error) {
      if (generationRunRef.current !== runId) return; // cancelled — stay silent
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

  // Face detection loop for Auto Framing
  useEffect(() => {
    if (!autoAdjustEnabled || !videoRef.current || !isPlaying || status === 'EXPORTING') {
      setAutoFrameSafeY(null);
      return;
    }

    let active = true;
    let timeoutId: any;

    const runDetector = async () => {
      if (!active) return;
      const video = videoRef.current;
      if (video && !video.paused) {
        const detector = await initFaceDetector();
        if (detector && active) {
          const safeZone = detectSafeZone(video, video.currentTime * 1000);
          if (active) {
            setAutoFrameSafeY(safeZone);
          }
        }
      }
      timeoutId = setTimeout(runDetector, 400);
    };

    runDetector();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [autoAdjustEnabled, isPlaying, status]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.error(e));
      }
    }
    
    // Resume the AudioContext if the browser suspended it (autoplay policy)
    if (!isPlaying) {
      soundEngineRef.current.resume();
      // Resume the real SFX engine on the same user gesture and align its
      // scheduler to the current playhead so we don't dump a backlog of cues.
      sfxPlayerRef.current?.resume();
      sfxPlayerRef.current?.resetSchedule(currentTimeRef.current);
    } else {
      sfxPlayerRef.current?.stopAll();
    }
    setIsPlaying(!isPlaying);
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
    if (!canvas) return; // Video is optional now for black screen mode

    // Studio Mode: enhance the current frame via the WebGL pass. Returns null
    // (draw raw video) when inactive, unsupported, or a frame fails — never throws.
    let enhancedSource: CanvasImageSource | null = null;
    if (studioActiveRef.current && video) {
      enhancedSource = studioRef.current?.processFrame(video, currentTimeRef.current) ?? null;
    }

    captionRendererRef.current.render(video, canvas, {
      enhancedSource,
      enhanceComparePos: studioComparePos,
      currentTime: currentTimeRef.current,
      captions: processedCaptions,
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
      skipCaptionDraw: false,
      iconCaptionsEnabled,
      autoFramingEnabled: autoAdjustEnabled,
      autoFrameSafeY: autoFrameSafeY ?? undefined,
      keyframeMap,
      stickers,
      cameraTrack: autoCameraEnabled ? cameraTrack : undefined,
      autoCameraEnabled,
    }, {
      // Legacy synthetic-SFX callbacks are intentionally no-ops now. Real,
      // transcription-driven SFX are scheduled by SfxPlayer.tick() from the
      // animation loop, sourced from the runSoundDesign() track.
      onNewCaption: () => {},
      onEmphasizedWord: () => {},
    });
  }, [processedCaptions, activeConfig, fontScale, verticalPos, horizontalPos, autoAdjustEnabled, autoMotionEnabled, autoSfxEnabled, kineticMode, currentStyle, isPlaying, entryAnimation, exitAnimation, wordHighlight, animationSpeed, aspectRatio, iconCaptionsEnabled, autoFrameSafeY, stickers, keyframeMap, cameraTrack, autoCameraEnabled, studioComparePos]);

  // --- ANIMATION LOOP: only run when playing or exporting ---
  useEffect(() => {
    let rafId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const video = videoRef.current;
      const maxTime = processedCaptions.length > 0
        ? Math.max(...processedCaptions.map(c => c.endTime)) + 2
        : 10;

      // Drive the caption playhead. Reads the real <video> position when it is
      // actually playing; otherwise advances a synthetic clock so captions
      // never freeze when the video is mounted-but-stalled. See playbackClock.ts.
      currentTimeRef.current = nextPlayheadTime({
        video: video
          ? {
              hasVideo: true,
              paused: video.paused,
              ended: video.ended,
              readyState: video.readyState,
              currentTime: video.currentTime,
            }
          : null,
        isPlaying,
        prevTime: currentTimeRef.current,
        dt,
        maxTime,
      });

      // Schedule dynamic SFX against the playhead (preview only; export uses an
      // offline render). No-ops when not playing or during export.
      if (status !== 'EXPORTING') {
        sfxPlayerRef.current?.tick(currentTimeRef.current, isPlaying);
      }

      renderFrame();
      // During export, push exactly this fully-rendered frame to the recorder so
      // no duplicated/stale frame is captured (the cause of export judder).
      if (status === 'EXPORTING' && exportVideoTrackRef.current) {
        try { (exportVideoTrackRef.current as any).requestFrame?.(); } catch { /* noop */ }
      }
      rafId = requestAnimationFrame(loop);
    };

    if (isPlaying || status === 'EXPORTING') {
      lastTime = performance.now();
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

  // Studio Mode: repaint the (paused) canvas immediately when enhancement is
  // toggled or analysis finishes, so the user sees before/after without pressing
  // play. While playing, the animation loop already repaints every frame.
  useEffect(() => {
    if (!isPlaying && status !== 'EXPORTING' && videoSrc) {
      renderFrame();
    }
  }, [studioActive, studioScene, studioAfter, studioParams, isPlaying, status, videoSrc, renderFrame]);

  // --- SEEK HANDLER (for TimelineScrubber) ---
  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    currentTimeRef.current = time;
    // Re-anchor the SFX scheduler to the new playhead (and kill in-flight sounds).
    sfxPlayerRef.current?.stopAll();
    sfxPlayerRef.current?.resetSchedule(time);
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

  if (!apiKey && !import.meta.env.VITE_GEMINI_API_KEY && !import.meta.env.VITE_API_KEY) {
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

    // Studio Mode: if a platform target is selected, its resolution/fps/bitrate/
    // format preset overrides the generic export options so the file ships
    // tuned for that platform's encoder.
    if (studioPlatform) {
      options = { ...options, ...PLATFORM_PRESETS[studioPlatform].export };
    }

    setStatus('EXPORTING');
    setIsPlaying(false);
    setExportProgress(0);

    // FIX: Disable loop so video.onended fires at the end of the video.
    // The <video> element has loop=true by default for preview, but export
    // relies on the 'ended' event to stop MediaRecorder and trigger download.
    const wasLooping = video.loop;
    video.loop = false;

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

    // Manual frame source when supported: one rendered frame == one captured frame
    // (smooth, no judder). The render loop calls track.requestFrame() per frame.
    const probeTrack = canvas.captureStream(0).getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined;
    const canReqFrame = !!(probeTrack && typeof (probeTrack as any).requestFrame === 'function');
    const canvasStream = canReqFrame ? canvas.captureStream(0) : canvas.captureStream(options.fps);
    exportVideoTrackRef.current = canReqFrame
      ? (canvasStream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack)
      : null;

    // ── Audio: mix the video's own audio + the dynamic SFX track into ONE stream
    // so SFX actually bake into the exported file. We deliberately do NOT use
    // video.captureStream() for audio — that path carries only the element's own
    // audio and would drop our WebAudio SFX (the old bug). A persistent
    // AudioContext is reused so the once-per-element MediaElementSource stays valid.
    let audioStream: MediaStream | null = null;
    let sfxExportSource: AudioBufferSourceNode | null = null;
    try {
      const vidAny = video as any;
      if (!exportAudioCtxRef.current) {
        const Ctor = window.AudioContext || (window as any).webkitAudioContext;
        exportAudioCtxRef.current = new Ctor();
      }
      const exCtx = exportAudioCtxRef.current!;
      if (exCtx.state === 'suspended') await exCtx.resume().catch(() => {});

      const destNode = exCtx.createMediaStreamDestination();

      // Video element audio → graph. createMediaElementSource is once-per-element,
      // ever; cache the node and keep it on this same persistent context.
      if (!vidAny.__audioSourceNode) {
        vidAny.__audioSourceNode = exCtx.createMediaElementSource(video);
        vidAny.__audioSourceNode.connect(exCtx.destination); // monitor while exporting
      }
      // Studio Mode AI audio cleanup: route the video audio through the
      // noise-reduction chain into the export destination. Falls back to a
      // direct connection if disabled or if the graph throws.
      if (studioActive && studioAudioEnabled) {
        insertAudioEnhancer(exCtx, vidAny.__audioSourceNode, destNode, { enabled: true, strength: 0.7 });
      } else {
        try { vidAny.__audioSourceNode.connect(destNode); } catch { /* already connected */ }
      }

      // Pre-render the whole SFX track to one buffer at the export sample rate
      // (deterministic mix incl. ducking), scheduled into the same destination.
      // Started precisely at playback start below for A/V alignment.
      if (autoSfxEnabled && sfxTrack.length > 0 && video.duration > 0) {
        const sfxBuffer = await sfxPlayerRef.current?.renderOffline(sfxTrack, video.duration, exCtx.sampleRate);
        if (sfxBuffer) {
          sfxExportSource = exCtx.createBufferSource();
          sfxExportSource.buffer = sfxBuffer;
          sfxExportSource.connect(destNode);
        }
      }

      audioStream = destNode.stream;
    } catch (e) {
      console.warn("Audio mix setup failed, exporting video-only:", e);
      sfxExportSource = null;
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

    // Safety net: stop recording at 99.75% of duration via timeupdate in case onended misfires
    const onTimeUpdateSafety = () => {
      if (video.duration > 0 && video.currentTime >= video.duration - 0.25) {
        stopExport();
      }
    };

    const stopExport = () => {
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      if (sfxExportSource) { try { sfxExportSource.stop(); } catch { /* already stopped */ } sfxExportSource = null; }
      video.onended = null;
      video.removeEventListener('timeupdate', onTimeUpdateSafety);
      // Restore loop state now that export is done
      video.loop = wasLooping;
    };

    mediaRecorder.onstop = () => {
      exportVideoTrackRef.current = null;
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
      video.loop = wasLooping;
      setIsPlaying(false);
      setIsExportPanelOpen(false);
    };
    mediaRecorder.onerror = () => {
      canvas.width = origCanvasWidth;
      canvas.height = origCanvasHeight;
      video.loop = wasLooping;
      setStatus('READY');
      showToast("Export failed. Please try again.");
    };
    mediaRecorder.start();
    // Primary stop trigger: video ended event
    video.onended = () => stopExport();
    // Register the timeupdate safety listener
    video.addEventListener('timeupdate', onTimeUpdateSafety);
    // Bug 7 Fix: readyState guard
    if (video.readyState < 2) {
      showToast("Video not ready. Please wait a moment and try again.", 'info');
      video.loop = wasLooping;
      setStatus('READY');
      return;
    }
    try {
      await video.play();
      // Start the pre-rendered SFX exactly as playback begins so cues align with
      // the recorded frames.
      if (sfxExportSource && exportAudioCtxRef.current) {
        try { sfxExportSource.start(exportAudioCtxRef.current.currentTime); } catch { /* range */ }
      }
    } catch (e) { stopExport(); setStatus('READY'); }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--cc-bg)] text-[var(--cc-text-2)] font-sans overflow-hidden">

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
            captions={processedCaptions}
          />
        </Suspense>
      )}
      {isChatEditOpen && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50">
          <Suspense fallback={null}>
            <ChatEditPanel
              captions={captions}
              currentTime={videoRef.current?.currentTime ?? 0}
              onCaptionsChange={newCaps => setCaptions(() => newCaps)}
              onClose={() => setIsChatEditOpen(false)}
            />
          </Suspense>
        </div>
      )}

      {isClipPickerOpen && (
        <div className="fixed bottom-28 right-4 z-50">
          <Suspense fallback={null}>
            <ClipPickerPanel
              captions={captions}
              onSeek={handleSeek}
              onClose={() => setIsClipPickerOpen(false)}
            />
          </Suspense>
        </div>
      )}

      {isKeyframeEditorOpen && (
        <div className="fixed bottom-28 left-4 z-50">
          <Suspense fallback={null}>
            <KeyframeEditor
              captions={captions}
              keyframeMap={keyframeMap}
              onKeyframeMapChange={setKeyframeMap}
              currentTime={currentTimeRef.current}
              onClose={() => setIsKeyframeEditorOpen(false)}
            />
          </Suspense>
        </div>
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
            src="/logo.svg"
            alt="Createrin"
            className="h-7 w-auto rounded object-contain bg-white"
            onError={(e) => { e.currentTarget.style.display = 'none'; const f = document.getElementById('logo-fallback'); if (f) f.classList.remove('hidden'); }}
          />
          <h1 id="logo-fallback" className="hidden text-lg font-semibold tracking-tight text-[var(--cc-text-1)]">createrin</h1>

          {/* Status pill */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[var(--cc-blue-dim)] border border-[rgba(0,112,243,0.15)] text-[var(--cc-blue)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--cc-blue)] animate-pulse" />
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
          {status === 'READY' && captions.length > 0 && (
            <button
              onClick={() => { captureDemoCaptions(captions); showToast('Saved as demo — Load Demo Project now uses these captions', 'info'); }}
              className="cc-btn cc-btn-ghost !px-2 !py-2"
              title="Save current captions as the demo project dataset (zero-token testing)"
            >
              <FlaskConical size={12} style={{ color: 'var(--cc-text-3)' }} />
            </button>
          )}
          {status === 'READY' && (
            <>
              {/* TEMPORARILY HIDDEN — SEO & Publish features
              <button onClick={() => setIsSeoModalOpen(true)} className="cc-btn cc-btn-ghost hidden xl:inline-flex">
                <Share2 size={13} /> SEO
              </button>
              <button onClick={() => setIsPublisherOpen(true)} className="cc-btn cc-btn-primary hidden md:inline-flex">
                <UploadCloud size={13} /> Publish
              </button>
              */}
              <div className="h-4 w-px mx-0.5 hidden sm:block" style={{ background: 'var(--cc-border-mid)' }} />
              <button
                onClick={() => setIsClipPickerOpen(v => !v)}
                className={`cc-btn ${isClipPickerOpen ? 'cc-btn-primary' : 'cc-btn-ghost'}`}
                title="Best Clips Picker"
              >
                <Scissors size={14} />
                <span className="hidden sm:inline">Clips</span>
              </button>
              <button
                onClick={() => setIsChatEditOpen(v => !v)}
                className={`cc-btn ${isChatEditOpen ? 'cc-btn-primary' : 'cc-btn-ghost'}`}
                title="Chat Caption Editor"
              >
                <MessageSquare size={14} />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => setIsKeyframeEditorOpen(v => !v)}
                className={`cc-btn ${isKeyframeEditorOpen ? 'cc-btn-primary' : 'cc-btn-ghost'}`}
                title="Keyframe Editor"
              >
                <Diamond size={13} />
                <span className="hidden sm:inline">Keys</span>
              </button>
              <div className="h-4 w-px mx-0.5 hidden sm:block" style={{ background: 'var(--cc-border-mid)' }} />
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
        <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[var(--cc-bg)]"><Loader2 className="animate-spin text-fuchsia-500 w-8 h-8" /></div>}>
          <AiThumbnailGenerator onBack={() => setActiveFeature(null)} />
        </Suspense>
      )}
      {activeFeature === 'MOTION' && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[var(--cc-bg)]"><Loader2 className="animate-spin text-fuchsia-500 w-8 h-8" /></div>}>
          <MotionGraphicsPanel onBack={() => setActiveFeature(null)} />
        </Suspense>
      )}
      {activeFeature === 'STUDIO' && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[var(--cc-bg)]"><Loader2 className="animate-spin text-fuchsia-500 w-8 h-8" /></div>}>
          <StudioModeStudio onBack={() => setActiveFeature(null)} />
        </Suspense>
      )}
      {activeFeature === 'TYPOGRAPHY_REEL' && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[var(--cc-bg)]"><Loader2 className="animate-spin text-violet-500 w-8 h-8" /></div>}>
          <TypographyReelStudio onBack={() => setActiveFeature(null)} />
        </Suspense>
      )}
      {activeFeature === 'SEO' && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[var(--cc-bg)]"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>}>
          <SeoGenerator captions={captions} onClose={() => setActiveFeature(null)} />
        </Suspense>
      )}
      {activeFeature === 'PUBLISH' && (
        videoSrc
          ? <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[var(--cc-bg)]"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>}><SocialPublisher videoSrc={videoSrc} captions={captions} onClose={() => setActiveFeature(null)} /></Suspense>
          : <div className="flex-1 flex items-center justify-center flex-col gap-4 bg-[var(--cc-bg)]">
            <div className="text-4xl">🎬</div>
            <h2 className="text-xl font-semibold text-[var(--cc-text-1)] tracking-tight">Upload a video first</h2>
            <p className="text-[var(--cc-text-2)] text-sm">You need to generate captions before publishing.</p>
            <button onClick={() => setActiveFeature(null)} className="cc-btn cc-btn-ghost mt-4">← Back</button>
          </div>
      )}
      {activeFeature === 'AUTOMATION' && (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[var(--cc-bg)]"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>}>
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
                  onLoadDemoProject={loadDemoProject}
                  setVideoSrc={setVideoSrc}
                  setVideoFile={setVideoFile}
                  setStatus={(s) => {
                    // Cancel (→ IDLE) invalidates any in-flight generation so a
                    // late-resolving request can't clobber state afterwards.
                    if (s === 'IDLE') generationRunRef.current++;
                    setStatus(s);
                  }}
                  handleTimeUpdate={handleTimeUpdate}
                  isPlaying={isPlaying}
                  togglePlay={togglePlay}
                  status={status}
                  exportProgress={exportProgress}
                  captions={processedCaptions}
                  updateCaption={updateCaption}
                  showSafeZones={showSafeZones}
                  safeZonePlatform={safeZonePlatform}
                  aspectRatio={aspectRatio}
                  videoIntrinsicRatio={videoIntrinsicRatio}
                  setVideoIntrinsicRatio={setVideoIntrinsicRatio}
                  activeConfig={activeConfig}
                  currentStyle={currentStyle}
                  fontScale={fontScale}
                  verticalPos={verticalPos}
                  horizontalPos={horizontalPos}
                  stickers={stickers}
                  onUpdateSticker={handleUpdateSticker}
                  isStickersTabActive={activeTab === 'STICKERS'}
                />

                {/* AI Studio Mode launcher — appears as soon as a video is
                    uploaded (before captioning), since enhancement is upstream. */}
                {videoSrc && (
                  <button
                    onClick={() => setStudioOpen(v => !v)}
                    title="AI Studio Mode — auto color, denoise, face & audio enhancement"
                    className={`absolute top-3 left-3 z-40 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md transition-all border ${studioActive ? 'bg-[var(--cc-blue)] border-transparent text-white' : 'bg-black/60 border-[var(--cc-border)] text-[var(--cc-text-2)] hover:bg-black/80 hover:text-[var(--cc-text-1)]'}`}
                  >
                    <Sparkles size={14} /> {studioAnalyzing ? 'Analyzing…' : studioActive ? 'Studio On' : 'Studio Mode'}
                  </button>
                )}

                {/* FX Quick-Toggle Bar — always visible after generation */}
                {videoSrc && status === 'READY' && (
                  <div className="absolute bottom-3 left-3 z-40 flex items-center gap-1 backdrop-blur-md bg-black/70 border border-[var(--cc-border)] rounded-xl px-2 py-1.5 shadow-xl">
                    {/* AI Auto-Camera + settings */}
                    <div className="relative flex items-center">
                      <button
                        onClick={() => setAutoCameraEnabled(v => !v)}
                        title={autoCameraEnabled ? 'AI Camera ON — zoom/pan/punch-in. Click to disable' : 'AI Camera OFF — click to auto-generate cinematic camera moves'}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-l-lg text-[11px] font-medium transition-all ${autoCameraEnabled ? 'bg-[var(--cc-blue-dim)] text-[var(--cc-blue-light)]' : 'text-[var(--cc-text-3)] hover:bg-white/5 hover:text-[var(--cc-text-2)]'}`}
                      >
                        <Camera size={11} /> {cameraAnalyzing ? 'Scanning…' : 'Camera'}
                      </button>
                      <button
                        onClick={() => setCameraSettingsOpen(o => !o)}
                        title="Camera style & strength"
                        className={`px-1 py-1 rounded-r-lg border-l border-black/20 transition-all ${cameraSettingsOpen ? 'bg-[var(--cc-blue)] text-white' : autoCameraEnabled ? 'bg-[var(--cc-blue-dim)] text-[var(--cc-blue-light)] hover:text-[var(--cc-text-1)]' : 'text-[var(--cc-text-3)] hover:bg-white/5 hover:text-[var(--cc-text-2)]'}`}
                      >
                        <ChevronDown size={11} className={`transition-transform ${cameraSettingsOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {cameraSettingsOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-64 p-3 rounded-xl bg-zinc-900/95 backdrop-blur-md border border-[var(--cc-border)] shadow-2xl text-[var(--cc-text-1)] space-y-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--cc-text-1)]">
                            <Camera size={12} className="text-[var(--cc-blue-light)]" /> Camera Director
                          </div>
                          {/* Style preset */}
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-[var(--cc-text-1)]/40 mb-1">Style</div>
                            <div className="grid grid-cols-3 gap-1">
                              {([
                                ['subtle', 'Subtle'], ['dynamic', 'Dynamic'], ['punchy', 'Punchy'],
                                ['cinematic', 'Cinematic'], ['handheld', 'Handheld'],
                              ] as [CameraStyle, string][]).map(([val, label]) => (
                                <button key={val}
                                  onClick={() => { setCameraStyle(val); if (!autoCameraEnabled) setAutoCameraEnabled(true); }}
                                  className={`px-1.5 py-1 rounded-md text-[10px] font-semibold transition-all ${cameraStyle === val ? 'bg-[var(--cc-blue)] text-white' : 'bg-white/5 text-[var(--cc-text-1)]/50 hover:bg-white/10'}`}
                                >{label}</button>
                              ))}
                            </div>
                            <div className="text-[9px] text-[var(--cc-text-1)]/35 mt-1 leading-tight">
                              {cameraStyle === 'subtle' && 'Gentle drift — talking-head safe.'}
                              {cameraStyle === 'dynamic' && 'Balanced modern edit with crash zooms.'}
                              {cameraStyle === 'punchy' && 'MrBeast retention: crash zooms, shake, big contrast.'}
                              {cameraStyle === 'cinematic' && 'Slow film push-ins + gentle dutch tilt.'}
                              {cameraStyle === 'handheld' && 'Vloggy GoPro energy — constant organic shake.'}
                            </div>
                          </div>
                          {/* Intensity */}
                          <label className="block">
                            <div className="flex justify-between text-[10px] text-[var(--cc-text-1)]/50 mb-0.5"><span>Intensity</span><span className="text-[var(--cc-text-2)]/70">{Math.round(cameraIntensity * 100)}%</span></div>
                            <input type="range" min={0.3} max={1.6} step={0.05} value={cameraIntensity}
                              onChange={e => setCameraIntensity(parseFloat(e.target.value))}
                              className="w-full accent-blue-500 h-1" />
                          </label>
                          {/* Shake */}
                          <label className="block">
                            <div className="flex justify-between text-[10px] text-[var(--cc-text-1)]/50 mb-0.5"><span>Shake</span><span className="text-[var(--cc-text-2)]/70">{Math.round(cameraShake * 100)}%</span></div>
                            <input type="range" min={0} max={2} step={0.1} value={cameraShake}
                              onChange={e => setCameraShake(parseFloat(e.target.value))}
                              className="w-full accent-blue-500 h-1" />
                          </label>
                          {/* Max zoom */}
                          <label className="block">
                            <div className="flex justify-between text-[10px] text-[var(--cc-text-1)]/50 mb-0.5"><span>Max Zoom</span><span className="text-[var(--cc-text-2)]/70">{cameraMaxZoom.toFixed(2)}×</span></div>
                            <input type="range" min={1.2} max={1.8} step={0.05} value={cameraMaxZoom}
                              onChange={e => setCameraMaxZoom(parseFloat(e.target.value))}
                              className="w-full accent-blue-500 h-1" />
                          </label>
                          {/* Track faces */}
                          <button onClick={() => setCameraTrackFaces(v => !v)}
                            className="flex items-center justify-between w-full text-[10px] text-[var(--cc-text-2)]/60 hover:text-[var(--cc-text-1)]">
                            <span>Track speaker's face</span>
                            {cameraTrackFaces ? <ToggleRight size={18} className="text-[var(--cc-blue-light)]" /> : <ToggleLeft size={18} className="text-[var(--cc-text-1)]/30" />}
                          </button>
                        </div>
                      )}
                    </div>
                    {/* B-Roll */}
                    <button
                      onClick={() => setAutoMotionEnabled(v => !v)}
                      title={autoMotionEnabled ? 'B-Roll ON — click to disable' : 'B-Roll OFF — click to enable'}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${autoMotionEnabled ? 'bg-[var(--cc-blue-dim)] text-[var(--cc-blue-light)]' : 'text-[var(--cc-text-3)] hover:bg-white/5 hover:text-[var(--cc-text-2)]'}`}
                    >
                      <Video size={11} /> B-Roll
                    </button>
                    {/* SFX */}
                    <button
                      onClick={() => setAutoSfxEnabled(v => !v)}
                      title={autoSfxEnabled ? 'SFX ON — click to disable' : 'SFX OFF — click to enable'}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${autoSfxEnabled ? 'bg-[var(--cc-blue-dim)] text-[var(--cc-blue-light)]' : 'text-[var(--cc-text-3)] hover:bg-white/5 hover:text-[var(--cc-text-2)]'}`}
                    >
                      <Music size={11} /> SFX
                    </button>
                  </div>
                )}

                {/* AI Studio Mode panel — floating overlay */}
                {videoSrc && studioOpen && (
                  <div className="absolute top-16 left-3 z-50 w-72 max-w-[calc(100%-1.5rem)]">
                    <StudioModePanel
                      hasVideo={!!videoSrc}
                      analyzing={studioAnalyzing}
                      supported={studioRef.current?.isSupported() ?? false}
                      mode={studioRef.current?.getMode() ?? 'none'}
                      scene={studioScene}
                      before={studioBefore}
                      after={studioAfter}
                      active={studioActive}
                      onToggle={handleStudioToggle}
                      comparePos={studioComparePos}
                      onComparePos={setStudioComparePos}
                      params={studioParams}
                      onParamsChange={handleStudioParamsChange}
                      onResetParams={handleStudioResetParams}
                      audioEnabled={studioAudioEnabled}
                      onAudioToggle={setStudioAudioEnabled}
                      onPickPlatform={handleStudioPlatform}
                      activePlatform={studioPlatform}
                    />
                  </div>
                )}

                {/* Safe Zones Toggle */}
                {videoSrc && status === 'READY' && (
                  <div className="absolute top-3 right-3 z-40 flex items-center shadow-lg rounded-lg border border-[var(--cc-border)] overflow-hidden backdrop-blur-md">
                    <button
                      onClick={() => setShowSafeZones(!showSafeZones)}
                      title="Toggle Social Media Safe Zones"
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${showSafeZones ? 'bg-[var(--cc-blue)] text-white' : 'bg-black/60 text-[var(--cc-text-2)] hover:bg-black/80 hover:text-[var(--cc-text-1)]'}`}
                    >
                      <Smartphone size={13} /> {showSafeZones ? 'Safe Zones ON' : 'Safe Zones'}
                    </button>
                    {showSafeZones && (
                      <div className="flex bg-black/80 items-center px-1 border-l border-[var(--cc-border)]">
                        {(['SHORTS', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => setSafeZonePlatform(p)}
                            className={`p-1.5 rounded transition-colors ${safeZonePlatform === p ? 'text-[var(--cc-blue-light)] bg-white/10' : 'text-[var(--cc-text-3)] hover:text-[var(--cc-text-1)]'}`}
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

            {/* Sound-design controls — adjustable vibe / intensity / volume.
                Hidden while an SFX cue is selected (the inspector shows it then). */}
            {videoSrc && status === 'READY' && autoSfxEnabled && selection?.kind !== 'sfx' && (
              <SfxControlPanel
                vibe={sfxVibe}
                onVibeChange={setSfxVibe}
                intensity={sfxIntensity}
                onIntensityChange={setSfxIntensity}
                volume={sfxVolume}
                onVolumeChange={setSfxVolume}
                cueCount={sfxTrack.length}
              />
            )}

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
                onSelectCaption={(id) => selectTimelineObject(id ? { kind: 'caption', id } : null)}
                selection={selection}
                onSelectObject={selectTimelineObject}
                keyframeMap={keyframeMap}
                onKeyframeMapChange={setKeyframeMap}
                beatGrid={beatGrid ?? undefined}
                autoMotionEnabled={autoMotionEnabled}
                autoSfxEnabled={autoSfxEnabled}
                entryAnimation={entryAnimation}
                wordHighlight={wordHighlight}
                sfxTrack={sfxTrack}
                onDeleteSfxCue={deleteSfxCue}
                onSwapSfxCue={swapSfxCue}
                onAdjustSfxCueGain={adjustSfxCueGain}
                onToggleSfxCueMuted={toggleSfxCueMuted}
                onPreviewSfxCue={previewSfxCue}
                cameraTrack={cameraTrack}
                onDeleteCameraKeyframe={deleteCameraKeyframe}
              />
            )}
          </div>

          {/* Right Panel: Context-sensitive */}
          <div className="w-full h-auto md:h-full flex-shrink-0 z-20 flex flex-col bg-[var(--cc-surface)] md:overflow-hidden border-t md:border-t-0 md:border-l border-[var(--cc-border)] md:w-[var(--panel-width)]">

            {/* Bug 2 Fix: Upload prompt when no video is loaded */}
            {!videoSrc && (status === 'IDLE') && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--cc-blue-dim)] border border-[rgba(0,112,243,0.15)] flex items-center justify-center">
                  <Upload size={28} className="text-[var(--cc-blue)]" />
                </div>
                <div>
                  <h3 className="text-[var(--cc-text-1)] font-black text-base">Upload a Video</h3>
                  <p className="text-[var(--cc-text-3)] text-xs mt-1 leading-relaxed">Drop a vertical video on the left to start generating viral captions.</p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-left">
                    <span className="text-lg">🎬</span>
                    <div>
                      <p className="text-xs font-bold text-[var(--cc-text-2)]">9:16 Vertical</p>
                      <p className="text-[10px] text-gray-600">TikTok, Reels, Shorts</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10 text-left">
                    <span className="text-lg">✨</span>
                    <div>
                      <p className="text-xs font-bold text-[var(--cc-text-2)]">100+ Languages</p>
                      <p className="text-[10px] text-gray-600">Auto-detect or pick manually</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/5 border border-green-500/10 text-left">
                    <span className="text-lg">🚀</span>
                    <div>
                      <p className="text-xs font-bold text-[var(--cc-text-2)]">Viral Templates</p>
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
                iconCaptionsEnabled={iconCaptionsEnabled}
                setIconCaptionsEnabled={setIconCaptionsEnabled}
                handleGenerateCaptions={handleGenerateCaptions}
                detectedLanguage={detectedLanguage}
              />
            )}

            {/* Bug 10 Fix: Processing state in right panel */}
            {(status === 'UPLOADING' || status === 'TRANSCRIBING') && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-[rgba(0,112,243,0.15)]" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wand2 size={24} className="text-[var(--cc-blue)]" />
                  </div>
                </div>
                <div>
                  <h3 className="text-[var(--cc-text-1)] font-black text-base">
                    {status === 'UPLOADING' ? 'Uploading Video…' : status === 'TRANSCRIBING' ? 'Transcribing Audio…' : 'Processing…'}
                  </h3>
                  <p className="text-[var(--cc-text-3)] text-xs mt-1">
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

            {/* CapCut-style contextual inspector — shown when a non-caption clip
                is selected on the timeline. Captions route to the Customize tab. */}
            {status === 'READY' && selection && selection.kind !== 'caption' && (
              <InspectorPanel
                selection={selection}
                onClose={() => selectTimelineObject(null)}
                cameraTrack={cameraTrack}
                onDeleteCameraKeyframe={deleteCameraKeyframe}
                cameraStyle={cameraStyle}
                setCameraStyle={setCameraStyle}
                cameraIntensity={cameraIntensity}
                setCameraIntensity={setCameraIntensity}
                cameraShake={cameraShake}
                setCameraShake={setCameraShake}
                cameraMaxZoom={cameraMaxZoom}
                setCameraMaxZoom={setCameraMaxZoom}
                cameraTrackFaces={cameraTrackFaces}
                setCameraTrackFaces={setCameraTrackFaces}
                sfxTrack={sfxTrack}
                sfxVibe={sfxVibe}
                setSfxVibe={setSfxVibe}
                sfxIntensity={sfxIntensity}
                setSfxIntensity={setSfxIntensity}
                sfxVolume={sfxVolume}
                setSfxVolume={setSfxVolume}
                onAdjustSfxCueGain={adjustSfxCueGain}
                onToggleSfxCueMuted={toggleSfxCueMuted}
                onSwapSfxCue={swapSfxCue}
                onDeleteSfxCue={deleteSfxCue}
                onPreviewSfxCue={previewSfxCue}
                captions={captions}
                onUpdateCaption={updateCaption}
                stickers={stickers}
                onUpdateSticker={handleUpdateSticker}
                onRemoveSticker={handleRemoveSticker}
              />
            )}

            {status === 'READY' && !(selection && selection.kind !== 'caption') && (
              <>
                {/* Tab bar for right panel */}
                <div style={{
                  display: 'flex',
                  borderBottom: '1px solid var(--cc-border)',
                  background: 'var(--cc-surface)',
                  flexShrink: 0, overflowX: 'auto',
                }}>
                  {
                    // 4 groups (DESIGN.md layout spec). Text covers both the
                    // Customize editor and the Transcript — sub-toggle below.
                    [
                      { id: 'PRESETS', label: 'Style', match: ['PRESETS'] },
                      { id: 'DESIGN', label: 'Text', match: ['DESIGN', 'TRANSCRIPT'] },
                      { id: 'ANIMATE', label: 'Motion', match: ['ANIMATE'] },
                      { id: 'STICKERS', label: 'Assets', match: ['STICKERS'] },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`cc-tab ${tab.match.includes(activeTab) ? 'active' : ''}`}
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
                      animationSpeed={animationSpeed}
                      setAnimationSpeed={setAnimationSpeed}
                      kineticMode={kineticMode}
                      setKineticMode={setKineticMode}
                      autoMotionEnabled={autoMotionEnabled}
                      setAutoMotionEnabled={setAutoMotionEnabled}
                      autoSfxEnabled={autoSfxEnabled}
                      setAutoSfxEnabled={setAutoSfxEnabled}
                    />
                    </Suspense>
                  ) : activeTab === 'STICKERS' ? (
                    <Suspense fallback={<div className="flex-1 flex items-center justify-center p-6"><Loader2 className="animate-spin text-blue-500" /></div>}>
                      <StickersPanel
                        stickers={stickers}
                        onAddSticker={handleAddSticker}
                        onUpdateSticker={handleUpdateSticker}
                        onRemoveSticker={handleRemoveSticker}
                        currentTime={currentTimeRef.current}
                        videoDuration={videoRef.current?.duration || 0}
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
                      autoAdjustEnabled={autoAdjustEnabled}
                      setAutoAdjustEnabled={setAutoAdjustEnabled}
                      smartCompressionEnabled={smartCompressionEnabled}
                      setSmartCompressionEnabled={setSmartCompressionEnabled}
                      iconCaptionsEnabled={iconCaptionsEnabled}
                      setIconCaptionsEnabled={setIconCaptionsEnabled}
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