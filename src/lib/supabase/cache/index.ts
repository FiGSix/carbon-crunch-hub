
export { 
  clearCache,
  isCacheValid,
  setCacheWithExpiry,
  invalidateCache,
  getCachedUserRole,
  getCachedProfile,
  setLongTermCache
} from './utils';
export { cacheStore } from './store';
export { 
  CACHE_TTL, 
  CACHE_TTL_SHORT, 
  CACHE_TTL_MEDIUM, 
  CACHE_TTL_LONG 
} from './types';
export type { ProfileCacheData, CacheEntry } from './types';
