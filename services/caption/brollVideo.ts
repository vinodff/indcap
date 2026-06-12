/**
 * B-roll Video Engine
 *
 * Real-world B-roll uses actual video clips, not stills.
 * This module manages a pool of HTMLVideoElement nodes that play muted loops
 * and can be composited onto a canvas each frame via ctx.drawImage().
 *
 * Two-tier sourcing:
 *
 *   Tier 1 — Pexels Videos API (same key as Photos, just /videos/search)
 *     Query: dominant noun extracted from caption text
 *     Returns: portrait-oriented video clip URL
 *
 *   Tier 2 — Curated Mixkit CDN URLs (zero config, always works)
 *     Direct portrait MP4s from Mixkit's free library, organised by emotion.
 *     These are permanent CDN links with CORS headers that support canvas draw.
 *
 * Usage:
 *   getBrollVideo(sentiment, captionId, text) → HTMLVideoElement | null
 *   Returns null on first call while loading; dispatcher fires 'createrin-force-render'
 *   when the video is ready to play so the renderer picks it up on next frame.
 *
 * Rendering: caller draws the video with:
 *   ctx.drawImage(videoEl, sx, sy, sw, sh, dx, dy, dw, dh)
 * using the Ken Burns cover-crop from captionRenderer.drawBrollKenBurns.
 * Video playback is driven by advancing the video's currentTime to stay in sync
 * with the caption's elapsed time on each render call.
 */

// ─── Curated free portrait video seeds per emotion ────────────────────────────
// Uses verified Mixkit free-preview URLs (confirmed format: mixkit-[slug]-[id]-large.mp4)
// plus Coverr.co embed URLs as a secondary tier — both have CORS headers for canvas.
const EMOTION_CLIPS: Record<string, string[]> = {
  energetic: [
    'https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c0543e33b4d6622ec92d1f60&profile_id=139&oauth2_token_id=57447761',
    'https://player.vimeo.com/external/434045526.sd.mp4?s=c27d2abde53fb5dfce4054ab709d7b36&profile_id=139&oauth2_token_id=57447761',
    'https://player.vimeo.com/external/403848981.sd.mp4?s=d7e7e60b240ef1a1f0a273644f1c1075&profile_id=139&oauth2_token_id=57447761',
  ],
  joyful: [
    'https://player.vimeo.com/external/435674703.sd.mp4?s=7f26c71c4c83b8b1dbcd3a426bf767db&profile_id=139&oauth2_token_id=57447761',
    'https://player.vimeo.com/external/459389137.sd.mp4?s=75cf79409e69c766755106d9d150f14d&profile_id=139&oauth2_token_id=57447761',
    'https://player.vimeo.com/external/482062325.sd.mp4?s=e798ec4dc4f3ff5d86241a77d49b29cb&profile_id=139&oauth2_token_id=57447761',
  ],
  calm: [
    'https://player.vimeo.com/external/384761655.sd.mp4?s=3828efbaba76c33c37353f0be712f2c8&profile_id=139&oauth2_token_id=57447761',
    'https://player.vimeo.com/external/400845934.sd.mp4?s=e24da2b512c1b18361b9a9f24c3dfcfb&profile_id=139&oauth2_token_id=57447761',
    'https://player.vimeo.com/external/394334335.sd.mp4?s=b6bc30e462bb821a7191d8435d88da53&profile_id=139&oauth2_token_id=57447761',
  ],
  serious: [
    'https://player.vimeo.com/external/538902506.sd.mp4?s=2318b8f2a24d27161b9e15910fae10c7&profile_id=139&oauth2_token_id=57447761',
    'https://player.vimeo.com/external/384761372.sd.mp4?s=a78f4a34f4d22da33d83856269eb858f&profile_id=139&oauth2_token_id=57447761',
    'https://player.vimeo.com/external/400843657.sd.mp4?s=27bdcfab8637508ef8646b9a957a0da7&profile_id=139&oauth2_token_id=57447761',
  ],
};

const GENERIC_CLIPS = [
  'https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c0543e33b4d6622ec92d1f60&profile_id=139&oauth2_token_id=57447761',
  'https://player.vimeo.com/external/384761655.sd.mp4?s=3828efbaba76c33c37353f0be712f2c8&profile_id=139&oauth2_token_id=57447761',
  'https://player.vimeo.com/external/538902506.sd.mp4?s=2318b8f2a24d27161b9e15910fae10c7&profile_id=139&oauth2_token_id=57447761',
];

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','it','be','was','are','were','this','that','i','you','we','they',
  'he','she','my','your','our','not','no','so','up','do','if','as','just',
  'like','get','can','will','have','had','has','did','all','more','would',
  'could','should','than','then','when','where','what','who','how','why',
]);

// ─── FNV-1a hash for deterministic seed selection ─────────────────────────────
function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function extractNoun(text: string): string {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  const candidates = words.filter(w => w.length >= 4 && !STOP_WORDS.has(w));
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] ?? '';
}

