
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser, getUserRole } from '@/lib/supabase/auth';
import { getProfile } from '@/lib/supabase/profile';
import { UserRole, UserProfile } from '../types';
import { User } from '@supabase/supabase-js';

interface UseAuthDebugProps {
  user: User | null;
  userRole: UserRole | null;
  profile: UserProfile | null;
}

export function useAuthDebug({ user, userRole, profile }: UseAuthDebugProps) {
  // Debug function to get auth state information
  const debugAuthState = async () => {
    try {
      // Check session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      // Check user
      const { user: currentUser, error: userError } = await getCurrentUser();
      
      // Check profile
      const { profile: currentProfile, error: profileError } = await getProfile();
      
      // Check role
      const { role: currentRole, error: roleError } = await getUserRole();
      
      // Compile all information
      const debugInfo = {
        sessionExists: !!currentSession,
        sessionExpires: currentSession?.expires_at ? new Date(currentSession.expires_at * 1000).toISOString() : 'N/A',
        userExists: !!currentUser,
        userId: currentUser?.id || 'none',
        userEmail: currentUser?.email || 'none',
        userError: userError?.message || 'none',
        profileExists: !!currentProfile,
        profileEmail: currentProfile?.email || 'none',
        profileRole: currentProfile?.role || 'none',
        profileError: profileError?.message || 'none',
        roleFromFunction: currentRole || 'none',
        contextUser: !!user,
        contextUserRole: userRole || 'none',
        contextProfile: !!profile
      };
      
      console.log("Auth debug information:", debugInfo);
      
      return JSON.stringify(debugInfo, null, 2);
    } catch (error) {
      console.error("Error gathering debug information:", error);
      return `Error gathering debug info: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  return { debugAuthState };
}
