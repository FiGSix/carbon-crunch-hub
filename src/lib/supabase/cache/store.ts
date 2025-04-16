
import { UserRole } from '../types';
import { ProfileCacheData, CacheEntry, CACHE_TTL } from './types';

/**
 * In-memory cache store implementation
 */
class CacheStore {
  private userRoles: Map<string, CacheEntry<UserRole>> = new Map();
  private profiles: Map<string, CacheEntry<ProfileCacheData>> = new Map();
  
  /**
   * Get user role from cache if valid
   */
  getUserRole(userId: string): UserRole | null {
    const entry = this.userRoles.get(userId);
    if (entry && entry.expiry > Date.now()) {
      return entry.data;
    }
    return null;
  }
  
  /**
   * Set user role in cache with expiry
   */
  setUserRole(userId: string, role: UserRole): void {
    this.userRoles.set(userId, {
      data: role,
      expiry: Date.now() + CACHE_TTL
    });
  }
  
  /**
   * Get profile from cache if valid
   */
  getProfile(userId: string): ProfileCacheData | null {
    const entry = this.profiles.get(userId);
    if (entry && entry.expiry > Date.now()) {
      return entry.data;
    }
    return null;
  }
  
  /**
   * Set profile in cache with expiry
   */
  setProfile(userId: string, profile: ProfileCacheData): void {
    this.profiles.set(userId, {
      data: profile,
      expiry: Date.now() + CACHE_TTL
    });
  }
  
  /**
   * Check if a cache entry exists and is still valid
   */
  isValid(userId: string, type: 'role' | 'profile'): boolean {
    const map = type === 'role' ? this.userRoles : this.profiles;
    const entry = map.get(userId);
    const isValid = entry !== undefined && entry.expiry > Date.now();
    
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
}

// Export a singleton instance
export const cacheStore = new CacheStore();
