import { useAuth } from '@/contexts/auth';

// Temporary compatibility shim for legacy imports
// Delegates to the new auth context to avoid runtime crashes from stale bundles
export function useAuthSimplified() {
  const {
    user,
    session,
    profile,
    userRole,
    isLoading,
    isInitialized,
    isAuthenticated,
  } = useAuth();

  return {
    user,
    session,
    profile,
    userRole,
    isLoading,
    isInitialized,
    isAuthenticated,
  };
}
