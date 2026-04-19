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

import { Caption, CaptionStyle, StyleConfig, EntryAnimation, ExitAnimation, WordHighlightMode, StickerItem } from '../types';

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

// ─── Emoji / Noto Animated GIF utilities ────────────────────────────────────
// Detects if a string is a single emoji (one or more codepoints forming a grapheme)
const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
export const isEmojiWord = (word: string): boolean => {
  const clean = word.trim();
  if (!clean) return false;
  // Check if removing all emojis from the string leaves it empty
  const stripped = clean.replace(EMOJI_REGEX, '');
  // Also strip any remaining ZWJ (200D) or variation selectors
  const fullyStripped = stripped.replace(/[\uFE0F\u200D]/g, '');
  return fullyStripped.length === 0;
};

// Convert an emoji character to its Noto animation CDN URL
// e.g. '❤️' → 'https://fonts.gstatic.com/s/e/notoemoji/latest/2764/512.gif'
export const emojiToNotoUrl = (emoji: string): string => {
  // Get the base codepoint, skipping variation selectors (FE0F) and ZWJ (200D)
  const codepoints = [...emoji]
    .map(c => c.codePointAt(0)!)
    .filter(cp => cp !== 0xFE0F) // strip variation selector-16
    .map(cp => cp.toString(16).toLowerCase());
  // For multi-codepoint (ZWJ sequences), join with underscore
  return `https://fonts.gstatic.com/s/e/notoemoji/latest/${codepoints.join('_')}/512.gif`;
};


export interface RendererState {
  captions: Caption[];
  activeConfig: StyleConfig;
  currentStyle: CaptionStyle;
  fontScale: number;
  verticalPos: number;
  horizontalPos: number;
  autoAdjustEnabled: boolean;
  autoMotionEnabled: boolean;
  autoSfxEnabled: boolean;
  isPlaying: boolean;
  // Phase 3: Animation Engine
  entryAnimation?: EntryAnimation;
  exitAnimation?: ExitAnimation;
  wordHighlight?: WordHighlightMode;
  animationSpeed?: 'FAST' | 'MEDIUM' | 'SLOW';
  // Phase 5: Sticker & Emoji Overlay
  stickers?: StickerItem[];
}

export interface RendererCallbacks {
  onNewCaption?: (caption: Caption) => void; // For SFX triggers
}

export class CaptionRenderer {
  private currentZoom = 1.0;
  private lastCaptionId: string | null = null;
  private cachedFont: string = '';
  // Cache of loaded HTMLImageElement instances — keyed by gifUrl
  // Allows canvas to call drawImage() every frame without re-fetching
  private imageCache = new Map<string, HTMLImageElement>();

  private getMixedTextWidth(ctx: CanvasRenderingContext2D, text: string, fontSize: number): number {
    const parts = text.split(EMOJI_REGEX).filter(Boolean);
    let width = 0;
    parts.forEach(p => {
      if (isEmojiWord(p)) width += fontSize * 1.4;
      else width += ctx.measureText(p).width;
    });
    return width;
  }

  private drawMixedText(
    ctx: CanvasRenderingContext2D, 
    text: string, 
    fontSize: number, 
    fill: string | CanvasGradient,
    x: number,
    y: number,
    isStroke: boolean = false
  ): void {
    const parts = text.split(EMOJI_REGEX).filter(Boolean);
    const totalW = this.getMixedTextWidth(ctx, text, fontSize);
    
    let curX = x;
    if (ctx.textAlign === 'center') {
      curX = x - totalW / 2;
    } else if (ctx.textAlign === 'right') {
      curX = x - totalW;
    }
    
    ctx.save();
    ctx.textAlign = 'left';
    parts.forEach(p => {
      if (isEmojiWord(p)) {
        const gifSize = fontSize * 1.4;
        if (!isStroke) {
          const gifUrl = emojiToNotoUrl(p.trim());
          const img = this.getOrLoadImage(gifUrl);
          if (img && img.naturalWidth > 0) {
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
        curX += ctx.measureText(p).width;
      }
    });
    ctx.restore();
  }

  /**
   * Main render method. Draws video frame + captions onto canvas.
   */
  render(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    state: RendererState,
    callbacks?: RendererCallbacks
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderTime = video.currentTime;

    // --- Find active caption via binary search ---
    const activeCaption = this.findActiveCaption(state.captions, renderTime);

    // --- Zoom logic ---
    let targetZoom = 1.0;
    if (state.autoMotionEnabled && activeCaption) {
      targetZoom = activeCaption.customScale && activeCaption.customScale > 1.2 ? 1.15 : 1.05;
      const progress = (renderTime - activeCaption.startTime) / (activeCaption.endTime - activeCaption.startTime);
      targetZoom += progress * 0.05;
    }
    this.currentZoom = lerp(this.currentZoom, targetZoom, 0.05);

    // --- SFX trigger ---
    if (state.autoSfxEnabled && state.isPlaying && activeCaption && this.lastCaptionId !== activeCaption.id) {
      callbacks?.onNewCaption?.(activeCaption);
      this.lastCaptionId = activeCaption.id;
    } else if (!activeCaption) {
      this.lastCaptionId = null;
    }

    // --- Draw video frame ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(this.currentZoom, this.currentZoom);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // --- Draw captions ---
    if (activeCaption) {
      this.drawCaption(ctx, canvas, activeCaption, state, renderTime);
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
    renderTime: number
  ): void {
    const style = state.activeConfig;
    let finalFontScale = state.fontScale;
    let finalVPos = state.verticalPos;
    let finalHPos = state.horizontalPos;

    if (state.autoAdjustEnabled) {
      if (caption.customScale) finalFontScale *= caption.customScale;
      if (caption.customPosition === 'TOP') finalVPos = 15;
      else if (caption.customPosition === 'MIDDLE') finalVPos = 50;
      else if (caption.customPosition === 'BOTTOM') finalVPos = 82;
    }

    const scaleFactor = (canvas.height / 1000) * finalFontScale;
    const anchorY = caption.customY !== undefined ? caption.customY * canvas.height : canvas.height * (finalVPos / 100);
    const anchorX = caption.customX !== undefined ? caption.customX * canvas.width : canvas.width * (finalHPos / 100);

    // Apply entry/exit animation transforms
    const hasEntryExit = (state.entryAnimation && state.entryAnimation !== 'NONE') ||
      (state.exitAnimation && state.exitAnimation !== 'NONE');

    if (hasEntryExit) {
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
      this.drawTypograph(ctx, canvas, caption, style, scaleFactor, anchorX, anchorY, renderTime);
    } else {
      // All other styles route through the unified drawGeneric renderer
      this.drawGeneric(ctx, canvas, caption, style, scaleFactor, anchorX, anchorY, renderTime, state);
    }

    if (hasEntryExit) {
      ctx.restore();
    }
  }

  // ─────────────────────────────────────────────────────────
  // GENERIC RENDERER (handles most styles)
  // ─────────────────────────────────────────────────────────
  private drawGeneric(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    caption: Caption,
    style: StyleConfig,
    scaleFactor: number,
    anchorX: number,
    anchorY: number,
    renderTime: number,
    state: RendererState
  ): void {
    let fontSize = style.fontSize * scaleFactor;
    const spaceWidth = fontSize * 0.3;

    // In WORD display mode, pre-shrink font if the active word overflows the canvas width.
    // We must do this BEFORE defineWord closure so fontSize is correct inside it.
    if (style.displayMode === 'WORD') {
      const rawT = style.uppercase ? caption.text.toUpperCase() : caption.text;
      const pfx = style.emojiPrefix ? style.emojiPrefix + ' ' : '';
      const sfx = style.emojiSuffix ? ' ' + style.emojiSuffix : '';
      const allWords = (pfx + rawT + sfx).split(' ');
      // Measure widest possible word in this caption
      ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
      let maxW = 0;
      allWords.forEach(w => { maxW = Math.max(maxW, this.getMixedTextWidth(ctx, w, fontSize)); });
      const allowed = canvas.width * 0.88;
      if (maxW > allowed) {
        fontSize = fontSize * (allowed / maxW);
      }
    }

    const fontStr = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
    ctx.font = fontStr;
    ctx.textAlign = style.textAlign || 'center';
    ctx.textBaseline = 'middle';

    let rawText = style.uppercase ? caption.text.toUpperCase() : caption.text;
    // Inject optional animated emoji decorations from the style config
    if (style.emojiPrefix) rawText = style.emojiPrefix + ' ' + rawText;
    if (style.emojiSuffix) rawText = rawText + ' ' + style.emojiSuffix;
    const words = rawText.split(' ');
    const wordCount = words.length;
    const captionProgress = Math.max(0, Math.min((renderTime - caption.startTime) / (caption.endTime - caption.startTime), 1));

    // Determine active word using precise word timings if available, else fallback to interpolation
    // When emojiPrefix/emojiSuffix inject extra display words, offset the activeWordIndex
    const emojiPrefixOffset = style.emojiPrefix ? 1 : 0;
    const originalWordCount = wordCount - emojiPrefixOffset - (style.emojiSuffix ? 1 : 0);
    let activeWordIndex = -1;
    let wordProgress = 1;

    if (caption.words && caption.words.length === originalWordCount) {
      // ±60ms boundary buffer compensates for API timing imprecision
      const TIMING_BUFFER = 0.06;
      let timingIndex = caption.words.findIndex(
        w => renderTime >= w.start - TIMING_BUFFER && renderTime <= w.end + TIMING_BUFFER
      );
      if (timingIndex !== -1) {
        activeWordIndex = timingIndex + emojiPrefixOffset;
        const activeW = caption.words[timingIndex];
        // Smooth ease-out progress within the word's lifetime
        wordProgress = Math.max(0, Math.min((renderTime - activeW.start) / Math.max(activeW.end - activeW.start, 0.05), 1));
      } else {
        // Not inside any word window — use the most recently passed word
        for (let i = caption.words.length - 1; i >= 0; i--) {
          if (renderTime > caption.words[i].end) { activeWordIndex = i + emojiPrefixOffset; break; }
        }
        wordProgress = 1;
      }
    } else {
      activeWordIndex = Math.min(Math.floor(captionProgress * wordCount), wordCount - 1);
      const wordDuration = (caption.endTime - caption.startTime) / wordCount;
      const wordStartTime = caption.startTime + activeWordIndex * wordDuration;
      wordProgress = Math.max(0, Math.min((renderTime - wordStartTime) / wordDuration, 1));
    }

    // Word highlight color palette for COLOR_POP / CONTEXTUAL mode
    const COLOR_POP_PALETTE = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6BFF', '#FF9F43', '#00D2D3', '#FF4757'];
    // Per-style color behavior (default: WORD_POP for backward-compat)
    const colorBehavior = style.colorBehavior || 'WORD_POP';

    const drawWord = (word: string, x: number, y: number, active: boolean, idx: number) => {
      ctx.save();

      // ── SHAKE_CAM: micro-jitter on active word ──
      if (active && style.specialRenderer === 'SHAKE_CAM') {
        const shakeIntensity = 5 * scaleFactor;
        const shakeX = Math.sin(renderTime * 73.1 + idx * 4.3) * shakeIntensity;
        const shakeY = Math.cos(renderTime * 59.7 + idx * 2.9) * shakeIntensity * 0.5;
        ctx.translate(x + shakeX, y + shakeY);
        ctx.translate(-x, -y);
      }

      // WAVE highlight mode: oscillate Y-position per word
      const wHighlightCheck = state.wordHighlight || 'NONE';
      const waveOffsetY = wHighlightCheck === 'WAVE'
        ? Math.sin(renderTime * 4 + idx * 0.9) * 10 * scaleFactor
        : 0;
      ctx.translate(x, y + waveOffsetY);

      // Rotation variance
      if (style.rotationVariance && style.rotationVariance > 0) {
        const rot = (idx % 2 === 0 ? 1 : -1) * style.rotationVariance * (Math.PI / 180);
        ctx.rotate(rot);
      }

      // Animation: POP / SCALE_UP / FIRE_POP
      if (active && style.animation === 'FIRE_POP') {
        // ── Phase 1: Explosive slam-in (first 35% of word duration) ──
        const slamT = Math.min(wordProgress / 0.35, 1);
        // Slams in from 3x size, overshoots to 1.12x, settles at 1.0
        const slamScale = slamT < 1 ? lerp(3.0, 1.12, backEaseOut(slamT)) : lerp(1.12, 1.0, easeOutQuint((wordProgress - 0.35) / 0.65));
        ctx.scale(slamScale, slamScale);

        // ── Heat shake: sub-pixel vibration on entry ──
        if (slamT < 1) {
          const shakeAmt = (1 - slamT) * 6;
          const shakeX = Math.sin(renderTime * 87.3 + idx * 3.7) * shakeAmt;
          const shakeY = Math.cos(renderTime * 63.1 + idx * 5.1) * shakeAmt * 0.5;
          ctx.translate(shakeX, shakeY);
        }
      } else if (active && style.animation === 'POP') {
        const scale = lerp(0.5, 1.15, backEaseOut(wordProgress));
        ctx.scale(scale, scale);
      } else if (active && style.animation === 'SCALE_UP') {
        const scale = lerp(0.8, 1.05, easeOutQuint(wordProgress));
        ctx.scale(scale, scale);
      }

      // Word Highlight Mode: SPOTLIGHT — dim inactive words
      const wHighlight = state.wordHighlight || 'NONE';
      if (wHighlight === 'SPOTLIGHT' && !active) {
        ctx.globalAlpha = 0.3;
      }

      // Opacity for inactive words (BLOCK_CINEMATIC_FADE)
      if (!active && style.opacityInactive !== undefined) {
        ctx.globalAlpha = style.opacityInactive;
      }

      // Background (standard or active)
      // Only draw per-word background if display mode is WORD, or if we are actively highlighting via BOX
      const isWordMode = style.displayMode === 'WORD';
      if (isWordMode) {
        const bgColor = active && style.activeBackgroundColor
          ? style.activeBackgroundColor
          : style.backgroundColor;

        if (bgColor && wHighlight !== 'BOX') {
          const wMeasure = this.getMixedTextWidth(ctx, word, fontSize);
          const p = (style.backgroundPadding || 12) * scaleFactor;
          const r = (style.backgroundBorderRadius || 0) * scaleFactor;
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.roundRect(-wMeasure / 2 - p, -fontSize / 2 - p, wMeasure + p * 2, fontSize + p * 2, r);
          ctx.fill();
        }
      }

      // FIRE_POP realistic particle fire background
      if (active && style.animation === 'FIRE_POP') {
        const wMeasure = this.getMixedTextWidth(ctx, word, fontSize);
        ctx.save();
        
        ctx.globalCompositeOperation = 'screen';
        const flameCount = 35; 
        
        for (let i = 0; i < flameCount; i++) {
          const isEmber = i > flameCount * 0.7; // last 30% are embers
          
          // Deterministic psuedo-random values
          const seed1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1; 
          const seed2 = Math.abs(Math.cos(i * 78.233) * 43758.5453) % 1;
          const seed3 = Math.abs(Math.sin(i * 39.816) * 43758.5453) % 1;
          
          // Lifecycle phase loops indefinitely based on time
          const speed = isEmber ? 2.5 + seed1 : 1.5 + seed1 * 0.5;
          const phase = (renderTime * speed + i * 0.37) % 1.0;
          
          // X spread matches word width
          const spreadX = (seed2 * 2 - 1) * (wMeasure * 0.6);
          
          // Y path rises up from behind the text
          const startY = fontSize * 0.4;
          const endY = -fontSize * (isEmber ? 1.8 + seed3 : 1.1 + seed3 * 0.4);
          const currentY = lerp(startY, endY, Math.pow(phase, 0.8)); // Decelerate upward
          
          // Sway horizontally as it rises
          const sway = Math.sin(renderTime * (3 + seed1) + i) * (15 + seed2 * 10) * scaleFactor;
          const currentX = spreadX + sway * phase;
          
          // Size shrinks over lifetime
          const baseSize = isEmber ? (fontSize * 0.08) : (fontSize * 0.35 + seed1 * fontSize * 0.15);
          const shrinkCurve = isEmber ? (1 - phase) : (1 - Math.pow(phase, 1.2));
          const currentSize = Math.max(0.1, baseSize * shrinkCurve);
          
          // Color transition: White-Hot -> Yellow -> Orange -> Deep Red -> Transparent
          let r = 255;
          let g = Math.max(0, Math.floor(lerp(240, 0, phase * 1.5)));
          let b = Math.max(0, Math.floor(lerp(100, 0, Math.min(1, phase * 4))));
          let a = Math.max(0, 1 - Math.pow(phase, 1.5));
          
          ctx.beginPath();
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a * (isEmber ? 0.9 : 0.6)})`;
          ctx.shadowColor = `rgba(${r}, ${Math.max(0, g-50)}, 0, ${a})`;
          ctx.shadowBlur = (isEmber ? 8 : 15) * scaleFactor;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          
          if (isEmber) {
             ctx.arc(currentX, currentY, currentSize, 0, Math.PI * 2);
          } else {
             // Tall flame shape
             ctx.ellipse(currentX, currentY, currentSize * 0.7, currentSize * 1.4, 0, 0, Math.PI * 2);
          }
          ctx.fill();
        }
        ctx.restore();
      }

      // Shadow
      if (style.shadowColor) {
        ctx.shadowColor = style.shadowColor;
        ctx.shadowBlur = (style.shadowBlur || 0) * scaleFactor;
        ctx.shadowOffsetX = (style.shadowOffsetX || 0) * scaleFactor;
        ctx.shadowOffsetY = (style.shadowOffsetY || 0) * scaleFactor;
      }

      // Stroke
      if (style.strokeWidth && style.strokeWidth > 0) {
        ctx.strokeStyle = style.strokeColor || '#000000';
        ctx.lineWidth = style.strokeWidth * scaleFactor;
        ctx.lineJoin = 'round';
        this.drawMixedText(ctx, word, fontSize, ctx.strokeStyle, 0, 0, true);
      }

      // --- FILL LOGIC: governed by colorBehavior ---
      let fill: string | CanvasGradient;

      // ── LIQUID_CHROME: animated metallic shimmer gradient ──
      if (style.specialRenderer === 'LIQUID_CHROME') {
        const shimmerPhase = (renderTime * 0.6 + idx * 0.15) % 1.0;
        const wGrad = this.getMixedTextWidth(ctx, word, fontSize);
        // Shift gradient stops based on time to create a shimmer sweep across the text
        const shimmerGrad = ctx.createLinearGradient(-wGrad / 2, 0, wGrad / 2, 0);
        const goldBright = `hsl(${42 + Math.sin(renderTime * 1.5 + idx) * 12}, 90%, ${active ? 72 : 55}%)`;
        const silver     = `hsl(0, 0%, ${active ? 90 : 70}%)`;
        const goldDim    = `hsl(${38 + Math.cos(renderTime + idx * 0.5) * 8}, 70%, ${active ? 60 : 45}%)`;
        // Animate stop positions for the sweep effect
        const pivot = (shimmerPhase + idx * 0.2) % 1.0;
        shimmerGrad.addColorStop(0, silver);
        shimmerGrad.addColorStop(Math.max(0, pivot - 0.3), silver);
        shimmerGrad.addColorStop(pivot, goldBright);
        shimmerGrad.addColorStop(Math.min(1, pivot + 0.3), goldDim);
        shimmerGrad.addColorStop(1, silver);
        fill = shimmerGrad;
      } else if (colorBehavior === 'FIXED') {
        // FIXED: always use the style's static color or gradient — never transform per word
        if (style.gradientColors && style.gradientColors.length >= 2) {
          const wGrad = this.getMixedTextWidth(ctx, word, fontSize);
          const gradient = ctx.createLinearGradient(-wGrad / 2, 0, wGrad / 2, 0);
          style.gradientColors.forEach((color, i) => {
            gradient.addColorStop(i / (style.gradientColors!.length - 1), color);
          });
          fill = gradient;
        } else {
          fill = style.textColor;
        }
      } else if (colorBehavior === 'ACTIVE_ONLY') {
        // ACTIVE_ONLY: inactive words are dim, active gets accent color
        if (active && style.activeTextColor) {
          fill = style.activeTextColor;
        } else {
          fill = style.textColor;
          if (!active) ctx.globalAlpha = Math.min(ctx.globalAlpha, style.opacityInactive ?? 0.35);
        }
      } else if (colorBehavior === 'CONTEXTUAL') {
        // CONTEXTUAL: use AI-assigned wordColors from transcript, fallback to COLOR_POP palette
        if (caption.wordColors && caption.wordColors[idx] && caption.wordColors[idx] !== 'default') {
          fill = caption.wordColors[idx];
        } else {
          fill = COLOR_POP_PALETTE[idx % COLOR_POP_PALETTE.length];
        }
        // Active word still gets accent if defined
        if (active && style.activeTextColor) fill = style.activeTextColor;
      } else {
        // WORD_POP (default): active word gets accent color, inactive uses textColor or gradient
        if (active && style.activeTextColor) {
          fill = style.activeTextColor;
        } else if (style.gradientColors && style.gradientColors.length >= 2) {
          const wGrad = this.getMixedTextWidth(ctx, word, fontSize);
          const gradient = ctx.createLinearGradient(-wGrad / 2, 0, wGrad / 2, 0);
          style.gradientColors.forEach((color, i) => {
            gradient.addColorStop(i / (style.gradientColors!.length - 1), color);
          });
          fill = gradient;
        } else {
          fill = style.textColor;
        }
        // User-set word color overrides (Transcript Editor) — only for WORD_POP
        if (caption.wordColors && caption.wordColors[idx] && caption.wordColors[idx] !== 'default') {
          fill = caption.wordColors[idx];
        }
      }

      // --- GLOBAL Word Highlight Mode (from AnimationPanel) — overrides colorBehavior ---

      // Global highlight mode overrides (COLOR_POP, KARAOKE)
      if (wHighlight === 'COLOR_POP') {
        fill = COLOR_POP_PALETTE[idx % COLOR_POP_PALETTE.length];
      }
      if (wHighlight === 'KARAOKE' && active) {
        fill = '#FACC15';
      } else if (wHighlight === 'KARAOKE' && !active) {
        ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.5);
      }

      // Reset shadow before fill to avoid double-shadow on stroke
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Re-apply clean shadow for fill text
      if (style.shadowColor) {
        ctx.shadowColor = style.shadowColor;
        ctx.shadowBlur = (style.shadowBlur || 0) * scaleFactor;
        ctx.shadowOffsetX = (style.shadowOffsetX || 0) * scaleFactor;
        ctx.shadowOffsetY = (style.shadowOffsetY || 0) * scaleFactor;
      }

      // Word Highlight Mode: BOX — draw colored background box for active word
      if (wHighlight === 'BOX' && active) {
        const wMeasure = this.getMixedTextWidth(ctx, word, fontSize);
        const boxPad = 6 * scaleFactor;
        ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
        ctx.beginPath();
        ctx.roundRect(-wMeasure / 2 - boxPad, -fontSize / 2 - boxPad * 0.5, wMeasure + boxPad * 2, fontSize + boxPad, 4 * scaleFactor);
        ctx.fill();
        fill = '#000000'; // Black text on yellow box
      }

      // ── DUAL_COLOR: top-half golden / bottom-half white split text ──
      if (style.specialRenderer === 'DUAL_COLOR') {
        const wMeasure = this.getMixedTextWidth(ctx, word, fontSize);
        // Top half: gold fill (clipped to upper 50% of text height)
        ctx.save();
        ctx.beginPath();
        ctx.rect(-wMeasure, -fontSize, wMeasure * 2, fontSize * 0.55);
        ctx.clip();
        const goldFill = active && style.activeTextColor ? style.activeTextColor : '#FFD700';
        this.drawMixedText(ctx, word, fontSize, goldFill, 0, 0, false);
        ctx.restore();
        // Bottom half: white fill (clipped to lower 50% of text height)
        ctx.save();
        ctx.beginPath();
        ctx.rect(-wMeasure, -fontSize * 0.45, wMeasure * 2, fontSize * 1.5);
        ctx.clip();
        this.drawMixedText(ctx, word, fontSize, '#FFFFFF', 0, 0, false);
        ctx.restore();
      } else {
        // Draw text (with inline animated emojis)
        this.drawMixedText(ctx, word, fontSize, fill as string | CanvasGradient, 0, 0, false);
      }

      // KARAOKE dynamic highlight filling (style-level)
      if (active && style.animation === 'KARAOKE' && style.activeTextColor) {
        ctx.save();
        const wordWidth = this.getMixedTextWidth(ctx, word, fontSize);
        // Clip to the percentage of wordProgress
        ctx.beginPath();
        ctx.rect(-wordWidth / 2 - 2, -fontSize, (wordWidth + 4) * wordProgress, fontSize * 2);
        ctx.clip();

        this.drawMixedText(ctx, word, fontSize, style.activeTextColor, 0, 0, false);
        ctx.restore();
      }

      // Word Highlight Mode: UNDERLINE — animated underline under active word
      if (wHighlight === 'UNDERLINE' && active) {
        const wMeasure = this.getMixedTextWidth(ctx, word, fontSize);
        const underlineY = fontSize * 0.65;
        const underlineWidth = wMeasure * wordProgress;
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#FACC15';
        ctx.lineWidth = 3 * scaleFactor;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-wMeasure / 2, underlineY);
        ctx.lineTo(-wMeasure / 2 + underlineWidth, underlineY);
        ctx.stroke();
        ctx.restore();
      }

      // Word Highlight Mode: FIRE — realistic fire colors for active word without the oval background
      if (wHighlight === 'FIRE' && active) {
        const fireFlicker = 0.85 + Math.sin(renderTime * 18.3 + idx * 2.1) * 0.15;
        ctx.save();
        // Re-draw text on top with fire color and shadow glow (excluding the hardcoded oval shape)
        ctx.shadowColor = '#FF6B00';
        ctx.shadowBlur = 20 * scaleFactor * fireFlicker;
        this.drawMixedText(ctx, word, fontSize, '#FFEE00', 0, 0, false);
        ctx.restore();
      }

      // Word Highlight Mode: RAINBOW — cycling hue per word
      if (wHighlight === 'RAINBOW') {
        const hue = (renderTime * 80 + idx * 45) % 360;
        if (active) {
          ctx.save();
          ctx.shadowColor = `hsl(${hue},100%,60%)`;
          ctx.shadowBlur = 18 * scaleFactor;
          this.drawMixedText(ctx, word, fontSize, `hsl(${hue},100%,65%)`, 0, 0, false);
          ctx.restore();
        } else {
          // Inactive words get a soft hue tint
          ctx.save();
          ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.6);
          this.drawMixedText(ctx, word, fontSize, `hsl(${(hue + 120) % 360},80%,60%)`, 0, 0, false);
          ctx.restore();
        }
      }

      // Word Highlight Mode: SPARKLE — glowing star dots around active word
      if (wHighlight === 'SPARKLE' && active) {
        const wMeasure = this.getMixedTextWidth(ctx, word, fontSize);
        ctx.save();
        ctx.shadowBlur = 0;
        const sparkleCount = 6;
        for (let s = 0; s < sparkleCount; s++) {
          const angle = (s / sparkleCount) * Math.PI * 2 + renderTime * 2.5;
          const radius = (wMeasure * 0.65) + Math.sin(renderTime * 4 + s * 1.3) * (wMeasure * 0.15);
          const sx = Math.cos(angle) * radius;
          const sy = Math.sin(angle) * radius * 0.5;
          const sparkAlpha = 0.6 + Math.sin(renderTime * 8 + s * 2.1) * 0.4;
          const sparkSize = (2 + Math.sin(renderTime * 6 + s) * 1.5) * scaleFactor;
          ctx.globalAlpha = sparkAlpha;
          ctx.fillStyle = ['#FFD700','#FF69B4','#00FFFF','#A855F7','#FF6B6B','#7FFF00'][s % 6];
          ctx.beginPath();
          ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Reset
      ctx.globalAlpha = 1;
      ctx.restore();
    };

    if (style.displayMode === 'WORD') {
      // Single-word mode: display only the active word centered.
      // Font was pre-shrunk above; now just clamp position within safe canvas bounds.
      if (activeWordIndex >= 0 && activeWordIndex < words.length) {
        const currWord = words[activeWordIndex];

        // Clamp anchorX so the word never bleeds off the sides
        const halfW = this.getMixedTextWidth(ctx, currWord, fontSize) / 2;
        const safeLeft  = halfW + canvas.width * 0.04;
        const safeRight = canvas.width - halfW - canvas.width * 0.04;
        const clampedX = Math.max(safeLeft, Math.min(safeRight, anchorX));

        // Clamp anchorY so word doesn't go above/below canvas
        const safeTopY    = canvas.height * 0.06;
        const safeBottomY = canvas.height * 0.96;
        const clampedY = Math.max(safeTopY, Math.min(safeBottomY, anchorY));

        drawWord(currWord, clampedX, clampedY, true, activeWordIndex);
      }
    } else {
      // BLOCK mode — wrap text into lines
      const maxWidth = canvas.width * 0.8;
      const lines: { text: string; words: string[]; startIndex: number }[] = [];
      let currentLineWords: string[] = [];
      let currentLineWidth = 0;
      let currentLineStartIndex = 0;

      words.forEach((word, index) => {
        const wWidth = this.getMixedTextWidth(ctx, word, fontSize);
        const newWidth = currentLineWidth + wWidth + (currentLineWords.length > 0 ? spaceWidth : 0);

        if (newWidth > maxWidth && currentLineWords.length > 0) {
          lines.push({ text: currentLineWords.join(' '), words: currentLineWords, startIndex: currentLineStartIndex });
          currentLineWords = [word];
          currentLineWidth = wWidth;
          currentLineStartIndex = index;
        } else {
          currentLineWords.push(word);
          currentLineWidth = newWidth;
        }
      });
      if (currentLineWords.length > 0) {
        lines.push({ text: currentLineWords.join(' '), words: currentLineWords, startIndex: currentLineStartIndex });
      }

      const lineHeight = fontSize * 1.3;
      const totalHeight = lines.length * lineHeight;
      const safeBottom = canvas.height * 0.92;
      const safeTop = canvas.height * 0.15;

      let effectiveY = anchorY;
      if (effectiveY + totalHeight / 2 > safeBottom) effectiveY = safeBottom - totalHeight / 2;
      else if (effectiveY - totalHeight / 2 < safeTop) effectiveY = safeTop + totalHeight / 2;

      let startY = effectiveY - totalHeight / 2 + lineHeight / 2;

      lines.forEach((line) => {
        const lineWidth = this.getMixedTextWidth(ctx, line.text, fontSize);
        let curX = anchorX - (style.textAlign === 'center' ? lineWidth / 2 : style.textAlign === 'right' ? lineWidth : 0);

        // Draw unified block background for the entire line
        if (style.backgroundColor) {
          const p = (style.backgroundPadding || 12) * scaleFactor;
          const r = (style.backgroundBorderRadius || 0) * scaleFactor;
          ctx.save();
          ctx.fillStyle = style.backgroundColor;
          ctx.beginPath();
          // curX is the left-edge of the text. startY is the vertical center of the text.
          ctx.roundRect(curX - p, startY - fontSize / 2 - p, lineWidth + p * 2, fontSize + p * 2, r);
          ctx.fill();
          ctx.restore();
        }

        line.words.forEach((w, i) => {
          const globalIndex = line.startIndex + i;
          const wWidth = this.getMixedTextWidth(ctx, w, fontSize);
          drawWord(w, curX + wWidth / 2, startY, globalIndex === activeWordIndex, globalIndex);
          curX += wWidth + spaceWidth;
        });
        startY += lineHeight;
      });
    }
  }

  // ─────────────────────────────────────────────────────────
  // TRENDING STYLE RENDERER
  // ─────────────────────────────────────────────────────────
  private drawTrending(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    caption: Caption,
    scaleFactor: number,
    anchorX: number,
    anchorY: number,
    renderTime: number
  ): void {
    if (!caption.text) return;
    const elapsed = renderTime - caption.startTime;
    const duration = caption.endTime - caption.startTime;
    const progress = Math.min(elapsed / duration, 1);

    const words = caption.text.trim().split(/\s+/);
    const totalWords = words.length;

    let activeWordIndex = -1;
    if (caption.words && caption.words.length === totalWords) {
      activeWordIndex = caption.words.findIndex(w => renderTime >= w.start && renderTime <= w.end);
      if (activeWordIndex === -1) {
        const passedWords = caption.words.filter(w => renderTime > w.end);
        if (passedWords.length > 0) activeWordIndex = passedWords.length - 1;
      }
    } else {
      activeWordIndex = Math.floor(progress * totalWords);
    }

    let baseFontSize = 70 * scaleFactor;
    ctx.font = `900 ${baseFontSize}px Montserrat, sans-serif`;

    // Measure and auto-scale
    let totalWidth = 0;
    words.forEach(word => {
      totalWidth += this.getMixedTextWidth(ctx, word.toUpperCase() + " ", baseFontSize);
    });

    const maxWidth = canvas.width * 0.90;
    let finalScaleFactor = 1.0;
    if (totalWidth > maxWidth) finalScaleFactor = maxWidth / totalWidth;

    const finalFontSize = baseFontSize * finalScaleFactor;
    ctx.font = `900 ${finalFontSize}px Montserrat, sans-serif`;

    totalWidth = 0;
    const finalWordWidths = words.map(word => {
      const w = this.getMixedTextWidth(ctx, word.toUpperCase() + " ", finalFontSize);
      totalWidth += w;
      return w;
    });

    let currentX = anchorX - totalWidth / 2;

    words.forEach((word, index) => {
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const isPast = index < activeWordIndex;
      const isActive = index === activeWordIndex;

      let wordScale = 1;
      if (isActive) {
        let wordProgress = 1;
        if (caption.words && caption.words[index]) {
          const w = caption.words[index];
          wordProgress = Math.max(0, Math.min((renderTime - w.start) / (w.end - w.start), 1));
        } else {
          const wordDuration = duration / totalWords;
          const wordElapsed = elapsed - index * wordDuration;
          wordProgress = Math.max(0, Math.min(wordElapsed / wordDuration, 1));
        }
        const t = Math.min(wordProgress / 0.3, 1); // Only scale in the first 30% of the word
        wordScale = Math.max(1, Math.min(backEaseOut(t), 1.2));
      }

      ctx.translate(currentX + finalWordWidths[index] / 2, anchorY);
      ctx.scale(wordScale, wordScale);
      ctx.translate(-(currentX + finalWordWidths[index] / 2), -anchorY);

      const textToDraw = word.toUpperCase();

      if (isActive) {
        // 3D extrusion
        ctx.fillStyle = "#091E5E";
        const depth = 8 * scaleFactor * finalScaleFactor;
        for (let i = depth; i > 0; i -= 1) {
          this.drawMixedText(ctx, textToDraw, finalFontSize, "#091E5E", currentX + i, anchorY + i, false);
        }
        // Gradient fill
        const gradient = ctx.createLinearGradient(currentX, anchorY - finalFontSize / 2, currentX, anchorY + finalFontSize / 2);
        gradient.addColorStop(0, "#3FA2FF");
        gradient.addColorStop(1, "#1A5BFF");
        ctx.fillStyle = gradient;
        ctx.shadowColor = "rgba(26, 91, 255, 0.8)";
        ctx.shadowBlur = 20 * scaleFactor;
      } else if (isPast) {
        ctx.fillStyle = "#FF3B3B";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 6 * scaleFactor;
        ctx.shadowOffsetY = 2 * scaleFactor;
      } else {
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 6 * scaleFactor;
        ctx.shadowOffsetY = 2 * scaleFactor;
      }

      let fillStyle = ctx.fillStyle;
      if (caption.wordColors && caption.wordColors[index] && caption.wordColors[index] !== 'default') {
        fillStyle = caption.wordColors[index];
      }
      this.drawMixedText(ctx, textToDraw, finalFontSize, fillStyle, currentX, anchorY, false);
      ctx.restore();
      currentX += finalWordWidths[index];
    });
  }

  // ─────────────────────────────────────────────────────────
  // NEON_IMPACT / VIRAL_CREATOR RENDERER
  // ─────────────────────────────────────────────────────────
  private drawNeonOrViralCreator(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    caption: Caption,
    scaleFactor: number,
    anchorX: number,
    anchorY: number,
    renderTime: number,
    currentStyle: CaptionStyle
  ): void {
    if (!caption.text) return;
    const isNeon = false; // Legacy: this renderer is no longer called
    const elapsed = renderTime - caption.startTime;

    const words = caption.text.trim().split(/\s+/);
    let secondary = "", primary = "", accent = "";

    if (words.length === 1) { primary = words[0]; }
    else if (words.length === 2) { secondary = words[0]; primary = words[1]; }
    else { secondary = words[0]; primary = words[1]; accent = words.slice(2).join(" "); }

    const primaryFontSize = (isNeon ? 65 : 70) * scaleFactor;
    const secondaryFontSize = (isNeon ? 22 : 24) * scaleFactor;
    const accentFontSize = (isNeon ? 20 : 20) * scaleFactor;

    // Measure widths for fit scaling
    ctx.font = `900 ${primaryFontSize}px 'Anton', sans-serif`;
    const primaryWidth = ctx.measureText(primary.toUpperCase()).width;

    ctx.font = `600 ${isNeon ? 'italic ' : ''}${secondaryFontSize}px 'Montserrat', sans-serif`;
    const secondaryWidth = ctx.measureText(secondary).width;

    ctx.font = `700 ${accentFontSize}px '${isNeon ? 'Montserrat' : 'Poppins'}', sans-serif`;
    const accentChars = Array.from(accent.toUpperCase());
    const accentLetterSpacing = 2 * scaleFactor;
    const rawAccentWidth = accentChars.reduce((acc, c) => acc + ctx.measureText(c).width, 0);
    const accentWidth = rawAccentWidth + (accentChars.length > 0 ? (accentChars.length - 1) * accentLetterSpacing : 0);

    const maxWidth = canvas.width * 0.80;
    let fitScale = 1.0;
    const maxTextWidth = Math.max(primaryWidth, secondaryWidth, accentWidth + 48 * scaleFactor);
    if (maxTextWidth > maxWidth) fitScale = maxWidth / maxTextWidth;

    const finalPrimSize = primaryFontSize * fitScale;
    const finalSecSize = secondaryFontSize * fitScale;
    const finalAccSize = accentFontSize * fitScale;

    const primHeight = finalPrimSize * 0.85;
    const secHeight = secondary ? finalSecSize * 0.9 : 0;
    const padX = 20 * scaleFactor * fitScale;
    const padY = 8 * scaleFactor * fitScale;
    const accHeight = accent ? finalAccSize * 1.0 + padY * 2 : 0;
    const gap = 4 * scaleFactor * fitScale;
    const totalHeight = secHeight + (secondary ? gap : 0) + primHeight + (accent ? gap : 0) + accHeight;

    let currentY = anchorY - totalHeight / 2;

    const secDelay = 0, primDelay = 0.25, accDelay = 0.50;
    const animDuration = 0.45;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Secondary text
    if (secondary) {
      const secElapsed = Math.max(0, elapsed - secDelay);
      const secT = Math.min(secElapsed / animDuration, 1);
      const yOffset = (1 - secT) * (-20 * scaleFactor);

      ctx.save();
      ctx.globalAlpha = secT;
      ctx.translate(anchorX, currentY + secHeight / 2 + yOffset);
      ctx.font = `600 ${isNeon ? 'italic ' : ''}${finalSecSize}px 'Montserrat', sans-serif`;
      ctx.fillStyle = isNeon ? "#FFD84D" : "#FFFFFF";
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 6 * scaleFactor * fitScale;
      ctx.shadowOffsetY = 3 * scaleFactor * fitScale;
      ctx.fillText(secondary, 0, finalSecSize * 0.05);
      ctx.restore();
      currentY += secHeight + gap;
    }

    // Primary text
    if (primary) {
      const primElapsed = Math.max(0, elapsed - primDelay);
      const primT = Math.min(primElapsed / animDuration, 1);
      let primScale = primT > 0 ? Math.max(0, backEaseOut(primT)) : 0;

      ctx.save();
      if (primT > 0) {
        ctx.translate(anchorX, currentY + primHeight / 2);
        ctx.scale(primScale, primScale);
        ctx.font = `900 ${finalPrimSize}px 'Anton', sans-serif`;
        const textToDraw = primary.toUpperCase();
        const textW = ctx.measureText(textToDraw).width;
        const visualOffsetY = finalPrimSize * 0.08;

        if (isNeon) {
          ctx.shadowColor = "#FF00C8";
          ctx.shadowBlur = 25 * scaleFactor * fitScale;
          ctx.fillStyle = "#FF00C8";
          ctx.fillText(textToDraw, 0, visualOffsetY);
          ctx.shadowBlur = 0;
          ctx.lineWidth = 10 * scaleFactor * fitScale;
          ctx.strokeStyle = "#000000";
          ctx.strokeText(textToDraw, 0, visualOffsetY);
          const gradient = ctx.createLinearGradient(-textW / 2, 0, textW / 2, 0);
          gradient.addColorStop(0, "#FF00C8");
          gradient.addColorStop(1, "#00E5FF");
          ctx.fillStyle = gradient;
          ctx.fillText(textToDraw, 0, visualOffsetY);
        } else {
          ctx.shadowColor = "rgba(0,0,0,0.6)";
          ctx.shadowBlur = 15 * scaleFactor * fitScale;
          ctx.shadowOffsetY = 8 * scaleFactor * fitScale;
          ctx.lineWidth = 12 * scaleFactor * fitScale;
          ctx.strokeStyle = "#000000";
          ctx.strokeText(textToDraw, 0, visualOffsetY);
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
          ctx.fillStyle = "#FFD400";
          ctx.fillText(textToDraw, 0, visualOffsetY);
        }
      }
      ctx.restore();
      currentY += primHeight + gap;
    }

    // Accent text
    if (accent) {
      const accElapsed = Math.max(0, elapsed - accDelay);
      const accT = Math.min(accElapsed / animDuration, 1);
      let accScale = accT > 0 ? Math.max(0, backEaseOut(accT)) : 0;

      ctx.save();
      if (accT > 0) {
        ctx.translate(anchorX, currentY + accHeight / 2);
        ctx.scale(accScale, accScale);
        ctx.font = `700 ${finalAccSize}px '${isNeon ? 'Montserrat' : 'Poppins'}', sans-serif`;
        const textToDraw = accent.toUpperCase();

        const letterSpacing = 2 * scaleFactor * fitScale;
        const chars = Array.from(textToDraw);
        let totalTextW = 0;
        const charWidths = chars.map(c => {
          const w = ctx.measureText(c).width;
          totalTextW += w + letterSpacing;
          return w;
        });
        totalTextW -= letterSpacing;

        const bgWidth = totalTextW + padX * 2;
        const bgHeight = finalAccSize * 1.0 + padY * 2;
        const radius = (isNeon ? 12 : 10) * scaleFactor * fitScale;

        ctx.fillStyle = isNeon ? "#000000" : "#FF2B2B";
        ctx.beginPath();
        ctx.roundRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, radius);
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        let charX = -totalTextW / 2;
        const visualOffsetY = finalAccSize * 0.08;
        chars.forEach((c, i) => {
          ctx.fillText(c, charX + charWidths[i] / 2, visualOffsetY);
          charX += charWidths[i] + letterSpacing;
        });
      }
      ctx.restore();
    }
  }

  // ─────────────────────────────────────────────────────────
  // INSTAGRAM TEMPLATE RENDERER
  // ─────────────────────────────────────────────────────────
  private drawInstagramTemplate(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    caption: Caption,
    scaleFactor: number,
    anchorX: number,
    anchorY: number,
    renderTime: number
  ): void {
    if (!caption.text) return;
    const elapsed = renderTime - caption.startTime;
    const duration = caption.endTime - caption.startTime;
    const progress = Math.min(elapsed / duration, 1);

    const words = caption.text.trim().split(/\s+/);
    const totalWords = words.length;
    const activeWordIndex = Math.floor(progress * totalWords);

    let baseFontSize = 65 * scaleFactor;

    // Distribute words into up to 3 lines
    const lines: { words: string[]; lineIndex: number }[] = [];
    if (totalWords === 1) {
      lines.push({ words: [words[0]], lineIndex: 1 });
    } else if (totalWords === 2) {
      lines.push({ words: [words[0]], lineIndex: 0 });
      lines.push({ words: [words[1]], lineIndex: 1 });
    } else if (totalWords === 3) {
      lines.push({ words: [words[0]], lineIndex: 0 });
      lines.push({ words: [words[1]], lineIndex: 1 });
      lines.push({ words: [words[2]], lineIndex: 2 });
    } else if (totalWords === 4) {
      lines.push({ words: [words[0], words[1]], lineIndex: 0 });
      lines.push({ words: [words[2]], lineIndex: 1 });
      lines.push({ words: [words[3]], lineIndex: 2 });
    } else if (totalWords === 5) {
      lines.push({ words: [words[0], words[1]], lineIndex: 0 });
      lines.push({ words: [words[2], words[3]], lineIndex: 1 });
      lines.push({ words: [words[4]], lineIndex: 2 });
    } else {
      const l1Count = Math.ceil(totalWords / 3);
      const l2Count = Math.ceil((totalWords - l1Count) / 2);
      lines.push({ words: words.slice(0, l1Count), lineIndex: 0 });
      lines.push({ words: words.slice(l1Count, l1Count + l2Count), lineIndex: 1 });
      lines.push({ words: words.slice(l1Count + l2Count), lineIndex: 2 });
    }

    const lineStyles = [
      { sizeMult: 0.7, font: 'italic 800', defaultColor: '#FFDE00', stroke: '#000000', strokeWidth: 8, shadow: '#000000', shadowDepth: 6 },
      { sizeMult: 1.3, font: '900', defaultColor: '#1E4DFF', stroke: '#FFFFFF', strokeWidth: 10, shadow: '#000000', shadowDepth: 8 },
      { sizeMult: 0.8, font: 'italic 900', defaultColor: '#FF2B2B', stroke: '#FFFFFF', strokeWidth: 8, shadow: '#000000', shadowDepth: 6 }
    ];

    // Fit-scaling pass
    let maxLineWidth = 0;
    lines.forEach(line => {
      const ls = lineStyles[line.lineIndex];
      ctx.font = `${ls.font} ${baseFontSize * ls.sizeMult}px Montserrat, sans-serif`;
      let lineWidth = 0;
      line.words.forEach(w => { lineWidth += this.getMixedTextWidth(ctx, w.toUpperCase() + " ", baseFontSize * ls.sizeMult); });
      if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
    });

    const maxWidth = canvas.width * 0.85;
    if (maxLineWidth > maxWidth) baseFontSize *= maxWidth / maxLineWidth;

    // Metrics pass
    let totalHeight = 0;
    const lineMetrics = lines.map(line => {
      const ls = lineStyles[line.lineIndex];
      const fSize = baseFontSize * ls.sizeMult;
      ctx.font = `${ls.font} ${fSize}px Montserrat, sans-serif`;
      let lineWidth = 0;
      const wordWidths = line.words.map(w => {
        const ww = this.getMixedTextWidth(ctx, w.toUpperCase() + " ", fSize);
        lineWidth += ww;
        return ww;
      });
      const lineHeight = fSize * 1.1;
      totalHeight += lineHeight;
      return { width: lineWidth, height: lineHeight, wordWidths, fontSize: fSize };
    });

    let startY = anchorY - totalHeight / 2;
    let globalWordIndex = 0;

    lines.forEach((line, lIdx) => {
      const ls = lineStyles[line.lineIndex];
      const metrics = lineMetrics[lIdx];

      ctx.font = `${ls.font} ${metrics.fontSize}px Montserrat, sans-serif`;
      let startX = anchorX - metrics.width / 2;
      if (line.lineIndex === 0) startX -= baseFontSize * 0.4;
      if (line.lineIndex === 2) startX += baseFontSize * 0.4;

      let currentX = startX;
      const currentLineCenterY = startY + metrics.height / 2;

      line.words.forEach((word, wIdx) => {
        const wIndex = globalWordIndex++;
        const isActive = wIndex === activeWordIndex;

        if (wIndex > activeWordIndex) {
          currentX += metrics.wordWidths[wIdx];
          return;
        }

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        let wordScale = 1;
        if (isActive) {
          const wordDuration = duration / totalWords;
          const wordElapsed = elapsed - wIndex * wordDuration;
          const t = Math.min(wordElapsed / 0.15, 1);
          wordScale = Math.max(1, Math.min(backEaseOut(t), 1.2));
        }

        ctx.translate(currentX + metrics.wordWidths[wIdx] / 2, currentLineCenterY);
        ctx.scale(wordScale, wordScale);
        ctx.translate(-(currentX + metrics.wordWidths[wIdx] / 2), -currentLineCenterY);

        const textToDraw = word.toUpperCase();

        // 3D extrusion shadow
        const shadowDepth = ls.shadowDepth * scaleFactor;
        ctx.fillStyle = ls.shadow;
        for (let i = shadowDepth; i > 0; i -= 1) {
          this.drawMixedText(ctx, textToDraw, metrics.fontSize, ls.shadow, currentX + i, currentLineCenterY + i, false);
          ctx.lineWidth = ls.strokeWidth * scaleFactor;
          ctx.strokeStyle = ls.shadow;
          this.drawMixedText(ctx, textToDraw, metrics.fontSize, ls.shadow, currentX + i, currentLineCenterY + i, true);
        }

        // Stroke
        ctx.lineWidth = ls.strokeWidth * scaleFactor;
        ctx.strokeStyle = ls.stroke;
        this.drawMixedText(ctx, textToDraw, metrics.fontSize, ls.stroke, currentX, currentLineCenterY, true);

        // Fill
        ctx.fillStyle = ls.defaultColor;
        this.drawMixedText(ctx, textToDraw, metrics.fontSize, ls.defaultColor, currentX, currentLineCenterY, false);

        ctx.restore();
        currentX += metrics.wordWidths[wIdx];
      });

      startY += metrics.height;
    });
  }

  // ─────────────────────────────────────────────────────────
  // TYPOGRAPH RENDERER — editorial magazine typographic style
  // ─────────────────────────────────────────────────────────
  private drawTypograph(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    caption: Caption,
    style: StyleConfig,
    scaleFactor: number,
    anchorX: number,
    anchorY: number,
    renderTime: number
  ): void {
    if (!caption.text) return;

    const elapsed = renderTime - caption.startTime;
    const duration = caption.endTime - caption.startTime;
    const captionProgress = Math.max(0, Math.min(elapsed / duration, 1));

    // ── Font & measurement setup ──
    const fontSize = style.fontSize * scaleFactor;
    const tracking = 6 * scaleFactor; // extra letter-spacing between chars
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;

    const rawWords = (style.uppercase ? caption.text.toUpperCase() : caption.text).trim().split(/\s+/);
    const wordCount = rawWords.length;

    // ── Determine active word ──
    let activeWordIndex = -1;
    let wordProgress = 1;
    if (caption.words && caption.words.length === wordCount) {
      const BUFFER = 0.06;
      const found = caption.words.findIndex(w => renderTime >= w.start - BUFFER && renderTime <= w.end + BUFFER);
      if (found !== -1) {
        activeWordIndex = found;
        const w = caption.words[found];
        wordProgress = Math.max(0, Math.min((renderTime - w.start) / Math.max(w.end - w.start, 0.05), 1));
      } else {
        for (let i = wordCount - 1; i >= 0; i--) {
          if (renderTime > caption.words[i].end) { activeWordIndex = i; break; }
        }
        wordProgress = 1;
      }
    } else {
      activeWordIndex = Math.min(Math.floor(captionProgress * wordCount), wordCount - 1);
      const wd = duration / wordCount;
      const ws = caption.startTime + activeWordIndex * wd;
      wordProgress = Math.max(0, Math.min((renderTime - ws) / wd, 1));
    }

    // Helper: measure word with tracking
    const measureWord = (word: string): number => {
      const chars = Array.from(word);
      return chars.reduce((sum, c) => sum + ctx.measureText(c).width, 0) + Math.max(0, chars.length - 1) * tracking;
    };

    // ── Measure all words to find the widest (strip width is max of all) ──
    const wordWidths = rawWords.map(w => measureWord(w));
    const maxWordWidth = Math.max(...wordWidths);
    const padH = (style.backgroundPadding || 26) * scaleFactor;
    const padV = padH * 0.55;
    const stripW = Math.min(maxWordWidth + padH * 2, canvas.width * 0.92);
    const stripH = fontSize + padV * 2;
    const accentBarW = 7 * scaleFactor; // left accent bar width
    const stripX = anchorX - stripW / 2;
    const stripY = anchorY - stripH / 2;

    // ── Entry animation: slide-up + fade ──
    const entryDur = Math.min(duration * 0.18, 0.25);
    const entryT = easeOutQuint(Math.min(elapsed / entryDur, 1));
    const entryOffsetY = (1 - entryT) * 30 * scaleFactor;
    const entryAlpha = Math.max(0.01, entryT);

    ctx.save();
    ctx.globalAlpha = entryAlpha;
    ctx.translate(0, entryOffsetY);

    // ── Draw full-width dark strip background ──
    ctx.fillStyle = style.backgroundColor || 'rgba(12,12,12,0.88)';
    ctx.beginPath();
    ctx.rect(stripX, stripY, stripW, stripH);
    ctx.fill();

    // ── Left accent bar (animated fill from bottom) ──
    const accentFill = easeOutQuint(Math.min(elapsed / Math.max(duration * 0.35, 0.001), 1));
    const accentBarH = stripH * accentFill;
    const accentGrad = ctx.createLinearGradient(0, stripY + stripH, 0, stripY);
    accentGrad.addColorStop(0, '#E8B84B'); // warm gold
    accentGrad.addColorStop(1, '#F5D78E');
    ctx.fillStyle = accentGrad;
    ctx.beginPath();
    ctx.rect(stripX, stripY + stripH - accentBarH, accentBarW, accentBarH);
    ctx.fill();

    // ── Draw active word with tracked characters ──
    const activeWord = activeWordIndex >= 0 && activeWordIndex < rawWords.length
      ? rawWords[activeWordIndex]
      : (rawWords[wordCount - 1] || '');
    const activeWordW = wordWidths[activeWordIndex >= 0 ? activeWordIndex : wordCount - 1] || 0;

    // Pop scale on word reveal
    const popScale = backEaseOut(Math.min(wordProgress / 0.4, 1));
    const wordCenterX = anchorX;
    const wordCenterY = anchorY;

    ctx.save();
    ctx.translate(wordCenterX, wordCenterY);
    ctx.scale(lerp(0.88, 1, popScale), lerp(0.88, 1, popScale));

    // Draw tracked characters (letter-spaced)
    const chars = Array.from(activeWord);
    let totalCharW = measureWord(activeWord);
    let charX = -totalCharW / 2;

    // Subtle shadow for depth
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 6 * scaleFactor;
    ctx.shadowOffsetY = 3 * scaleFactor;

    chars.forEach((c) => {
      const cw = ctx.measureText(c).width;
      ctx.fillStyle = style.activeTextColor || '#F5F0E8';
      ctx.fillText(c, charX, 0);
      charX += cw + tracking;
    });

    ctx.restore();

    // ── Animated underline bar on active word ──
    const underlineY = anchorY + fontSize * 0.58;
    const underlineMaxW = activeWordW;
    const underlineProgress = easeOutQuint(Math.min(wordProgress / 0.55, 1));
    const underlineW = underlineMaxW * underlineProgress;
    const underlineH = 3.5 * scaleFactor;

    ctx.save();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    const ulGrad = ctx.createLinearGradient(anchorX - underlineW / 2, 0, anchorX + underlineW / 2, 0);
    ulGrad.addColorStop(0, '#E8B84B');
    ulGrad.addColorStop(1, '#F5D78E');
    ctx.fillStyle = ulGrad;
    ctx.beginPath();
    ctx.rect(anchorX - underlineW / 2, underlineY, underlineW, underlineH);
    ctx.fill();
    ctx.restore();

    // ── Word counter dots (tiny editorial page markers) ──
    const dotRadius = 2.5 * scaleFactor;
    const dotSpacing = 10 * scaleFactor;
    const dotsW = (wordCount - 1) * dotSpacing;
    const dotsStartX = anchorX - dotsW / 2;
    const dotsY = stripY - 10 * scaleFactor;

    for (let i = 0; i < wordCount; i++) {
      const dotX = dotsStartX + i * dotSpacing;
      ctx.beginPath();
      ctx.arc(dotX, dotsY, dotRadius, 0, Math.PI * 2);
      if (i < activeWordIndex) {
        ctx.fillStyle = '#E8B84B';
        ctx.globalAlpha = entryAlpha;
      } else if (i === activeWordIndex) {
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = entryAlpha;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.globalAlpha = entryAlpha * 0.6;
      }
      ctx.fill();
    }

    ctx.restore(); // restore entry animation translate
  }

  resetZoom(): void {
    this.currentZoom = 1.0;
  }

  // ─────────────────────────────────────────────────────────
  // STICKER RENDERING — Real Noto animated GIFs via drawImage
  // ─────────────────────────────────────────────────────────
  private getOrLoadImage(url: string): HTMLImageElement {
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

    img.src = url;
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
      if (img.naturalWidth > 0) {
        ctx.drawImage(img, -halfSz, -halfSz, halfSz * 2, halfSz * 2);
      }

      ctx.restore();
    });
  }
}
