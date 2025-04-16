
import { useCallback } from "react";

type UseAuthRefreshProps = {
  refreshUser: () => Promise<void>;
  user: any;
};

export function useAuthRefresh({ refreshUser, user }: UseAuthRefreshProps) {
  const handleAuthError = useCallback(async () => {
    console.log("Authentication error detected, refreshing session");
    try {
      await refreshUser();
      return !!user?.id; // Return true if user is still authenticated after refresh
    } catch (refreshError) {
      console.error("Failed to refresh user:", refreshError);
      return false; // Authentication refresh failed
    }
  }, [refreshUser, user]);

  return { handleAuthError };
}
