/**
 * CaptionRenderer — Standalone canvas-based caption rendering engine.
 * 
 * Extracted from App.tsx to isolate all drawing logic. Handles:
 * - Binary search for active caption at current time
 * - Style-specific rendering (generic, TRENDING, NEON_IMPACT, VIRAL_CREATOR, INSTAGRAM_TEMPLATE)
 * - Gradient text rendering (was unimplemented before)
 * - Active word highlighting with animations
 * - Background boxes, strokes, shadows, rotation
 * - activeBackgroundColor / opacityInactive support (was unimplemented)
 * - shadowOffsetX support (was missing)
 * - Zoom/motion effects
 */

import { Caption, CaptionStyle, StyleConfig, EntryAnimation, ExitAnimation, WordHighlightMode, StickerItem, KineticMode, TypographyLayer, AspectRatio, RendererState, RendererCallbacks } from '../types';
import { RenderHelpers } from './caption/types';
import { drawGeneric } from './caption/renderers/generic';
import { drawTrending } from './caption/renderers/trending';
import { drawInstagramTemplate } from './caption/renderers/instagram';
import { drawTypographyCaption } from './caption/renderers/typography';
import { drawTypograph } from './caption/renderers/editorial';
import { EMOJI_REGEX, isEmojiWord, emojiToNotoUrl, fetchAndCacheEmojiGif } from './caption/emojiUtils';
import { getActiveWordEmphasis } from './caption/zoomEffect';
import { drawEmotionBackground } from './caption/backgroundEffect';
import { evaluateKeyframe, applyCaptionKeyframe } from './caption/keyframeEngine';
import { getBrollImage } from './caption/brollCache';
import { getBrollVideo, syncBrollTime } from './caption/brollVideo';

// --- MATH UTILS ---
const lerp = (start: number, end: number, t: number): number => start * (1 - t) + end * t;

// Back easing for bounce-in pop animations
const backEaseOut = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// Elastic easing for spring effects
const elasticOut = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

// Ease Out Quint for smooth rapid entry
const easeOutQuint = (t: number): number => {
  return 1 - Math.pow(1 - t, 5);
};

export class CaptionRenderer implements RenderHelpers {
  private currentZoom = 1.0;
  private lastCaptionId: string | null = null;
  private lastWordKey = '';
  private cachedFont: string = '';
  private imageCache = new Map<string, HTMLImageElement>();
  private static readonly IMAGE_CACHE_MAX = 200;
  private mixedTextCache = new Map<string, { parts: string[], isEmoji: boolean[] }>();
  private textWidthCache = new Map<string, number>();

  public setFont(ctx: CanvasRenderingContext2D, fontStr: string) {
    if (this.cachedFont !== fontStr) {
      ctx.font = fontStr;
      this.cachedFont = fontStr;
    }
  }

  private measureTextFast(ctx: CanvasRenderingContext2D, text: string): number {
    const key = `${this.cachedFont}|${text}`;
    const cached = this.textWidthCache.get(key);
    if (cached !== undefined) return cached;
    const w = text.length > 0 ? ctx.measureText(text).width : 0;
    if (this.textWidthCache.size > 3000) this.textWidthCache.clear();
    this.textWidthCache.set(key, w);
    return w;
  }

  private parseMixedText(text: string): { parts: string[], isEmoji: boolean[] } {
    const cached = this.mixedTextCache.get(text);
    if (cached) return cached;

    // Fast-path for plain text — checks ALL emoji Unicode ranges:
    // \uFE0F  = variation selector-16 (used by ❤️, ✈️, ⚡️ etc.)
    // 1F300-1FAFF = Misc Symbols and Pictographs, Emoticons, Transport, Supplemental Symbols
    // 2600-27BF  = Misc Symbols (☕ ✨ ⚡ ☀ etc.), Dingbats (✅ ✈ etc.)
    // 1F900-1F9FF = Supplemental Symbols and Pictographs
    // 1FA00-1FAFF = Chess Symbols, Extended Pictographs
    const HAS_EMOJI = /[\uFE0F\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F900}-\u{1FAFF}]/u;
    if (!HAS_EMOJI.test(text)) {
      const result = { parts: [text], isEmoji: [false] };
      if (this.mixedTextCache.size > 1000) this.mixedTextCache.clear();
      this.mixedTextCache.set(text, result);
      return result;
    }

