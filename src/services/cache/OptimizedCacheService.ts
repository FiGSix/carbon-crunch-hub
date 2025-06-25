
/**
 * Optimized cache service with LRU eviction and memory management
 */
interface CacheEntry<T> {
  data: T;
  expires: number;
  lastAccessed: number;
  size: number;
}

interface CacheConfig {
  maxSize: number; // Maximum memory size in bytes
  maxAge: number; // Default TTL in milliseconds
  maxEntries: number; // Maximum number of entries
}

export class OptimizedCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private currentSize = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 10 * 1024 * 1024, // 10MB default
      maxAge: config.maxAge || 5 * 60 * 1000, // 5 minutes default
      maxEntries: config.maxEntries || 1000
    };

    // Periodic cleanup
    setInterval(() => this.cleanup(), 60000); // Every minute
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expires = now + (ttl || this.config.maxAge);
    const size = this.estimateSize(data);

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.currentSize -= existing.size;
    }

    // Check if we need to make space
    this.makeSpace(size);

    const entry: CacheEntry<T> = {
      data,
      expires,
      lastAccessed: now,
      size
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    
    // Check if expired
    if (now > entry.expires) {
      this.delete(key);
      return null;
    }

    // Update last accessed time
    entry.lastAccessed = now;
    return entry.data;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentSize -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      memoryUsage: this.currentSize,
      memoryUsageMB: (this.currentSize / (1024 * 1024)).toFixed(2),
      hitRate: this.calculateHitRate()
    };
  }

  private makeSpace(requiredSize: number): void {
    // If we're at max entries or memory limit, remove LRU items
    while (
      this.cache.size >= this.config.maxEntries ||
      this.currentSize + requiredSize > this.config.maxSize
    ) {
      const lruKey = this.findLRUKey();
      if (lruKey) {
        this.delete(lruKey);
      } else {
        break; // Safety break
      }
    }
  }

  private findLRUKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
  }

  private estimateSize(data: any): number {
    // Simple size estimation
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1000; // Default size for non-serializable data
    }
  }

  private calculateHitRate(): number {
    // This would need to be tracked separately in a real implementation
    return 0; // Placeholder
  }
}

// Create singleton instance
export const optimizedCache = new OptimizedCacheService({
  maxSize: 20 * 1024 * 1024, // 20MB
  maxAge: 10 * 60 * 1000, // 10 minutes
  maxEntries: 500
});
