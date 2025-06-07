
import { supabase } from "@/integrations/supabase/client";
import { ClientInformation } from "@/types/proposals";
import { logger } from "@/lib/logger";
import { findOrCreateClient } from "../client/clientProfileService";
import { ProposalOperationResult, ClientResult } from "./types";

export async function handleExistingClient(selectedClientId: string): Promise<ProposalOperationResult<ClientResult>> {
  const proposalLogger = logger.withContext({
    component: 'ClientHandler',
    method: 'handleExistingClient'
  });

  proposalLogger.info("Using selected client ID directly", { selectedClientId });

  // Validate that the client exists
  const { data: existingClient, error: clientError } = await supabase
    .from('clients')
    .select('id, user_id')
    .eq('id', selectedClientId)
    .single();

  if (clientError) {
    proposalLogger.error("Selected client not found in clients table", { 
      clientId: selectedClientId, 
      error: clientError 
    });
    
    // Check if this is a registered user
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', selectedClientId)
      .eq('role', 'client')
      .single();
    
    if (profileError) {
      return {
        success: false,
        error: `Selected client ${selectedClientId} not found in database`
      };
    }
    
    return {
      success: true,
      data: {
        clientId: selectedClientId,
        isRegisteredUser: true
      }
    };
  }
  
  const isRegisteredUser = !!existingClient.user_id;

  return {
    success: true,
    data: {
      clientId: selectedClientId,
      isRegisteredUser
    }
  };
}

export async function handleNewClient(clientInfo: ClientInformation, agentId: string): Promise<ProposalOperationResult<ClientResult>> {
  const proposalLogger = logger.withContext({
    component: 'ClientHandler',
    method: 'handleNewClient'
  });

  proposalLogger.info("Finding or creating client profile", { 
    clientEmail: clientInfo.email,
    existingClient: clientInfo.existingClient
  });

  const clientResult = await findOrCreateClient(clientInfo);

  if (!clientResult || !clientResult.clientId) {
    proposalLogger.error("Failed to create or find client profile", { clientInfo });
    return {
      success: false,
      error: "Failed to create or find client profile"
    };
  }

  // Additional validation - verify the client was actually created/found
  const { data: verificationClient, error: verificationError } = await supabase
    .from('clients')
    .select('id, email')
    .eq('id', clientResult.clientId)
    .single();

  if (verificationError || !verificationClient) {
    proposalLogger.error("Client verification failed after creation", { 
      clientId: clientResult.clientId,
      error: verificationError
    });
    
    return {
      success: false,
      error: "Client was created but verification failed"
    };
  }

  proposalLogger.info("Client profile found/created and verified", { 
    clientId: clientResult.clientId,
    isRegisteredUser: clientResult.isRegisteredUser,
    verifiedEmail: verificationClient.email
  });

  return {
    success: true,
    data: {
      clientId: clientResult.clientId,
      isRegisteredUser: clientResult.isRegisteredUser
    }
  };
}
