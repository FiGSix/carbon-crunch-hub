import { useEffect, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useViewProposalLogic } from "./hooks/useViewProposalLogic";
import { useViewProposalAuth } from "./hooks/useViewProposalAuth";
import { ViewProposalContent } from "./components/ViewProposalContent";
import { useToast } from '@/hooks/use-toast';

// Error fallback for transient errors
function ViewProposalErrorFallback({ error }: { error: Error }) {
  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">
          Loading proposal details...
        </p>
        {import.meta.env.DEV && (
          <details className="text-xs text-left max-w-md mx-auto">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Error Details (Dev)
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

const ViewProposalPage = () => {
  const { toast } = useToast();
  const viewProposalLogic = useViewProposalLogic();
  const viewProposalAuth = useViewProposalAuth(
    viewProposalLogic.proposal, 
    viewProposalLogic.clientEmail, 
    viewProposalLogic.token
  );
  
  // Wrap fetchProposal to provide current id and token
  const handleProposalUpdate = useCallback(() => {
    if (viewProposalLogic.id) {
      viewProposalLogic.fetchProposal(viewProposalLogic.id, viewProposalLogic.token);
    }
  }, [viewProposalLogic.id, viewProposalLogic.token, viewProposalLogic.fetchProposal]);
  
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
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch {
        // Silently ignored — history API blocked in sandboxed WebView/in-app browsers
      }
      
      // Force a proposal refresh to ensure latest data
      if (viewProposalLogic.id) {
        viewProposalLogic.fetchProposal(viewProposalLogic.id, viewProposalLogic.token);
      }
    }
  }, [viewProposalAuth.user, viewProposalLogic.id, viewProposalLogic.token, toast]);
  
  return (
    <ErrorBoundary 
      FallbackComponent={ViewProposalErrorFallback}
      onReset={() => window.location.reload()}
    >
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
    </ErrorBoundary>
  );
};

export default ViewProposalPage;
