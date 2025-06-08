
import { useCallback } from "react";
import { ProposalListItem } from "@/types/proposals";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { fetchProposalsCore } from "./utils/fetchProposalsCore";
import { transformProposalData } from "./utils/dataTransformer";
import { handleQueryError } from "./utils/queryErrorHandler";
import { logger } from "@/lib/logger";

interface UseFetchProposalsProps {
  user: any;
  userRole: string | null;
  filters: any;
  toast: any;
  refreshUser: () => void;
  setProposals: (proposals: ProposalListItem[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useFetchProposals = ({
  user,
  userRole,
  filters,
  toast,
  refreshUser,
  setProposals,
  setLoading,
  setError
}: UseFetchProposalsProps) => {
  const fetchLogger = logger.withContext({ 
    component: 'UseFetchProposals', 
    feature: 'proposal-fetching' 
  });

  const fetchProposals = useCallback(async (forceRefresh: boolean = false) => {
    if (!user?.id || !userRole) {
      fetchLogger.warn("Missing user or role", { userId: user?.id, userRole });
      setError("Authentication required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      fetchLogger.info("Fetching proposals", { 
        userId: user.id, 
        userRole, 
        filters,
        forceRefresh 
      });

      const data = await fetchProposalsCore(user.id, userRole, filters);
      
      if (data) {
        const transformedProposals = transformProposalData(data, userRole);
        setProposals(transformedProposals);
        fetchLogger.info("Proposals fetched successfully", { 
          count: transformedProposals.length 
        });
      } else {
        setProposals([]);
        fetchLogger.info("No proposals found");
      }
    } catch (error) {
      fetchLogger.error("Failed to fetch proposals", { error });
      const errorMessage = handleQueryError(error, toast, refreshUser);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, userRole, filters, toast, refreshUser, setProposals, setLoading, setError, fetchLogger]);

  return { fetchProposals };
};
