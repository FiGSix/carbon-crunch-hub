
import { useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useViewProposal } from "@/hooks/proposals/view/useViewProposal";
import { useAuth } from "@/contexts/auth";
import { logger } from "@/lib/logger";

export function useViewProposalLogic() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const { user } = useAuth();
  
  // Create a contextualized logger
  const viewLogger = logger.withContext({ 
    component: 'ViewProposalPage', 
    feature: 'proposals' 
  });
  
  // Debug log the current route and parameters
  useEffect(() => {
    console.log("=== ViewProposal Component Mounted ===");
    console.log("Proposal ID:", id);
    console.log("Token:", token ? `${token.substring(0, 8)}...` : "No token");
    console.log("User:", user ? user.id : "Not authenticated");
    console.log("URL:", window.location.href);
  }, [id, token, user]);
  
  // Handle successful deletion with navigation
  const handleDeleteSuccess = useCallback(() => {
    viewLogger.info("Proposal deleted successfully, navigating to proposals page");
    navigate('/proposals');
  }, [navigate, viewLogger]);
  
  const viewProposalData = useViewProposal(id, token, handleDeleteSuccess);
  
  // Handler to retry loading the proposal
  const handleRetry = useCallback(() => {
    viewLogger.info("Retrying proposal fetch", { id, hasToken: !!token });
    viewProposalData.fetchProposal(id, token);
  }, [id, token, viewProposalData.fetchProposal, viewLogger]);
  
  // Debug logging
  useEffect(() => {
    console.log("=== ViewProposal State Update ===");
    console.log("Loading:", viewProposalData.loading);
    console.log("Error:", viewProposalData.error);
    console.log("Proposal:", viewProposalData.proposal ? { 
      id: viewProposalData.proposal.id, 
      title: viewProposalData.proposal.title, 
      status: viewProposalData.proposal.status 
    } : null);
    console.log("Client Email:", viewProposalData.clientEmail);
    
    if (viewProposalData.proposal) {
      viewLogger.info("ViewProposal - Current proposal state", { 
        id: viewProposalData.proposal.id,
        status: viewProposalData.proposal.status,
        isClient: viewProposalData.isClient,
        canTakeAction: viewProposalData.canTakeAction,
        hasClientId: !!viewProposalData.proposal.client_id,
        hasClientReferenceId: !!viewProposalData.proposal.client_reference_id,
        userLoggedIn: !!user,
        accessedViaToken: !!token
      });
    }
  }, [viewProposalData.proposal, viewProposalData.isClient, viewProposalData.canTakeAction, viewLogger, user, token, viewProposalData.loading, viewProposalData.error, viewProposalData.clientEmail]);

  return {
    id,
    token,
    user,
    handleRetry,
    ...viewProposalData
  };
}
