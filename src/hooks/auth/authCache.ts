
import { UserProfile } from '@/contexts/auth/types';
import { cacheStore } from '@/lib/supabase/cache';

export interface ProfileCacheEntry {
  profile: UserProfile;
  timestamp: number;
}

export class AuthCache {
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  set(userId: string, profile: UserProfile): void {
    cacheStore.set(`${userId}_profile`, {
      data: profile,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    });
  }

  get(userId: string): UserProfile | null {
    const entry = cacheStore.get(`${userId}_profile`);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      cacheStore.delete(`${userId}_profile`);
      return null;
    }
    
    return entry.data as UserProfile;
  }

  clear(): void {
    // Clear all profile-related cache entries
    for (const key of cacheStore.keys()) {
      if (key.includes('_profile')) {
        cacheStore.delete(key);
      }
    }
  }

  delete(userId: string): void {
    cacheStore.delete(`${userId}_profile`);
  }
}

export const authCache = new AuthCache();