    const parts = text.split(EMOJI_REGEX).filter(Boolean);
    const isEmoji = parts.map(p => isEmojiWord(p));
    const result = { parts, isEmoji };
    if (this.mixedTextCache.size > 1000) this.mixedTextCache.clear();
    this.mixedTextCache.set(text, result);
    return result;
  }

  public getMixedTextWidth(ctx: CanvasRenderingContext2D, text: string, fontSize: number): number {
    const { parts, isEmoji } = this.parseMixedText(text);
    let width = 0;
    for (let i = 0; i < parts.length; i++) {
      if (isEmoji[i]) width += fontSize * 1.4;
      else width += this.measureTextFast(ctx, parts[i]);
    }
    return width;
  }

  public applyGradientFill(
    ctx: CanvasRenderingContext2D,
    text: string,
    fontSize: number,
    colors: string[]
  ): CanvasGradient {
    const w = this.getMixedTextWidth(ctx, text, fontSize);
    const gradient = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    colors.forEach((color, i) => {
      gradient.addColorStop(i / (colors.length - 1), color);
    });
    return gradient;
  }

  // A sharp, far-offset colored shadow renders as a second displaced copy of the
  // text — users read it as "two caption styles at once". Clamp the offset and
  // guarantee enough blur so a shadow always softens into depth, never a clone.
  // Definition/impact is preserved by each style's stroke, not by the offset.
  private static readonly MAX_SHADOW_OFFSET = 3;

  public applyShadow(
    ctx: CanvasRenderingContext2D,
    style: { shadowColor?: string; shadowBlur?: number; shadowOffsetX?: number; shadowOffsetY?: number },
    scaleFactor: number
  ): void {
    if (style.shadowColor) {
      const max = CaptionRenderer.MAX_SHADOW_OFFSET;
      const rawOX = style.shadowOffsetX || 0;
      const rawOY = style.shadowOffsetY || 0;
      const rawBlur = style.shadowBlur || 0;
      const maxRawOffset = Math.max(Math.abs(rawOX), Math.abs(rawOY));
      // If the offset was large, force the blur up so the residual offset reads
      // as a soft drop shadow instead of a hard ghost.
      const softBlur = maxRawOffset > max ? Math.max(rawBlur, maxRawOffset * 1.5) : rawBlur;

      ctx.shadowColor = style.shadowColor;
      ctx.shadowBlur = softBlur * scaleFactor;
      ctx.shadowOffsetX = Math.max(-max, Math.min(max, rawOX)) * scaleFactor;
      ctx.shadowOffsetY = Math.max(-max, Math.min(max, rawOY)) * scaleFactor;
    }
  }

  public applyStroke(
    ctx: CanvasRenderingContext2D,
    style: { strokeColor?: string; strokeWidth?: number },
    scaleFactor: number,
    text: string,
    fontSize: number
  ): void {
    if (style.strokeWidth && style.strokeWidth > 0) {
      ctx.strokeStyle = style.strokeColor || '#000000';
      ctx.lineWidth = style.strokeWidth * scaleFactor;
      ctx.lineJoin = 'round';
      this.drawMixedText(ctx, text, fontSize, ctx.strokeStyle, 0, 0, true);
    }
  }

  private static readonly ASPECT_RATIOS: Record<string, number> = {
    '9:16': 9 / 16,
    '16:9': 16 / 9,
    '1:1': 1,
    '4:5': 4 / 5,
  };

  private getVisibleArea(
    canvasWidth: number,
    canvasHeight: number,
    aspectRatio?: AspectRatio
  ): { x: number; y: number; w: number; h: number } {
    if (!aspectRatio || aspectRatio === 'ORIGINAL') {
      return { x: 0, y: 0, w: canvasWidth, h: canvasHeight };
    }
    const targetRatio = CaptionRenderer.ASPECT_RATIOS[aspectRatio];
    if (!targetRatio) return { x: 0, y: 0, w: canvasWidth, h: canvasHeight };

    const sourceRatio = canvasWidth / canvasHeight;
    if (targetRatio < sourceRatio) {
      const visW = canvasHeight * targetRatio;
      return { x: (canvasWidth - visW) / 2, y: 0, w: visW, h: canvasHeight };
    } else if (targetRatio > sourceRatio) {
      const visH = canvasWidth / targetRatio;
      return { x: 0, y: (canvasHeight - visH) / 2, w: canvasWidth, h: visH };
    }
    return { x: 0, y: 0, w: canvasWidth, h: canvasHeight };
  }

  public drawMixedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    fontSize: number,
    fill: string | CanvasGradient,
    x: number,
    y: number,
    isStroke: boolean = false
  ): void {
    const { parts, isEmoji } = this.parseMixedText(text);
    const totalW = this.getMixedTextWidth(ctx, text, fontSize);

    let curX = x;
    if (ctx.textAlign === 'center') {
      curX = x - totalW / 2;
    } else if (ctx.textAlign === 'right') {
      curX = x - totalW;
    }

    ctx.save();
    ctx.textAlign = 'left';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (isEmoji[i]) {
        const gifSize = fontSize * 1.4;
        if (!isStroke) {
          const gifUrl = emojiToNotoUrl(p.trim());
          const img = this.getOrLoadImage(gifUrl);
          if (img && img.naturalWidth > 0 && img.dataset.failed !== 'true') {
            let imgY = y - gifSize / 2;
            if (ctx.textBaseline === 'top') imgY = y;
            else if (ctx.textBaseline === 'bottom') imgY = y - gifSize;

            ctx.drawImage(img, curX, imgY, gifSize, gifSize);
          } else {
            ctx.fillStyle = fill;
            ctx.fillText(p, curX, y);
          }
        }
        curX += gifSize;
      } else {
        if (isStroke) {
          ctx.strokeText(p, curX, y);
        } else {
          ctx.fillStyle = fill;
          ctx.fillText(p, curX, y);
        }
        curX += this.measureTextFast(ctx, p);
      }
    }
    ctx.restore();
  }

  /**
   * Main render method. Draws video frame + captions onto canvas.
   */
  render(
    video: HTMLVideoElement | null,
    canvas: HTMLCanvasElement,
    state: RendererState,
    callbacks?: RendererCallbacks
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear font cache at start of frame to ensure context sync
    this.cachedFont = '';

    // Prefer state.currentTime if provided (for synthetic playback), fallback to video.currentTime
    const renderTime = state.currentTime !== undefined ? state.currentTime : (video?.currentTime || 0);

    // --- Preload emoji GIFs for EMOJI_AUTO mode ---
    if (state.currentStyle === CaptionStyle.EMOJI_AUTO && state.captions) {
      // Preload emojis from all captions to ensure GIFs are ready when needed
      state.captions.forEach(caption => {
        if (caption.text) {
          // Extract trailing emoji from caption text
          const emojiMatch = caption.text.match(
            /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1FAFF}][\uFE0F\u20D0-\u20FF]?[\s]*$/u
          );
          if (emojiMatch) {
            const emoji = emojiMatch[0].trim();
            const gifUrl = emojiToNotoUrl(emoji);
            // Trigger preload by calling getOrLoadImage
            this.getOrLoadImage(gifUrl);
          }
        }
      });
    }

    // --- Preload premium PNG icons for Icon Captions ---
    if (state.iconCaptionsEnabled && state.captions) {
      state.captions.forEach(caption => {
        caption.words?.forEach(word => {
          if (word.iconUrl) {
            this.getOrLoadImage(word.iconUrl);
          }
        });
      });
    }

    // --- Find active caption via binary search ---
    const activeCaption = this.findActiveCaption(state.captions, renderTime);

    // --- Zoom logic (word-level emphasis) ---
    let targetZoom = 1.0;
    if (state.autoMotionEnabled && activeCaption) {
      const wordEmphasis = getActiveWordEmphasis(activeCaption, renderTime);
      if (wordEmphasis >= 90) {
        targetZoom = 1.22;
      } else if (wordEmphasis >= 70) {
        targetZoom = 1.15;
      } else if (wordEmphasis >= 50) {
        targetZoom = 1.10;
      } else {
        targetZoom = activeCaption.customScale && activeCaption.customScale > 1.2 ? 1.15 : 1.05;
        const progress = (renderTime - activeCaption.startTime) / (activeCaption.endTime - activeCaption.startTime);
        targetZoom += progress * 0.03;
      }
    }
    // Faster lerp during emphasis for snappier punch-in; slower release
    this.currentZoom = lerp(this.currentZoom, targetZoom, targetZoom > this.currentZoom ? 0.09 : 0.05);

    // --- SFX trigger ---
    if (state.autoSfxEnabled && state.isPlaying && activeCaption && !activeCaption.sfxDisabled) {
      if (this.lastCaptionId !== activeCaption.id) {
        callbacks?.onNewCaption?.(activeCaption);
        this.lastCaptionId = activeCaption.id;
      }
      // Pop sound on emphasized words
      const wordEmphasis = getActiveWordEmphasis(activeCaption, renderTime);
      if (wordEmphasis >= 80 && activeCaption.words) {
        const wIdx = activeCaption.words.findIndex(
          w => renderTime >= w.start - 0.06 && renderTime <= w.end + 0.06
        );
        if (wIdx >= 0) {
          const wordKey = `${activeCaption.id}:${wIdx}`;
          if (wordKey !== this.lastWordKey) {
            callbacks?.onEmphasizedWord?.();
            this.lastWordKey = wordKey;
          }
        }
      }
    } else if (!activeCaption) {
      this.lastCaptionId = null;
    }

    // --- Draw video frame ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (video) {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(this.currentZoom, this.currentZoom);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }

    // --- Draw captions (skipped when HyperCaption HTML overlay is active) ---
    if (activeCaption && !state.skipCaptionDraw) {
      this.drawCaption(ctx, canvas, activeCaption, state, renderTime, state.captions);
    }

    // --- Draw stickers & emojis (Phase 5) ---
    if (state.stickers && state.stickers.length > 0) {
      this.renderStickers(ctx, canvas, state.stickers, renderTime);
    }
  }

  private findActiveCaption(captions: Caption[], time: number): Caption | undefined {
    let low = 0;
    let high = captions.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const c = captions[mid];
      if (time >= c.startTime && time <= c.endTime) return c;
      if (time < c.startTime) high = mid - 1;
      else low = mid + 1;
    }
    return undefined;
  }

  // ─────────────────────────────────────────────────────────
  // ANIMATION HELPERS (Phase 3)
  // ─────────────────────────────────────────────────────────
  private getAnimationTransform(
    ctx: CanvasRenderingContext2D,
    caption: Caption,
    renderTime: number,
    anchorX: number,
    anchorY: number,
    state: RendererState
  ): { offsetY: number; offsetX: number; scale: number; alpha: number; rotation: number } {
    const captionDuration = caption.endTime - caption.startTime;
    const speedFactor = state.animationSpeed === 'FAST' ? 0.15 : state.animationSpeed === 'SLOW' ? 0.4 : 0.25;
    const animDuration = captionDuration * speedFactor;

    const entryProgress = Math.max(0, Math.min(1, (renderTime - caption.startTime) / animDuration));
    const exitProgress = Math.max(0, Math.min(1, (caption.endTime - renderTime) / animDuration));

    const entryT = easeOutQuint(entryProgress);
    const exitT = easeOutQuint(exitProgress);

    let offsetY = 0;
    let offsetX = 0;
    let scale = 1;
    let alpha = 1;
    let rotation = 0;

    // Entry animation
    const entry = state.entryAnimation || 'NONE';
    if (entryProgress < 1) {
      switch (entry) {
        case 'SLIDE_UP':
          offsetY = lerp(60, 0, entryT);
          alpha = entryT;
          break;
        case 'SLIDE_DOWN':
          offsetY = lerp(-60, 0, entryT);
          alpha = entryT;
          break;
        case 'FADE_IN':
          alpha = entryT;
          break;
        case 'ZOOM_IN':
          scale = lerp(0.3, 1, entryT);
          alpha = entryT;
          break;
        case 'BOUNCE':
          scale = backEaseOut(entryT);
          alpha = Math.min(1, entryT * 3);
          break;
        case 'FLIP':
          scale = Math.abs(Math.cos((1 - entryT) * Math.PI / 2));
          alpha = entryT;
          break;
        case 'ROTATE_IN':
          rotation = lerp(-Math.PI / 4, 0, entryT);
          alpha = entryT;
          scale = lerp(0.5, 1, entryT);
          break;
        case 'BLUR_IN':
          alpha = entryT;
          // Blur is simulated via scale oscillation
          scale = lerp(1.1, 1, entryT);
          break;
        case 'GLITCH':
          // RGB channel split effect — deterministic noise to prevent canvas flickering
          {
            const noise1 = Math.sin(renderTime * 47.3 + 1.1) * 0.5 + 0.5;
            const noise2 = Math.sin(renderTime * 31.7 + 2.3) * 0.5 + 0.5;
            offsetX = entryProgress < 0.7 ? (noise1 - 0.5) * 20 * (1 - entryT) : 0;
            offsetY = entryProgress < 0.7 ? (noise2 - 0.5) * 10 * (1 - entryT) : 0;
            alpha = entryProgress < 0.3 ? (noise1 > 0.5 ? 1 : 0.3) : entryT;
            scale = lerp(1.05, 1, entryT);
          }
          break;
        case 'ELASTIC':
          scale = elasticOut(entryProgress);
          alpha = Math.min(1, entryT * 2);
          break;
        case 'KINETIC':
          // Slam-in: starts very large, rapidly snaps to normal
          scale = lerp(3.0, 1, easeOutQuint(entryProgress));
          alpha = Math.min(1, entryProgress * 4);
          offsetY = lerp(-20, 0, entryT);
          break;
        case 'SHATTER':
          // Words assemble from scattered positions — deterministic per-word feel
          {
            const seed = Math.sin(renderTime * 10 + anchorX * 0.01) * 0.5 + 0.5;
            const cosVal = Math.cos(renderTime * 7 + anchorY * 0.01) * 0.5;
            offsetX = entryProgress < 1 ? lerp((seed - 0.5) * 800, 0, backEaseOut(entryT)) : 0;
            offsetY = entryProgress < 1 ? lerp(cosVal * 600, 0, backEaseOut(entryT)) : 0;
            alpha = Math.min(1, entryT * 2.5);
            scale = lerp(0.4, 1, easeOutQuint(entryProgress));
          }
          break;
        case 'SPOTLIGHT':
          // Text reveals from center outwards — scale snaps in with a flash
          scale = lerp(0.1, 1, backEaseOut(entryT));
          alpha = Math.min(1, entryProgress * 5);
          break;
        case 'WIPE_RIGHT':
          // Handled separately via canvas clip in drawGeneric — just fade alpha here
          alpha = entryT;
          break;
      }
    }

    // Exit animation (only if near end)
    const exit = state.exitAnimation || 'NONE';
    if (exitProgress < 1) {
      switch (exit) {
        case 'SLIDE_DOWN':
          offsetY += lerp(60, 0, exitT);
          alpha = Math.min(alpha, exitT);
          break;
        case 'SLIDE_UP':
          offsetY += lerp(-60, 0, exitT);
          alpha = Math.min(alpha, exitT);
          break;
        case 'FADE_OUT':
          alpha = Math.min(alpha, exitT);
          break;
        case 'ZOOM_OUT':
          scale *= lerp(0.3, 1, exitT);
          alpha = Math.min(alpha, exitT);
          break;
        case 'DISSOLVE':
          alpha = Math.min(alpha, exitT * exitT);
          break;
        case 'GLITCH_OUT':
          {
            const gn1 = Math.sin(renderTime * 53.1 + 0.7) * 0.5 + 0.5;
            const gn2 = Math.sin(renderTime * 29.9 + 1.4) * 0.5 + 0.5;
            offsetX += exitProgress < 0.7 ? (gn1 - 0.5) * 30 * (1 - exitT) : 0;
            alpha = Math.min(alpha, exitProgress < 0.5 ? (gn2 > 0.3 ? exitT : 0.2) : exitT);
          }
          break;
        case 'SHRINK':
          scale *= lerp(0, 1, exitT);
          alpha = Math.min(alpha, exitT);
          break;
      }
    }

    return { offsetY, offsetX, scale, alpha, rotation };
  }

  private drawCaption(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    caption: Caption,
    state: RendererState,
    renderTime: number,
    allCaptions?: Caption[]
  ): void {
    const style = state.activeConfig;
    let finalFontScale = state.fontScale;
    let finalVPos = state.verticalPos;
    let finalHPos = state.horizontalPos;

    const isAutoFraming = state.autoFramingEnabled || state.autoAdjustEnabled;
    if (isAutoFraming && state.autoFrameSafeY) {
      finalVPos = Math.max(state.autoFrameSafeY.min, Math.min(state.autoFrameSafeY.max, finalVPos));
    } else if (state.autoAdjustEnabled) {
      if (caption.customScale) finalFontScale *= caption.customScale;
      if (caption.customPosition === 'TOP') finalVPos = 15;
      else if (caption.customPosition === 'MIDDLE') finalVPos = 50;
      else if (caption.customPosition === 'BOTTOM') finalVPos = 82;
    }

    const scaleFactor = (canvas.height / 1000) * finalFontScale;
    const vis = this.getVisibleArea(canvas.width, canvas.height, state.aspectRatio);
    const anchorY = caption.customY !== undefined ? vis.y + caption.customY * vis.h : vis.y + vis.h * (finalVPos / 100);
    const anchorX = caption.customX !== undefined ? vis.x + caption.customX * vis.w : vis.x + vis.w * (finalHPos / 100);

    // ── Emotion background gradient (autoMotionEnabled gate) ──
    if (state.autoMotionEnabled && !caption.brollDisabled && caption.sentiment) {
      const lineH = (state.activeConfig.fontSize || 48) * scaleFactor;
      drawEmotionBackground(ctx, canvas, caption.sentiment, anchorY, lineH);
    }

    // ── B-roll overlay — video clip preferred, still-image fallback ──
    if (state.autoMotionEnabled && !caption.brollDisabled) {
      const videoEl = getBrollVideo(caption.sentiment, caption.id, caption.text);
      if (videoEl) {
        const captionElapsed = Math.max(0, renderTime - caption.startTime);
        syncBrollTime(videoEl, captionElapsed);
        this.drawBrollKenBurns(ctx, canvas, videoEl, caption, renderTime);
      } else {
        // Still loading video — fall back to still image so the canvas isn't empty
        const stillImg = getBrollImage(caption.sentiment, caption.id, caption.text);
        if (stillImg) {
          this.drawBrollKenBurns(ctx, canvas, stillImg, caption, renderTime);
        }
      }
    }

    // ── Keyframe overrides ──
    const captionFrames = state.keyframeMap?.get(caption.id);
    let hasKeyframe = false;
    if (captionFrames && captionFrames.length > 0) {
      const kf = evaluateKeyframe(captionFrames, renderTime, undefined);
      if (kf) {
        hasKeyframe = true;
        ctx.save();
        const kfAlpha = applyCaptionKeyframe(ctx, kf, anchorX, anchorY);
        if (kf.opacity !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, kfAlpha));
      }
    }

    // Apply entry/exit animation transforms
    const hasEntryExit = (state.entryAnimation && state.entryAnimation !== 'NONE') ||
      (state.exitAnimation && state.exitAnimation !== 'NONE');

    // ── BLUR_REVEAL caption-level effect ──
    // For BLUR_REVEAL (BLOCK mode), apply a smooth blur-to-sharp reveal at caption level
    const isBlurReveal = state.currentStyle === CaptionStyle.BLUR_REVEAL;
    if (isBlurReveal) {
      const elapsed = renderTime - caption.startTime;
      const captionDuration = caption.endTime - caption.startTime;
      const revealDur = Math.min(captionDuration * 0.5, 1.0);
      const revealT = easeOutQuint(Math.max(0, Math.min(elapsed / revealDur, 1)));
      const blurPx = lerp(24, 0, revealT);
      const blurAlpha = Math.max(0, Math.min(revealT * 1.6, 1));
      ctx.save();
      ctx.globalAlpha = blurAlpha;
      if (blurPx > 0.3) {
        ctx.filter = `blur(${blurPx.toFixed(1)}px)`;
      }
    }

    // ── EMOJI_AUTO: draw an animated floating emoji GIF icon above the text block ──
    const isEmojiAuto = state.currentStyle === CaptionStyle.EMOJI_AUTO;
    if (isEmojiAuto && caption.text) {
      const elapsed = renderTime - caption.startTime;
      // Extract the trailing emoji from the caption text (appended by applyAutoEmojis)
      // Use broad Unicode emoji regex to match all emoji types including ✨ ⚡ ❤️ etc.
      const emojiMatch = caption.text.match(
        /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1FAFF}][\uFE0F\u20D0-\u20FF]?[\s]*$/u
      );
      if (emojiMatch) {
        const emoji = emojiMatch[0].trim();
        const gifUrl = emojiToNotoUrl(emoji);
        // Pre-load image; getOrLoadImage starts fetch immediately on first call
        const img = this.getOrLoadImage(gifUrl);
        const iconSize = 72 * scaleFactor; // Larger for more visual impact
        // Float animation: gentle sine-wave bob
        const floatY = Math.sin(elapsed * 2.8) * 8 * scaleFactor;
        // Pulse scale: subtle heartbeat
        const pulseScale = 1 + Math.sin(elapsed * 5.5) * 0.08;
        // Entry pop: scale in during first 0.4s
        const entryT = easeOutQuint(Math.min(elapsed / 0.4, 1));
        const entryScale = lerp(0.2, 1, entryT);
        // Only render if GIF is loaded — skip static text fallback entirely
        if (img && img.naturalWidth > 0 && img.dataset.failed !== 'true') {
          ctx.save();
          ctx.globalAlpha = entryT;
          ctx.translate(anchorX, anchorY - iconSize * 1.8 + floatY);
          ctx.scale(pulseScale * entryScale, pulseScale * entryScale);
          // Glow ring behind icon — color matches emoji category
          ctx.shadowColor = 'rgba(255, 220, 50, 0.7)';
          ctx.shadowBlur = 28 * scaleFactor;
          ctx.drawImage(img, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
          ctx.restore();
        }
      }
    }

    const isPerWordAnim = !(
      state.currentStyle === CaptionStyle.TYPOGRAPH ||
      state.currentStyle === CaptionStyle.MINIMAL_BAR ||
      !!style.typographyLayout
    );

    if (hasEntryExit && !isPerWordAnim) {
      const anim = this.getAnimationTransform(ctx, caption, renderTime, anchorX, anchorY, state);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, anim.alpha));
      ctx.translate(anchorX + anim.offsetX, anchorY + anim.offsetY);
      ctx.scale(anim.scale, anim.scale);
      if (anim.rotation !== 0) ctx.rotate(anim.rotation);
      ctx.translate(-anchorX, -anchorY);
    }

    // TYPOGRAPH and MINIMAL_BAR use the specialised editorial renderer
    if (state.currentStyle === CaptionStyle.TYPOGRAPH || state.currentStyle === CaptionStyle.MINIMAL_BAR) {
      drawTypograph(this, ctx, canvas, caption, style, scaleFactor, anchorX, anchorY, renderTime);
    } else if (style.typographyLayout) {
      // Typography Caption styles (Sprint 5) — multi-layer kinetic typography
      drawTypographyCaption(this, ctx, canvas, caption, style, scaleFactor, anchorX, anchorY, renderTime);
    } else {
      // All other styles route through the unified drawGeneric renderer
      drawGeneric(this, ctx, canvas, caption, style, scaleFactor, anchorX, anchorY, renderTime, state);
    }

    if (hasEntryExit && !isPerWordAnim) {
      ctx.restore();
    }

    if (hasKeyframe) {
      ctx.restore();
    }

    if (isBlurReveal) {
      ctx.filter = 'none';
      ctx.restore();
    }
  }

  // ─────────────────────────────────────────────────────────
  // GENERIC RENDERER (handles most styles)
  // ─────────────────────────────────────────────────────────
  

  // ─────────────────────────────────────────────────────────
  // TRENDING STYLE RENDERER
  // ─────────────────────────────────────────────────────────
  

  // ─────────────────────────────────────────────────────────
  // NEON_IMPACT / VIRAL_CREATOR RENDERER
  // ─────────────────────────────────────────────────────────
  

  // ─────────────────────────────────────────────────────────
  // INSTAGRAM TEMPLATE RENDERER
  // ─────────────────────────────────────────────────────────
  

  // ─────────────────────────────────────────────────────────
  // TYPOGRAPH RENDERER — editorial magazine typographic style
  // ─────────────────────────────────────────────────────────
  // TYPOGRAPHY CAPTION RENDERER (Sprint 5)
  // Multi-layer kinetic typography: each layer has its own font, size, color, animation
  // ─────────────────────────────────────────────────────────
  

  // ─────────────────────────────────────────────────────────
  

  resetZoom(): void {
    this.currentZoom = 1.0;
  }

  // ─────────────────────────────────────────────────────────
  // CAPCUT MULTI-FLOAT KARAOKE RENDERER (Sprint 6)
  // 3-tier floating word engine:
  //   TIER 1 (ACTIVE)       — large, blue, letter-by-letter pop
  //   TIER 2 (RED_CONTEXT)  — medium, red italic, floats up-left
  //   TIER 3 (WHITE_CONTEXT)— small, white italic, floats up further
  // ─────────────────────────────────────────────────────────
  

  // ─────────────────────────────────────────────────────────
  // STICKER RENDERING — Real Noto animated GIFs via drawImage
  // ─────────────────────────────────────────────────────────
  public getOrLoadImage(url: string): HTMLImageElement {
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url)!;
    }
    // Create image and append to a hidden DOM element to force browser to
    // decode and animate the GIF continuously so drawImage() captures it.
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let container = document.getElementById('createrin-gif-cache');
    if (!container) {
      container = document.createElement('div');
      container.id = 'createrin-gif-cache';
      container.style.position = 'absolute';
      container.style.width = '0px';
      container.style.height = '0px';
      container.style.overflow = 'hidden';
      container.style.opacity = '0.01'; // Not display:none (forces paint)
      document.body.appendChild(container);
    }
    container.appendChild(img);

    img.onload = () => {
      // Dispatch event to force a frame re-render (helpful if video is currently paused)
      window.dispatchEvent(new CustomEvent('createrin-force-render'));
    };

    img.onerror = () => {
      img.dataset.failed = 'true';
      window.dispatchEvent(new CustomEvent('createrin-force-render'));
    };

    if (url.startsWith('https://fonts.gstatic.com/')) {
      fetchAndCacheEmojiGif(url)
        .then(cachedUrl => {
          img.src = cachedUrl;
        })
        .catch(err => {
          console.error('Error fetching/caching emoji gif:', err);
          img.dataset.failed = 'true';
          window.dispatchEvent(new CustomEvent('createrin-force-render'));
        });
    } else {
      img.src = url;
    }

    if (this.imageCache.size >= CaptionRenderer.IMAGE_CACHE_MAX) {
      const oldest = this.imageCache.keys().next().value;
      if (oldest !== undefined) this.imageCache.delete(oldest);
    }
    this.imageCache.set(url, img);
    return img;
  }

  private renderStickers(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    stickers: StickerItem[],
    renderTime: number
  ): void {
    stickers.forEach(sticker => {
      if (renderTime < sticker.startTime || renderTime > sticker.endTime) return;

      const x = sticker.x * canvas.width;
      const y = sticker.y * canvas.height;
      const baseFontSize = 56 * sticker.scale;
      const elapsed = renderTime - sticker.startTime;
      const totalDuration = sticker.endTime - sticker.startTime;

      // --- Smooth fade in/out (first/last 0.2s) ---
      const fadeMs = 0.2;
      let opacity = sticker.opacity;
      if (elapsed < fadeMs) opacity *= elapsed / fadeMs;
      else if (elapsed > totalDuration - fadeMs) opacity *= (totalDuration - elapsed) / fadeMs;
      opacity = Math.max(0, Math.min(1, opacity));

      // --- Motion transform (applied to BOTH gif and fallback text) ---
      let offsetX = 0;
      let offsetY = 0;
      let scale = 1;
      let rotation = sticker.rotation * (Math.PI / 180);
      let scaleX = 1;
      let scaleY = 1;

      switch (sticker.animation) {
        case 'BOUNCE': {
          const bounceT = Math.abs(Math.sin(elapsed * Math.PI * 1.6));
          offsetY = -baseFontSize * 0.35 * bounceT;
          if (bounceT < 0.15) {
            scaleX = 1 + 0.15 * (1 - bounceT / 0.15);
            scaleY = 1 - 0.12 * (1 - bounceT / 0.15);
          }
          break;
        }
        case 'SPIN': {
          rotation += elapsed * 3.5;
          break;
        }
        case 'PULSE': {
          const beatCycle = elapsed % 1.0;
          if (beatCycle < 0.15) scale = 1 + 0.3 * Math.sin(beatCycle / 0.15 * Math.PI);
          else if (beatCycle < 0.35) scale = 1 + 0.15 * Math.sin((beatCycle - 0.15) / 0.20 * Math.PI);
          else scale = 1;
          break;
        }
        case 'SHAKE': {
          const shakeDecay = Math.max(0, 1 - elapsed / Math.max(totalDuration, 0.1));
          offsetX = Math.sin(elapsed * 35) * 8 * sticker.scale * shakeDecay;
          offsetY = Math.cos(elapsed * 28) * 3 * sticker.scale * shakeDecay;
          break;
        }
        case 'FLOAT': {
          offsetY = -Math.sin(elapsed * 1.8) * baseFontSize * 0.18;
          offsetX = Math.sin(elapsed * 0.9) * baseFontSize * 0.06;
          rotation += Math.sin(elapsed * 1.2) * 0.05;
          break;
        }
        case 'WOBBLE': {
          rotation += Math.sin(elapsed * 6) * 0.25;
          offsetY = Math.sin(elapsed * 6) * baseFontSize * 0.04;
          break;
        }
        case 'POP_IN': {
          const popDuration = 0.45;
          if (elapsed < popDuration) {
            scale = elasticOut(elapsed / popDuration) * 1.05;
          } else {
            scale = 1 + 0.04 * Math.sin((elapsed - popDuration) * 3.5);
          }
          break;
        }
        case 'ORBIT': {
          const orbitRadius = baseFontSize * 0.28;
          offsetX = Math.cos(elapsed * 2.5) * orbitRadius;
          offsetY = Math.sin(elapsed * 2.5) * orbitRadius * 0.6;
          rotation += elapsed * 1.5;
          break;
        }
        case 'JELLY': {
          const jellyT = elapsed * 4;
          scaleX = 1 + 0.12 * Math.cos(jellyT);
          scaleY = 1 + 0.18 * Math.sin(jellyT);
          offsetY = -Math.sin(jellyT) * baseFontSize * 0.06;
          break;
        }
        case 'SWING': {
          const swingAngle = Math.sin(elapsed * 3.5) * 0.35;
          rotation += swingAngle;
          offsetY = (1 - Math.cos(swingAngle)) * baseFontSize * 0.5;
          break;
        }
        default:
          break;
      }

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.translate(x + offsetX, y + offsetY);
      ctx.rotate(rotation);
      ctx.scale(scale * scaleX, scale * scaleY);

      // Soft drop shadow for depth
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 4;

      // --- Draw: Noto animated GIF only (no text emoji fallback) ---
      const gifUrl = sticker.gifUrl || emojiToNotoUrl(sticker.emoji);
      const img = this.getOrLoadImage(gifUrl);
      const halfSz = baseFontSize * 0.55;
      if (img.naturalWidth > 0 && img.dataset.failed !== 'true') {
        ctx.drawImage(img, -halfSz, -halfSz, halfSz * 2, halfSz * 2);
      }

      ctx.restore();
    });
  }

  /**
   * Draws a B-roll image with Ken Burns effect:
   *  - Cover-fit with animated source rect (slow zoom + pan)
   *  - Alpha fade in over first 0.3 s, fade out over last 0.3 s
   *  - Gradient vignette to darken edges for text readability
   * Direction (pan L/R, zoom in/out) is seeded by captionId for variety.
   */
  private drawBrollKenBurns(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    img: HTMLImageElement | HTMLVideoElement,
    caption: Caption,
    renderTime: number
  ): void {
    const duration = caption.endTime - caption.startTime;
    const elapsed = Math.max(0, renderTime - caption.startTime);
    const t = duration > 0 ? Math.min(elapsed / duration, 1) : 0;

    // Fade alpha: 0→0.50 in first 0.3 s, hold, 0.50→0 in last 0.3 s
    const fadeIn = Math.min(elapsed / 0.3, 1);
    const fadeOut = Math.min((duration - elapsed) / 0.3, 1);
    const alpha = 0.50 * Math.min(fadeIn, fadeOut);
    if (alpha <= 0) return;

    // Seed a direction from captionId hash (FNV-like inline)
    let h = 2166136261;
    for (let i = 0; i < caption.id.length; i++) {
      h ^= caption.id.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    const zoomIn = (h & 1) === 0;       // even hash → zoom in, odd → zoom out
    const panRight = (h & 2) === 0;     // bit 1 → pan direction

    // Ken Burns: cover-fit source rect animates slowly
    const zoom = zoomIn ? lerp(1.0, 1.08, t) : lerp(1.08, 1.0, t);
    // HTMLImageElement uses naturalWidth/Height; HTMLVideoElement uses videoWidth/Height
    const srcNatW = (img as HTMLImageElement).naturalWidth  || (img as HTMLVideoElement).videoWidth  || canvas.width;
    const srcNatH = (img as HTMLImageElement).naturalHeight || (img as HTMLVideoElement).videoHeight || canvas.height;
    const imgAspect = srcNatW / srcNatH;
    const canvasAspect = canvas.width / canvas.height;

    let srcW: number, srcH: number, srcX: number, srcY: number;
    if (imgAspect > canvasAspect) {
      srcH = srcNatH / zoom;
      srcW = srcH * canvasAspect;
      const maxOffsetX = srcNatW - srcW;
      srcX = panRight ? maxOffsetX * t : maxOffsetX * (1 - t);
      srcY = (srcNatH - srcH) / 2;
    } else {
      srcW = srcNatW / zoom;
      srcH = srcW / canvasAspect;
      srcX = (srcNatW - srcW) / 2;
      const maxOffsetY = srcNatH - srcH;
      srcY = panRight ? maxOffsetY * t : maxOffsetY * (1 - t);
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

    // Vignette gradient: darken top + bottom so text remains readable
    const vTop = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.35);
    vTop.addColorStop(0, 'rgba(0,0,0,0.55)');
    vTop.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = vTop;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.35);

    const vBot = ctx.createLinearGradient(0, canvas.height * 0.65, 0, canvas.height);
    vBot.addColorStop(0, 'rgba(0,0,0,0)');
    vBot.addColorStop(1, 'rgba(0,0,0,0.65)');
    ctx.fillStyle = vBot;
    ctx.fillRect(0, canvas.height * 0.65, canvas.width, canvas.height * 0.35);

    ctx.restore();
  }
}
