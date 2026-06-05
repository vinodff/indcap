/**
 * AnimatedEmojiService
 *
 * Renders TRUE animated emojis — a laughing face that actually opens its mouth
 * and laughs, not a static glyph that merely zooms. Native OS emoji (drawn with
 * canvas `fillText`) are frozen bitmaps: the only motion you can give them is a
 * scale/bounce of the whole picture. To get real per-feature motion you need
 * actual animation data. This service uses Google's open-source **Noto animated
 * emoji** Lottie files.
 *
 * Three-tier delivery, all deterministic for frame-accurate video export:
 *
 *   Tier 1 — BUNDLED (instant, offline): the ~30 most common caption emojis are
 *     shipped as Lottie JSON in ./emojiData and bundled at build time via Vite's
 *     import.meta.glob. These render on frame 1 with zero network. Primary path.
 *
 *   Tier 2 — CDN (lazy, network): any emoji not bundled is fetched once from
 *     Google's gstatic CDN (CORS-enabled) and cached. Until it loads the caller
 *     falls back to the native glyph; once loaded it upgrades silently.
 *
 *   Tier 3 — NATIVE FALLBACK (caller's job): if neither tier has an animation
 *     (e.g. an emoji Noto doesn't animate), getFrame returns null and the caller
 *     draws the static OS glyph. Nothing ever breaks or shows an error.
 *
 * All animation state is derived from `playbackTimeSec` via goToAndStop(frame),
 * so the same timestamp always renders identical pixels — required for
 * reproducible export.
 *
 * Usage:
 *   const c = animatedEmojiService.getFrame('😂', playbackTimeSec);
 *   if (c) ctx.drawImage(c, x, y, size, size);   // animated
 *   else   ctx.fillText('😂', x, y);             // static fallback
 */

import lottie, { AnimationItem } from 'lottie-web';

// ─── Bundled Lottie data (Vite glob — bundled at build, zero runtime fetch) ────
// Each file is named by its runtime key (lowercase hex codepoints, FE0F stripped,
// joined by "_"), e.g. 1f602.json for 😂. _manifest.json is skipped.
const BUNDLED: Record<string, unknown> = {};
{
  const mods = import.meta.glob('./emojiData/*.json', { eager: true }) as Record<
    string,
    { default: unknown }
  >;
  for (const path in mods) {
    const key = path.split('/').pop()!.replace('.json', '');
    if (key.startsWith('_')) continue; // skip _manifest.json
    BUNDLED[key] = (mods[path] as any).default ?? mods[path];
  }
}

// ─── Substitutes — emojis Noto has no animation for → nearest animated cousin ──
// e.g. the money bag 💰 (1f4b0) is not in Noto's animated set; map it to the
// money-with-wings 💸 (1f4b8) which is. Keeps "money" words animated.
const SUBSTITUTE: Record<string, string> = {
  '1f4b0': '1f4b8', // 💰 money bag → 💸 money with wings
};

const CANVAS_SIZE = 256; // emoji art is square; downscaled by the renderer
const LOOP_SECONDS = 2.0; // wall-clock seconds per animation cycle

const CDN = (key: string) =>
  `https://fonts.gstatic.com/s/e/notoemoji/latest/${key}/lottie.json`;

// ─── Emoji → Noto key ─────────────────────────────────────────────────────────
/**
 * Converts an emoji string to its Noto codepoint key: lowercase hex of each
 * code point, the U+FE0F variation selector removed, joined by "_". This matches
 * both the bundled filenames and Noto's CDN path scheme. Returns '' for input
 * that has no usable code points.
 *
 * Note: `for...of` over a string iterates by full code point (handles surrogate
 * pairs / astral emoji correctly), so codePointAt(0) is always the whole glyph.
 */
function emojiKey(emoji: string): string {
  const cps: string[] = [];
  for (const ch of emoji) {
    const c = ch.codePointAt(0)!;
    if (c === 0xfe0f) continue; // drop variation selector
    if (c === 0x200d) continue; // drop ZWJ (Noto keys single-glyph emoji here)
    cps.push(c.toString(16));
  }
  return cps.join('_');
}

