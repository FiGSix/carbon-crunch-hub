import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProposalData, ProposalContent } from "@/types/proposals";
import { PageLoading } from "@/components/ui/loading-states";
import { ProposalSummarySection } from "./components/ProposalSummarySection";
import { TermsAndConditionsSection } from "./components/TermsAndConditionsSection";
import { SignatureSection } from "./components/SignatureSection";
import { useToast } from "@/hooks/use-toast";

export default function ProposalAcceptance() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const { toast } = useToast();

  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      // Token-based access (from email link)
      fetchProposalByToken();
    } else if (id) {
      // Authenticated user access (logged in, no token)
      fetchProposalAuthenticated();
    } else {
      setError("Invalid proposal link.");
      setLoading(false);
    }
  }, [id, token]);

  const fetchProposalByToken = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('get_proposal_by_token_direct', { token_param: token });

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Proposal not found or invitation has expired");
      }

      const rawProposal = data[0];
      
      // Transform the data to match ProposalData type
      const transformedProposal: ProposalData = {
        id: rawProposal.id,
        title: rawProposal.title,
        status: rawProposal.status,
        content: (rawProposal.content as unknown) as ProposalContent,
        created_at: rawProposal.created_at,
        signed_at: rawProposal.signed_at,
        archived_at: rawProposal.archived_at,
        review_later_until: rawProposal.review_later_until,
        client_id: rawProposal.client_id,
        client_reference_id: rawProposal.client_reference_id,
        agent_id: rawProposal.agent_id,
        annual_energy: rawProposal.annual_energy,
        carbon_credits: rawProposal.carbon_credits,
        client_share_percentage: rawProposal.client_share_percentage,
        invitation_token: rawProposal.invitation_token,
        invitation_expires_at: rawProposal.invitation_expires_at,
      };
      
      setProposal(transformedProposal);
    } catch (err) {
      console.error("Error fetching proposal by token:", err);
      setError(err instanceof Error ? err.message : "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  };

  const fetchProposalAuthenticated = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to view this proposal");
      }

      // Query proposal directly (RLS will ensure user has access)
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Proposal not found or you don't have access to it");

      // Transform the data to match ProposalData type
      const transformedProposal: ProposalData = {
        id: data.id,
        title: data.title,
        status: data.status,
        content: (data.content as unknown) as ProposalContent,
        created_at: data.created_at,
        signed_at: data.signed_at,
        archived_at: data.archived_at,
        review_later_until: data.review_later_until,
        client_id: data.client_id,
        client_reference_id: data.client_reference_id,
        agent_id: data.agent_id,
        annual_energy: data.annual_energy,
        carbon_credits: data.carbon_credits,
        client_share_percentage: data.client_share_percentage,
        invitation_token: data.invitation_token,
        invitation_expires_at: data.invitation_expires_at,
      };
      
      setProposal(transformedProposal);
    } catch (err) {
      console.error("Error fetching proposal:", err);
      setError(err instanceof Error ? err.message : "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (): string => {
    if (!proposal) return "";
    return proposal.content?.clientInfo?.name || "";
  };

  const validateTypedName = (): boolean => {
    const clientName = getClientName().toLowerCase().trim();
    const typed = typedName.toLowerCase().trim();
    
    // Simple fuzzy match - check if all words in client name are in typed name
    const clientWords = clientName.split(/\s+/);
    return clientWords.every(word => typed.includes(word));
  };

  const canSubmit = hasScrolledToBottom && hasAgreed && typedName.trim().length > 0 && validateTypedName();

  const handleSubmit = async () => {
    if (!canSubmit || !proposal) return;

    setIsSubmitting(true);
    try {
      // Get user info for audit trail
      let ipAddress = '';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const { ip } = await ipResponse.json();
        ipAddress = ip;
      } catch (e) {
        console.warn('Failed to get IP address:', e);
      }

      // Call the public Edge Function
      const { data, error } = await supabase.functions.invoke('accept-proposal', {
        body: {
          token: token || undefined,
          proposalId: !token ? proposal.id : undefined,
          typedName,
          ipAddress,
          userAgent: navigator.userAgent
        }
      });

      if (error) throw error;

      if (data?.alreadySigned) {
        toast({
          description: "This proposal has already been signed.",
        });
        setTimeout(() => {
          const redirectUrl = token 
            ? `/proposals/${proposal.id}?token=${token}`
            : `/proposals/${proposal.id}`;
          navigate(redirectUrl);
        }, 1500);
        return;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        description: "Thank you for accepting this proposal. You will receive a confirmation email shortly.",
      });

      // Redirect to view proposal page
      setTimeout(() => {
        const redirectUrl = token 
          ? `/proposals/${proposal.id}?token=${token}`
          : `/proposals/${proposal.id}`;
        navigate(redirectUrl);
      }, 2000);

    } catch (err) {
      console.error("Error submitting agreement:", err);
      toast({
        description: err instanceof Error ? err.message : "Failed to submit agreement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoading minimal />;
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Proposal</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Proposal Not Found</h2>
          <p className="text-muted-foreground">The proposal you're looking for could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Accept Proposal</h1>
        <p className="text-muted-foreground">
          Please review the proposal details and terms carefully before signing.
        </p>
      </div>

      <div className="space-y-8">
        <ProposalSummarySection proposal={proposal} />
        
        <TermsAndConditionsSection 
          onScrolledToBottom={() => setHasScrolledToBottom(true)}
          proposal={proposal}
        />
        
        <SignatureSection
          hasScrolledToBottom={hasScrolledToBottom}
          hasAgreed={hasAgreed}
          onAgreeChange={setHasAgreed}
          typedName={typedName}
          onTypedNameChange={setTypedName}
          clientName={getClientName()}
          isValid={validateTypedName()}
          canSubmit={canSubmit}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
