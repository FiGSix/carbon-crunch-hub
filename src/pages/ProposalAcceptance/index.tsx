import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProposalData, ProposalContent } from "@/types/proposals";
import { resolveClientInfo, LiveClientRecord } from "@/utils/proposals/resolveClientInfo";
import { PageLoading } from "@/components/ui/loading-states";
import { ProposalSummarySection } from "./components/ProposalSummarySection";
import { ThirtySecondSummary } from "./components/ThirtySecondSummary";
import { TermsAndConditionsSection } from "./components/TermsAndConditionsSection";
import { SignatureSection } from "./components/SignatureSection";
import { PostSignatureOnboardingModal } from "@/components/proposals/acceptance/PostSignatureOnboardingModal";
import { useToast } from "@/hooks/use-toast";
import { parseEdgeFunctionError } from "@/lib/errors/edgeFunctionErrors";
import { AlertTriangle, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProposalAcceptance() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const { toast } = useToast();

  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingAgreement, setHasExistingAgreement] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [clientRecord, setClientRecord] = useState<LiveClientRecord | null>(null);

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

      // Fetch live client data and check existing agreement
      if (rawProposal.client_reference_id) {
        await Promise.all([
          fetchClientRecord(rawProposal.client_reference_id),
          checkExistingAgreement(rawProposal.client_reference_id),
        ]);
      }
    } catch (err) {
      console.error("Error fetching proposal by token:", err);
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isExpiredError = errorMessage.includes('expired') || 
                             errorMessage.includes('Invalid or expired');
      
      // Check if user is authenticated admin or agent - can fallback to RLS access
      if (isExpiredError && id) {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Check user's role from user_roles table (secure approach)
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id);
          
          const hasAgentOrAdminRole = roles?.some(r => 
            r.role === 'admin' || r.role === 'agent'
          );
          
          if (hasAgentOrAdminRole) {
            console.log("Token expired but user is admin/agent, using RLS access");
            setTokenExpired(true);
            // fetchProposalAuthenticated will use RLS to check access
            await fetchProposalAuthenticated();
            return;
          }
        }
      }
      
      setError(errorMessage);
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

      // Fetch live client data and check existing agreement
      if (data.client_reference_id) {
        await Promise.all([
          fetchClientRecord(data.client_reference_id),
          checkExistingAgreement(data.client_reference_id),
        ]);
      }
    } catch (err) {
      console.error("Error fetching proposal:", err);
      setError(err instanceof Error ? err.message : "Failed to load proposal");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientRecord = async (clientReferenceId: string) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('first_name, last_name, email, phone, company_name, registration_number')
        .eq('id', clientReferenceId)
        .single();

      if (!error && data) {
        setClientRecord(data);
      }
    } catch (err) {
      console.error('Error fetching client record:', err);
    }
  };

  const checkExistingAgreement = async (clientReferenceId: string) => {
    try {
      const { data: client, error } = await supabase
        .from('clients')
        .select('cession_signed_at')
        .eq('id', clientReferenceId)
        .single();
      
      if (!error && client?.cession_signed_at) {
        setHasExistingAgreement(true);
      }
    } catch (err) {
      console.error('Error checking for existing agreement:', err);
    }
  };

  const getClientName = (): string => {
    if (!proposal) return "";
    const resolved = resolveClientInfo(proposal.content?.clientInfo || {}, clientRecord);
    return resolved.name || "";
  };

  const validateTypedName = (): boolean => {
    const clientName = getClientName().toLowerCase().trim();
    const typed = typedName.toLowerCase().trim();
    
    // Simple fuzzy match - check if all words in client name are in typed name
    const clientWords = clientName.split(/\s+/);
    return clientWords.every(word => typed.includes(word));
  };

  const canSubmit = hasScrolledToBottom && hasAgreed && (signatureImage !== null || (typedName.trim().length > 0 && validateTypedName()));

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

      // Refresh session to ensure valid JWT before edge function call
      await supabase.auth.getSession();

      // Call the public Edge Function
      const { data, error } = await supabase.functions.invoke('accept-proposal', {
        body: {
          token: token || undefined,
          proposalId: !token ? proposal.id : undefined,
          typedName,
          signatureImage: signatureImage || undefined,
          signatureType: signatureImage ? 'canvas' : 'typed_name',
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

      if (data?.autoApproved) {
        toast({
          description: "Project successfully added to your existing agreement.",
        });
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
        return;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Show onboarding modal instead of toast and redirect
      setShowOnboardingModal(true);

    } catch (err) {
      console.error("Error submitting agreement:", err);
      
      const errorMessage = await parseEdgeFunctionError(
        err,
        "Failed to submit agreement. Please try again."
      );
      
      toast({
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoading minimal />;
  }

  // Warning banner for expired token access (admin/agent fallback)
  const ExpiredTokenBanner = () => (
    <div className="container max-w-4xl mx-auto px-4 pt-4">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
        <div>
          <p className="text-amber-800 font-medium">Invitation Link Expired</p>
          <p className="text-amber-700 text-sm">
            The client's invitation token has expired. You're viewing this proposal 
            with your account privileges. To send a new working link to the client, 
            regenerate the PDF which will create a fresh token.
          </p>
        </div>
      </div>
    </div>
  );

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

  // Simplified flow for returning clients with existing agreement
  if (hasExistingAgreement) {
    return (
      <>
        {tokenExpired && <ExpiredTokenBanner />}
        <div className="container max-w-4xl mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Project Added to Your Agreement</h1>
            <p className="text-muted-foreground">
              You already have a signed Cession Agreement. This project has been automatically added.
            </p>
          </div>

          <div className="space-y-8">
            <ProposalSummarySection proposal={proposal} />
            
            <div className="bg-accent/50 border border-accent rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">Automatically Added</h3>
                  <p className="text-muted-foreground mb-4">
                    Per Clause 5.6 of your existing Cession Agreement, new projects are automatically included 
                    without requiring a new signature. This project has been added to your portfolio and is ready 
                    for onboarding.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      View Dashboard
                    </button>
                    <button
                      onClick={() => navigate(`/proposals/${proposal.id}`)}
                      className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      View Project Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Original signature flow for new clients
  return (
    <>
      {tokenExpired && <ExpiredTokenBanner />}
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Proposal & Cession Agreement</h1>
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
            signatureImage={signatureImage}
            onSignatureImageChange={setSignatureImage}
            clientName={getClientName()}
            isValid={validateTypedName()}
            canSubmit={canSubmit}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        </div>

        <PostSignatureOnboardingModal
          open={showOnboardingModal}
          onOpenChange={setShowOnboardingModal}
          proposalId={proposal.id}
          token={token}
        />
      </div>
    </>
  );
}
