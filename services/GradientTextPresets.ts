/**
 * GradientTextPresets — Curated gradient color presets for trending caption styles.
 * Inspired by Instagram, TikTok, and CapCut trending aesthetics.
 */

export interface GradientPreset {
  id: string;
  name: string;
  colors: string[];
  preview: string; // CSS gradient for UI preview
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'sunset_vibes',
    name: 'Sunset Vibes',
    colors: ['#FF512F', '#F09819'],
    preview: 'linear-gradient(135deg, #FF512F, #F09819)',
  },
  {
    id: 'ocean_wave',
    name: 'Ocean Wave',
    colors: ['#2193b0', '#6dd5ed'],
    preview: 'linear-gradient(135deg, #2193b0, #6dd5ed)',
  },
  {
    id: 'neon_night',
    name: 'Neon Night',
    colors: ['#FF00FF', '#00FFFF'],
    preview: 'linear-gradient(135deg, #FF00FF, #00FFFF)',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    colors: ['#00d2ff', '#928DAB'],
    preview: 'linear-gradient(135deg, #00d2ff, #928DAB)',
  },
  {
    id: 'candy_pop',
    name: 'Candy Pop',
    colors: ['#ff758c', '#ff7eb3'],
    preview: 'linear-gradient(135deg, #ff758c, #ff7eb3)',
  },
  {
    id: 'fire_storm',
    name: 'Fire Storm',
    colors: ['#f12711', '#f5af19'],
    preview: 'linear-gradient(135deg, #f12711, #f5af19)',
  },
  {
    id: 'royal_purple',
    name: 'Royal Purple',
    colors: ['#8E2DE2', '#4A00E0'],
    preview: 'linear-gradient(135deg, #8E2DE2, #4A00E0)',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    colors: ['#11998e', '#38ef7d'],
    preview: 'linear-gradient(135deg, #11998e, #38ef7d)',
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    colors: ['#F2994A', '#F2C94C'],
    preview: 'linear-gradient(135deg, #F2994A, #F2C94C)',
  },
  {
    id: 'electric_blue',
    name: 'Electric Blue',
    colors: ['#4776E6', '#8E54E9'],
    preview: 'linear-gradient(135deg, #4776E6, #8E54E9)',
  },
  {
    id: 'cotton_candy',
    name: 'Cotton Candy',
    colors: ['#E8CBC0', '#636FA4'],
    preview: 'linear-gradient(135deg, #E8CBC0, #636FA4)',
  },
  {
    id: 'cherry_blossom',
    name: 'Cherry Blossom',
    colors: ['#FFC3A0', '#FFAFBD'],
    preview: 'linear-gradient(135deg, #FFC3A0, #FFAFBD)',
  },
];

/**
 * Social media export presets for one-click export configuration.
 */
export interface SocialExportPreset {
  id: string;
  name: string;
  icon: string;
  resolution: '720p' | '1080p' | '4K';
  fps: 24 | 30 | 60;
  bitrate: 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';
  format: 'webm' | 'mp4';
  aspectRatio: string;
}

export const SOCIAL_EXPORT_PRESETS: SocialExportPreset[] = [
  {
    id: 'instagram_reels',
    name: 'Instagram Reels',
    icon: '📸',
    resolution: '1080p',
    fps: 30,
    bitrate: 'HIGH',
    format: 'mp4',
    aspectRatio: '9:16',
  },
  {
    id: 'youtube_shorts',
    name: 'YouTube Shorts',
    icon: '▶️',
    resolution: '1080p',
    fps: 30,
    bitrate: 'HIGH',
    format: 'mp4',
    aspectRatio: '9:16',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    resolution: '1080p',
    fps: 30,
    bitrate: 'MEDIUM',
    format: 'mp4',
    aspectRatio: '9:16',
  },
  {
    id: 'youtube_video',
    name: 'YouTube Video',
    icon: '🎬',
    resolution: '1080p',
    fps: 30,
    bitrate: 'HIGH',
    format: 'mp4',
    aspectRatio: '16:9',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '👍',
    resolution: '1080p',
    fps: 30,
    bitrate: 'MEDIUM',
    format: 'mp4',
    aspectRatio: '1:1',
  },
];
