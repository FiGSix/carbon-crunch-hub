
import { cacheStore } from './store';
import { UserRole } from '../types';
import { ProfileCacheData } from './types';

/**
 * Check if a cache entry for a user is still valid
 */
export function isCacheValid(userId: string, type: 'role' | 'profile'): boolean {
  if (!userId) return false;
  
  const isValid = cacheStore.isValid(userId, type);
  console.log(`Cache validity check for ${userId} (${type}): ${isValid ? 'valid' : 'expired'}`);
  
  return isValid;
}

/**
 * Set cache with expiry for user role, profile, or both
 */
export function setCacheWithExpiry(
  userId: string, 
  role?: UserRole, 
  profile?: ProfileCacheData
): void {
  if (!userId) return;
  
  if (role) {
    console.log(`Caching role for user ${userId}: ${role}`);
    cacheStore.setUserRole(userId, role);
  }
  
  if (profile) {
    console.log(`Caching profile for user ${userId}`);
    cacheStore.setProfile(userId, profile);
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
