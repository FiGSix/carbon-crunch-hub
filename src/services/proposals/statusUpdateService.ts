
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { Database } from '@/integrations/supabase/types';

type ProposalUpdate = Database['public']['Tables']['proposals']['Update'];

export interface StatusUpdateResult {
  success: boolean;
  error?: string;
}

/**
 * Update the status of a proposal
 */
export async function updateProposalStatus(
  proposalId: string,
  newStatus: string,
  userId: string
): Promise<StatusUpdateResult> {
  const statusLogger = logger.withContext({
    component: 'StatusUpdateService',
    method: 'updateProposalStatus',
    proposalId,
    newStatus,
    userId
  });

  try {
    statusLogger.info("Starting status update with audit trail");

    // Validate the new status
    const validStatuses = ['draft', 'pending', 'approved', 'rejected'];
    if (!validStatuses.includes(newStatus)) {
      statusLogger.error("Invalid status provided", { newStatus, validStatuses });
      return {
        success: false,
        error: `Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`
      };
    }

    // Get current proposal data for audit trail
    const { data: currentProposal, error: fetchError } = await supabase
      .from('proposals')
      .select('status, title')
      .eq('id', proposalId)
      .single();

    if (fetchError) {
      statusLogger.error("Failed to fetch current proposal", { error: fetchError.message });
      return {
        success: false,
        error: fetchError.message
      };
    }

    // Don't update if status is the same
    if (currentProposal.status === newStatus) {
      statusLogger.info("Status unchanged, skipping update");
      return { success: true };
    }

    // Update the proposal status with proper typing and audit trail
    const updateData: ProposalUpdate = {
      status: newStatus,
      last_modified_by: userId,
      // Set signed_at when approved
      ...(newStatus === 'approved' && { signed_at: new Date().toISOString() })
    };

    const { error } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', proposalId);

    if (error) {
      statusLogger.error("Database update failed", { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }

    statusLogger.info("Status update completed successfully with audit trail", { 
      previousStatus: currentProposal.status,
      newStatus,
      proposalTitle: currentProposal.title 
    });
    
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    statusLogger.error("Unexpected error updating status", { error: errorMessage });
    
    return {
      success: false,
      error: errorMessage
    };
  }
}
