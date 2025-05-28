
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

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
    statusLogger.info("Starting status update");

    // Validate the new status
    const validStatuses = ['draft', 'pending', 'approved', 'rejected'];
    if (!validStatuses.includes(newStatus)) {
      statusLogger.error("Invalid status provided", { newStatus, validStatuses });
      return {
        success: false,
        error: `Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`
      };
    }

    // Update the proposal status
    const { error } = await supabase
      .from('proposals')
      .update({ 
        status: newStatus,
        // Set signed_at when approved
        ...(newStatus === 'approved' && { signed_at: new Date().toISOString() })
      })
      .eq('id', proposalId);

    if (error) {
      statusLogger.error("Database update failed", { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }

    statusLogger.info("Status update completed successfully");
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
