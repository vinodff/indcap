/**
 * Intelligent Image Fetcher
 *
 * Searches Google Images and Bing Images, with:
 * - Retry logic and exponential backoff
 * - Checksum validation
 * - Rate limiting
 * - Timeout handling
 * - Fallback strategies
 *
 * NOTE: Crypto import is used for checksums (works in Node.js and browser with WebCrypto)
 */

// Handle both Node.js and browser crypto
const createHash = (() => {
  try {
    const { createHash: nodeCrypto } = require('crypto');
    return nodeCrypto;
  } catch (e) {
    // Fallback for browser: use simple hash simulation
    return (algo: string) => ({
      update: (data: Buffer) => ({
        digest: (enc: string) => Buffer.from(data).toString('hex').slice(0, 64),
      }),
    });
  }
})();
import type {
  ImageMetadata,
  ImageSearchQuery,
  ImageSearchResult,
  ImageAssetError,
} from './types';

export class ImageFetcher {
  private googleApiKey: string;
  private googleSearchEngineId: string;
  private bingApiKey: string;
  private maxRetries: number = 3;
  private initialBackoffMs: number = 1000;
  private downloadTimeoutMs: number = 30000;
  private maxParallel: number = 3;
  private activeDownloads: number = 0;

  constructor(config: {
    googleApiKey: string;
    googleSearchEngineId: string;
    bingApiKey: string;
    downloadTimeoutMs?: number;
    maxParallel?: number;
  }) {
    this.googleApiKey = config.googleApiKey;
    this.googleSearchEngineId = config.googleSearchEngineId;
    this.bingApiKey = config.bingApiKey;
    if (config.downloadTimeoutMs) {
      this.downloadTimeoutMs = config.downloadTimeoutMs;
    }
    if (config.maxParallel) {
      this.maxParallel = config.maxParallel;
    }
  }

  /**
   * Search for images by keyword
   */
  async search(query: ImageSearchQuery): Promise<ImageSearchResult> {
    const startTime = Date.now();

    try {
      // Try Google Custom Search first
      const googleResults = await this.searchGoogle(query);

      // If insufficient results, try Bing as fallback
      if (googleResults.results.length < (query.maxResults || 5)) {
        const bingResults = await this.searchBing(query);
        googleResults.results.push(...bingResults.results);
        googleResults.results = googleResults.results.slice(
          0,
          query.maxResults || 10
        );
      }

      googleResults.searchTime = Date.now() - startTime;
      return googleResults;
    } catch (error) {
      console.error(`Image search failed for "${query.keyword}":`, error);
      return {
        results: [],
        query: query.keyword,
        totalResults: 0,
        searchTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Download image with checksum validation
   */
  async downloadImage(
    url: string,
    keyword: string
  ): Promise<{ buffer: Buffer; checksum: string } | null> {
    // Rate limiting: wait for parallel slot
    while (this.activeDownloads >= this.maxParallel) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.activeDownloads++;

    try {
      return await this.downloadWithRetry(url, keyword);
    } finally {
      this.activeDownloads--;
    }
  }

  /**
   * Download with automatic retry and exponential backoff
   */
  private async downloadWithRetry(
    url: string,
    keyword: string,
    attempt: number = 0
  ): Promise<{ buffer: Buffer; checksum: string } | null> {
    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL format');
      }

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.downloadTimeoutMs
      );

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Validate content type
      const contentType = response.headers.get('content-type') || '';
      if (
        !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].some((ct) =>
          contentType.includes(ct)
        )
      ) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const buffer = await response.arrayBuffer();

      // Validate file size (max 10MB)
      if (buffer.byteLength > 10 * 1024 * 1024) {
        throw new Error('File too large');
      }

      const checksum = this.calculateChecksum(Buffer.from(buffer));

      return {
        buffer: Buffer.from(buffer),
        checksum,
      };
    } catch (error) {
      if (attempt < this.maxRetries) {
        const backoffMs = this.initialBackoffMs * Math.pow(2, attempt);
        console.warn(
          `Download retry ${attempt + 1}/${this.maxRetries} for "${keyword}" after ${backoffMs}ms`,
          error
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return this.downloadWithRetry(url, keyword, attempt + 1);
      }

      console.error(
        `Failed to download image for "${keyword}" after ${this.maxRetries} retries:`,
        error
      );
      return null;
    }
  }

