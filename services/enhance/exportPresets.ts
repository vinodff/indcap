// Per-platform export presets. One tap sets aspect ratio, resolution, bitrate
// and fps tuned for each social platform's encoder + safe zones.
import { AspectRatio, ExportOptions } from '../../types';

export type SocialTarget = 'youtube' | 'youtube_shorts' | 'instagram' | 'tiktok' | 'facebook';

export interface PlatformPreset {
  id: SocialTarget;
  label: string;
  aspectRatio: AspectRatio;
  /** Partial: spread-merged over the user's chosen ExportOptions at export time. */
  export: Partial<ExportOptions>;
  /** Caption-safe inset from each edge, as a fraction of height/width, so text
   *  clears the platform's overlaid UI (like/share rails, captions bar). */
  safeZone: { top: number; bottom: number; sides: number };
  note: string;
}

export const PLATFORM_PRESETS: Record<SocialTarget, PlatformPreset> = {
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    aspectRatio: '16:9',
    export: { resolution: '1080p', fps: 30, bitrate: 'HIGH', format: 'mp4' },
    safeZone: { top: 0.05, bottom: 0.08, sides: 0.05 },
    note: '16:9 1080p H.264, high bitrate',
  },
  youtube_shorts: {
    id: 'youtube_shorts',
    label: 'YT Shorts',
    aspectRatio: '9:16',
    export: { resolution: '1080p', fps: 30, bitrate: 'HIGH', format: 'mp4' },
    safeZone: { top: 0.08, bottom: 0.18, sides: 0.06 },
    note: '9:16 vertical, leaves room for the Shorts UI',
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    aspectRatio: '9:16',
    export: { resolution: '1080p', fps: 30, bitrate: 'HIGH', format: 'mp4' },
    safeZone: { top: 0.12, bottom: 0.2, sides: 0.06 },
    note: '9:16 Reels, clears the caption + action rail',
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok',
    aspectRatio: '9:16',
    export: { resolution: '1080p', fps: 30, bitrate: 'HIGH', format: 'mp4' },
    safeZone: { top: 0.1, bottom: 0.22, sides: 0.08 },
    note: '9:16, generous bottom safe zone for TikTok UI',
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    aspectRatio: '4:5',
    export: { resolution: '1080p', fps: 30, bitrate: 'MEDIUM', format: 'mp4' },
    safeZone: { top: 0.06, bottom: 0.1, sides: 0.05 },
    note: '4:5 feed video, balanced bitrate',
  },
};

export const PLATFORM_LIST = Object.values(PLATFORM_PRESETS);
