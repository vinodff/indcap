/**
 * B-roll image cache.
 *
 * Two-tier system:
 *   Tier 1 (always works, zero config) — curated Picsum seeds per emotion category.
 *     Seeds are strings → Picsum maps them to a deterministic photo from their library.
 *     Different captions with the same emotion get different images (seeded by captionId hash).
 *
 *   Tier 2 (better relevance, requires VITE_PEXELS_API_KEY) — live Pexels portrait search
 *     using the dominant noun extracted from caption text. Falls back to Tier 1 on error.
 *
 * Async fetch-on-miss: first call returns null while loading.
 * Dispatches 'createrin-force-render' on image load so the renderer picks it up.
 */

// ─── Curated seeds per emotion ─────────────────────────────────────────────
// 6 seeds per emotion so consecutive same-emotion captions look different.
// Seeds are human-readable strings; Picsum gives a deterministic photo per string.
const EMOTION_SEEDS: Record<string, string[]> = {
  energetic: ['city-energy', 'sport-action', 'urban-motion', 'power-burst', 'dynamic-fast', 'crowd-energy'],
  joyful:    ['bright-colors', 'summer-joy', 'colorful-party', 'happy-light', 'sunshine-warm', 'festival-fun'],
  calm:      ['forest-calm', 'ocean-serene', 'mountain-peace', 'lake-reflect', 'nature-still', 'misty-morning'],
  serious:   ['dramatic-dark', 'cinematic-low', 'moody-contrast', 'intense-focus', 'deep-shadow', 'bold-statement'],
};

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from',
  'is','it','its','be','was','are','were','this','that','i','you','we','they','he',
  'she','my','your','our','not','no','so','up','do','if','as','just','like','get',
  'can','will','have','had','has','did','all','more','would','could','should','than',
  'then','when','where','what','who','how','why','now','here','there','one','two',
]);

// ─── Cache ─────────────────────────────────────────────────────────────────
const imageCache = new Map<string, HTMLImageElement | null>();
const pendingTags = new Set<string>();

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Deterministic hash so the same captionId always picks the same seed. */
function hashId(id: string): number {
  let h = 2166136261; // FNV-1a 32-bit offset basis
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/** Extract the most content-rich noun from caption text. */
function extractNoun(text: string): string {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  // Prefer longer words that are not stop words
  const candidates = words.filter(w => w.length >= 4 && !STOP_WORDS.has(w));
  // Sort by length descending (longer words tend to be more specific)
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] ?? '';
}

function loadImage(cacheKey: string, url: string): void {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    imageCache.set(cacheKey, img);
    window.dispatchEvent(new CustomEvent('createrin-force-render'));
  };
  img.onerror = () => {
    // On CORS/load error for Picsum, mark as permanently null so we don't retry
    imageCache.set(cacheKey, null);
  };
  img.src = url;
}

// ─── Tier 1: Picsum fallback ───────────────────────────────────────────────

function getFallbackImage(sentiment: string, captionId: string): HTMLImageElement | null {
  const seeds = EMOTION_SEEDS[sentiment] ?? EMOTION_SEEDS.calm;
  const idx = hashId(captionId) % seeds.length;
  const seed = seeds[idx];
  // Picsum: seed= gives deterministic image; 1080×1920 matches vertical video
  const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/1080/1920`;
  const key = `picsum:${seed}`;

  if (imageCache.has(key)) return imageCache.get(key) ?? null;
  if (pendingTags.has(key)) return null;

  pendingTags.add(key);
  imageCache.set(key, null);

  // Start loading; clear pending flag after attempt regardless of outcome
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    imageCache.set(key, img);
    pendingTags.delete(key);
    window.dispatchEvent(new CustomEvent('createrin-force-render'));
  };
  img.onerror = () => {
    imageCache.set(key, null);
    pendingTags.delete(key);
  };
  img.src = url;

  return null;
}

// ─── Tier 2: Pexels live search ────────────────────────────────────────────

function getPexelsImage(apiKey: string, sentiment: string, captionId: string, text: string): HTMLImageElement | null {
  const noun = extractNoun(text);
  const query = noun ? `${sentiment} ${noun}` : sentiment;
  const key = `pexels:${sentiment}:${noun}`;

  if (imageCache.has(key)) return imageCache.get(key) ?? null;
  if (pendingTags.has(key)) return null;

  pendingTags.add(key);
  imageCache.set(key, null);

  fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=portrait`,
    { headers: { Authorization: apiKey } }
  )
    .then(r => r.json())
    .then((data: any) => {
      const photos: any[] = data?.photos ?? [];
      if (photos.length === 0) throw new Error('no photos');
      // Pick one of the first 3 results, seeded by captionId for variety
      const pick = photos[hashId(captionId) % photos.length];
      const url: string = pick?.src?.large2x ?? pick?.src?.large ?? pick?.src?.medium ?? '';
      if (!url) throw new Error('no url');
      loadImage(key, url);
    })
    .catch(() => {
      // Pexels failed → fall back to Picsum immediately
      const fallback = getFallbackImage(sentiment, captionId);
      if (fallback) imageCache.set(key, fallback);
      pendingTags.delete(key);
    });

  return null;
}

function getGoogleSearchImage(sentiment: string, captionId: string, text: string): HTMLImageElement | null {
  const noun = extractNoun(text);
  const query = noun ? `${sentiment} ${noun}` : sentiment;
  const key = `google:${sentiment}:${noun}`;

  if (imageCache.has(key)) return imageCache.get(key) ?? null;
  if (pendingTags.has(key)) return null;

  pendingTags.add(key);
  imageCache.set(key, null);

  fetch(`/api/imageAssets/search?q=${encodeURIComponent(query)}`)
    .then(r => r.json())
    .then((data: any) => {
      if (!data.success || !data.items || data.items.length === 0) throw new Error('no photos');
      // Pick one of the results, seeded by captionId for variety
      const pick = data.items[hashId(captionId) % data.items.length];
      const url: string = pick.link;
      if (!url) throw new Error('no url');
      loadImage(key, url);
    })
    .catch(() => {
      // Google search proxy failed → fall back to Picsum
      const fallback = getFallbackImage(sentiment, captionId);
      if (fallback) imageCache.set(key, fallback);
      pendingTags.delete(key);
    });

  return null;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Returns a loaded HTMLImageElement for the current caption, or null if not yet loaded.
 * Always works without any API key (Tier 1).
 * Uses Pexels for better content-relevance when VITE_PEXELS_API_KEY is set.
 */
export function getBrollImage(
  sentiment: string | undefined,
  captionId: string,
  text: string
): HTMLImageElement | null {
  const effectiveSentiment = sentiment ?? 'calm';
  const apiKey = (import.meta as any).env?.VITE_PEXELS_API_KEY as string | undefined;

  if (apiKey) {
    return getPexelsImage(apiKey, effectiveSentiment, captionId, text);
  }
  return getGoogleSearchImage(effectiveSentiment, captionId, text);
}
