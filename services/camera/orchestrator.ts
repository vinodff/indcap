// Auto-Camera Orchestrator — dispatches the camera agents and returns a clean,
// editable CameraTrack. Single entry point the app calls.

import type { AutoCameraInput, AutoCameraOptions, CameraTrack } from './types';
import { sceneAgent } from './sceneAgent';
import { momentAgent } from './momentAgent';
import { directorAgent } from './directorAgent';
import { smoothingAgent } from './smoothingAgent';

export function runAutoCamera(input: AutoCameraInput, options: AutoCameraOptions = {}): CameraTrack {
  const opts: AutoCameraOptions = {
    intensity: options.intensity ?? 1,
    maxZoom: options.maxZoom ?? 1.45,
    trackFaces: options.trackFaces ?? true,
    style: options.style ?? 'dynamic',
    shake: options.shake ?? 1,
  };
  if ((!input.captions || input.captions.length === 0) && (!input.faces || input.faces.length === 0)) {
    return [];
  }

  let track: CameraTrack = [];
  try {
    const shots = sceneAgent(input.captions, input.duration);
    const moments = momentAgent(input.captions, input.beats);
    const raw = directorAgent(shots, moments, input.faces, opts, input.duration);
    track = smoothingAgent(raw, opts);
  } catch (e) {
    console.warn('[autoCamera] generation failed:', e);
    return [];
  }

  try {
    const byKind: Record<string, number> = {};
    for (const k of track) byKind[k.kind] = (byKind[k.kind] ?? 0) + 1;
    // eslint-disable-next-line no-console
    console.groupCollapsed(`[autoCamera] ${track.length} keyframes`);
    console.log('by move:', byKind, '| faces:', input.faces?.length ?? 0);
    console.groupEnd();
  } catch { /* best-effort */ }

  return track;
}

export type { AutoCameraInput, AutoCameraOptions, CameraTrack, CameraKeyframe, CameraStyle } from './types';