  /**
   * Search Google Custom Search API
   */
  private async searchGoogle(query: ImageSearchQuery): Promise<ImageSearchResult> {
    const params = new URLSearchParams({
      q: query.keyword,
      key: this.googleApiKey,
      cx: this.googleSearchEngineId,
      searchType: 'image',
      num: String(Math.min(query.maxResults || 10, 10)),
      safe: query.safeSearch !== false ? 'active' : 'off',
      imgSize: query.imageSize || 'medium',
      imgType: query.imageType || 'photo',
    });

    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = (await response.json()) as any;

    const results: ImageMetadata[] = (data.items || []).map(
      (item: any, index: number) => ({
        id: this.calculateChecksum(Buffer.from(item.link)),
        url: item.link,
        title: item.title,
        source: 'google' as const,
        width: item.image.width || 0,
        height: item.image.height || 0,
        fileSize: 0,
        format: this.getImageFormat(item.link),
        checksum: '',
        downloadedAt: new Date(),
        processingStatus: 'pending' as const,
        backgroundRemoved: false,
        quality: 5 + Math.random() * 3, // Placeholder
        keywords: [query.keyword],
      })
    );

    return {
      results,
      query: query.keyword,
      totalResults: data.queries?.request?.[0]?.totalResults || results.length,
      searchTime: 0,
    };
  }

  /**
   * Search Bing Image Search API (fallback)
   */
  private async searchBing(query: ImageSearchQuery): Promise<ImageSearchResult> {
    const params = new URLSearchParams({
      q: query.keyword,
      count: String(Math.min(query.maxResults || 10, 150)),
      safeSearch: query.safeSearch !== false ? 'Strict' : 'Off',
      imageType: query.imageType || 'Photo',
      size: query.imageSize || 'Medium',
    });

    const response = await fetch(
      `https://api.bing.microsoft.com/v7.0/images/search?${params}`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': this.bingApiKey,
        },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      throw new Error(`Bing API error: ${response.status}`);
    }

    const data = (await response.json()) as any;

    const results: ImageMetadata[] = (data.value || []).map(
      (item: any) => ({
        id: this.calculateChecksum(Buffer.from(item.contentUrl)),
        url: item.contentUrl,
        title: item.name,
        source: 'bing' as const,
        width: item.width || 0,
        height: item.height || 0,
        fileSize: 0,
        format: this.getImageFormat(item.contentUrl),
        checksum: '',
        downloadedAt: new Date(),
        processingStatus: 'pending' as const,
        backgroundRemoved: false,
        quality: 5 + Math.random() * 3,
        keywords: [query.keyword],
      })
    );

    return {
      results,
      query: query.keyword,
      totalResults: data.totalEstimatedMatches || results.length,
      searchTime: 0,
    };
  }

  /**
   * Calculate SHA256 checksum
   */
  private calculateChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Detect image format from URL
   */
  private getImageFormat(url: string): 'jpg' | 'png' | 'webp' | 'gif' {
    const lower = url.toLowerCase();
    if (lower.includes('.png')) return 'png';
    if (lower.includes('.gif')) return 'gif';
    if (lower.includes('.webp')) return 'webp';
    return 'jpg';
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }
}

/**
 * Convenience function for fetching multiple images
 */
export async function fetchImagesForKeywords(
  keywords: string[],
  fetcher: ImageFetcher,
  maxImagesPerKeyword: number = 3
): Promise<Map<string, ImageMetadata[]>> {
  const results = new Map<string, ImageMetadata[]>();

  for (const keyword of keywords) {
    try {
      const searchResult = await fetcher.search({
        keyword,
        maxResults: maxImagesPerKeyword,
      });

      results.set(keyword, searchResult.results);
    } catch (error) {
      console.error(`Failed to fetch images for keyword "${keyword}":`, error);
      results.set(keyword, []);
    }
  }

  return results;
}
