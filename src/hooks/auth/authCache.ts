
import { UserProfile } from '@/contexts/auth/types';

export interface ProfileCacheEntry {
  profile: UserProfile;
  timestamp: number;
}

export class AuthCache {
  private cache = new Map<string, ProfileCacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  set(userId: string, profile: UserProfile): void {
    this.cache.set(userId, {
      profile,
      timestamp: Date.now()
    });
  }

  get(userId: string): UserProfile | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(userId);
      return null;
    }
    
    return cached.profile;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(userId: string): void {
    this.cache.delete(userId);
  }
}

export const authCache = new AuthCache();
