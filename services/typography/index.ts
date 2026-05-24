/**
 * Typography Reel Service Exports
 *
 * Complete kinetic typography system for AI-powered reel generation:
 * Audio → Gemini Analysis → Beat Detection → Animation Selection → Canvas → MP4
 */

// Core types
export type {
  AnimationSequence,
  AnimationTiming,
  AnimationType,
  BeatGrid,
  CanvasRenderState,
  EmotionIntensity,
  EnrichedTranscript,
  ExportOptions,
  LayoutConfiguration,
  PipelineStage,
  PipelineState,
  RenderMetrics,
  SegmentEmotion,
  TextStyle,
  ThemeProfile,
  TranscriptSegment,
  TranscriptWord,
  WordAnimation,
  WordRole,
} from './types';

export { THEME_PRESETS } from './types';

// Emotion-to-Animation Mapping
export {
  calculateAnimationTiming,
  checkForRepetitionFatigue,
  generateTextStyle,
  selectAnimation,
  EMOTION_ANIMATION_MAP,
  INTENSITY_TIMING_PRESETS,
  ROLE_ANIMATION_PREFERENCE,
} from './emotionAnimationMap';

// Beat Snapping & Synchronization
export {
  adjustWordDurationToBeat,
  calculateSyncQuality,
  findNearestBeat,
  generateBeatMarkers,
  snapWordsToSyllables,
  snapWordsWithConstraints,
  type SyncQuality,
} from './beatSnapper';

// Choreography Engine (with validation)
export {
  choreograph,
  groupAnimationsIntoScenes,
  validateAnimationPacing,
  validateAnimationSequence,
  validateThemeCompatibility,
  type SceneDefinition,
} from './choreographyEngine';

// Canvas Rendering
export {
  createCanvasRenderer,
  measureText,
  TypographyRenderer,
} from './typographyRenderer';

// Audio Analysis
export {
  analyzeBeats,
  analyzeBeatGrid,
} from './audioAnalyzer';

// Transcript Analysis (Gemini)
export {
  analyzeTranscript,
  createDemoTranscript,
} from './transcriptAnalyzer';
