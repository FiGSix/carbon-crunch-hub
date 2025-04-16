
import { cacheStore } from './store';
import { UserRole } from '../types';
import { ProfileCacheData, CACHE_TTL, CACHE_TTL_LONG } from './types';

/**
 * Check if a cache entry for a user is still valid
 */
export function isCacheValid(userId: string, type: 'role' | 'profile'): boolean {
  if (!userId) return false;
  
  const isValid = cacheStore.isValid(userId, type);
  return isValid;
}

/**
 * Set cache with expiry for user role, profile, or both
 * @param userId The user ID
 * @param role Optional user role to cache
 * @param profile Optional user profile to cache
 * @param ttl Optional custom TTL in milliseconds
 */
export function setCacheWithExpiry(
  userId: string, 
  role?: UserRole, 
  profile?: ProfileCacheData,
  ttl?: number
): void {
  if (!userId) return;
  
  if (role) {
    console.log(`Caching role for user ${userId}: ${role}`);
    cacheStore.setUserRole(userId, role, ttl);
  }
  
  if (profile) {
    console.log(`Caching profile for user ${userId}`);
    cacheStore.setProfile(userId, profile, ttl);
  }
}

/**
 * Invalidate cache for a specific user
 */
export function invalidateCache(userId: string, type?: 'role' | 'profile'): void {
  if (!userId) return;
  
  console.log(`Invalidating cache for user ${userId}${type ? ` (${type})` : ''}`);
  cacheStore.invalidate(userId, type);
}

/**
 * Clear all cache data
 */
export function clearCache(): void {
  console.log("Clearing all cache data");
  cacheStore.clear();
}

/**
 * Get cached user role if valid
 */
export function getCachedUserRole(userId: string): UserRole | null {
  return cacheStore.getUserRole(userId);
}

/**
 * Get cached profile if valid
 */
export function getCachedProfile(userId: string): ProfileCacheData | null {
  return cacheStore.getProfile(userId);
}

/**
 * Set long-lived cache entry (useful for data that rarely changes)
 */
export function setLongTermCache(
  userId: string,
  role?: UserRole,
  profile?: ProfileCacheData
): void {
  setCacheWithExpiry(userId, role, profile, CACHE_TTL_LONG);
}
