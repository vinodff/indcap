/**
 * AnimatedIconService
 *
 * Two-tier animated icon system for typography reels:
 *
 * Tier 1 — CANVAS PROCEDURAL (guaranteed, zero network): Each emotion has a
 *   hand-drawn canvas animation that runs at up to 60fps using pure Math.
 *   These render on frame 1 with no loading time. This is the primary path.
 *
 * Tier 2 — LOTTIE ENHANCEMENT (progressive, network): If a Lottie JSON loads
 *   successfully from the CDN, it replaces the procedural icon with a richer
 *   animation. If the CDN is unreachable, the procedural icon keeps running
 *   silently — no errors visible to the user.
 *
 * Both paths are deterministic: all animation state is derived from
 * playbackTimeSec so the same timestamp always renders the same pixels,
 * enabling frame-accurate reproducible video export.
 *
 * Usage:
 *   const canvas = animatedIconService.getFrame(emotion, playbackTimeSec);
 *   if (canvas) ctx.drawImage(canvas, x, y, size, size);
 */

import lottie, { AnimationItem } from 'lottie-web';
import type { SegmentEmotion } from './types';
import { EMOTION_DRAW, drawSparkle } from './iconDrawings';

// ─── Lottie CDN URLs (progressive enhancement — graceful degradation on fail) ─
// These replace the procedural icon if they load. If unreachable, the canvas
// animation keeps running silently.
//
// Source: Google Noto animated emoji (fonts.gstatic.com) — stable, CORS-enabled,
// one real animated emoji per emotion. The previous lottiefiles.com asset URLs
// returned HTTP 403 and never loaded, which is why this tier always fell back to
// the abstract procedural shapes. URL scheme: /latest/{codepoint}/lottie.json.
const NOTO = (cp: string) =>
  `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/lottie.json`;
const LOTTIE_CDN_URLS: Partial<Record<SegmentEmotion, string>> = {
  anger:       NOTO('1f621'), // 😡 pouting face
  inspiration: NOTO('1f680'), // 🚀 rocket
  joy:         NOTO('1f602'), // 😂 tears of joy
  awe:         NOTO('1f929'), // 🤩 star-struck
  authority:   NOTO('1f451'), // 👑 crown
  shock:       NOTO('1f631'), // 😱 screaming
  humor:       NOTO('1f60e'), // 😎 smiling with sunglasses
  sadness:     NOTO('1f62d'), // 😭 loudly crying
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProceduralEntry {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

interface LottieEntry {
  anim: AnimationItem;
  canvas: HTMLCanvasElement;
  container: HTMLDivElement;
  totalFrames: number;
  loaded: boolean;
}

const CANVAS_SIZE = 200;

// ─── Service ─────────────────────────────────────────────────────────────────

class AnimatedIconService {
  // Procedural canvases — pre-allocated, one per emotion, always ready
  private procedural = new Map<SegmentEmotion, ProceduralEntry>();
  // Lottie canvases — loaded asynchronously, replace procedural when ready
  private lottie = new Map<SegmentEmotion, LottieEntry>();
  private lottieLoading = new Set<SegmentEmotion>();

  /**
   * Returns a canvas containing the animated icon for the given emotion at the
   * given playback time. Always returns a canvas immediately (procedural tier);
   * upgrades to Lottie in the background if a CDN URL is available.
   *
   * The returned canvas is driven by `playbackTimeSec` so the same timestamp
   * always produces the same pixels — required for reproducible video export.
   */
  getFrame(emotion: SegmentEmotion, playbackTimeSec: number): HTMLCanvasElement {
    // Try Lottie first (richer, only available after load)
    const lottieEntry = this.lottie.get(emotion);
    if (lottieEntry?.loaded) {
      const cycle = 2.0; // seconds per loop
      const t = (playbackTimeSec % cycle) / cycle;
      const frame = Math.floor(t * lottieEntry.totalFrames);
      try { lottieEntry.anim.goToAndStop(frame, true); } catch { /* not ready */ }
      return lottieEntry.canvas;
    }

    // Kick off Lottie load in the background (non-blocking)
    if (!this.lottieLoading.has(emotion) && LOTTIE_CDN_URLS[emotion]) {
      this.loadLottie(emotion);
    }

    // Return procedural icon immediately (always works)
    return this.getProceduralFrame(emotion, playbackTimeSec);
  }

  private getProceduralFrame(emotion: SegmentEmotion, playbackTimeSec: number): HTMLCanvasElement {
    let entry = this.procedural.get(emotion);
    if (!entry) {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create procedural icon canvas');
      entry = { canvas, ctx };
      this.procedural.set(emotion, entry);
    }
    const cycle = 1.5; // seconds per loop (faster than Lottie to feel snappier)
    const t = (playbackTimeSec % cycle) / cycle;
    const draw = EMOTION_DRAW[emotion] ?? drawSparkle;
    draw(entry.ctx, t);
    return entry.canvas;
  }

  private loadLottie(emotion: SegmentEmotion): void {
    const url = LOTTIE_CDN_URLS[emotion];
    if (!url) return;
    this.lottieLoading.add(emotion);

    const container = document.createElement('div');
    container.style.cssText =
      `position:fixed;left:-9999px;top:-9999px;width:${CANVAS_SIZE}px;` +
      `height:${CANVAS_SIZE}px;pointer-events:none;opacity:0;`;
    document.body.appendChild(container);

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    container.appendChild(canvas);

    try {
      const anim = lottie.loadAnimation({
        container,
        renderer: 'canvas',
        loop: true,
        autoplay: false,
        path: url,
        rendererSettings: {
          // lottie-web's canvas renderer renders into rendererSettings.context;
          // it ignores a bare `canvas` key, so the read-back canvas would stay
          // blank. Pass the 2D context explicitly.
          context: canvas.getContext('2d'),
          preserveAspectRatio: 'xMidYMid meet',
          clearCanvas: true,
        } as any,
      });

      const entry: LottieEntry = { anim, canvas, container, totalFrames: 60, loaded: false };
      this.lottie.set(emotion, entry);

      anim.addEventListener('DOMLoaded', () => {
        entry.totalFrames = (anim as any).totalFrames || 60;
        entry.loaded = true;
      });

      anim.addEventListener('error' as any, () => {
        // CDN unavailable — stay on procedural, clean up silently
        this.lottie.delete(emotion);
        container.remove();
      });
    } catch {
      // lottie-web init error — stay on procedural
      this.lottieLoading.delete(emotion);
      container.remove();
    }
  }

  /** Release all resources. Call when the renderer is destroyed. */
  destroy(): void {
    this.lottie.forEach(({ anim, container }) => {
      anim.destroy();
      container.remove();
    });
    this.lottie.clear();
    this.lottieLoading.clear();
    this.procedural.clear();
  }
}

// Singleton shared across renderer instances
export const animatedIconService = new AnimatedIconService();
export type { AnimatedIconService };
