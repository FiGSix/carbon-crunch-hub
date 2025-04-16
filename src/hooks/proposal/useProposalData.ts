
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProposalData } from "@/components/proposals/view/types";

export function useProposalData(id?: string, token?: string | null) {
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        setLoading(true);
        console.log("Fetching proposal with:", { id, token });
        
        if (token) {
          // Validate the token and get the proposal ID and client email
          const { data, error: validationError } = await supabase.rpc('validate_invitation_token', { token });
          
          if (validationError || !data || !data.length || !data[0].proposal_id) {
            console.error("Token validation failed:", validationError || "No valid proposal ID returned");
            setError("This invitation link is invalid or has expired.");
            setLoading(false);
            return;
          }
          
          const proposalId = data[0].proposal_id;
          const invitedEmail = data[0].client_email;
          
          console.log("Token validated, proposal ID:", proposalId, "Client email:", invitedEmail);
          setClientEmail(invitedEmail);
          
          // Mark the invitation as viewed
          await supabase
            .from('proposals')
            .update({ invitation_viewed_at: new Date().toISOString() })
            .eq('invitation_token', token);
          
          // Now fetch the proposal with the validated ID
          const { data: proposalData, error: fetchError } = await supabase
            .from('proposals')
            .select('*')
            .eq('id', proposalId)
            .single();
          
          if (fetchError) {
            throw fetchError;
          }
          
          // Ensure the data is properly typed with all required ProposalData fields
          const typedData: ProposalData = {
            ...proposalData as any,
            review_later_until: proposalData.review_later_until || null
          };
          
          setProposal(typedData);
        } else if (id) {
          // Regular fetch by ID (for authenticated users)
          console.log("Fetching proposal by ID:", id);
          const { data, error: fetchError } = await supabase
            .from('proposals')
            .select('*')
            .eq('id', id)
            .single();
          
          if (fetchError) {
            console.error("Error fetching proposal by ID:", fetchError);
            throw fetchError;
          }
          
          // Ensure the data is properly typed with all required ProposalData fields
          const typedData: ProposalData = {
            ...data as any,
            review_later_until: data.review_later_until || null
          };
          
          console.log("Proposal fetched successfully:", typedData);
          setProposal(typedData);
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
    clientEmail
  };
}
