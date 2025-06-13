
import { UserProfile } from '@/contexts/auth/types';

export interface ProfileOperations {
  getProfile(userId: string, forceRefresh?: boolean): Promise<UserProfile | null>;
  updateProfile(userId: string, updates: Partial<UserProfile>): Promise<ProfileUpdateResult>;
}

export interface ProfileUpdateResult {
  success: boolean;
  error?: string;
}

export interface ProfileServiceDependencies {
  cache: {
    get<T>(key: string): T | null;
    set<T>(key: string, data: T, ttl?: number): void;
    invalidate(pattern: string): void;
  };
}
