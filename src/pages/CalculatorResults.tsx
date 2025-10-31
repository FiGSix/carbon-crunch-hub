import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useCalculatorResults } from "@/hooks/calculator/useCalculatorResults";
import { useCalculatorResultsAuth } from "@/hooks/calculator/useCalculatorResultsAuth";
import { CalculatorResultsContent } from "./calculator/CalculatorResultsContent";
import { useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function CalculatorResults() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: result, isLoading, error, refetch } = useCalculatorResults(id || "", token || "");
  
  const handleProposalCreated = useCallback(async (proposalId: string) => {
    // Show success message
    toast({
      title: "Project Created!",
      description: "Your solar project has been created. Redirecting you to review your proposal...",
    });
    
    // Redirect to the proposal view page with token if available
    setTimeout(() => {
      const proposalUrl = token 
        ? `/proposals/${proposalId}/view?token=${token}`
        : `/proposals/${proposalId}/view`;
      
      navigate(proposalUrl);
    }, 1500);
  }, [navigate, token, toast]);
  
  // Check if proposal was created after auth
  useEffect(() => {
    if (result?.proposal_id && result?.user_id) {
      handleProposalCreated(result.proposal_id);
    }
  }, [result?.proposal_id, result?.user_id, handleProposalCreated]);
  
  const auth = useCalculatorResultsAuth(
    result, 
    result?.email || null, 
    token,
    refetch
  );

  return (
    <CalculatorResultsContent
      result={result}
      loading={isLoading}
      error={error}
      token={token}
      user={auth.user}
      showAuthForm={auth.showAuthForm}
      handleAuthComplete={auth.handleAuthComplete}
      showSignInPrompt={auth.showSignInPrompt}
      handleSignInClick={auth.handleSignInClick}
    />
  );
}
