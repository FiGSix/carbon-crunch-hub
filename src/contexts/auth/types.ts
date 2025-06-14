
import { User } from '@supabase/supabase-js';

// Role types
export type UserRole = 'client' | 'agent' | 'admin';

// Profile information
export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  company_name?: string;
  company_logo_url?: string;
  avatar_url?: string;
  role?: UserRole;
  terms_accepted_at?: string;
  created_at?: string;
  intro_video_viewed?: boolean;
  intro_video_viewed_at?: string;
}

// Auth context type definition
export interface AuthContextType {
  // User and session state
  user: User | null;
  session: any;
  userRole: UserRole | null;
  profile: UserProfile | null;
  
  // State flags
  isLoading: boolean;
  isRefreshing: boolean;
  refreshAttemptCount: number;
  authInitialized: boolean;
  isAdmin: boolean;
  
  // Methods
  refreshUser: () => Promise<void>;
  debugAuthState: () => void;
  
  // New sign out method
  signOut: () => Promise<boolean>;
}
