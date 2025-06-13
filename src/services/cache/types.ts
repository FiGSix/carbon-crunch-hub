
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOperations {
  set<T>(key: string, data: T, ttl?: number): void;
  get<T>(key: string): T | null;
  invalidate(pattern: string): void;
  clear(): void;
}

export const CACHE_KEYS = {
  PROFILE: (userId: string) => `profile_${userId}`,
  PROPOSALS: (userId: string, userRole: string) => `proposals_${userId}_${userRole}`,
  DASHBOARD: (userId: string, userRole: string) => `dashboard_${userId}_${userRole}`,
} as const;

export const CACHE_TTL = {
  DEFAULT: 5 * 60 * 1000,      // 5 minutes
  SHORT: 2 * 60 * 1000,        // 2 minutes  
  MEDIUM: 10 * 60 * 1000,      // 10 minutes
  LONG: 30 * 60 * 1000,        // 30 minutes
} as const;
