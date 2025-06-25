
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheInterface {
  get<T>(key: string): T | null;
  set<T>(key: string, data: T, ttl?: number): void;
  invalidate(pattern: string): void;
  clear(): void;
  size(): number;
  has(key: string): boolean;
}

export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,    // 5 minutes
  MEDIUM: 15 * 60 * 1000,  // 15 minutes
  LONG: 60 * 60 * 1000,    // 1 hour
} as const;

export const CACHE_KEYS = {
  PROPOSALS: (userId: string, userRole: string) => `proposals_${userId}_${userRole}`,
  DASHBOARD: (userId: string, userRole: string) => `dashboard_${userId}_${userRole}`,
  CLIENTS: (userId: string) => `clients_${userId}`,
  PROFILE: (userId: string) => `profile_${userId}`,
} as const;
