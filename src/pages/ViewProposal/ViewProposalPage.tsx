import { useEffect } from 'react';
import { useViewProposalLogic } from "./hooks/useViewProposalLogic";
import { useViewProposalAuth } from "./hooks/useViewProposalAuth";
import { ViewProposalContent } from "./components/ViewProposalContent";
import { useToast } from '@/hooks/use-toast';

const ViewProposalPage = () => {
  const { toast } = useToast();
  const viewProposalLogic = useViewProposalLogic();
  const viewProposalAuth = useViewProposalAuth(
    viewProposalLogic.proposal, 
    viewProposalLogic.clientEmail, 
    viewProposalLogic.token
  );
  
  // Wrap fetchProposal to provide current id and token
  const handleProposalUpdate = () => {
    if (viewProposalLogic.id) {
      viewProposalLogic.fetchProposal(viewProposalLogic.id, viewProposalLogic.token);
    }
  };
  
  // Phase 5: Add effect to detect email verification source
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get('source');
    
    if (source === 'email_verification' && viewProposalAuth.user) {
      // User just verified their email and returned to proposal
      console.log('📧 User returned from email verification');
      
      // Show welcome message
      toast({
        title: "Welcome!",
        description: "Your email is verified. You can now respond to this proposal.",
      });
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      
      // Force a proposal refresh to ensure latest data
      if (viewProposalLogic.id) {
        viewProposalLogic.fetchProposal(viewProposalLogic.id, viewProposalLogic.token);
      }
    }
  }, [viewProposalAuth.user, viewProposalLogic.id, viewProposalLogic.token, toast]);
  
  return (
    <ViewProposalContent
      // Data props
      proposal={viewProposalLogic.proposal}
      loading={viewProposalLogic.loading}
      error={viewProposalLogic.error}
      clientEmail={viewProposalLogic.clientEmail}
      token={viewProposalLogic.token}
      user={viewProposalAuth.user}
      
      // Auth props
      showAuthForm={viewProposalAuth.showAuthForm}
      handleAuthComplete={viewProposalAuth.handleAuthComplete}
      showSignInPrompt={viewProposalAuth.showSignInPrompt}
      
      // Action props
      canTakeAction={viewProposalLogic.canTakeAction}
      isClient={viewProposalLogic.isClient}
      handleApprove={viewProposalLogic.handleApprove}
      handleReject={viewProposalLogic.handleReject}
      handleDelete={viewProposalLogic.handleDelete}
      handleSignInClick={viewProposalAuth.handleSignInClick}
      deleteDialogOpen={viewProposalLogic.deleteDialogOpen}
      setDeleteDialogOpen={viewProposalLogic.setDeleteDialogOpen}
      
      // Utility props
      handleRetry={viewProposalLogic.handleRetry}
      onProposalUpdate={handleProposalUpdate}
    />
  );
};

export default ViewProposalPage;
