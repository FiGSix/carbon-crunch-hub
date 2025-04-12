
import { UserRole } from './types'

// Optimized cache for frequently accessed data
export const cache = {
  userRole: new Map<string, UserRole>(),
  profiles: new Map<string, any>(),
  sessionExpiry: new Map<string, number>()
};

// Time to live for cache items (10 minutes)
export const CACHE_TTL = 10 * 60 * 1000;

// Clear all cache data
export function clearCache() {
  cache.userRole.clear();
  cache.profiles.clear();
  cache.sessionExpiry.clear();
}

// Check if a cache entry is still valid
export function isCacheValid(userId: string) {
  const expiry = cache.sessionExpiry.get(userId);
  return expiry && expiry > Date.now();
}

// Set cache with expiry
export function setCacheWithExpiry(userId: string, roleCache?: UserRole, profileCache?: any) {
  const expiry = Date.now() + CACHE_TTL;
  cache.sessionExpiry.set(userId, expiry);
  
  if (roleCache) {
    cache.userRole.set(userId, roleCache);
  }
  
  if (profileCache) {
    cache.profiles.set(userId, profileCache);
  }
}
