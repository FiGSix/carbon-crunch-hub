import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProposalSignature {
  id: string;
  proposal_id: string;
  proposal_title: string;
  signed_by: string;
  signed_at: string;
  signature_type: string;
  typed_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  accepted_terms_version: string;
  client_name: string;
  client_email: string;
  agent_name: string;
}

export function useProposalSignatures() {
  return useQuery({
    queryKey: ["proposal-signatures"],
    queryFn: async () => {
      const { data: agreements, error } = await supabase
        .from("proposal_agreements")
        .select(`
          id,
          proposal_id,
          signed_by,
          signed_at,
          signature_type,
          typed_name,
          ip_address,
          user_agent,
          accepted_terms_version,
          proposals!inner(
            id,
            title,
            agent_id,
            client_id,
            client_reference_id
          )
        `)
        .order("signed_at", { ascending: false });

      if (error) throw error;

      // Fetch related profile and client data
      const enriched = await Promise.all(
        agreements.map(async (agreement) => {
          const proposal = agreement.proposals as any;
          
          // Get signer profile
          const { data: signerProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name, email")
            .eq("id", agreement.signed_by)
            .single();

          // Get agent profile
          const { data: agentProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", proposal.agent_id)
            .single();

          // Get client info
          let clientName = "Unknown";
          let clientEmail = "";
          
          if (proposal.client_id) {
            const { data: clientProfile } = await supabase
              .from("profiles")
              .select("first_name, last_name, email")
              .eq("id", proposal.client_id)
              .single();
            
            if (clientProfile) {
              clientName = `${clientProfile.first_name} ${clientProfile.last_name}`.trim();
              clientEmail = clientProfile.email;
            }
          } else if (proposal.client_reference_id) {
            const { data: client } = await supabase
              .from("clients")
              .select("first_name, last_name, email")
              .eq("id", proposal.client_reference_id)
              .single();
            
            if (client) {
              clientName = `${client.first_name} ${client.last_name}`.trim();
              clientEmail = client.email;
            }
          }

          return {
            id: agreement.id,
            proposal_id: agreement.proposal_id,
            proposal_title: proposal.title,
            signed_by: agreement.signed_by,
            signed_at: agreement.signed_at,
            signature_type: agreement.signature_type,
            typed_name: agreement.typed_name,
            ip_address: agreement.ip_address,
            user_agent: agreement.user_agent,
            accepted_terms_version: agreement.accepted_terms_version,
            client_name: clientName,
            client_email: clientEmail,
            agent_name: agentProfile 
              ? `${agentProfile.first_name} ${agentProfile.last_name}`.trim()
              : "Unknown",
          } as ProposalSignature;
        })
      );

      return enriched;
    },
  });
}
