
import { ProfileCacheData, CacheEntry, CACHE_TTL_SHORT, CACHE_TTL_MEDIUM } from './types';
import { cacheStore } from './store';

/**
 * Enhanced cache utilities with performance optimizations
 */

export function clearCache() {
  console.log('🧹 Clearing all cache');
  cacheStore.clear();
}

export function isCacheValid(userId: string, type: 'role' | 'profile'): boolean {
  const key = `${userId}_${type}`;
  const entry = cacheStore.get(key);
  
  if (!entry) return false;
  
  const now = Date.now();
  const isValid = now - entry.timestamp < entry.ttl;
  
  if (!isValid) {
    // Clean up expired entry
    cacheStore.delete(key);
  }
  
  return isValid;
}

export function setCacheWithExpiry(
  userId: string, 
  role?: string, 
  profile?: any, 
  customTtl?: number
) {
  const now = Date.now();
  const ttl = customTtl || CACHE_TTL_MEDIUM;
  
  if (role) {
    const roleKey = `${userId}_role`;
    cacheStore.set(roleKey, {
      data: role,
      timestamp: now,
      ttl
    });
  }
  
  if (profile) {
    const profileKey = `${userId}_profile`;
    cacheStore.set(profileKey, {
      data: profile,
      timestamp: now,
      ttl
    });
  }
}

export function invalidateCache(userId: string, type?: 'role' | 'profile') {
  if (type) {
    const key = `${userId}_${type}`;
    cacheStore.delete(key);
    console.log(`🗑️ Invalidated ${type} cache for user:`, userId);
  } else {
    // Invalidate all cache entries for this user
    const keysToDelete = Array.from(cacheStore.keys()).filter(key => key.startsWith(userId));
    keysToDelete.forEach(key => cacheStore.delete(key));
    console.log(`🗑️ Invalidated all cache for user:`, userId);
  }
}

export function getCachedUserRole(userId: string): string | null {
  const key = `${userId}_role`;
  const entry = cacheStore.get(key);
  return entry?.data as string || null;
}

export function getCachedProfile(userId: string): ProfileCacheData | null {
  const key = `${userId}_profile`;
  const entry = cacheStore.get(key);
  return entry?.data as ProfileCacheData || null;
}

export function setLongTermCache(key: string, data: any, customTtl?: number) {
  const now = Date.now();
  const ttl = customTtl || CACHE_TTL_MEDIUM;
  
  cacheStore.set(key, {
    data,
    timestamp: now,
    ttl
  });
}

// Performance optimization: Batch cache operations
export function batchCacheUpdate(operations: Array<{
  userId: string;
  role?: string;
  profile?: any;
}>) {
  const now = Date.now();
  
  operations.forEach(({ userId, role, profile }) => {
    if (role) {
      const roleKey = `${userId}_role`;
      cacheStore.set(roleKey, {
        data: role,
        timestamp: now,
        ttl: CACHE_TTL_MEDIUM
      });
    }
    
    if (profile) {
      const profileKey = `${userId}_profile`;
      cacheStore.set(profileKey, {
        data: profile,
        timestamp: now,
        ttl: CACHE_TTL_MEDIUM
      });
    }
  });
  
  console.log(`📦 Batch updated cache for ${operations.length} operations`);
}

// Cleanup expired cache entries periodically
export function cleanupExpiredCache() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  cacheStore.forEach((entry, key) => {
    if (now - entry.timestamp >= entry.ttl) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => cacheStore.delete(key));
  
  if (keysToDelete.length > 0) {
    console.log(`🧹 Cleaned up ${keysToDelete.length} expired cache entries`);
  }
}
