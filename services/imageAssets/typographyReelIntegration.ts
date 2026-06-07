/**
 * Typography Reel Integration
 *
 * Integrates image assets into typography reel rendering:
 * - Maps images to words in sequence
 * - Overlays images on canvas
 * - Handles timing and transitions
 * - Provides fallback if images unavailable
 */

// Only import readFileSync on server side
const readFileSync = (() => {
  try {
    return require('fs').readFileSync;
  } catch (e) {
    // Fallback: return null for browser
    return null;
  }
})();
import type {
  TypographyReelImageIntegration,
  TypographyReelWithImages,
  ImageOverlayOptions,
  ImageMetadata,
} from './types';

export class TypographyReelImageIntegrator {
  /**
   * Match images to words in animation sequence
   */
  static matchImagesToWords(
    animationSequence: any, // AnimationSequence from typography
    imagesByKeyword: Map<string, ImageMetadata[]>
  ): TypographyReelImageIntegration[] {
    const integrations: TypographyReelImageIntegration[] = [];
    const usedImages = new Set<string>();

    // Extract keywords from animation sequence
    const keywords = Array.from(imagesByKeyword.keys());

    for (let i = 0; i < animationSequence.animations.length; i++) {
      const animation = animationSequence.animations[i];
      const wordText = animation.text.toLowerCase();

      // Find matching keyword
      let matchedKeyword = keywords.find(
        (k) =>
          wordText.includes(k) ||
          k.includes(wordText)
      );

      if (!matchedKeyword) {
        // Try partial match
        matchedKeyword = keywords.find((k) => wordText.startsWith(k.substring(0, 3)));
      }

      if (!matchedKeyword) {
        continue; // No image for this word
      }

      const images = imagesByKeyword.get(matchedKeyword) || [];
      if (images.length === 0) {
        continue;
      }

      // Pick an unused image (or recycle if all used)
      let selectedImage = images.find((img) => !usedImages.has(img.id));
      if (!selectedImage && images.length > 0) {
        selectedImage = images[Math.floor(Math.random() * images.length)];
      }

      if (!selectedImage) {
        continue;
      }

      usedImages.add(selectedImage.id);

      // Create overlay positioning (responsive)
      const overlay = this.generateOverlayOptions(i, animationSequence.animations.length);

      // Create timing (staggered with word animation)
      const timing = {
        entryDelay: 100 + i * 50, // Slightly after word entry
        displayDuration: animation.duration - 200,
        exitDelay: 100,
      };

      integrations.push({
        wordIndex: i,
        image: selectedImage,
        overlay,
        timing,
      });
    }

    return integrations;
  }

  /**
   * Generate responsive overlay positioning
   */
  private static generateOverlayOptions(
    index: number,
    total: number
  ): ImageOverlayOptions {
    // Distribute images across canvas (top-left to bottom-right)
    const positions = [
      { x: 0.1, y: 0.15, width: 0.2, height: 0.2 },  // Top-left
      { x: 0.7, y: 0.1, width: 0.25, height: 0.25 }, // Top-right
      { x: 0.05, y: 0.6, width: 0.22, height: 0.22 }, // Bottom-left
      { x: 0.65, y: 0.65, width: 0.28, height: 0.28 }, // Bottom-right
      { x: 0.4, y: 0.3, width: 0.18, height: 0.18 }, // Center
    ];

    const position = positions[index % positions.length];

    return {
      ...position,
      opacity: 0.85,
      blendMode: 'normal',
      rotation: Math.random() * 5 - 2.5, // Slight random rotation
      zIndex: 10 - (index % 5), // Vary z-index
    };
  }

  /**
   * Render image overlay on canvas context
   */
  static renderImageOverlay(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    image: HTMLImageElement | ImageBitmap,
    overlay: ImageOverlayOptions,
    progress: number = 1.0 // 0-1 animation progress
  ): void {
    ctx.save();

    // Calculate pixel coordinates
    const x = canvas.width * overlay.x;
    const y = canvas.height * overlay.y;
    const width = canvas.width * overlay.width;
    const height = canvas.height * overlay.height;

    // Apply easing to entry/exit
    const easedProgress = this.easeOutCubic(progress);

    // Apply transforms
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate((overlay.rotation || 0) * (Math.PI / 180));
    ctx.globalAlpha = (overlay.opacity || 1) * easedProgress;

    // Apply blend mode
    if (overlay.blendMode && overlay.blendMode !== 'normal') {
      ctx.globalCompositeOperation = this.blendModeToComposite(overlay.blendMode);
    }

    // Draw image (centered on transform point)
    ctx.drawImage(image, -width / 2, -height / 2, width, height);

    ctx.restore();
  }

  /**
   * Load image buffer and convert to ImageBitmap (for canvas rendering)
   */
  static async loadImageForRendering(
    imagePath: string
  ): Promise<ImageBitmap | null> {
    try {
      const buffer = readFileSync(imagePath);
      const blob = new Blob([buffer], { type: 'image/png' });
      return await createImageBitmap(blob);
    } catch (error) {
      console.error(`Failed to load image ${imagePath}:`, error);
      return null;
    }
  }

  /**
   * Convert blend mode name to canvas composite operation
   */
  private static blendModeToComposite(
    mode: 'normal' | 'multiply' | 'screen' | 'overlay'
  ): GlobalCompositeOperation {
    const modeMap: Record<string, GlobalCompositeOperation> = {
      normal: 'source-over',
      multiply: 'multiply',
      screen: 'screen',
      overlay: 'overlay',
    };
    return modeMap[mode] || 'source-over';
  }

  /**
   * Easing function for animation
   */
  private static easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}

/**
 * Create typography reel with integrated images
 */
export function createTypographyReelWithImages(
  animationSequence: any,
  imagesByKeyword: Map<string, ImageMetadata[]>
): TypographyReelWithImages {
  const imageAssets = TypographyReelImageIntegrator.matchImagesToWords(
    animationSequence,
    imagesByKeyword
  );

  const totalWords = animationSequence.animations.length;
  const overallImageCoverage = totalWords > 0 ? (imageAssets.length / totalWords) * 100 : 0;

  return {
    reelId: animationSequence.id,
    animationSequence,
    imageAssets,
    overallImageCoverage,
  };
}

/**
 * Update canvas render loop to include image overlays
 *
 * Usage in typographyRenderer.ts:
 * ```typescript
 * // In the render() method, after rendering text:
 *
 * if (this.imageAssets && this.imageAssets.length > 0) {
 *   for (const imageIntegration of this.imageAssets) {
 *     const elapsed = currentTime - imageIntegration.timing.entryDelay / 1000;
 *     const progress = Math.max(
 *       0,
 *       Math.min(1, elapsed / (imageIntegration.timing.displayDuration / 1000))
 *     );
 *
 *     if (progress > 0 && progress < 1) {
 *       const image = await TypographyReelImageIntegrator.loadImageForRendering(
 *         imageIntegration.image.storagePath
 *       );
 *       if (image) {
 *         TypographyReelImageIntegrator.renderImageOverlay(
 *           this.ctx,
 *           this.canvas,
 *           image,
 *           imageIntegration.overlay,
 *           progress
 *         );
 *       }
 *     }
 *   }
 * }
 * ```
 */
