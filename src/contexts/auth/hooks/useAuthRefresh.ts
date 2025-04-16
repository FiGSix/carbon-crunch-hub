
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
  const [refreshAttemptCount, setRefreshAttemptCount] = useState(0);

  const refreshUser = async () => {
    if (isRefreshing) return; // Prevent multiple concurrent refreshes
    
    setIsLoading(true);
    setIsRefreshing(true);
    setRefreshAttemptCount(prev => prev + 1);
    
    try {
      console.log("Refreshing user data... (Attempt #" + (refreshAttemptCount + 1) + ")");
      
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
          clearAuthState();
        }
      } else if (refreshedSession) {
        setSession(refreshedSession);
        setUser(refreshedSession.user);
        await fetchUserData(refreshedSession.user);
        console.log("User data refreshed via session refresh");
      } else {
        // No session or error, likely user is signed out
        clearAuthState();
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // On critical errors, clear state to avoid confusion
      clearAuthState();
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Helper function to clear all auth state
  const clearAuthState = () => {
    setUser(null);
    setUserRole(null);
    setProfile(null);
    setSession(null);
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
        console.log("User role set:", roleResult.role);
      } else {
        console.warn("No role found for user", currentUser.id);
        setUserRole(null);
      }
      
      if (!profileResult.error && profileResult.profile) {
        setProfile(profileResult.profile);
        console.log("User profile set for", currentUser.id);
      } else {
        console.warn("No profile found for user", currentUser.id);
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching user data during refresh:', error);
      setUserRole(null);
      setProfile(null);
    }
  };

  return { refreshUser, isRefreshing, refreshAttemptCount };
}
