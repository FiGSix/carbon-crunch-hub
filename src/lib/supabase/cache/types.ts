
import { UserRole } from '../types'

/**
 * Profile cache data structure
 */
export interface ProfileCacheData {
  id: string;
  [key: string]: any;
}

/**
 * Cache entry with expiry time
 */
export interface CacheEntry<T> {
  data: T;
  expiry: number;
}

/**
 * Cache configuration
 */
export const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Additional TTL presets
export const CACHE_TTL_SHORT = 30 * 1000; // 30 seconds
export const CACHE_TTL_MEDIUM = 5 * 60 * 1000; // 5 minutes
export const CACHE_TTL_LONG = 30 * 60 * 1000; // 30 minutes
