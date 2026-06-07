/**
 * Image Asset System Types
 *
 * Complete type definitions for intelligent image extraction, searching,
 * background removal, and integration with typography reels.
 */

export interface KeywordExtractionOptions {
  strategy: 'regex' | 'tfidf' | 'transformer';
  minFrequency?: number;  // Minimum word frequency to consider
  minLength?: number;     // Minimum keyword length
  maxKeywords?: number;   // Maximum keywords to extract
  excludeStopwords?: boolean;
}

export interface ExtractedKeyword {
  text: string;
  score: number;           // 0-1 relevance/frequency score
  type: 'noun' | 'verb' | 'adjective' | 'unknown';
  frequency: number;
}

export interface KeywordExtractionResult {
  keywords: ExtractedKeyword[];
  totalWords: number;
  language: string;
  confidence: number;      // 0-1
}

export interface ImageSearchQuery {
  keyword: string;
  maxResults?: number;
  safeSearch?: boolean;
  imageSize?: 'small' | 'medium' | 'large' | 'xlarge';
  imageType?: 'photo' | 'clipart' | 'lineart' | 'animated';
  colorFilter?: string;    // e.g., 'red', 'blue', 'transparent'
}

export interface ImageSearchResult {
  results: ImageMetadata[];
  query: string;
  totalResults: number;
  searchTime: number;      // milliseconds
}

export interface ImageMetadata {
  id: string;              // Unique identifier (hash of URL)
  url: string;
  title: string;
  source: string;          // 'google' | 'bing' | 'cache'
  width: number;
  height: number;
  fileSize: number;        // bytes
  format: 'jpg' | 'png' | 'webp' | 'gif';
  checksum: string;        // SHA256 of downloaded image
  downloadedAt: Date;
  processingStatus: 'pending' | 'processing' | 'success' | 'failed';
  backgroundRemoved: boolean;
  quality: number;         // 0-10 quality score (blurriness, resolution, etc.)
  keywords: string[];      // Keywords it was found for
}

export interface BackgroundRemovalOptions {
  model?: 'u2net' | 'u2netp' | 'u2net_human_seg';
  outputFormat?: 'png' | 'webp';
  quality?: number;        // 1-100 for lossy formats
  maxWidth?: number;
  maxHeight?: number;
}

export interface BackgroundRemovalResult {
  imageBuffer: Buffer;
  format: 'png' | 'webp';
  originalSize: { width: number; height: number };
  processedSize: { width: number; height: number };
  processingTime: number;  // milliseconds
  success: boolean;
  error?: string;
}

export interface AssetCacheEntry {
  id: string;
  checksum: string;
  storagePath: string;
  metadata: ImageMetadata;
  createdAt: Date;
  lastAccessedAt: Date;
  accessCount: number;
  byteSize: number;
}

export interface AssetStorageStats {
  totalAssets: number;
  totalBytes: number;
  maxBytes: number;
  utilizationPercent: number;
  oldestAsset: Date;
  newestAsset: Date;
}

export interface ImageOverlayOptions {
  x: number;               // 0-1 relative to canvas width
  y: number;               // 0-1 relative to canvas height
  width: number;           // 0-1 relative to canvas width
  height: number;          // 0-1 relative to canvas height
  opacity?: number;        // 0-1
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay';
  rotation?: number;       // degrees
  zIndex?: number;         // render order
}

export interface TypographyReelImageIntegration {
  wordIndex: number;       // Which word to attach image to
  image: ImageMetadata;
  overlay: ImageOverlayOptions;
  timing: {
    entryDelay: number;    // milliseconds after word entry
    displayDuration: number; // milliseconds to show image
    exitDelay: number;     // milliseconds before word exit
  };
}

export interface AssetQueueJob {
  id: string;
  reelId: string;
  keywords: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    percent: number;
  };
  results: ImageMetadata[];
  errors: string[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ImageQualityScore {
  overallScore: number;    // 0-10
  blurriness: number;      // 0-10 (10 = sharp)
  resolution: number;      // 0-10 (10 = high res)
  contrast: number;        // 0-10
  saturation: number;      // 0-10
  backgroundCleanness: number; // 0-10 (10 = clean removal)
  relevance: number;       // 0-10 (manual rating)
}

export interface TypographyReelWithImages {
  reelId: string;
  animationSequence: any;  // AnimationSequence from typography types
  imageAssets: TypographyReelImageIntegration[];
  overallImageCoverage: number; // percentage of words with images
}

export interface ImageAssetError {
  code: 'KEYWORD_EXTRACTION_FAILED' |
        'SEARCH_FAILED' |
        'DOWNLOAD_FAILED' |
        'BACKGROUND_REMOVAL_FAILED' |
        'STORAGE_FULL' |
        'INVALID_URL' |
        'RATE_LIMITED' |
        'API_ERROR' |
        'TIMEOUT' |
        'UNKNOWN';
  message: string;
  keyword?: string;
  url?: string;
  originalError?: Error;
}

export interface ImageAssetConfig {
  enabled: boolean;
  maxAssetsPerReel: number;
  maxAssetStorageBytes: number;  // e.g., 500 * 1024 * 1024 (500MB)
  defaultImageSize: 'small' | 'medium' | 'large';
  enableBackgroundRemoval: boolean;
  googleCustomSearchApiKey: string;
  googleSearchEngineId: string;
  bingImageSearchApiKey: string;
  maxParallelDownloads: number;
  downloadTimeout: number;       // milliseconds
  backgroundRemovalModel: 'u2net' | 'u2netp';
  qualityMinimum: number;        // 0-10, skip images below this
  cacheDir: string;              // e.g., './public/assets'
  enableWebSocketUpdates: boolean;
}
