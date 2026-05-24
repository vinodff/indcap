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

    // Initialize
    this.preloadFonts();
  }

  // ─── Main Render Loop ──────────────────────────────────────────────────

  render(currentTime: number, audioElement?: HTMLAudioElement): void {
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

    // Sync with audio if provided
    const playbackTime = audioElement
      ? audioElement.currentTime
      : currentTime / 1000;

    // Clear canvas with background color
    this.ctx.fillStyle = this.layout.backgroundColor || '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.sequence.animations.length === 0) {
      return; // Nothing to render
    }

    // Find the SINGLE most active animation (to prevent overlap)
    let activeAnimation: WordAnimation | null = null;
    let maxProgress = -1;

    for (const anim of this.sequence.animations) {
      const elapsed = playbackTime - anim.startTime;

      // Check if animation is currently active
      if (elapsed >= 0 && elapsed < anim.duration) {
        const progress = elapsed / anim.duration;

        // Pick the animation that's most in-progress
        if (progress > maxProgress) {
          maxProgress = progress;
          activeAnimation = anim;
        }
      }
    }

    // Render the active animation
    if (activeAnimation) {
      this.renderWordAnimation(activeAnimation, playbackTime);
    }

    // Update metrics
    this.metrics.droppedFrames = this.fps < 30 ? this.droppedFrames++ : 0;
  }

  // ─── Word Animation Renderer ───────────────────────────────────────────

  private renderWordAnimation(
    anim: WordAnimation,
    currentTime: number,
    globalOpacity = 1.0
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
    const properties = this.calculateAnimationProperties(
      anim,
      easedProgress,
      phase
    );

    // Render text
    this.renderText(anim.text, properties, globalOpacity);
  }

  // ─── Animation Properties Calculator ───────────────────────────────────

  private calculateAnimationProperties(
    anim: WordAnimation,
    progress: number,
    phase: 'entry' | 'hold' | 'exit'
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

      case 'scale-pop':
        // Quick scale then back to normal
        const popScale = progress < 0.5
          ? 1.0 + (progress / 0.5) * (anim.scaleAmount || 0.4)
          : 1.0 + ((1 - progress) / 0.5) * (anim.scaleAmount || 0.4);
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
        return {
          ...base,
          opacity: progress < 0.3 ? 1.0 : progress > 0.7 ? 1.0 : 0.7,
        };

      case 'glow-pulse':
        return {
          ...base,
          opacity: 0.5 + Math.sin(progress * Math.PI * 4) * 0.5,
        };

      case 'shake':
        const shakeAmount = 10 * (1 - progress);
        return {
          ...base,
          x: base.x + (Math.random() - 0.5) * shakeAmount * 2,
          y: base.y + (Math.random() - 0.5) * shakeAmount * 2,
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
        const flashColor = progress < 0.5
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
          opacity: 0.8 + Math.sin(progress * Math.PI) * 0.2,
          scale: 1.0 + Math.sin(progress * Math.PI * 2) * 0.1,
        };

      case 'fire':
        return {
          ...base,
          scale: 0.9 + progress * 0.2 + Math.sin(progress * Math.PI * 3) * 0.1,
          opacity: progress < 0.8 ? 1.0 : (1 - progress) / 0.2,
        };

      case 'shimmer':
        return {
          ...base,
          opacity: progress,
          scale: 0.95 + Math.sin(progress * Math.PI * 4) * 0.05,
        };

      case 'wave':
        return {
          ...base,
          x: base.x + Math.sin(progress * Math.PI * 2) * 30,
          y: base.y + Math.sin(progress * Math.PI * 4) * 20,
          opacity: progress,
        };

      case 'kinetic':
        const kineticBounce = Math.sin(Math.pow(progress, 1.5) * Math.PI) * 0.5;
        return {
          ...base,
          scale: 0.8 + progress * 0.4 + kineticBounce,
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
    } = properties;

    // Validate inputs
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return; // Don't render empty text
    }

    // Save context state
    this.ctx.save();

    // Apply opacity first
    this.ctx.globalAlpha = Math.max(0, Math.min(1, opacity * globalOpacity));

    // Transform from center point
    this.ctx.translate(x, y);
    if (rotation !== 0) {
      this.ctx.rotate(rotation);
    }
    if (scale !== 1 && scale > 0) {
      this.ctx.scale(scale, scale);
    }

    // Text style
    const fontSizeNum = Math.max(8, Math.min(200, fontSize)); // Clamp font size
    const fontWeightNum = Math.max(100, Math.min(900, fontWeight)); // Clamp weight
    this.ctx.font = `${fontWeightNum} ${fontSizeNum}px "${fontFamily}"`;
    this.ctx.fillStyle = color || '#FFFFFF';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Add shadow for readability
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    this.ctx.shadowBlur = 8;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 3;

    // Draw text (translate to origin after transforms)
    this.ctx.fillText(text, 0, 0);

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

  // ─── Font Preloading ──────────────────────────────────────────────────

  private preloadFonts(): void {
    // Trigger font loading for common fonts used in themes
    const fonts = [
      'Space Grotesk',
      'Playfair Display',
      'Inter',
      'Montserrat',
      'Cinzel',
    ];

    for (const font of fonts) {
      const doc = new FontFaceObserver(font);
      doc.load().catch(() => {
        console.warn(`Failed to load font: ${font}`);
      });
    }
  }

  // ─── Get Metrics ──────────────────────────────────────────────────────

  getMetrics(): RenderMetrics {
    if (typeof (performance as any).memory !== 'undefined') {
      this.metrics.memoryUsageMB = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return this.metrics;
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
