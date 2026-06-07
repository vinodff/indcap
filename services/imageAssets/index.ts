/**
 * Image Asset System - Public API
 *
 * Complete intelligent image extraction and integration system for typography reels.
 */

// Types
export type {
  KeywordExtractionOptions,
  ExtractedKeyword,
  KeywordExtractionResult,
  ImageSearchQuery,
  ImageSearchResult,
  ImageMetadata,
  BackgroundRemovalOptions,
  BackgroundRemovalResult,
  AssetCacheEntry,
  AssetStorageStats,
  ImageOverlayOptions,
  TypographyReelImageIntegration,
  TypographyReelWithImages,
  AssetQueueJob,
  ImageQualityScore,
  ImageAssetError,
  ImageAssetConfig,
} from './types';

// Keyword Extraction
export { KeywordExtractor, extractKeywords } from './keywordExtractor';

// Image Fetching
export { ImageFetcher, fetchImagesForKeywords } from './imageFetcher';

// Background Removal
export { BackgroundRemover, createBackgroundRemover } from './backgroundRemover';

// Asset Storage
export { AssetStorage, createAssetStorage } from './assetStorage';

// Typography Reel Integration
export {
  TypographyReelImageIntegrator,
  createTypographyReelWithImages,
} from './typographyReelIntegration';

// Orchestrator
export {
  ImageAssetOrchestrator,
  createImageAssetOrchestrator,
} from './orchestrator';
