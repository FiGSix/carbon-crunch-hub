
import { supabase } from "@/integrations/supabase/client";
import { ClientInformation } from "@/types/proposals";
import { logger } from "@/lib/logger";
import { findOrCreateClient } from "../client/clientProfileService";
import { ProposalOperationResult } from "./types";

// Enhanced client result interface
interface ClientResult {
  clientsTableId: string; // ID from clients table
  profileId?: string; // ID from profiles table (for registered users)
  isRegisteredUser: boolean;
}

export async function handleExistingClient(selectedClientId: string): Promise<ProposalOperationResult<ClientResult>> {
  const proposalLogger = logger.withContext({
    component: 'ClientHandler',
    method: 'handleExistingClient'
  });

  proposalLogger.info("Processing existing client", { selectedClientId });

  // First check if this is a profile ID (registered user)
  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', selectedClientId)
    .eq('role', 'client')
    .single();

  if (!profileError && existingProfile) {
    proposalLogger.info("Found registered user profile", { profileId: existingProfile.id });
    
    // Find corresponding client record in clients table
    const { data: clientRecord, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', selectedClientId)
      .single();

    if (!clientError && clientRecord) {
      return {
        success: true,
        data: {
          clientsTableId: clientRecord.id,
          profileId: existingProfile.id,
          isRegisteredUser: true
        }
      };
    } else {
      proposalLogger.warn("Profile found but no corresponding client record", { 
        profileId: selectedClientId 
      });
      
      return {
        success: false,
        error: "Registered user profile found but missing client record"
      };
    }
  }

  // If not a profile, check if it's a client record
  const { data: existingClient, error: clientError } = await supabase
    .from('clients')
    .select('id, user_id')
    .eq('id', selectedClientId)
    .single();

  if (clientError) {
    proposalLogger.error("Selected client not found", { 
      clientId: selectedClientId, 
      error: clientError 
    });
    
    return {
      success: false,
      error: `Selected client ${selectedClientId} not found in database`
    };
  }
  
  const isRegisteredUser = !!existingClient.user_id;

  return {
    success: true,
    data: {
      clientsTableId: selectedClientId,
      profileId: isRegisteredUser ? existingClient.user_id : undefined,
      isRegisteredUser
    }
  };
}

export async function handleNewClient(clientInfo: ClientInformation, agentId: string): Promise<ProposalOperationResult<ClientResult>> {
  const proposalLogger = logger.withContext({
    component: 'ClientHandler',
    method: 'handleNewClient'
  });

  proposalLogger.info("Creating new client profile", { 
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

  // Verify the client was actually created/found
  const { data: verificationClient, error: verificationError } = await supabase
    .from('clients')
    .select('id, email, user_id')
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

  const isRegisteredUser = !!verificationClient.user_id;

  proposalLogger.info("Client profile created/found and verified", { 
    clientsTableId: clientResult.clientId,
    profileId: verificationClient.user_id,
    isRegisteredUser,
    verifiedEmail: verificationClient.email
  });

  return {
    success: true,
    data: {
      clientsTableId: clientResult.clientId,
      profileId: isRegisteredUser ? verificationClient.user_id : undefined,
      isRegisteredUser
    }
  };
}
