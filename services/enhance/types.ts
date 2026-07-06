// AI Auto Video Enhancement Engine — shared types.
// Plan: docs/designs/AI_AUTO_VIDEO_ENHANCEMENT_ENGINE.md

/** Scene categories the Gemini classifier maps a clip into. */
export type SceneType =
  | 'indoor'
  | 'outdoor'
  | 'night'
  | 'gaming'
  | 'podcast'
  | 'educational'
  | 'generic';

/**
 * The full parameter set the WebGL shader chain consumes. All values are
 * normalized so that a neutral (no-op) pass is the `NEUTRAL_PARAMS` below.
 */
export interface EnhanceParams {
  /** Stops of exposure adjustment. 0 = unchanged. Applied as 2^exposure. */
  exposure: number;
  /** Contrast multiplier around mid-gray. 1 = unchanged. */
  contrast: number;
  /** Saturation multiplier. 1 = unchanged, 0 = grayscale. */
  saturation: number;
  /** Per-channel white-balance gains (gray-world, auto). [1,1,1] = unchanged. */
  wbGain: [number, number, number];
  /** User-facing warm/cool slider, -1..1. 0 = neutral, + = warmer. */
  temperature: number;
  /** Spatial denoise strength 0..1 (mix toward a 3x3 box blur). */
  denoise: number;
  /** Global unsharp-mask amount 0..2. 0 = no sharpen. */
  sharpen: number;
  /** Optional face region (normalized 0..1) for local enhancement. */
  face?: FaceRegion | null;
  /** Extra sharpen applied inside the face region. */
  faceSharpen: number;
  /** Skin smoothing inside the face region 0..1 (edge-preserving mix). */
  skinSmooth: number;
  /** Virtual studio lighting 0..1 — shadow fill + soft 45° key + separation vignette. */
  relight: number;
}

export interface FaceRegion {
  /** Center, normalized 0..1 in video space. */
  cx: number;
  cy: number;
  /** Radii, normalized 0..1. */
  rx: number;
  ry: number;
}

/** A no-op parameter set: passing this leaves the frame visually unchanged. */
export const NEUTRAL_PARAMS: EnhanceParams = {
  exposure: 0,
  contrast: 1,
  saturation: 1,
  wbGain: [1, 1, 1],
  temperature: 0,
  denoise: 0,
  sharpen: 0,
  face: null,
  faceSharpen: 0,
  skinSmooth: 0,
  relight: 0,
};

/** No-reference quality score breakdown, each sub-score 0..100. */
export interface QualityBreakdown {
  sharpness: number;
  exposure: number;
  contrast: number;
  color: number;
  /** Optional audio sub-score when an analyser is available. */
  audio?: number;
}

export interface QualityResult {
  /** Weighted overall score 0..100. */
  score: number;
  breakdown: QualityBreakdown;
}