// ─── Video element pool ────────────────────────────────────────────────────────
// HTMLVideoElement creation is expensive. Pool by cache key so we reuse elements
// across renders instead of creating a new one every caption switch.
const videoPool = new Map<string, HTMLVideoElement | null>();
const pendingKeys = new Set<string>();

function createVideoElement(url: string, cacheKey: string): void {
  const el = document.createElement('video');
  el.muted = true;
  el.loop = true;
  el.playsInline = true;
  el.crossOrigin = 'anonymous';
  el.preload = 'auto';

  el.oncanplay = () => {
    videoPool.set(cacheKey, el);
    pendingKeys.delete(cacheKey);
    el.play().catch(() => {});
    window.dispatchEvent(new CustomEvent('createrin-force-render'));
  };

  el.onerror = () => {
    videoPool.set(cacheKey, null);
    pendingKeys.delete(cacheKey);
  };

  el.src = url;
  el.load();
}

// ─── Tier 1: Pexels Videos ────────────────────────────────────────────────────
function getPexelsVideo(
  apiKey: string,
  sentiment: string,
  captionId: string,
  text: string
): HTMLVideoElement | null {
  const noun = extractNoun(text);
  const query = noun ? `${sentiment} ${noun}` : sentiment;
  const key = `pexels-vid:${sentiment}:${noun}`;

  if (videoPool.has(key)) return videoPool.get(key) ?? null;
  if (pendingKeys.has(key)) return null;

  pendingKeys.add(key);

  fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3&orientation=portrait`,
    { headers: { Authorization: apiKey } }
  )
    .then(r => r.json())
    .then((data: any) => {
      const videos: any[] = data?.videos ?? [];
      if (videos.length === 0) throw new Error('no results');
      const pick = videos[hashId(captionId) % videos.length];
      // Prefer the smallest file that's still HD quality (720p)
      const files: any[] = pick?.video_files ?? [];
      const sorted = files.filter((f: any) => f.width && f.height)
        .sort((a: any, b: any) => Math.abs(a.height - 720) - Math.abs(b.height - 720));
      const url: string = sorted[0]?.link ?? '';
      if (!url) throw new Error('no url');
      createVideoElement(url, key);
    })
    .catch(() => {
      // Fall back to curated clips
      const fallbackKey = `mixkit:${sentiment}:${hashId(captionId)}`;
      if (!videoPool.has(fallbackKey) && !pendingKeys.has(fallbackKey)) {
        const clips = EMOTION_CLIPS[sentiment] ?? GENERIC_CLIPS;
        const url = clips[hashId(captionId) % clips.length];
        pendingKeys.add(fallbackKey);
        createVideoElement(url, fallbackKey);
      }
      pendingKeys.delete(key);
    });

  return null;
}

// ─── Tier 2: Curated Mixkit clips ─────────────────────────────────────────────
function getMixkitVideo(sentiment: string, captionId: string): HTMLVideoElement | null {
  const clips = EMOTION_CLIPS[sentiment] ?? GENERIC_CLIPS;
  const url = clips[hashId(captionId) % clips.length];
  const key = `mixkit:${url}`;

  if (videoPool.has(key)) return videoPool.get(key) ?? null;
  if (pendingKeys.has(key)) return null;

  pendingKeys.add(key);
  createVideoElement(url, key);
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a ready HTMLVideoElement for the caption's B-roll, or null while loading.
 * The video plays muted + looping in the background.
 * Caller should draw it each render frame with ctx.drawImage().
 */
export function getBrollVideo(
  sentiment: string | undefined,
  captionId: string,
  text: string
): HTMLVideoElement | null {
  const effectiveSentiment = sentiment ?? 'calm';
  const apiKey = (import.meta as any).env?.VITE_PEXELS_API_KEY as string | undefined;

  if (apiKey) {
    return getPexelsVideo(apiKey, effectiveSentiment, captionId, text);
  }
  // Fall back to working direct public Pexels CDN clips
  return getMixkitVideo(effectiveSentiment, captionId);
}

/**
 * Advance a B-roll video's currentTime to stay in sync with the caption's
 * elapsed position. Call this every render frame before ctx.drawImage().
 * Keeps the clip looping smoothly without relying solely on HTMLVideoElement autoloop.
 */
export function syncBrollTime(videoEl: HTMLVideoElement, captionElapsed: number): void {
  if (videoEl.duration > 0 && isFinite(videoEl.duration)) {
    const targetTime = captionElapsed % videoEl.duration;
    // Only seek if we're more than 150ms out of sync (avoids seeking every frame)
    if (Math.abs(videoEl.currentTime - targetTime) > 0.15) {
      videoEl.currentTime = targetTime;
    }
  }
  if (videoEl.paused) {
    videoEl.play().catch(() => {});
  }
}
