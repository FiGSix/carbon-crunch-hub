
/**
 * Enhanced cache manager with LRU eviction and better performance
 */
interface CacheEntry {
  data: any;
  expires: number;
  hits: number;
  lastAccessed: number;
  size: number;
}

export class CacheManager {
  private static cache = new Map<string, CacheEntry>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_SIZE = 100; // Maximum number of entries
  private static hitCount = 0;
  private static missCount = 0;

  static getCacheKey(type: string, ...params: (string | number | boolean | null | undefined)[]): string {
    // Handle null/undefined params and create consistent keys
    const cleanParams = params.map(p => p?.toString() || 'null');
    return `${type}_${cleanParams.join('_')}`;
  }

  static getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) {
      this.missCount++;
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now > cached.expires) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Update access statistics
    cached.hits++;
    cached.lastAccessed = now;
    this.hitCount++;
    
    return cached.data;
  }

  static setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const now = Date.now();
    
    // Estimate size (rough approximation)
    const size = this.estimateSize(data);
    
    // Ensure we don't exceed max size
    this.evictIfNecessary();
    
    const entry: CacheEntry = {
      data,
      expires: now + ttl,
      hits: 0,
      lastAccessed: now,
      size
    };

    this.cache.set(key, entry);
  }

  static clearCache(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  static clearCachePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  static getStats() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests * 100).toFixed(2) : '0';
    
    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: `${hitRate}%`,
      totalMemoryEstimate: this.getTotalSize()
    };
  }

  private static evictIfNecessary(): void {
    if (this.cache.size >= this.MAX_SIZE) {
      // Find LRU entry (least recently used with lowest hit count)
      let lruKey: string | null = null;
      let lruScore = Infinity;
      
      for (const [key, entry] of this.cache.entries()) {
        // Score based on recency and hit count (lower is worse)
        const score = entry.lastAccessed + (entry.hits * 1000);
        if (score < lruScore) {
          lruScore = score;
          lruKey = key;
        }
      }
      
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }
  }

  private static estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 1000; // Default estimate for non-serializable data
    }
  }

  private static getTotalSize(): string {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return `${(totalSize / 1024).toFixed(2)} KB`;
  }
}
