/**
 * Image Asset Orchestrator
 *
 * Coordinates the complete image asset pipeline:
 * Extraction → Search → Download → Background Removal → Storage → Integration
 */

import type {
  KeywordExtractionResult,
  ImageSearchResult,
  ImageMetadata,
  TypographyReelWithImages,
  ImageAssetConfig,
} from './types';
import { KeywordExtractor } from './keywordExtractor';
import { ImageFetcher } from './imageFetcher';
import { BackgroundRemover } from './backgroundRemover';
import { AssetStorage } from './assetStorage';
import { TypographyReelImageIntegrator } from './typographyReelIntegration';

export class ImageAssetOrchestrator {
  private extractor: KeywordExtractor;
  private fetcher: ImageFetcher;
  private remover: BackgroundRemover;
  private storage: AssetStorage;
  private config: ImageAssetConfig;

  constructor(config: ImageAssetConfig) {
    this.config = config;
    this.extractor = new KeywordExtractor();
    this.fetcher = new ImageFetcher({
      googleApiKey: config.googleCustomSearchApiKey,
      googleSearchEngineId: config.googleSearchEngineId,
      bingApiKey: config.bingImageSearchApiKey,
      downloadTimeoutMs: config.downloadTimeout,
      maxParallel: config.maxParallelDownloads,
    });
    this.remover = new BackgroundRemover({
      model: config.backgroundRemovalModel,
      outputFormat: 'png',
    });
    this.storage = new AssetStorage(config.cacheDir, config.maxAssetStorageBytes);
  }

  /**
   * Complete pipeline: transcript → images → typography reel
   */
  async processTranscriptForImages(
    transcriptText: string,
    animationSequence: any
  ): Promise<TypographyReelWithImages | null> {
    try {
      // Step 1: Extract keywords
      console.log('[ImageAsset] Extracting keywords...');
      const extractionResult = await this.extractor.extract(transcriptText);

      if (extractionResult.keywords.length === 0) {
        console.warn('[ImageAsset] No keywords extracted');
        return this.createFallbackReel(animationSequence);
      }

      // Step 2: Search for images
      console.log('[ImageAsset] Searching for images...');
      const imagesByKeyword = new Map<string, ImageMetadata[]>();

      for (const keyword of extractionResult.keywords.slice(0, this.config.maxAssetsPerReel)) {
        const searchResult = await this.fetcher.search({
          keyword: keyword.text,
          maxResults: 3,
        });

        if (searchResult.results.length > 0) {
          imagesByKeyword.set(keyword.text, searchResult.results);
        }
      }

      if (imagesByKeyword.size === 0) {
        console.warn('[ImageAsset] No images found');
        return this.createFallbackReel(animationSequence);
      }

      // Step 3: Download and process images
      console.log('[ImageAsset] Downloading and processing images...');
      const processedImages = new Map<string, ImageMetadata[]>();

      for (const [keyword, results] of imagesByKeyword.entries()) {
        const processedList: ImageMetadata[] = [];

        for (const imageMetadata of results.slice(0, 2)) {
          try {
            const downloadResult = await this.fetcher.downloadImage(
              imageMetadata.url,
              keyword
            );

            if (!downloadResult) {
              console.warn(`Failed to download image for "${keyword}"`);
              continue;
            }

            // Step 4: Remove background
            const removalResult = await this.remover.removeBackground(
              downloadResult.buffer
            );

            if (!removalResult.success) {
              console.warn(`Failed to remove background for "${keyword}"`);
              continue;
            }

            // Step 5: Store asset
            const storagePath = await this.storage.storeImage(
              removalResult.imageBuffer,
              downloadResult.checksum,
              {
                ...imageMetadata,
                checksum: downloadResult.checksum,
                format: removalResult.format as any,
                backgroundRemoved: true,
                processingStatus: 'success',
              }
            );

            processedList.push({
              ...imageMetadata,
              checksum: downloadResult.checksum,
              format: removalResult.format as any,
              backgroundRemoved: true,
              processingStatus: 'success',
            });
          } catch (error) {
            console.error(`Error processing image for "${keyword}":`, error);
          }
        }

        if (processedList.length > 0) {
          processedImages.set(keyword, processedList);
        }
      }

      if (processedImages.size === 0) {
        console.warn('[ImageAsset] No images successfully processed');
        return this.createFallbackReel(animationSequence);
      }

      // Step 6: Integrate images into typography reel
      console.log('[ImageAsset] Integrating images into reel...');
      const reelWithImages = TypographyReelImageIntegrator.matchImagesToWords(
        animationSequence,
        processedImages
      );

      const result: TypographyReelWithImages = {
        reelId: animationSequence.id,
        animationSequence,
        imageAssets: reelWithImages,
        overallImageCoverage:
          animationSequence.animations.length > 0
            ? (reelWithImages.length / animationSequence.animations.length) * 100
            : 0,
      };

      console.log(
        `[ImageAsset] Success! ${reelWithImages.length} images integrated (${result.overallImageCoverage.toFixed(1)}% coverage)`
      );

      return result;
    } catch (error) {
      console.error('[ImageAsset] Pipeline failed:', error);
      return this.createFallbackReel(animationSequence);
    }
  }

  /**
   * Fallback: return reel without images if pipeline fails
   */
  private createFallbackReel(animationSequence: any): TypographyReelWithImages {
    return {
      reelId: animationSequence.id,
      animationSequence,
      imageAssets: [],
      overallImageCoverage: 0,
    };
  }

  /**
   * Get storage statistics
   */
  getStorageStats() {
    return this.storage.getStats();
  }

  /**
   * Clear storage (cleanup)
   */
  clearStorage() {
    this.storage.clearAll();
  }
}

/**
 * Create orchestrator with environment configuration
 */
export function createImageAssetOrchestrator(): ImageAssetOrchestrator {
  const config: ImageAssetConfig = {
    enabled: process.env.IMAGE_ASSET_ENABLED !== 'false',
    maxAssetsPerReel: parseInt(process.env.MAX_ASSETS_PER_REEL || '5'),
    maxAssetStorageBytes: parseInt(
      process.env.MAX_ASSET_STORAGE_BYTES || String(500 * 1024 * 1024)
    ),
    defaultImageSize: 'large',
    enableBackgroundRemoval: process.env.ENABLE_BG_REMOVAL !== 'false',
    googleCustomSearchApiKey: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || '',
    googleSearchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID || '',
    bingImageSearchApiKey: process.env.BING_IMAGE_SEARCH_KEY || '',
    maxParallelDownloads: parseInt(process.env.MAX_PARALLEL_DOWNLOADS || '3'),
    downloadTimeout: parseInt(process.env.DOWNLOAD_TIMEOUT_MS || '30000'),
    backgroundRemovalModel: 'u2netp',
    qualityMinimum: 5,
    cacheDir: process.env.IMAGE_CACHE_DIR || './public/assets/images',
    enableWebSocketUpdates: process.env.ENABLE_WEBSOCKET_UPDATES !== 'false',
  };

  return new ImageAssetOrchestrator(config);
}
