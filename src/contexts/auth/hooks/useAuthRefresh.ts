
import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { refreshSession, getCurrentUser } from '@/lib/supabase/auth';
import { getUserRole } from '@/lib/supabase/auth';
import { getProfile } from '@/lib/supabase/profile';
import { UserRole, UserProfile } from '../types';

interface UseAuthRefreshProps {
  setUser: (user: User | null) => void;
  setUserRole: (role: UserRole | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setSession: (session: any) => void;
  setIsLoading: (loading: boolean) => void;
}

export function useAuthRefresh({
  setUser,
  setUserRole,
  setProfile,
  setSession,
  setIsLoading
}: UseAuthRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshUser = async () => {
    setIsLoading(true);
    setIsRefreshing(true);
    
    try {
      console.log("Refreshing user data...");
      
      // Try refreshing the session first
      const { session: refreshedSession, error: refreshError } = await refreshSession();
      
      if (refreshError) {
        console.log("Session refresh failed, trying getCurrentUser");
        const { user: currentUser } = await getCurrentUser();
        
        if (currentUser) {
          setUser(currentUser);
          await fetchUserData(currentUser);
          console.log("User data refreshed via getCurrentUser");
        } else {
          console.log("Could not get current user, user may be signed out");
          setUser(null);
          setUserRole(null);
          setProfile(null);
        }
      } else if (refreshedSession) {
        setSession(refreshedSession);
        setUser(refreshedSession.user);
        await fetchUserData(refreshedSession.user);
        console.log("User data refreshed via session refresh");
      } else {
        // No session or error, likely user is signed out
        setUser(null);
        setUserRole(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // On critical errors, clear state to avoid confusion
      setUser(null);
      setUserRole(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Helper function to fetch user data during refresh
  const fetchUserData = async (currentUser: User) => {
    try {
      // Run both requests in parallel for better performance
      const [roleResult, profileResult] = await Promise.all([
        getUserRole(),
        getProfile()
      ]);
      
      if (roleResult.role) {
        setUserRole(roleResult.role);
      } else {
        setUserRole(null);
      }
      
      if (!profileResult.error && profileResult.profile) {
        setProfile(profileResult.profile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user data during refresh:', error);
      setUserRole(null);
      setProfile(null);
    }
  };

  return { refreshUser, isRefreshing };
}
