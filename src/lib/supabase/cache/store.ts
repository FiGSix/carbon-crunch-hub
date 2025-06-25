
import { UserRole } from '../types';
import { ProfileCacheData, CacheEntry, CACHE_TTL } from './types';

/**
 * Generic cache entry for the unified cache store
 */
interface GenericCacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

/**
 * Unified cache store implementation with Map-like interface
 */
class UnifiedCacheStore {
  private cache = new Map<string, GenericCacheEntry>();
  private lastCleanup: number = Date.now();
  private cleanupInterval: number = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    // Automatically clean up expired entries periodically
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupExpired(), this.cleanupInterval);
    }
  }
  
  /**
   * Get entry from cache if valid
   */
  get(key: string): GenericCacheEntry | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    return entry;
  }
  
  /**
   * Set entry in cache
   */
  set(key: string, entry: GenericCacheEntry): void {
    this.cache.set(key, entry);
  }
  
  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Get all cache keys
   */
  keys(): IterableIterator<string> {
    return this.cache.keys();
  }
  
  /**
   * Iterate over cache entries
   */
  forEach(callback: (entry: GenericCacheEntry, key: string) => void): void {
    this.cache.forEach(callback);
  }
  
  /**
   * Clear all cache data
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Check if a cache entry exists and is still valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const isValid = Date.now() <= entry.timestamp + entry.ttl;
    if (!isValid) {
      this.cache.delete(key);
    }
    return isValid;
  }
  
  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
  
  /**
   * Clean up expired cache entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    
    // Only run cleanup if enough time has passed since last cleanup
    if (now - this.lastCleanup < this.cleanupInterval) return;
    
    this.lastCleanup = now;
    let expiredCount = 0;
    
    // Clean up expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`Cache cleanup: removed ${expiredCount} expired entries`);
    }
  }

  // Legacy compatibility methods for role-specific caching
  getUserRole(userId: string): UserRole | null {
    const key = `${userId}_role`;
    const entry = this.get(key);
    return entry?.data as UserRole || null;
  }
  
  setUserRole(userId: string, role: UserRole, ttl?: number): void {
    const key = `${userId}_role`;
    this.set(key, {
      data: role,
      timestamp: Date.now(),
      ttl: ttl || CACHE_TTL
    });
  }
  
  getProfile(userId: string): ProfileCacheData | null {
    const key = `${userId}_profile`;
    const entry = this.get(key);
    return entry?.data as ProfileCacheData || null;
  }
  
  setProfile(userId: string, profile: ProfileCacheData, ttl?: number): void {
    const key = `${userId}_profile`;
    this.set(key, {
      data: profile,
      timestamp: Date.now(),
      ttl: ttl || CACHE_TTL
    });
  }
  
  invalidate(userId: string, type?: 'role' | 'profile'): void {
    if (!type || type === 'role') {
      this.delete(`${userId}_role`);
    }
    
    if (!type || type === 'profile') {
      this.delete(`${userId}_profile`);
    }
  }
}

// Export a singleton instance
export const cacheStore = new UnifiedCacheStore();
