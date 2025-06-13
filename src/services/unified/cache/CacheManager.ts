
/**
 * Simple cache manager for unified data service
 */
export class CacheManager {
  private static cache = new Map<string, { data: any; expires: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  static getCacheKey(type: string, ...params: string[]): string {
    return `${type}_${params.join('_')}`;
  }

  static getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  static setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, expires: Date.now() + this.CACHE_TTL });
  }

  static clearCache(): void {
    this.cache.clear();
  }

  static clearCachePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
