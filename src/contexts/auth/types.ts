
import { Session, User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string;
  role: UserRole;
  terms_accepted_at: string | null;
  created_at: string;
  phone: string | null;
}

export type UserRole = 'client' | 'agent' | 'admin';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: UserRole | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isRefreshing: boolean;
  refreshAttemptCount: number;
  authInitialized: boolean;
  refreshUser: () => Promise<void>;
  debugAuthState: () => Promise<string>;
}
