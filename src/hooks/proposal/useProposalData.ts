
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProposalData } from "@/components/proposals/view/types";

export function useProposalData(id?: string, token?: string | null) {
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        setLoading(true);
        
        if (token) {
          // Validate the token and get the proposal ID
          const { data: proposalId, error: validationError } = await supabase.rpc('validate_invitation_token', { token });
          
          if (validationError || !proposalId) {
            setError("This invitation link is invalid or has expired.");
            setLoading(false);
            return;
          }
          
          // Mark the invitation as viewed
          await supabase
            .from('proposals')
            .update({ invitation_viewed_at: new Date().toISOString() })
            .eq('invitation_token', token);
          
          // Now fetch the proposal with the validated ID
          const { data, error: fetchError } = await supabase
            .from('proposals')
            .select('*')
            .eq('id', proposalId)
            .single();
          
          if (fetchError) {
            throw fetchError;
          }
          
          // Cast data to ProposalData and ensure review_later_until is defined
          const proposalData: ProposalData = {
            ...(data as any),
            review_later_until: data.review_later_until || null
          };
          
          setProposal(proposalData);
        } else if (id) {
          // Regular fetch by ID (for authenticated users)
          const { data, error: fetchError } = await supabase
            .from('proposals')
            .select('*')
            .eq('id', id)
            .single();
          
          if (fetchError) {
            throw fetchError;
          }
          
          // Cast data to ProposalData and ensure review_later_until is defined
          const proposalData: ProposalData = {
            ...(data as any),
            review_later_until: data.review_later_until || null
          };
          
          setProposal(proposalData);
        } else {
          setError("No proposal ID or invitation token provided.");
        }
      } catch (err) {
        console.error("Error fetching proposal:", err);
        setError("Failed to load the proposal. It may have been deleted or you don't have permission to view it.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProposal();
  }, [id, token]);

  return {
    proposal,
    loading,
    error,
  };
}
