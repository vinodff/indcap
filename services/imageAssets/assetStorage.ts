/**
 * Asset Storage Manager
 *
 * Content-addressed storage with:
 * - SHA256-based deduplication
 * - LRU eviction policy
 * - Metadata tracking
 * - Automatic cleanup
 */

import { writeFileSync, readFileSync, statSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { AssetCacheEntry, AssetStorageStats, ImageMetadata } from './types';

export class AssetStorage {
  private storagePath: string;
  private maxBytes: number;
  private cache: Map<string, AssetCacheEntry> = new Map();
  private metadataPath: string;

  constructor(storagePath: string, maxBytes: number = 500 * 1024 * 1024) {
    this.storagePath = storagePath;
    this.maxBytes = maxBytes;
    this.metadataPath = join(storagePath, '.metadata.json');

    // Ensure directory exists
    if (!existsSync(storagePath)) {
      mkdirSync(storagePath, { recursive: true });
    }

    // Load existing metadata
    this.loadMetadata();
  }

  /**
   * Store image asset with deduplication
   */
  async storeImage(
    imageBuffer: Buffer,
    checksum: string,
    metadata: ImageMetadata
  ): Promise<string> {
    // Check if already stored
    const existingEntry = Array.from(this.cache.values()).find(
      (entry) => entry.checksum === checksum
    );

    if (existingEntry) {
      existingEntry.lastAccessedAt = new Date();
      existingEntry.accessCount++;
      return existingEntry.storagePath;
    }

    // Generate storage path (use checksum)
    const filename = `${checksum}.png`;
    const storagePath = join(this.storagePath, filename);

    // Write file
    writeFileSync(storagePath, imageBuffer);

    // Update cache
    const byteSize = imageBuffer.length;
    const id = checksum;

    this.cache.set(id, {
      id,
      checksum,
      storagePath,
      metadata,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 1,
      byteSize,
    });

    // Check if we need to evict
    await this.evictIfNecessary();

    // Persist metadata
    this.saveMetadata();

    return storagePath;
  }

  /**
   * Retrieve asset metadata
   */
  getAsset(id: string): AssetCacheEntry | null {
    const entry = this.cache.get(id);
    if (entry) {
      entry.lastAccessedAt = new Date();
      entry.accessCount++;
    }
    return entry || null;
  }

  /**
   * Get asset by checksum (for deduplication check)
   */
  findAssetByChecksum(checksum: string): AssetCacheEntry | null {
    const entry = Array.from(this.cache.values()).find(
      (e) => e.checksum === checksum
    );
    if (entry) {
      entry.lastAccessedAt = new Date();
      entry.accessCount++;
    }
    return entry || null;
  }

  /**
   * List all stored assets
   */
  listAssets(): AssetCacheEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Get storage statistics
   */
  getStats(): AssetStorageStats {
    const entries = Array.from(this.cache.values());
    const totalBytes = entries.reduce((sum, e) => sum + e.byteSize, 0);
    const dates = entries
      .map((e) => e.createdAt)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      totalAssets: entries.length,
      totalBytes,
      maxBytes: this.maxBytes,
      utilizationPercent: (totalBytes / this.maxBytes) * 100,
      oldestAsset: dates[0] || new Date(),
      newestAsset: dates[dates.length - 1] || new Date(),
    };
  }

  /**
   * Evict least-recently-used assets if storage exceeds limit
   */
  private async evictIfNecessary(): Promise<void> {
    const stats = this.getStats();

    if (stats.totalBytes <= this.maxBytes) {
      return;
    }

    // Sort by last access time (oldest first)
    const sorted = Array.from(this.cache.values()).sort(
      (a, b) => a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime()
    );

    // Evict until under limit
    let currentBytes = stats.totalBytes;

    for (const entry of sorted) {
      if (currentBytes <= this.maxBytes * 0.9) {
        // Stop at 90% to avoid repeated eviction
        break;
      }

      // Delete file
      try {
        unlinkSync(entry.storagePath);
      } catch (error) {
        console.error(`Failed to delete asset ${entry.id}:`, error);
      }

      // Remove from cache
      this.cache.delete(entry.id);
      currentBytes -= entry.byteSize;

      console.log(`Evicted asset ${entry.id} (${entry.byteSize} bytes)`);
    }
  }

  /**
   * Delete specific asset
   */
  deleteAsset(id: string): boolean {
    const entry = this.cache.get(id);
    if (!entry) return false;

    try {
      unlinkSync(entry.storagePath);
      this.cache.delete(id);
      this.saveMetadata();
      return true;
    } catch (error) {
      console.error(`Failed to delete asset ${id}:`, error);
      return false;
    }
  }

  /**
   * Clear all assets
   */
  clearAll(): void {
    for (const entry of this.cache.values()) {
      try {
        unlinkSync(entry.storagePath);
      } catch (error) {
        console.error(`Failed to delete asset ${entry.id}:`, error);
      }
    }
    this.cache.clear();
    this.saveMetadata();
  }

  /**
   * Load metadata from disk
   */
  private loadMetadata(): void {
    try {
      if (!existsSync(this.metadataPath)) {
        return;
      }

      const content = readFileSync(this.metadataPath, 'utf-8');
      const data = JSON.parse(content) as Record<string, any>;

      for (const [id, entry] of Object.entries(data)) {
        this.cache.set(id, {
          ...entry,
          createdAt: new Date(entry.createdAt),
          lastAccessedAt: new Date(entry.lastAccessedAt),
        });
      }
    } catch (error) {
      console.warn('Failed to load metadata:', error);
    }
  }

  /**
   * Save metadata to disk
   */
  private saveMetadata(): void {
    try {
      const data: Record<string, any> = {};

      for (const [id, entry] of this.cache.entries()) {
        data[id] = {
          ...entry,
          createdAt: entry.createdAt.toISOString(),
          lastAccessedAt: entry.lastAccessedAt.toISOString(),
        };
      }

      writeFileSync(this.metadataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save metadata:', error);
    }
  }
}

/**
 * Create asset storage instance
 */
export function createAssetStorage(
  storagePath: string,
  maxBytes?: number
): AssetStorage {
  return new AssetStorage(storagePath, maxBytes);
}
