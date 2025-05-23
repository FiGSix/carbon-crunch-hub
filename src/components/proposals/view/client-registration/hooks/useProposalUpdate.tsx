
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface ProposalUpdateOptions {
  proposalId: string;
  userId: string;
}

interface ProposalData {
  client_id: string | null;
  client_reference_id: string | null;
}

export function useProposalUpdate() {
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();
  
  // Create a contextualized logger
  const updateLogger = logger.withContext({
    component: 'useProposalUpdate', 
    feature: 'client-auth'
  });

  const updateProposalClientId = async (options: ProposalUpdateOptions) => {
    const { proposalId, userId } = options;
    setUpdating(true);
    
    try {
      updateLogger.info("Updating proposal with new client ID", {
        proposalId,
        userId
      });
      
      // First, fetch the current state of the proposal to check client reference
      const { data: proposalData, error: proposalFetchError } = await supabase
        .from('proposals')
        .select('client_id, client_reference_id')
        .eq('id', proposalId)
        .single();
        
      if (proposalFetchError) {
        updateLogger.error("Error fetching proposal before update", { 
          error: proposalFetchError,
          proposalId
        });
        throw proposalFetchError;
      }
      
      // Check if this user exists in the clients table  
      const { data: clientRecord, error: clientLookupError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
        
      if (clientLookupError && !clientLookupError.message.includes('No rows found')) {
        updateLogger.error("Error looking up client record", { 
          error: clientLookupError,
          userId
        });
      }
      
      // Log the current state for debugging
      updateLogger.info("Current proposal state before update", {
        proposalId,
        currentClientId: proposalData.client_id,
        currentClientReferenceId: proposalData.client_reference_id,
        foundClientRecordId: clientRecord?.id
      });
      
      // Build the update data - set client_id to the registered user ID
      const updateData: { client_id: string, client_reference_id?: string } = {
        client_id: userId
      };
      
      // If we found a corresponding client record, update the reference
      if (clientRecord?.id) {
        updateData.client_reference_id = clientRecord.id;
        updateLogger.info("Setting client_reference_id during update", {
          clientReferenceId: clientRecord.id
        });
      }
      
      // Update the proposal with the new client ID
      const { error: updateError } = await supabase
        .from('proposals')
        .update(updateData)
        .eq('id', proposalId);
      
      if (updateError) {
        updateLogger.error("Error linking proposal to client account", { 
          error: updateError,
          userId,
          proposalId,
          updateData
        });
        
        toast({
          title: "Update Error",
          description: "There was an issue linking this proposal to your account. Please contact support.",
          variant: "destructive"
        });
        
        return false;
      }
      
      updateLogger.info("Successfully linked proposal to client account", {
        userId,
        proposalId,
        updateData
      });
      
      return true;
    } catch (error: any) {
      updateLogger.error("Proposal update error", { 
        error: error.message,
        proposalId,
        userId
      });
      return false;
    } finally {
      setUpdating(false);
    }
  };

  return {
    updating,
    updateProposalClientId
  };
}
