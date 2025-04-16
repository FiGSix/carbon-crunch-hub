
import { UserRole } from '../types';
import { ProfileCacheData, CacheEntry, CACHE_TTL } from './types';

/**
 * In-memory cache store implementation with performance optimizations
 */
class CacheStore {
  private userRoles: Map<string, CacheEntry<UserRole>> = new Map();
  private profiles: Map<string, CacheEntry<ProfileCacheData>> = new Map();
  private lastCleanup: number = Date.now();
  private cleanupInterval: number = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    // Automatically clean up expired entries periodically
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupExpired(), this.cleanupInterval);
    }
  }
  
  /**
   * Get user role from cache if valid
   */
  getUserRole(userId: string): UserRole | null {
    const entry = this.userRoles.get(userId);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.userRoles.delete(userId);
      return null;
    }
    return entry.data;
  }
  
  /**
   * Set user role in cache with optional custom TTL
   */
  setUserRole(userId: string, role: UserRole, ttl?: number): void {
    this.userRoles.set(userId, {
      data: role,
      expiry: Date.now() + (ttl || CACHE_TTL)
    });
  }
  
  /**
   * Get profile from cache if valid
   */
  getProfile(userId: string): ProfileCacheData | null {
    const entry = this.profiles.get(userId);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.profiles.delete(userId);
      return null;
    }
    return entry.data;
  }
  
  /**
   * Set profile in cache with optional custom TTL
   */
  setProfile(userId: string, profile: ProfileCacheData, ttl?: number): void {
    this.profiles.set(userId, {
      data: profile,
      expiry: Date.now() + (ttl || CACHE_TTL)
    });
  }
  
  /**
   * Check if a cache entry exists and is still valid
   */
  isValid(userId: string, type: 'role' | 'profile'): boolean {
    const map = type === 'role' ? this.userRoles : this.profiles;
    const entry = map.get(userId);
    
    if (!entry) return false;
    const isValid = entry.expiry > Date.now();
    
    // Clean up expired entry if invalid
    if (!isValid) {
      map.delete(userId);
    }
    
    return isValid;
  }
  
  /**
   * Delete specific cache entries for a user
   */
  invalidate(userId: string, type?: 'role' | 'profile'): void {
    if (!type || type === 'role') {
      this.userRoles.delete(userId);
    }
    
    if (!type || type === 'profile') {
      this.profiles.delete(userId);
    }
  }
  
  /**
   * Clear all cache data
   */
  clear(): void {
    this.userRoles.clear();
    this.profiles.clear();
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
    
    // Clean up expired user roles
    for (const [userId, entry] of this.userRoles.entries()) {
      if (now > entry.expiry) {
        this.userRoles.delete(userId);
        expiredCount++;
      }
    }
    
    // Clean up expired profiles
    for (const [userId, entry] of this.profiles.entries()) {
      if (now > entry.expiry) {
        this.profiles.delete(userId);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`Cache cleanup: removed ${expiredCount} expired entries`);
    }
  }
}

// Export a singleton instance
export const cacheStore = new CacheStore();
