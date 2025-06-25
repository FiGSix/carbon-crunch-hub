
import { cacheStore } from '@/lib/supabase/cache';

/**
 * Enhanced cache manager with LRU eviction and better performance
 * Now uses the unified cache store
 */
export class CacheManager {
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static hitCount = 0;
  private static missCount = 0;

  static getCacheKey(type: string, ...params: (string | number | boolean | null | undefined)[]): string {
    // Handle null/undefined params and create consistent keys
    const cleanParams = params.map(p => p?.toString() || 'null');
    return `${type}_${cleanParams.join('_')}`;
  }

  static getFromCache<T>(key: string): T | null {
    const entry = cacheStore.get(key);
    if (!entry) {
      this.missCount++;
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now > entry.timestamp + entry.ttl) {
      cacheStore.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return entry.data as T;
  }

  static setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    cacheStore.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  static clearCache(): void {
    cacheStore.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  static clearCachePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of cacheStore.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => cacheStore.delete(key));
  }

  static getStats() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests * 100).toFixed(2) : '0';
    
    return {
      size: cacheStore.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: `${hitRate}%`,
      totalMemoryEstimate: this.getTotalSize()
    };
  }

  private static getTotalSize(): string {
    let totalSize = 0;
    cacheStore.forEach((entry) => {
      try {
        totalSize += JSON.stringify(entry.data).length;
      } catch {
        totalSize += 1000; // Default estimate for non-serializable data
      }
    });
    return `${(totalSize / 1024).toFixed(2)} KB`;
  }
}
