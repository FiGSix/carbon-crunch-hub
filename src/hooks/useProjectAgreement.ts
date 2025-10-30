import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface ProjectAgreement {
  id: string;
  proposal_id: string;
  signed_by: string;
  signed_at: string;
  signature_type: string;
  typed_name: string | null;
  signature_image_url: string | null;
  signed_pdf_url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  accepted_terms_version: string;
  metadata: any;
  signer_name: string;
  signer_email: string;
  agent_name: string;
  client_name: string;
  client_email: string;
}

export function useProjectAgreement(proposalId: string | undefined) {
  return useQuery({
    queryKey: ["project-agreement", proposalId],
    queryFn: async () => {
      if (!proposalId) return null;

      const { data: agreement, error: agreementError } = await supabase
        .from("proposal_agreements")
        .select("*")
        .eq("proposal_id", proposalId)
        .order("signed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (agreementError) {
        logger.error("Error fetching agreement", { error: agreementError, proposalId });
        throw agreementError;
      }

      if (!agreement) return null;

      // Fetch signer profile
      const { data: signerProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", agreement.signed_by)
        .single();

      // Fetch proposal details to get agent and client info
      const { data: proposal } = await supabase
        .from("proposals")
        .select("agent_id, client_id, client_reference_id, title, content")
        .eq("id", proposalId)
        .single();

      let agentName = "";
      let clientName = "";
      let clientEmail = "";

      if (proposal) {
        // Get agent name
        const { data: agentProfile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", proposal.agent_id)
          .single();

        agentName = agentProfile
          ? `${agentProfile.first_name || ""} ${agentProfile.last_name || ""}`.trim()
          : "";

        // Get client info - check both client_id and client_reference_id
        if (proposal.client_id) {
          const { data: clientProfile } = await supabase
            .from("profiles")
            .select("first_name, last_name, email")
            .eq("id", proposal.client_id)
            .single();

          if (clientProfile) {
            clientName = `${clientProfile.first_name || ""} ${clientProfile.last_name || ""}`.trim();
            clientEmail = clientProfile.email || "";
          }
        } else if (proposal.client_reference_id) {
          const { data: clientRecord } = await supabase
            .from("clients")
            .select("first_name, last_name, email")
            .eq("id", proposal.client_reference_id)
            .single();

          if (clientRecord) {
            clientName = `${clientRecord.first_name || ""} ${clientRecord.last_name || ""}`.trim();
            clientEmail = clientRecord.email || "";
          }
        }

        // Fallback to content if not found
        if (!clientName && proposal.content) {
          const content = proposal.content as any;
          if (content.clientInfo) {
            clientName = content.clientInfo.name || "";
            clientEmail = content.clientInfo.email || "";
          }
        }
      }

      return {
        ...agreement,
        signer_name: signerProfile
          ? `${signerProfile.first_name || ""} ${signerProfile.last_name || ""}`.trim()
          : "",
        signer_email: signerProfile?.email || "",
        agent_name: agentName,
        client_name: clientName,
        client_email: clientEmail,
      } as ProjectAgreement;
    },
    enabled: !!proposalId,
  });
}
