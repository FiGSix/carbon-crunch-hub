
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
