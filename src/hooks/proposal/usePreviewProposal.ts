
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

export function usePreviewProposal() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createPreview = async (proposalId: string) => {
    setLoading(true);
    try {
      logger.info(`Creating preview for proposal: ${proposalId}`);
      
      // First fetch the original proposal
      const { data: originalProposal, error: fetchError } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();
      
      if (fetchError) {
        logger.error("Error fetching original proposal:", fetchError);
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
        logger.error("Error creating preview:", createError);
        throw createError;
      }
      
      logger.info("Preview created successfully:", preview.id);
      toast({
        title: "Preview Created",
        description: "You can now make changes to the preview without affecting the original proposal.",
      });
      
      return preview;
    } catch (error) {
      logger.error("Error in createPreview:", error);
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
