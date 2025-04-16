
import { UserRole } from './types'

/**
 * Cache for frequently accessed data
 */
export const cache = {
  userRole: new Map<string, UserRole>(),
  profiles: new Map<string, any>(),
  sessionExpiry: new Map<string, number>()
};

// Time to live for cache items (5 minutes - reduced from 10 to ensure fresher data)
export const CACHE_TTL = 5 * 60 * 1000;

/**
 * Clear all cache data
 */
export function clearCache() {
  console.log("Clearing all cache data");
  cache.userRole.clear();
  cache.profiles.clear();
  cache.sessionExpiry.clear();
}

/**
 * Check if a cache entry is still valid
 */
export function isCacheValid(userId: string) {
  const expiry = cache.sessionExpiry.get(userId);
  const isValid = expiry !== undefined && expiry > Date.now();
  console.log(`Cache validity check for ${userId}: ${isValid ? 'valid' : 'expired'} (expires at ${expiry ? new Date(expiry).toISOString() : 'N/A'})`);
  return isValid;
}

/**
 * Set cache with expiry
 */
export function setCacheWithExpiry(userId: string, roleCache?: UserRole, profileCache?: any) {
  const expiry = Date.now() + CACHE_TTL;
  cache.sessionExpiry.set(userId, expiry);
  
  if (roleCache) {
    console.log(`Caching role for user ${userId}: ${roleCache}`);
    cache.userRole.set(userId, roleCache);
  }
  
  if (profileCache) {
    console.log(`Caching profile for user ${userId}`);
    cache.profiles.set(userId, profileCache);
  }
}

/**
 * Invalidate cache for a specific user
 */
export function invalidateCache(userId: string) {
  console.log(`Invalidating cache for user ${userId}`);
  cache.userRole.delete(userId);
  cache.profiles.delete(userId);
  cache.sessionExpiry.delete(userId);
}
