/**
 * Typography Canvas Renderer
 *
 * Renders word-by-word animations to a 2D canvas.
 * Handles 30 FPS animation, text layout, effects, and audio sync.
 *
 * Performance optimized:
 * - RequestAnimationFrame for smooth 60 FPS capable
 * - Offscreen canvas for text measurement
 * - Minimal state mutations
 */

import type {
  AnimationSequence,
  CanvasRenderState,
  LayoutConfiguration,
  RenderMetrics,
  WordAnimation,
} from './types';

// ─── Renderer Class ────────────────────────────────────────────────────────

export class TypographyRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  sequence: AnimationSequence;
  layout: LayoutConfiguration;

  // Performance tracking
  frameCount = 0;
  lastFrameTime = 0;
  fps = 0;
  droppedFrames = 0;
  consecutiveDroppedFrames = 0;
  lastDropWarningTime = 0;
  lastHealthCheckFrame = 0;
  private prevMemoryMB = 0;

  // Metrics
  metrics: RenderMetrics = {
    fps: 60,
    frameTime: 16.67,
    droppedFrames: 0,
    memoryUsageMB: 0,
  };

  // Offscreen canvas for text measurement
  private measureCanvas: HTMLCanvasElement;
  private measureCtx: CanvasRenderingContext2D;

  private noisePattern: CanvasPattern | null = null;
  private lastActiveWordId: string | null = null;
  private emojiCache = new Map<string, HTMLImageElement>();
  private emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu;

  get scaleFactor(): number {
    return Math.min(this.layout.width / 1080, this.layout.height / 1920);
  }

  constructor(
    canvasElement: HTMLCanvasElement,
    sequence: AnimationSequence
  ) {
    this.canvas = canvasElement;
    const ctx = canvasElement.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.sequence = sequence;
    this.layout = sequence.layout;

    // Setup offscreen canvas for text measurement
    this.measureCanvas = document.createElement('canvas');
    this.measureCanvas.width = this.layout.width;
    this.measureCanvas.height = this.layout.height;
    const measureCtx = this.measureCanvas.getContext('2d');
    if (!measureCtx) {
      throw new Error('Failed to get measurement context');
    }
    this.measureCtx = measureCtx;

    // Set canvas size - DO NOT apply DPI scaling, let CSS handle it
    this.canvas.width = this.layout.width;
    this.canvas.height = this.layout.height;

    // Set CSS size to match
    this.canvas.style.width = `${this.layout.width}px`;
    this.canvas.style.height = `${this.layout.height}px`;

    // Generate texture noise pattern if configured
    if (this.layout.backgroundType === 'textured_solid') {
      const textureOpacity = this.layout.backgroundTextureOpacity !== undefined ? this.layout.backgroundTextureOpacity : 0.15;
      const noiseCanvas = this.generateNoisePattern(textureOpacity);
      if (noiseCanvas) {
        this.noisePattern = this.ctx.createPattern(noiseCanvas, 'repeat');
      }
    }

    // Initialize
    this.preloadFonts();
  }

  private generateNoisePattern(opacity: number): HTMLCanvasElement | null {
    const width = 256;
    const height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 50; // Random offset around 0
      data[i] = 128 + noise;     // R
      data[i+1] = 128 + noise;   // G
      data[i+2] = 128 + noise;   // B
      data[i+3] = opacity * 255; // Alpha
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  // ─── Main Render Loop ──────────────────────────────────────────────────

  render(currentTime: number, audioElement?: HTMLAudioElement, onWordTrigger?: (word: WordAnimation) => void): void {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;

    // Track FPS
    if (deltaTime > 0) {
      this.fps = Math.round(1000 / deltaTime);
      this.metrics.fps = this.fps;
      this.metrics.frameTime = deltaTime;
    }
    this.lastFrameTime = now;
    this.frameCount++;

    // ─── Frame Drop Detection ──────────────────────────────────────────────
    // Line 100: Detect frame drops (30 FPS threshold = 33.3ms per frame)
    const FRAME_DROP_THRESHOLD_MS = 33.3;
    if (deltaTime > FRAME_DROP_THRESHOLD_MS) {
      this.droppedFrames++;
      this.consecutiveDroppedFrames++;

      // Line 105: Log warning to console for frame drops
      console.warn(
        `Frame drop: ${deltaTime.toFixed(1)}ms (${this.fps} FPS) - consider lowering quality`
      );

      // Line 109: Throttle warnings to avoid log spam (max 1 warning per 500ms)
      const now = performance.now();
      if (now - this.lastDropWarningTime > 500) {
        console.warn(
          `[Render Performance] Consistent frame drops detected. Device may struggle with current settings.`
        );
        this.lastDropWarningTime = now;
      }
    } else {
      // Reset consecutive counter on good frames
      this.consecutiveDroppedFrames = 0;
    }

    // Line 119: Track dropped frames in metrics
    this.metrics.droppedFrames = this.droppedFrames;

    // ─── Memory Tracking ───────────────────────────────────────────────────
    // Track memory usage every frame
    if (typeof (performance as any).memory !== 'undefined') {
      this.metrics.memoryUsageMB = (performance as any).memory.usedJSHeapSize / 1024 / 1024;

      // Warn if memory usage is high
      if (this.metrics.memoryUsageMB > 500) {
        console.warn(`[typography] High memory usage: ${this.metrics.memoryUsageMB.toFixed(1)} MB`);
      }

      // Memory spike detection (track previous frame's memory)
      const memoryIncrease = this.metrics.memoryUsageMB - this.prevMemoryMB;
      if (memoryIncrease > 50) {  // 50 MB increase is a spike
        console.warn(`[typography] Memory spike: +${memoryIncrease.toFixed(1)} MB`);
      }
      this.prevMemoryMB = this.metrics.memoryUsageMB;
    }

    // Log memory stats periodically (every second at 30 FPS = every 30 frames)
    if (this.frameCount % 30 === 0) {
      console.log(`[typography] Memory: ${this.metrics.memoryUsageMB.toFixed(1)} MB, FPS: ${this.fps}`);
    }

    // Line 130: Check frame health every 30 frames
    if (this.frameCount - this.lastHealthCheckFrame >= 30) {
      this.checkFrameHealth();
      this.lastHealthCheckFrame = this.frameCount;
    }

    // Sync with audio if provided
    const playbackTime = audioElement
      ? audioElement.currentTime
      : currentTime / 1000;

    // Clear canvas with background color
    this.ctx.fillStyle = this.layout.backgroundColor || '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply texture overlay if configured
    if (this.noisePattern) {
      this.ctx.fillStyle = this.noisePattern;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.sequence.animations.length === 0) {
      return; // Nothing to render
    }

    // Find the SINGLE most active animation
    let activeIdx = -1;
    let activeAnimation: WordAnimation | null = null;
    let maxProgress = -1;

    for (let i = 0; i < this.sequence.animations.length; i++) {
      const anim = this.sequence.animations[i];
      const elapsed = playbackTime - anim.startTime;

      // Check if animation is currently active
      if (elapsed >= 0 && elapsed < anim.duration) {
        const progress = elapsed / anim.duration;

        // Pick the animation that's most in-progress
        if (progress > maxProgress) {
          maxProgress = progress;
          activeAnimation = anim;
          activeIdx = i;
        }
      }
    }

    // Render the active animation / phrase
    if (activeAnimation && activeIdx !== -1) {
      if (activeAnimation.wordId !== this.lastActiveWordId) {
        this.lastActiveWordId = activeAnimation.wordId;
        onWordTrigger?.(activeAnimation);
      }
      const layoutStyle = this.layout.layoutStyle || 'center';

      if (layoutStyle === 'center') {
        this.renderWordAnimation(activeAnimation, playbackTime, 1.0, { x: 0, y: 0 });
      } else {
        // Find boundaries of the current phrase block (words close in timing)
        let startIdx = activeIdx;
        while (startIdx > 0) {
          const prev = this.sequence.animations[startIdx - 1];
          const curr = this.sequence.animations[startIdx];
          if (curr.startTime - (prev.startTime + prev.duration) < 0.8) {
            startIdx--;
          } else {
            break;
          }
        }

        // Limit phrase to maximum 4 words to keep screen clean
        const phraseStart = Math.max(startIdx, activeIdx - 3);
        const phraseWords = this.sequence.animations.slice(phraseStart, activeIdx + 1);

        phraseWords.forEach((anim, idx) => {
          const phraseWordIdx = phraseStart + idx;
          const isCurrentActive = phraseWordIdx === activeIdx;

          // Compute offsets and scaling based on layoutStyle and relative index
          let offsetX = 0;
          let offsetY = 0;
          let scaleMult = 1.0;
          let opacityMult = 1.0;

          const relIdx = phraseWordIdx - activeIdx; // 0 for active, -1 for previous, etc.
          const sf = this.scaleFactor;

          if (layoutStyle === 'stacking') {
            offsetY = relIdx * 90 * sf; // Stack vertically upwards
            scaleMult = 1.0 + relIdx * 0.15; // older words are smaller
            opacityMult = isCurrentActive ? 1.0 : Math.max(0.1, 1.0 + relIdx * 0.55); // older words fade out
          } else if (layoutStyle === 'scattered') {
            const positions = [
              { x: -120, y: -160 },
              { x: 140, y: -80 },
              { x: -90, y: 60 },
              { x: 40, y: 140 }
            ];
            const posIdx = phraseWordIdx % positions.length;
            const slot = positions[posIdx];
            offsetX = slot.x * sf;
            offsetY = slot.y * sf;

            opacityMult = isCurrentActive ? 1.0 : Math.max(0.1, 1.0 + relIdx * 0.4);
            scaleMult = isCurrentActive ? 1.0 : 0.85;
          }

          if (isCurrentActive) {
            this.renderWordAnimation(anim, playbackTime, opacityMult, { x: offsetX, y: offsetY }, scaleMult);
          } else {
            // Render previous words at their final animation state
            const finalTime = anim.startTime + anim.duration - 0.01;
            this.renderWordAnimation(anim, finalTime, opacityMult, { x: offsetX, y: offsetY }, scaleMult);
          }
        });
      }
    } else {
      this.lastActiveWordId = null;
    }

    // Draw watermark if configured
    if (this.layout.watermarkText) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.20; // 20% opacity
      this.ctx.font = `600 28px "Inter"`;
      this.ctx.fillStyle = this.layout.watermarkText.startsWith('#') || this.layout.backgroundColor === '#F5F2EB' ? '#1A1A1A' : '#FFFFFF';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText(this.layout.watermarkText, this.layout.width / 2, this.layout.height - 100);
      this.ctx.restore();
    }

    // Draw visual safe-zone corner anchor progress/badge at 25% opacity
    this.drawCornerAnchorBadge();
  }

  // ─── Word Animation Renderer ───────────────────────────────────────────

  private renderWordAnimation(
    anim: WordAnimation,
    currentTime: number,
    globalOpacity = 1.0,
    offset = { x: 0, y: 0 },
    scaleMultiplier = 1.0
  ): void {
    const elapsed = currentTime - anim.startTime;
    const progress = Math.max(
      0,
      Math.min(1, elapsed / anim.duration)
    );

    // Calculate animation phase (entry, hold, exit)
    const totalDuration = anim.timing.entryDuration +
      anim.timing.holdDuration +
      anim.timing.exitDuration;

    let animationProgress = 0;
    let phase: 'entry' | 'hold' | 'exit' = 'entry';

    if (elapsed < anim.timing.entryDuration) {
      animationProgress = elapsed / anim.timing.entryDuration;
      phase = 'entry';
    } else if (elapsed < anim.timing.entryDuration + anim.timing.holdDuration) {
      animationProgress = 1.0;
      phase = 'hold';
    } else {
      const exitStart = anim.timing.entryDuration + anim.timing.holdDuration;
      animationProgress = Math.max(
        0,
        1 - (elapsed - exitStart) / anim.timing.exitDuration
      );
      phase = 'exit';
    }

    // Apply easing
    const easedProgress = this.applyEasing(
      animationProgress,
      phase === 'entry' ? anim.timing.entryEasing : anim.timing.exitEasing
    );

    // Calculate visual properties
    const totalWordProgress = Math.max(0, Math.min(1, elapsed / anim.duration));
    const properties = this.calculateAnimationProperties(
      anim,
      easedProgress,
      phase,
      totalWordProgress
    ) as any;

    // Apply continuous subtle zoom (drift of 1.0 to 1.05) over word duration
    const scaleDrift = 1.0 + totalWordProgress * 0.05;
    properties.scale = (properties.scale || 1.0) * scaleDrift * scaleMultiplier;

    // Apply offset positioning
    properties.x = (properties.x || this.layout.width / 2) + offset.x;
    properties.y = (properties.y || this.layout.height / 2) + offset.y;

    // Store eased progress for animations (e.g. bouncing emoji)
    properties.progress = easedProgress;
    properties.phase = phase;
    properties.totalProgress = totalWordProgress;
    properties.type = anim.type; // Pass animation type down for custom clipping/styling

    // Render text with styling
    this.renderText(anim.text, properties, globalOpacity);
  }

  private calculateAnimationProperties(
    anim: WordAnimation,
    progress: number,
    phase: 'entry' | 'hold' | 'exit',
    totalProgress: number
  ) {
    const base = {
      x: this.layout.width / 2,
      y: this.layout.height / 2,
      scale: 1.0,
      opacity: 1.0,
      rotation: 0,
      color: anim.style.color,
      fontSize: anim.style.fontSize || 52,
      fontFamily: anim.style.fontFamily || 'Space Grotesk',
      fontWeight: anim.style.fontWeight || 700,
    };

    // Apply animation type
    switch (anim.type) {
      case 'fade-in':
        return {
          ...base,
          opacity: progress,
        };

      case 'slide-left':
        return {
          ...base,
          x: base.x - (1 - progress) * 100,
          opacity: progress,
        };

      case 'slide-right':
        return {
          ...base,
          x: base.x + (1 - progress) * 100,
          opacity: progress,
        };

      case 'slide-up':
        return {
          ...base,
          y: base.y + (1 - progress) * 100,
          opacity: progress,
        };

      case 'scale-up':
        return {
          ...base,
          scale: 0.8 + progress * 0.2,
          opacity: progress,
        };

      case 'bounce-in':
        // Ease-out elastic
        const bounceProgress = this.elasticEaseOut(progress);
        return {
          ...base,
          scale: bounceProgress * (anim.scaleAmount || 1.2),
          opacity: progress,
        };

      case 'pop-slide-up':
        const popProgress = this.overshootEaseOut(progress);
        return {
          ...base,
          scale: popProgress,
          y: base.y + (1 - progress) * 30, // slide up 30px
          opacity: Math.min(1.0, progress * 2), // fade in faster
        };

      case 'whip-pan':
        // Fast whip from left (-400px)
        return {
          ...base,
          x: base.x - (1 - progress) * 400,
          opacity: Math.min(1.0, progress * 4),
        };

      case 'mask-reveal':
        // Handled in renderText via clipping
        return { ...base, opacity: progress };

      case 'scale-pop':
        // Pop dynamically using totalProgress
        const scaleAmountVal = anim.scaleAmount || 1.3;
        const popScale = totalProgress < 0.25
          ? 1.0 + (totalProgress / 0.25) * (scaleAmountVal - 1.0)
          : 1.0 + Math.max(0, 1.0 - (totalProgress - 0.25) / 0.75) * (scaleAmountVal - 1.0) * 0.15;
        return {
          ...base,
          scale: popScale,
          color: anim.colorTransition || anim.style.color,
        };

      case 'typewriter':
        // Handled by clip region in renderText
        return { ...base, opacity: 1.0 };

      case 'glitch':
        // RGB channel shift
        const glitchTime = Math.sin(totalProgress * Math.PI * 12);
        return {
          ...base,
          x: base.x + (glitchTime > 0.8 || glitchTime < -0.8 ? (Math.random() - 0.5) * 15 : 0),
          opacity: glitchTime > 0.9 ? 0.6 : 1.0,
        };

      case 'glow-pulse':
        return {
          ...base,
          opacity: 0.6 + Math.sin(totalProgress * Math.PI * 6) * 0.4,
        };

      case 'shake':
        // Continuous organic shake
        const shakeVal = Math.sin(totalProgress * Math.PI * 12) * 8 * (1.0 - totalProgress);
        return {
          ...base,
          x: base.x + shakeVal * (Math.random() > 0.5 ? 1 : -1),
          y: base.y + shakeVal * (Math.random() > 0.5 ? -1 : 1),
        };

      case 'slide-down':
        return {
          ...base,
          y: base.y - (1 - progress) * 100,
          opacity: progress,
        };

      case 'rotate-in':
        return {
          ...base,
          rotation: (1 - progress) * Math.PI * 2,
          scale: progress,
          opacity: progress,
        };

      case 'blur-in':
        return {
          ...base,
          opacity: progress,
          scale: 0.9 + progress * 0.1,
        };

      case 'color-flash':
        const flashColor = totalProgress < 0.3
          ? anim.colorTransition || anim.style.color
          : anim.style.color;
        return {
          ...base,
          color: flashColor,
          opacity: 1.0,
        };

      case 'aurora':
        return {
          ...base,
          opacity: 0.8 + Math.sin(totalProgress * Math.PI * 4) * 0.2,
          scale: 1.0 + Math.sin(totalProgress * Math.PI * 2) * 0.06,
        };

      case 'fire':
        const flameOffset = Math.sin(totalProgress * Math.PI * 15) * 5;
        return {
          ...base,
          y: base.y - Math.abs(flameOffset),
          scale: 0.95 + Math.sin(totalProgress * Math.PI * 6) * 0.05,
          opacity: progress,
        };

      case 'shimmer':
        return {
          ...base,
          opacity: 0.7 + Math.sin(totalProgress * Math.PI * 8) * 0.3,
        };

      case 'wave':
        return {
          ...base,
          x: base.x + Math.sin(totalProgress * Math.PI * 4) * 20,
          y: base.y + Math.cos(totalProgress * Math.PI * 6) * 15,
          opacity: progress,
        };

      case 'kinetic':
        const bounceAmount = Math.sin(totalProgress * Math.PI * 2) * 0.08;
        return {
          ...base,
          scale: 1.0 + bounceAmount,
          opacity: progress,
        };

      case 'karaoke':
        // Filled color reveals as progress increases
        return {
          ...base,
          color: anim.colorTransition || anim.style.color,
          opacity: 1.0,
        };

      default:
        return base;
    }
  }

  // ─── Text Rendering ───────────────────────────────────────────────────

  private renderText(
    text: string,
    properties: any,
    globalOpacity: number
  ): void {
    const {
      x = this.layout.width / 2,
      y = this.layout.height / 2,
      scale = 1.0,
      opacity = 1.0,
      color = '#FFFFFF',
      rotation = 0,
      fontSize = 52,
      fontFamily = 'Space Grotesk',
      fontWeight = 700,
      letterSpacing = 0,
      textCase = 'normal',
      type = '',
    } = properties;

    // Validate inputs
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return; // Don't render empty text
    }

    // Extract emoji and clean text
    const emojiMatch = text.match(this.emojiRegex);
    const emoji = emojiMatch ? emojiMatch[0] : null;
    const cleanText = text.replace(this.emojiRegex, '').trim();

    // Validate if anything remains to be rendered
    if (cleanText.length === 0 && !emoji) {
      return;
    }

    // Process text case
    let displayText = cleanText;
    if (cleanText.length > 0) {
      if (textCase === 'uppercase') {
        displayText = cleanText.toUpperCase();
      } else if (textCase === 'lowercase') {
        displayText = cleanText.toLowerCase();
      } else if (textCase === 'capitalize') {
        displayText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1).toLowerCase();
      }
    }

    // Save context state
    this.ctx.save();

    // Apply opacity (fixed squaring bug where opacity was multiplied by itself)
    this.ctx.globalAlpha = Math.max(0, Math.min(1, opacity * globalOpacity));

    // Handle mask reveal clipping if applicable
    if (type === 'mask-reveal' && cleanText.length > 0) {
      const progress = opacity; // opacity stores phase progress in mask-reveal case
      this.ctx.font = `${fontWeight} ${fontSize}px "${fontFamily}"`;
      const textWidth = this.ctx.measureText(displayText).width;
      const leftBound = -textWidth / 2;
      const clipWidth = textWidth * progress;
      
      this.ctx.beginPath();
      this.ctx.rect(x + leftBound, y - fontSize, clipWidth, fontSize * 2);
      this.ctx.clip();
    }

    // Transform from center point
    this.ctx.translate(x, y);
    if (rotation !== 0) {
      this.ctx.rotate(rotation);
    }
    if (scale !== 1 && scale > 0) {
      this.ctx.scale(scale, scale);
    }

    // Text style
    const scaleFactor = this.scaleFactor;
    const adjustedFontSize = fontSize * scaleFactor;
    const fontSizeNum = Math.max(8, Math.min(200, adjustedFontSize));
    const fontWeightNum = Math.max(100, Math.min(900, fontWeight));
    this.ctx.font = `${fontWeightNum} ${fontSizeNum}px "${fontFamily}"`;
    this.ctx.fillStyle = color || '#FFFFFF';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Apply letterSpacing if supported
    if ('letterSpacing' in this.ctx) {
      (this.ctx as any).letterSpacing = `${letterSpacing || 0}px`;
    }

    // Determine highlight box styling
    const isBgBox = this.layout.emphasisStyle === 'bg-box' && fontSizeNum >= 80 && cleanText.length > 0;

    let textWidth = 0;
    if (cleanText.length > 0) {
      textWidth = this.ctx.measureText(displayText).width;
    }

    if (isBgBox) {
      this.ctx.save();
      // Apply shadow to background box
      this.ctx.shadowColor = properties.shadowColor || 'rgba(0, 0, 0, 0.4)';
      this.ctx.shadowBlur = properties.shadowBlur || 8;
      this.ctx.shadowOffsetX = properties.shadowOffsetX !== undefined ? properties.shadowOffsetX : 2;
      this.ctx.shadowOffsetY = properties.shadowOffsetY !== undefined ? properties.shadowOffsetY : 3;

      const paddingX = fontSizeNum * 0.4;
      const paddingY = fontSizeNum * 0.25;
      const boxWidth = textWidth + paddingX * 2;
      const boxHeight = fontSizeNum + paddingY * 2;
      const boxX = -boxWidth / 2;
      const boxY = -boxHeight / 2;

      this.ctx.fillStyle = color; // Accent color
      this.drawRoundedRect(this.ctx, boxX, boxY, boxWidth, boxHeight, fontSizeNum * 0.3);
      this.ctx.fill();
      this.ctx.restore();

      // Draw text in charcoal/black over box
      this.ctx.fillStyle = '#1A1A1A';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    } else {
      // Add stronger drop shadow for normal text readability on any background
      this.ctx.shadowColor = properties.shadowColor || 'rgba(0, 0, 0, 0.6)'; // Raised opacity (was 0.4)
      this.ctx.shadowBlur = properties.shadowBlur || 12; // Raised blur (was 8)
      this.ctx.shadowOffsetX = properties.shadowOffsetX !== undefined ? properties.shadowOffsetX : 3;
      this.ctx.shadowOffsetY = properties.shadowOffsetY !== undefined ? properties.shadowOffsetY : 4;
    }

    // Draw text if any
    if (cleanText.length > 0) {
      // Draw outline stroke first if specified (so fill overlays cleanly)
      const strokeColor = properties.strokeColor;
      const strokeWidth = properties.strokeWidth;
      if (strokeColor && strokeWidth) {
        this.ctx.save();
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = strokeWidth * scaleFactor;
        this.ctx.lineJoin = 'round';
        this.ctx.strokeText(displayText, 0, 0);
        this.ctx.restore();
      }

      this.ctx.fillText(displayText, 0, 0);
    }

    // Draw custom CDN Twemoji image if applicable
    if (emoji) {
      const emojiImg = this.getEmojiImage(emoji);
      if (emojiImg && emojiImg.complete && emojiImg.naturalWidth > 0) {
        const emojiSize = fontSizeNum * 0.95;
        const emojiX = -emojiSize / 2;
        // Bouncing offset using properties.progress (0-1)
        const progress = properties.progress !== undefined ? properties.progress : 0.5;
        const bounce = -Math.sin(progress * Math.PI) * 25 * scaleFactor;
        // Place it above the text/box
        const offsetAbove = isBgBox ? (fontSizeNum * 0.8) : (fontSizeNum * 0.6);
        const emojiY = -offsetAbove - emojiSize + bounce;

        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 2;
        this.ctx.drawImage(emojiImg, emojiX, emojiY, emojiSize, emojiSize);
        this.ctx.restore();
      }
    }

    // Restore context
    this.ctx.restore();
  }

  // ─── Easing Functions ───────────────────────────────────────────────────

  private applyEasing(
    progress: number,
    easing: string
  ): number {
    switch (easing) {
      case 'ease-out':
        return 1 - Math.pow(1 - progress, 3); // Cubic ease-out
      case 'ease-in':
        return Math.pow(progress, 3); // Cubic ease-in
      case 'ease-in-out':
        return progress < 0.5
          ? 4 * Math.pow(progress, 3)
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      case 'overshoot-ease-out':
        return this.overshootEaseOut(progress);
      case 'linear':
      default:
        return progress;
    }
  }

  private elasticEaseOut(progress: number): number {
    const c5 = (2 * Math.PI) / 4.5;
    return progress === 0
      ? 0
      : progress === 1
      ? 1
      : Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c5) + 1;
  }

  private overshootEaseOut(progress: number, s = 1.70158): number {
    const p = progress - 1;
    return p * p * ((s + 1) * p + s) + 1;
  }

  // ─── Font Preloading ──────────────────────────────────────────────────

  private preloadFonts(): void {
    // Trigger font loading for common fonts used in themes
    const fonts = [
      'Space Grotesk',
      'Playfair Display',
      'Inter',
      'Montserrat',
      'Cinzel',
      'Satisfy',
      'Pacifico',
      'Alex Brush',
    ];

    for (const font of fonts) {
      const doc = new FontFaceObserver(font);
      doc.load().catch(() => {
        console.warn(`Failed to load font: ${font}`);
      });
    }
  }

  // ─── Frame Health Check ───────────────────────────────────────────────

  private checkFrameHealth(): void {
    if (this.fps < 20) {
      console.error(
        `[typography] CRITICAL: FPS dropped below 20 (current: ${this.fps} FPS)`
      );
    } else if (this.fps < 30) {
      console.warn(
        `[typography] WARNING: FPS below 30 FPS threshold (current: ${this.fps} FPS)`
      );
    }
  }

  // ─── Get Metrics ──────────────────────────────────────────────────────

  getMetrics(): RenderMetrics {
    if (typeof (performance as any).memory !== 'undefined') {
      this.metrics.memoryUsageMB = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return this.metrics;
  }

  private drawCornerAnchorBadge(): void {
    this.ctx.save();
    this.ctx.globalAlpha = 0.25;

    // Corner coordinates (top-right safe zone)
    const x = this.layout.width - 90;
    const y = 90;
    const radius = 24;

    // Draw branding/crosshair vector circle
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = this.layout.backgroundColor === '#F5F2EB' ? '#1A1A1A' : '#FFFFFF';
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius - 8, 0, Math.PI * 2);
    this.ctx.fillStyle = this.layout.backgroundColor === '#F5F2EB' ? '#1A1A1A' : '#FFFFFF';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(x, y, 4, 0, Math.PI * 2);
    this.ctx.fillStyle = this.layout.backgroundColor === '#F5F2EB' ? '#FFFFFF' : '#000000';
    this.ctx.fill();

    this.ctx.restore();
  }

  private extractEmoji(text: string): { emoji: string | null; cleanText: string } {
    const match = text.match(this.emojiRegex);
    const emoji = match ? match[0] : null;
    const cleanText = text.replace(this.emojiRegex, '').trim();
    return { emoji, cleanText };
  }

  private getEmojiCodePoint(emojiStr: string): string {
    const codePoints: string[] = [];
    for (const char of emojiStr) {
      const cp = char.codePointAt(0);
      if (cp !== undefined) {
        codePoints.push(cp.toString(16));
      }
    }
    return codePoints.filter(cp => cp !== 'fe0f').join('-');
  }

  private getEmojiImage(emoji: string): HTMLImageElement | null {
    const codePoint = this.getEmojiCodePoint(emoji);
    if (!codePoint) return null;

    if (this.emojiCache.has(codePoint)) {
      return this.emojiCache.get(codePoint) || null;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codePoint}.png`;
    this.emojiCache.set(codePoint, img);

    img.onload = () => {
      // Trigger redraw so the image displays immediately on load
      const event = new CustomEvent('createrin-force-render');
      window.dispatchEvent(event);
    };

    img.onerror = () => {
      console.warn(`Failed to load emoji image for: ${emoji} (codePoint: ${codePoint})`);
    };

    return img;
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

// ─── Font Loading Helper ──────────────────────────────────────────────────

class FontFaceObserver {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  async load(): Promise<void> {
    if ((document as any).fonts) {
      await (document as any).fonts.load(`12px "${this.name}"`);
    }
  }
}

// ─── Canvas Utility Functions ──────────────────────────────────────────────

export function createCanvasRenderer(
  element: HTMLCanvasElement,
  sequence: AnimationSequence
): TypographyRenderer {
  return new TypographyRenderer(element, sequence);
}

export function measureText(
  text: string,
  fontFamily: string,
  fontSize: number,
  fontWeight: number
): { width: number; height: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { width: 0, height: 0 };
  }

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);

  return {
    width: metrics.width,
    height: fontSize, // Approximate
  };
}
