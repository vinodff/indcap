// Director Agent — composes the camera track from shots, moments, and the
// optional face trajectory. This is the "human-like editing style" layer, now
// driven by a CameraStyleProfile so the same pipeline can feel subtle, punchy
// (MrBeast-style), cinematic, or handheld:
//   - establish (zoom-out) at each shot start, focus on the subject
//   - slow push-in across the shot (retention drift)
//   - crash-zoom OR soft punch-in on each important moment, then ease back
//   - dutch tilt + impact shake on the hottest moments (energy)
//   - whip-pan into new shots (punchy styles)
//   - "breathing room": calm, level, shake-free holds between bursts so the
//     next impact hits harder — the core 2026 retention lesson.
//
// Raw keyframes here may overlap in time; the Smoothing Agent resolves that.

import type { Shot } from './sceneAgent';
import type { CameraMoment } from './momentAgent';
import type { CameraKeyframe, FaceSample, AutoCameraOptions, CameraStyleProfile } from './types';
import { camId, DEFAULT_FOCUS_X, DEFAULT_FOCUS_Y, CAMERA_STYLES } from './types';

const RELEASE = 0.7;          // seconds to ease out of a punch
const BREATHING_GAP = 2.6;    // s of calm before a moment counts as "breathing room"

export function directorAgent(
  shots: Shot[],
  moments: CameraMoment[],
  faces: FaceSample[] | undefined,
  options: AutoCameraOptions,
  duration: number,
): CameraKeyframe[] {
  const intensity = options.intensity ?? 1;
  const maxZoom = options.maxZoom ?? 1.45;
  const track = options.trackFaces !== false;
  const style: CameraStyleProfile = CAMERA_STYLES[options.style ?? 'dynamic'];
  const shakeMul = options.shake ?? 1;

  // Smoothed face focus lookup (nearest sample, with a light average).
  const focusAt = (t: number): { x: number; y: number } => {
    if (!track || !faces || !faces.length) return { x: DEFAULT_FOCUS_X, y: DEFAULT_FOCUS_Y };
    let sx = 0, sy = 0, n = 0;
    for (const f of faces) {
      if (Math.abs(f.time - t) <= 1.0) { sx += f.x; sy += f.y; n++; }
    }
    if (n === 0) {
      let best = faces[0], bd = Infinity;
      for (const f of faces) { const d = Math.abs(f.time - t); if (d < bd) { bd = d; best = f; } }
      return { x: best.x, y: Math.min(0.55, best.y) };
    }
    return { x: sx / n, y: Math.min(0.55, sy / n) };
  };

  const kfs: CameraKeyframe[] = [];
  const z = (target: number) => 1 + (target - 1) * intensity;       // scale zoom delta by intensity
  const sh = (amt: number) => Math.max(0, Math.min(1, amt * shakeMul)); // user shake multiplier
  const baseShake = sh(style.baseShake);

  // ── Shots: establish + slow drift, plus a whip-pan into later shots ──
  shots.forEach((shot, si) => {
    const f0 = focusAt(shot.start);

    // Whip-pan: a fast lateral swing that snaps level on the cut. Reads as a
    // "swish" without true motion blur. Only for styles that opt in, never the first shot.
    if (style.whip && si > 0 && shot.end - shot.start > 1.2) {
      const dir = si % 2 === 0 ? 1 : -1;
      // Lead must exceed the smoothing merge gap (0.22s) or the level snap is lost.
      kfs.push({ id: camId('whip-pan'), time: Math.max(0, shot.start - 0.3),
        zoom: Math.min(maxZoom, z(style.driftZoom)),
        focusX: clamp01(f0.x + dir * 0.16), focusY: f0.y,
        rotation: dir * style.dutchDeg * 0.4, shake: baseShake,
        easing: 'easeIn', kind: 'whip-pan' });
    }

    kfs.push({ id: camId('establish'), time: shot.start,
      zoom: Math.min(maxZoom, z(style.baseZoom)),
      focusX: f0.x, focusY: f0.y, rotation: 0, shake: baseShake,
      easing: style.whip ? 'easeOutBack' : 'easeOut', kind: 'establish' });

    // Slow push-in toward the end of the shot (skip very short shots).
    if (shot.end - shot.start > 2.2) {
      const fe = focusAt(shot.end);
      kfs.push({ id: camId('zoom-in'), time: Math.max(shot.start + 1.5, shot.end - 0.3),
        zoom: Math.min(maxZoom, z(style.driftZoom)),
        focusX: fe.x, focusY: fe.y, rotation: 0, shake: baseShake,
        easing: 'ease', kind: 'zoom-in' });
    }
  });

  // ── Moments: crash-zoom / punch-in with dutch + impact shake, then release ──
  moments.forEach((m, mi) => {
    const f = focusAt(m.time);
    const prev = moments[mi - 1];
    const gapBefore = prev ? m.time - prev.time : Infinity;

    // Breathing room: if there was a long calm before this hit, pre-empt it with
    // a level, pulled-back, shake-free hold so the impact lands with contrast.
    if (style.breathing > 0.15 && gapBefore > BREATHING_GAP && m.time - 0.5 > 0) {
      const fb = focusAt(m.time - 0.5);
      kfs.push({ id: camId('hold'), time: m.time - 0.5,
        zoom: Math.min(maxZoom, z(1 + (style.baseZoom - 1) * (1 - style.breathing))),
        focusX: fb.x, focusY: fb.y, rotation: 0, shake: 0,
        easing: 'easeOut', kind: 'hold' });
    }

    const punchTarget = style.punchMin + (style.punchMax - style.punchMin) * m.strength;
    const punch = Math.min(maxZoom, z(punchTarget));
    const dutch = style.dutchDeg ? (mi % 2 === 0 ? 1 : -1) * style.dutchDeg * m.strength : 0;
    const impactShake = sh(style.baseShake + style.impactShake * m.strength);
    const isCrash = style.crash && m.strength > 0.45;

    kfs.push({
      id: camId(isCrash ? 'crash-zoom' : 'punch-in'),
      time: m.time, zoom: punch, focusX: f.x, focusY: f.y,
      rotation: dutch, shake: impactShake,
      easing: isCrash ? 'spring' : 'easeOutBack',
      kind: isCrash ? 'crash-zoom' : 'punch-in',
    });

    // Settle back: level out, decay shake, fall toward the drift zoom.
    const rel = focusAt(m.time + RELEASE);
    kfs.push({ id: camId('hold'), time: m.time + RELEASE,
      zoom: Math.min(maxZoom, z(style.driftZoom)),
      focusX: rel.x, focusY: rel.y, rotation: 0, shake: baseShake,
      easing: 'ease', kind: 'hold' });
  });

  // Always open neutral and close gently.
  kfs.push({ id: camId('establish'), time: 0, zoom: 1.0,
    focusX: DEFAULT_FOCUS_X, focusY: DEFAULT_FOCUS_Y, rotation: 0, shake: baseShake,
    easing: 'easeOut', kind: 'establish' });
  if (duration > 0) {
    const fe = focusAt(duration);
    kfs.push({ id: camId('zoom-out'), time: duration,
      zoom: Math.min(maxZoom, z(style.baseZoom)),
      focusX: fe.x, focusY: fe.y, rotation: 0, shake: 0,
      easing: 'ease', kind: 'zoom-out' });
  }

  return kfs;
}

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }
