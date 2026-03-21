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

    // Route to style-specific renderers
    switch (state.currentStyle) {
      case CaptionStyle.INSTAGRAM_TEMPLATE:
        this.drawInstagramTemplate(ctx, canvas, caption, scaleFactor, anchorX, anchorY, renderTime);
        break;
      case CaptionStyle.TRENDING:
        this.drawTrending(ctx, canvas, caption, scaleFactor, anchorX, anchorY, renderTime);
        break;
      case CaptionStyle.NEON_IMPACT:
      case CaptionStyle.VIRAL_CREATOR:
        this.drawNeonOrViralCreator(ctx, canvas, caption, scaleFactor, anchorX, anchorY, renderTime, state.currentStyle);
        break;
      default:
        this.drawGeneric(ctx, canvas, caption, style, scaleFactor, anchorX, anchorY, renderTime, state);
        break;
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
    const fontSize = style.fontSize * scaleFactor;
    const spaceWidth = fontSize * 0.3;

    const fontStr = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
    ctx.font = fontStr;
    ctx.textAlign = style.textAlign || 'center';
    ctx.textBaseline = 'middle';

    const rawText = style.uppercase ? caption.text.toUpperCase() : caption.text;
    const words = rawText.split(' ');
    const wordCount = words.length;
    const captionProgress = Math.max(0, Math.min((renderTime - caption.startTime) / (caption.endTime - caption.startTime), 1));

    // Determine active word using precise word timings if available, else fallback to interpolation
    let activeWordIndex = -1;
    let wordProgress = 1;

    if (caption.words && caption.words.length === wordCount) {
      activeWordIndex = caption.words.findIndex(w => renderTime >= w.start && renderTime <= w.end);
      if (activeWordIndex !== -1) {
        const activeW = caption.words[activeWordIndex];
        // Ease out quint slightly for the active word's life progress
        wordProgress = Math.max(0, Math.min((renderTime - activeW.start) / (activeW.end - activeW.start), 1));
      } else {
        // If not strictly inside any word, find latest word before renderTime
        const passedWords = caption.words.filter(w => renderTime > w.end);
        if (passedWords.length > 0) activeWordIndex = passedWords.length - 1; // last passed word
      }
    } else {
      activeWordIndex = Math.min(Math.floor(captionProgress * wordCount), wordCount - 1);
      const wordDuration = (caption.endTime - caption.startTime) / wordCount;
      const wordStartTime = caption.startTime + activeWordIndex * wordDuration;
      wordProgress = Math.max(0, Math.min((renderTime - wordStartTime) / wordDuration, 1));
    }

    // Word highlight color palette for COLOR_POP mode
    const COLOR_POP_PALETTE = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6BFF', '#FF9F43', '#00D2D3', '#FF4757'];

    const drawWord = (word: string, x: number, y: number, active: boolean, idx: number) => {
      ctx.save();
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

      // Animation: POP / SCALE_UP
      if (active && style.animation === 'POP') {
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
      const bgColor = active && style.activeBackgroundColor
        ? style.activeBackgroundColor
        : style.backgroundColor;

      if (bgColor) {
        const w = ctx.measureText(word).width;
        const p = (style.backgroundPadding || 12) * scaleFactor;
        const r = (style.backgroundBorderRadius || 0) * scaleFactor;
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(-w / 2 - p, -fontSize / 2 - p, w + p * 2, fontSize + p * 2, r);
        ctx.fill();
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
        ctx.strokeText(word, 0, 0);
      }

      // Fill — gradient support
      let fill: string | CanvasGradient;
      if (active && style.activeTextColor) {
        fill = style.activeTextColor;
      } else if (style.gradientColors && style.gradientColors.length >= 2) {
        const w = ctx.measureText(word).width;
        const gradient = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        const stops = style.gradientColors.length;
        style.gradientColors.forEach((color, i) => {
          gradient.addColorStop(i / (stops - 1), color);
        });
        fill = gradient;
      } else {
        fill = style.textColor;
      }

      // Word-level custom color overrides (from Transcript Editor or AI)
      if (caption.wordColors && caption.wordColors[idx] && caption.wordColors[idx] !== 'default') {
        fill = caption.wordColors[idx];
      }

      // Word Highlight Mode: COLOR_POP — each word gets a unique vibrant color
      if (wHighlight === 'COLOR_POP') {
        fill = COLOR_POP_PALETTE[idx % COLOR_POP_PALETTE.length];
      }

      // Word Highlight Mode: KARAOKE (global) — active word gets accent color
      if (wHighlight === 'KARAOKE' && active) {
        fill = '#FACC15'; // Yellow karaoke highlight
      } else if (wHighlight === 'KARAOKE' && !active) {
        ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.5);
      }

      // Reset shadow before fill to avoid double-shadow
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Re-apply shadow for fill
      if (style.shadowColor) {
        ctx.shadowColor = style.shadowColor;
        ctx.shadowBlur = (style.shadowBlur || 0) * scaleFactor;
        ctx.shadowOffsetX = (style.shadowOffsetX || 0) * scaleFactor;
        ctx.shadowOffsetY = (style.shadowOffsetY || 0) * scaleFactor;
      }

      // Word Highlight Mode: BOX — draw colored background box for active word
      if (wHighlight === 'BOX' && active) {
        const wMeasure = ctx.measureText(word).width;
        const boxPad = 6 * scaleFactor;
        ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
        ctx.beginPath();
        ctx.roundRect(-wMeasure / 2 - boxPad, -fontSize / 2 - boxPad * 0.5, wMeasure + boxPad * 2, fontSize + boxPad, 4 * scaleFactor);
        ctx.fill();
        fill = '#000000'; // Black text on yellow box
      }

      ctx.fillStyle = fill as string;
      ctx.fillText(word, 0, 0);

      // KARAOKE dynamic highlight filling (style-level)
      if (active && style.animation === 'KARAOKE' && style.activeTextColor) {
        ctx.save();
        const wordWidth = ctx.measureText(word).width;
        // Clip to the percentage of wordProgress
        ctx.beginPath();
        ctx.rect(-wordWidth / 2 - 2, -fontSize, (wordWidth + 4) * wordProgress, fontSize * 2);
        ctx.clip();

        ctx.fillStyle = style.activeTextColor;
        ctx.fillText(word, 0, 0);
        ctx.restore();
      }

      // Word Highlight Mode: UNDERLINE — animated underline under active word
      if (wHighlight === 'UNDERLINE' && active) {
        const wMeasure = ctx.measureText(word).width;
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

      // Word Highlight Mode: FIRE — radial fire glow around active word
      if (wHighlight === 'FIRE' && active) {
        const wMeasure = ctx.measureText(word).width;
        const fireFlicker = 0.85 + Math.sin(renderTime * 18.3 + idx * 2.1) * 0.15;
        ctx.save();
        ctx.shadowBlur = 0;
        const fireGrad = ctx.createRadialGradient(0, 0, wMeasure * 0.1, 0, 0, wMeasure * 0.9 * fireFlicker);
        fireGrad.addColorStop(0, 'rgba(255,220,0,0.7)');
        fireGrad.addColorStop(0.4, 'rgba(255,100,0,0.5)');
        fireGrad.addColorStop(1, 'rgba(255,30,0,0)');
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, wMeasure * 0.8 * fireFlicker, fontSize * 1.2 * fireFlicker, 0, 0, Math.PI * 2);
        ctx.fill();
        // Re-draw text on top with fire color
        ctx.shadowColor = '#FF6B00';
        ctx.shadowBlur = 20 * scaleFactor * fireFlicker;
        ctx.fillStyle = '#FFEE00';
        ctx.fillText(word, 0, 0);
        ctx.restore();
      }

      // Word Highlight Mode: RAINBOW — cycling hue per word
      if (wHighlight === 'RAINBOW') {
        const hue = (renderTime * 80 + idx * 45) % 360;
        if (active) {
          ctx.save();
          ctx.shadowColor = `hsl(${hue},100%,60%)`;
          ctx.shadowBlur = 18 * scaleFactor;
          ctx.fillStyle = `hsl(${hue},100%,65%)`;
          ctx.fillText(word, 0, 0);
          ctx.restore();
        } else {
          // Inactive words get a soft hue tint
          ctx.save();
          ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.6);
          ctx.fillStyle = `hsl(${(hue + 120) % 360},80%,60%)`;
          ctx.fillText(word, 0, 0);
          ctx.restore();
        }
      }

      // Word Highlight Mode: SPARKLE — glowing star dots around active word
      if (wHighlight === 'SPARKLE' && active) {
        const wMeasure = ctx.measureText(word).width;
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
      // CapCut-style 3-word context window: dim prev | ACTIVE | dim next
      const prevIdx = activeWordIndex - 1;
      const nextIdx = activeWordIndex + 1;

      // Active word — centered
      if (activeWordIndex >= 0 && activeWordIndex < words.length) {
        drawWord(words[activeWordIndex], anchorX, anchorY, true, activeWordIndex);
      }

      // Previous word — left of active, dimmed
      if (prevIdx >= 0) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        const activeW = ctx.measureText(words[activeWordIndex] || '').width;
        const prevW = ctx.measureText(words[prevIdx]).width;
        const prevX = anchorX - (activeW / 2 + spaceWidth + prevW / 2) * 1.5;
        drawWord(words[prevIdx], prevX, anchorY, false, prevIdx);
        ctx.restore();
      }

      // Next word — right of active, dimmed
      if (nextIdx < words.length) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        const activeW = ctx.measureText(words[activeWordIndex] || '').width;
        const nextW = ctx.measureText(words[nextIdx]).width;
        const nextX = anchorX + (activeW / 2 + spaceWidth + nextW / 2) * 1.5;
        drawWord(words[nextIdx], nextX, anchorY, false, nextIdx);
        ctx.restore();
      }
    } else {
      // BLOCK mode — wrap text into lines
      const maxWidth = canvas.width * 0.8;
      const lines: { text: string; words: string[]; startIndex: number }[] = [];
      let currentLineWords: string[] = [];
      let currentLineWidth = 0;
      let currentLineStartIndex = 0;

      words.forEach((word, index) => {
        const wWidth = ctx.measureText(word).width;
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
        const lineWidth = ctx.measureText(line.text).width;
        let curX = anchorX - (style.textAlign === 'center' ? lineWidth / 2 : style.textAlign === 'right' ? lineWidth : 0);

        line.words.forEach((w, i) => {
          const globalIndex = line.startIndex + i;
          const wWidth = ctx.measureText(w).width;
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
      totalWidth += ctx.measureText(word.toUpperCase() + " ").width;
    });

    const maxWidth = canvas.width * 0.90;
    let finalScaleFactor = 1.0;
    if (totalWidth > maxWidth) finalScaleFactor = maxWidth / totalWidth;

    const finalFontSize = baseFontSize * finalScaleFactor;
    ctx.font = `900 ${finalFontSize}px Montserrat, sans-serif`;

    totalWidth = 0;
    const finalWordWidths = words.map(word => {
      const w = ctx.measureText(word.toUpperCase() + " ").width;
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
          ctx.fillText(textToDraw, currentX + i, anchorY + i);
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

      if (caption.wordColors && caption.wordColors[index] && caption.wordColors[index] !== 'default') {
        ctx.fillStyle = caption.wordColors[index];
      }
      ctx.fillText(textToDraw, currentX, anchorY);
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
    const isNeon = currentStyle === CaptionStyle.NEON_IMPACT;
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
      line.words.forEach(w => { lineWidth += ctx.measureText(w.toUpperCase() + " ").width; });
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
        const ww = ctx.measureText(w.toUpperCase() + " ").width;
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
          ctx.fillText(textToDraw, currentX + i, currentLineCenterY + i);
          ctx.lineWidth = ls.strokeWidth * scaleFactor;
          ctx.strokeStyle = ls.shadow;
          ctx.strokeText(textToDraw, currentX + i, currentLineCenterY + i);
        }

        // Stroke
        ctx.lineWidth = ls.strokeWidth * scaleFactor;
        ctx.strokeStyle = ls.stroke;
        ctx.strokeText(textToDraw, currentX, currentLineCenterY);

        // Fill
        ctx.fillStyle = ls.defaultColor;
        ctx.fillText(textToDraw, currentX, currentLineCenterY);

        ctx.restore();
        currentX += metrics.wordWidths[wIdx];
      });

      startY += metrics.height;
    });
  }

  resetZoom(): void {
    this.currentZoom = 1.0;
  }

  // ─────────────────────────────────────────────────────────
  // STICKER RENDERING (Phase 5)
  // ─────────────────────────────────────────────────────────
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
      const fontSize = 48 * sticker.scale;

      ctx.save();
      ctx.globalAlpha = sticker.opacity;
      ctx.translate(x, y);

      // Sticker animation
      const elapsed = renderTime - sticker.startTime;
      let stickerScale = 1;
      switch (sticker.animation) {
        case 'BOUNCE':
          stickerScale = 1 + 0.1 * Math.sin(elapsed * 6);
          break;
        case 'SPIN':
          ctx.rotate(elapsed * 2);
          break;
        case 'PULSE':
          stickerScale = 1 + 0.15 * Math.sin(elapsed * 4);
          break;
        case 'SHAKE':
          ctx.translate(Math.sin(elapsed * 20) * 3, 0);
          break;
      }

      if (sticker.rotation) ctx.rotate(sticker.rotation * Math.PI / 180);
      ctx.scale(stickerScale, stickerScale);

      ctx.font = `${fontSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sticker.emoji, 0, 0);

      ctx.restore();
    });
  }
}
