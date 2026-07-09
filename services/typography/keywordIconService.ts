/**
 * Keyword Icon Service — dynamic, internet-fetched icons per word.
 *
 * At generation time we look up each important word on the Iconify API
 * (200k+ open-source icons, CORS `*`, no auth) and rasterize the best match
 * to an offscreen canvas. At render time lookups are synchronous and
 * deterministic — the same frame always draws the same pixels, which keeps
 * preview and exported video identical.
 *
 *   search:  https://api.iconify.design/search?query={word}&prefixes=...
 *   svg:     https://api.iconify.design/{prefix}/{name}.svg
 *
 * Graceful degradation: no network / no match → getIcon() returns null and
 * the renderer falls back to the emotion-keyed animated icon it already has.
 */

import type { AnimationSequence } from './types';

// Full-color emoji sets first (glossy, read instantly at reel scale), then
// bold monotone sets (recolorable via currentColor) as coverage fallback.
const ICON_PREFIXES = 'fluent-emoji,noto,twemoji,solar,ph';
const COLORFUL_PREFIX_RE = /^(fluent-emoji|noto|twemoji):/;
const SEARCH_URL = (kw: string) =>
  `https://api.iconify.design/search?query=${encodeURIComponent(kw)}&limit=10&prefixes=${ICON_PREFIXES}`;
const SVG_URL = (icon: string) => {
  const [prefix, name] = icon.split(':');
  return `https://api.iconify.design/${prefix}/${name}.svg`;
};

const RASTER_SIZE = 256;      // px — crisp at every hero size we draw
const FETCH_TIMEOUT_MS = 4000;
const MAX_KEYWORDS = 24;      // one reel is ≤60s of speech — plenty
const CONCURRENCY = 4;

// Words that would fetch meaningless icons ("the", "very"…)
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'than', 'that', 'this',
  'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'can', 'could',
  'should', 'shall', 'may', 'might', 'must', 'not', 'no', 'yes', 'so', 'very',
  'just', 'only', 'too', 'also', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
  'from', 'by', 'as', 'it', 'its', 'you', 'your', 'we', 'our', 'they', 'them',
  'he', 'she', 'his', 'her', 'my', 'me', 'i', 'us', 'what', 'when', 'how',
  'why', 'who', 'all', 'any', 'more', 'most', 'some', 'now', 'get', 'got',
]);

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;

/** Normalizes a display word to a lookup keyword, or null if not icon-worthy. */
export function iconKeyword(text: string): string | null {
  const kw = text
    .replace(EMOJI_RE, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase();
  if (kw.length < 3 || STOPWORDS.has(kw)) return null;
  return kw;
}

class KeywordIconService {
  /** keyword → rasterized icon, or null when lookup found nothing (don't retry). */
  private cache = new Map<string, HTMLCanvasElement | null>();
  private inFlight = new Set<string>();

  /** Sync, render-loop safe. null → caller uses its existing fallback icon. */
  getIcon(text: string): HTMLCanvasElement | null {
    const kw = iconKeyword(text);
    if (!kw) return null;
    return this.cache.get(kw) ?? null;
  }

  /**
   * Fetch icons for every icon-worthy hero/secondary word in the sequence.
   * Resolves when done (or when individual fetches time out) — callers may
   * await it with their own soft deadline; late arrivals still land in cache.
   */
  async prefetch(sequence: AnimationSequence, color: string): Promise<void> {
    const keywords: string[] = [];
    for (const anim of sequence.animations) {
      const important = (anim.style.fontWeight || 0) >= 800 || (anim.intensity || 0) >= 2;
      if (!important) continue;
      const kw = iconKeyword(anim.text);
      if (kw && !this.cache.has(kw) && !this.inFlight.has(kw) && !keywords.includes(kw)) {
        keywords.push(kw);
        if (keywords.length >= MAX_KEYWORDS) break;
      }
    }

    // ponytail: simple worker-pool; a fancier queue buys nothing at n≤24
    const queue = [...keywords];
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      for (let kw = queue.shift(); kw; kw = queue.shift()) {
        await this.fetchOne(kw, color);
      }
    });
    await Promise.all(workers);
  }

  private async fetchOne(kw: string, color: string): Promise<void> {
    this.inFlight.add(kw);
    try {
      const found = await this.timedJson(SEARCH_URL(kw));
      const icons: string[] = found?.icons || [];
      if (!icons.length) {
        this.cache.set(kw, null);
        return;
      }
      // Prefer full-color emoji art; else bold/filled monotone — outline
      // icons vanish against video noise.
      const best =
        icons.find((i) => COLORFUL_PREFIX_RE.test(i)) ||
        icons.find((i) => /-bold(?!-duotone)|-fill$/.test(i)) ||
        icons.find((i) => !/outline|linear|thin|light|broken|duotone/.test(i)) ||
        icons[0];

      const svgRes = await this.timedFetch(SVG_URL(best));
      if (!svgRes?.ok) {
        this.cache.set(kw, null);
        return;
      }
      // Iconify monotone SVGs paint with currentColor — inject the theme color
      const svgText = (await svgRes.text()).replace(/currentColor/g, color);
      const canvas = await rasterizeSvg(svgText, RASTER_SIZE);
      this.cache.set(kw, canvas);
    } catch {
      this.cache.set(kw, null); // network down → permanent fallback, no spam
    } finally {
      this.inFlight.delete(kw);
    }
  }

  private async timedFetch(url: string): Promise<Response | null> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    try {
      return await fetch(url, { signal: ctrl.signal });
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }

  private async timedJson(url: string): Promise<any> {
    const res = await this.timedFetch(url);
    if (!res?.ok) return null;
    return res.json();
  }
}

async function rasterizeSvg(svgText: string, size: number): Promise<HTMLCanvasElement | null> {
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, size, size);
    return canvas;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const keywordIconService = new KeywordIconService();
