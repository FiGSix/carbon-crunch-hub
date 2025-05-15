
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { ProposalData } from "@/types/proposals";
import { logger } from "@/lib/logger";

export function usePreviewProposal() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Create a contextualized logger for preview functionality
  const previewLogger = logger.withContext({ 
    component: 'PreviewProposal', 
    feature: 'proposals' 
  });

  const createPreview = async (proposalId: string) => {
    setLoading(true);
    try {
      previewLogger.info(`Creating preview for proposal: ${proposalId}`, { proposalId });
      
      // First fetch the original proposal
      const { data: originalProposal, error: fetchError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();
      
      if (fetchError) {
        previewLogger.error("Error fetching original proposal", { proposalId, error: fetchError });
        throw fetchError;
      }
      
      // Create a new preview proposal
      const { data: preview, error: createError } = await supabase
        .from('proposals')
        .insert({
          ...originalProposal,
          id: undefined, // Let Supabase generate a new ID
          is_preview: true,
          preview_of_id: proposalId,
          status: 'draft', // Preview always starts as draft
          signed_at: null,
          invitation_token: null,
          invitation_sent_at: null,
          invitation_viewed_at: null,
          invitation_expires_at: null,
          archived_at: null,
          archived_by: null,
          review_later_until: null
        })
        .select()
        .single();
        
      if (createError) {
        previewLogger.error("Error creating preview", { proposalId, error: createError });
        throw createError;
      }
      
      previewLogger.info("Preview created successfully", { 
        originalProposalId: proposalId,
        previewId: preview.id 
      });
      
      toast({
        title: "Preview Created",
        description: "You can now make changes to the preview without affecting the original proposal.",
      });
      
      return preview;
    } catch (error) {
      previewLogger.error("Error in createPreview", error);
      toast({
        title: "Error",
        description: "Failed to create preview. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPreview,
    loading
  };
}
