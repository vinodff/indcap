// Per-scene enhancement presets. The Gemini SceneClassifier picks a SceneType,
// and these baselines are combined with the auto-levels measured from the actual
// pixels (computed in EnhancementEngine.analyze) to produce the final params.
import { EnhanceParams, NEUTRAL_PARAMS, SceneType } from './types';

/**
 * Baseline look per scene. These intentionally stay subtle — over-correction is
 * the #1 way auto-enhancement reads as "fake". The CPU auto-levels stage adds
 * the clip-specific exposure/white-balance correction on top.
 */
// Tuned for NATURAL, professional results — accurate color, clean contrast, no
// artificial warmth (warmth was yellow-casting skin). White balance is handled
// separately by the neutral-pixel auto-WB; presets keep temperature at 0.
export const SCENE_PRESETS: Record<SceneType, Partial<EnhanceParams>> = {
  // Indoor phone footage is dim and soft: lift a touch, gentle contrast/color.
  indoor: { exposure: 0.12, contrast: 1.10, saturation: 1.10, temperature: 0, denoise: 0.22, sharpen: 0.6, faceSharpen: 0.45, skinSmooth: 0.3, relight: 0.4 },
  // Outdoor: usually bright but flat/hazy; add clarity, keep color honest.
  outdoor: { exposure: 0.0, contrast: 1.12, saturation: 1.12, temperature: 0, denoise: 0.1, sharpen: 0.65, relight: 0.2 },
  // Night: dark and noisy — lift exposure, denoise harder, sharpen less.
  night: { exposure: 0.45, contrast: 1.08, saturation: 1.06, temperature: 0, denoise: 0.5, sharpen: 0.4, faceSharpen: 0.4, skinSmooth: 0.4, relight: 0.45 },
  // Gaming/screen content: crisp edges, slightly punchier color, no skin work.
  gaming: { exposure: 0.05, contrast: 1.16, saturation: 1.18, temperature: 0, denoise: 0.05, sharpen: 0.85, relight: 0 },
  // Podcast/talking-head: natural skin, clean contrast, gentle smoothing + studio light.
  podcast: { exposure: 0.06, contrast: 1.10, saturation: 1.08, temperature: 0, denoise: 0.25, sharpen: 0.6, faceSharpen: 0.5, skinSmooth: 0.4, relight: 0.45 },
  // Educational/whiteboard/slides: clarity over color.
  educational: { exposure: 0.1, contrast: 1.14, saturation: 1.05, temperature: 0, denoise: 0.18, sharpen: 0.75, relight: 0.15 },
  // Safe default when classification fails or is skipped.
  generic: { exposure: 0.08, contrast: 1.11, saturation: 1.10, temperature: 0, denoise: 0.18, sharpen: 0.65, faceSharpen: 0.4, skinSmooth: 0.3, relight: 0.35 },
};

/** Merge a scene preset onto the neutral baseline into a complete param set. */
export function presetFor(scene: SceneType): EnhanceParams {
  return { ...NEUTRAL_PARAMS, ...SCENE_PRESETS[scene] };
}
