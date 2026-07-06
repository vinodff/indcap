// AI Auto-Camera — shared types for the cinematic keyframe pipeline.
//
// A CameraTrack is a time-ordered set of CameraKeyframes that zoom + pan the
// MAIN video frame (a virtual camera over the source). The renderer interpolates
// between them and draws a source sub-rectangle (Ken Burns style), so the camera
// is baked into both preview and export automatically.

import type { Caption } from '../../types';

// `easeOutBack` = overshoot-and-settle (the pro "snap" on punch-ins).
// `spring`       = stronger elastic overshoot for crash zooms.
export type CameraEasing = 'linear' | 'ease' | 'easeIn' | 'easeOut' | 'easeOutBack' | 'spring';
export type CameraMoveKind =
  | 'establish' | 'zoom-in' | 'zoom-out' | 'punch-in' | 'pan' | 'hold'
  | 'crash-zoom' | 'whip-pan' | 'dutch' | 'shake';

export interface CameraKeyframe {
  id: string;
  time: number;       // absolute video time (s)
  zoom: number;       // 1.0 = full frame; >1 = zoomed in
  focusX: number;     // 0..1 normalized focus center (of the source frame)
  focusY: number;     // 0..1
  /** Dutch / roll angle in degrees applied to the framing. 0 = level. */
  rotation?: number;
  /** Procedural handheld/impact shake amplitude 0..1 (decays toward the next kf). */
  shake?: number;
  easing: CameraEasing;// curve applied FROM this keyframe to the next
  kind: CameraMoveKind;// label for the timeline
}

/** Named director personalities the user can pick from the camera settings. */
export type CameraStyle = 'subtle' | 'dynamic' | 'punchy' | 'cinematic' | 'handheld';

export interface CameraStyleProfile {
  /** Base ever-present zoom presence. */
  baseZoom: number;
  /** Slow push-in target across a shot. */
  driftZoom: number;
  /** Min/max punch zoom range. */
  punchMin: number;
  punchMax: number;
  /** Use crash-zoom (fast overshoot) instead of a soft punch on strong moments. */
  crash: boolean;
  /** Add a whip-pan on shot changes. */
  whip: boolean;
  /** Baseline handheld shake (0..1) held across the whole track. */
  baseShake: number;
  /** Extra shake injected on impact moments (0..1). */
  impactShake: number;
  /** Dutch-tilt degrees applied on energetic moments (0 disables). */
  dutchDeg: number;
  /** 0..1 — how much to carve out calm "breathing room" between bursts. */
  breathing: number;
}

export const CAMERA_STYLES: Record<CameraStyle, CameraStyleProfile> = {
  // Gentle Ken-Burns presence — documentary / talking-head safe.
  subtle:    { baseZoom: 1.03, driftZoom: 1.08, punchMin: 1.12, punchMax: 1.26, crash: false, whip: false, baseShake: 0.0,  impactShake: 0.05, dutchDeg: 0,   breathing: 0.2 },
  // Balanced modern edit — the default.
  dynamic:   { baseZoom: 1.05, driftZoom: 1.12, punchMin: 1.18, punchMax: 1.42, crash: true,  whip: false, baseShake: 0.04, impactShake: 0.18, dutchDeg: 0.8, breathing: 0.35 },
  // MrBeast-style retention: crash zooms, impact shake, big contrast.
  punchy:    { baseZoom: 1.06, driftZoom: 1.14, punchMin: 1.24, punchMax: 1.58, crash: true,  whip: true,  baseShake: 0.06, impactShake: 0.30, dutchDeg: 1.6, breathing: 0.55 },
  // Slow, deliberate film look — long pushes, gentle dutch, no shake.
  cinematic: { baseZoom: 1.04, driftZoom: 1.16, punchMin: 1.14, punchMax: 1.34, crash: false, whip: false, baseShake: 0.0,  impactShake: 0.0,  dutchDeg: 1.2, breathing: 0.45 },
  // Vloggy GoPro energy — constant organic shake.
  handheld:  { baseZoom: 1.06, driftZoom: 1.12, punchMin: 1.18, punchMax: 1.40, crash: true,  whip: false, baseShake: 0.16, impactShake: 0.34, dutchDeg: 0.6, breathing: 0.25 },
};

export type CameraTrack = CameraKeyframe[];

/** One sampled face position (normalized center + size) at a point in time. */
export interface FaceSample {
  time: number;
  x: number;   // 0..1 center
  y: number;   // 0..1 center
  size: number;// 0..1 face height as a fraction of frame height
}

export interface AutoCameraInput {
  captions: Caption[];
  duration: number;
  beats?: number[];
  faces?: FaceSample[];   // optional smoothed face trajectory (subject tracking)
}

export interface AutoCameraOptions {
  /** 0..1 overall strength of the moves (zoom amount + frequency). */
  intensity?: number;
  /** Hard cap on zoom so we never reveal soft/pixelated over-zoom. */
  maxZoom?: number;
  /** Pan to follow the face trajectory when one is provided. */
  trackFaces?: boolean;
  /** Director personality preset (default 'dynamic'). */
  style?: CameraStyle;
  /** 0..1 user multiplier on all shake (handheld + impact). Default 1. */
  shake?: number;
}

let _cid = 0;
export function camId(kind: CameraMoveKind): string {
  return `cam_${kind}_${(_cid++).toString(36)}`;
}

// Default focus: horizontally centered, slightly above center for headroom.
export const DEFAULT_FOCUS_X = 0.5;
export const DEFAULT_FOCUS_Y = 0.44;
