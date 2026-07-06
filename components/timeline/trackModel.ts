// Shared selection + track model for the CapCut-style Caption Studio editor.
//
// One selection primitive drives the whole editor: clicking any clip on the
// timeline sets a TimelineSelection, and the right-hand InspectorPanel renders
// that object's properties. This file owns the type and the per-kind cosmetics
// (name, accent color, icon key) so the timeline and the inspector stay in sync.

export type TimelineObjectKind = 'caption' | 'camera' | 'sfx' | 'broll' | 'sticker';

export interface TimelineSelection {
  kind: TimelineObjectKind;
  /** Object id. For 'broll' this is the owning caption's id (b-roll is per-caption). */
  id: string;
}

export interface TrackMeta {
  name: string;
  /** Hex accent used for the track label + selected-clip ring. */
  color: string;
}

// Muted, desaturated track accents — hue keeps track identity readable while
// staying quiet next to the single blue UI accent (pro-NLE convention).
export const TRACK_META: Record<TimelineObjectKind, TrackMeta> = {
  caption: { name: 'Captions', color: '#5b8def' },
  camera:  { name: 'Camera',   color: '#4fa3a5' },
  sfx:     { name: 'SFX',      color: '#5fa97f' },
  broll:   { name: 'B-Roll',   color: '#8b7ec8' },
  sticker: { name: 'Stickers', color: '#b57d9d' },
};

export function sameSelection(a: TimelineSelection | null, b: TimelineSelection | null): boolean {
  if (!a || !b) return a === b;
  return a.kind === b.kind && a.id === b.id;
}
