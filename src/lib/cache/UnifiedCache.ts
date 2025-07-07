/**
 * Phase 3: Unified Cache Service
 * Replaces multiple caching layers with a single, optimized solution
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
  lastAccessed: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  size: number;
  memoryUsage: number;
}

export class UnifiedCache {
  private cache = new Map<string, CacheEntry<any>>();
  private metrics: CacheMetrics = { hits: 0, misses: 0, size: 0, memoryUsage: 0 };
  private readonly maxEntries = 1000;
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const now = Date.now();
    const expires = now + ttl;

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Make space if needed
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      expires,
      lastAccessed: now
    });

    this.metrics.size = this.cache.size;
    this.updateMemoryUsage();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.metrics.size = this.cache.size;
      return null;
    }

    // Update access time
    entry.lastAccessed = Date.now();
    this.metrics.hits++;
    return entry.data;
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      this.metrics.size = this.cache.size;
      this.updateMemoryUsage();
    }
    return result;
  }

  clear(): void {
    this.cache.clear();
    this.metrics = { hits: 0, misses: 0, size: 0, memoryUsage: 0 };
  }

  // Delete by pattern (for clearing related cache entries)
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete = Array.from(this.cache.keys()).filter(key => regex.test(key));
    keysToDelete.forEach(key => this.delete(key));
  }

  getMetrics(): CacheMetrics & { hitRate: number } {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 ? (this.metrics.hits / total) * 100 : 0
    };
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      this.metrics.size = this.cache.size;
      this.updateMemoryUsage();
    }
  }

  private updateMemoryUsage(): void {
    // Estimate memory usage (simplified)
    this.metrics.memoryUsage = this.cache.size * 1000; // Rough estimate
  }
}

// Cache presets for different use cases
export const authCache = new UnifiedCache();     // For auth/profile data
export const dataCache = new UnifiedCache();     // For API data
export const uiCache = new UnifiedCache();       // For UI state

// Legacy exports for compatibility
export const performanceCache = dataCache;
export const optimizedCache = dataCache;