interface Entry {
  anim: AnimationItem | null;
  canvas: HTMLCanvasElement;
  container: HTMLDivElement;
  totalFrames: number;
  loaded: boolean;
  failed: boolean;
}

class AnimatedEmojiService {
  private entries = new Map<string, Entry>();

  /**
   * True if an animated frame can be produced for this emoji *right now*
   * (bundled, or a CDN load that has finished). Lets callers decide layout
   * without forcing a load.
   */
  has(emoji: string): boolean {
    const key = this.resolveKey(emoji);
    if (!key) return false;
    if (BUNDLED[key]) return true;
    return this.entries.get(key)?.loaded === true;
  }

  /**
   * Returns a canvas with the emoji's animated frame at the given playback time,
   * or null if no animation is available (caller should draw the native glyph).
   * Kicks off a one-time CDN load for non-bundled emojis in the background.
   */
  getFrame(emoji: string, playbackTimeSec: number): HTMLCanvasElement | null {
    const key = this.resolveKey(emoji);
    if (!key) return null;

    let entry: Entry | null | undefined = this.entries.get(key);
    if (!entry) entry = this.init(key);
    if (!entry || !entry.loaded || !entry.anim) return null;

    const t = ((playbackTimeSec % LOOP_SECONDS) + LOOP_SECONDS) % LOOP_SECONDS;
    const frame = Math.min(
      entry.totalFrames - 1,
      Math.floor((t / LOOP_SECONDS) * entry.totalFrames)
    );
    try {
      entry.anim.goToAndStop(frame, true);
    } catch {
      /* renderer not ready this tick — return last good canvas */
    }
    return entry.canvas;
  }

  private resolveKey(emoji: string): string {
    const raw = emojiKey(emoji);
    return SUBSTITUTE[raw] ?? raw;
  }

  private init(key: string): Entry | null {
    // Guard non-DOM environments (Node test/SSR) — lottie-web needs `document`.
    if (typeof document === 'undefined') return null;

    const container = document.createElement('div');
    container.style.cssText =
      `position:fixed;left:-9999px;top:-9999px;width:${CANVAS_SIZE}px;` +
      `height:${CANVAS_SIZE}px;pointer-events:none;opacity:0;`;
    document.body.appendChild(container);

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    container.appendChild(canvas);
    const context = canvas.getContext('2d');

    const entry: Entry = {
      anim: null,
      canvas,
      container,
      totalFrames: 60,
      loaded: false,
      failed: false,
    };
    this.entries.set(key, entry);

    const data = BUNDLED[key];
    try {
      const anim = lottie.loadAnimation({
        container,
        renderer: 'canvas',
        loop: true,
        autoplay: false,
        ...(data ? { animationData: data } : { path: CDN(key) }),
        rendererSettings: {
          context,
          clearCanvas: true,
          preserveAspectRatio: 'xMidYMid meet',
        } as any,
      });
      entry.anim = anim;

      if (data) {
        // Bundled data is parsed synchronously — frame count is available now.
        entry.totalFrames = (anim as any).totalFrames || 60;
        entry.loaded = true;
      } else {
        anim.addEventListener('DOMLoaded', () => {
          entry.totalFrames = (anim as any).totalFrames || 60;
          entry.loaded = true;
        });
        const onFail = () => {
          entry.failed = true;
          this.cleanup(key);
        };
        anim.addEventListener('data_failed' as any, onFail);
        anim.addEventListener('error' as any, onFail);
      }
    } catch {
      entry.failed = true;
      this.cleanup(key);
      return null;
    }
    return entry;
  }

  private cleanup(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    try {
      entry.anim?.destroy();
    } catch {
      /* ignore */
    }
    entry.container.remove();
    // Keep a tombstone so we don't retry a known-bad CDN key every frame.
    this.entries.set(key, { ...entry, anim: null, loaded: false, failed: true });
  }

  /** Release all resources. Call when the renderer is destroyed. */
  destroy(): void {
    this.entries.forEach(({ anim, container }) => {
      try {
        anim?.destroy();
      } catch {
        /* ignore */
      }
      container.remove();
    });
    this.entries.clear();
  }
}

// Singleton shared across renderer instances
export const animatedEmojiService = new AnimatedEmojiService();
export type { AnimatedEmojiService };
