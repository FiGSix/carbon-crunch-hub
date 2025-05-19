
import { supabase } from "@/integrations/supabase/client";
import { ClientInformation } from "@/types/proposals";
import { logger } from "@/lib/logger";
import { isValidUUID } from "@/utils/validationUtils";
import { directClientLookup } from "./clientLookupService";
import { ensureValidSession } from "./authService";

/**
 * Create or find a client profile using the secure edge function
 * Returns both client ID and source information (registered user or client contact)
 */
export async function findOrCreateClient(clientInfo: ClientInformation): Promise<{ clientId: string | null, isRegisteredUser: boolean } | null> {
  const contextLogger = logger.withContext({ 
    function: 'findOrCreateClient', 
    clientEmail: clientInfo.email,
    existingClient: clientInfo.existingClient 
  });
  
  try {
    // Normalize client email to prevent case mismatch issues
    const normalizedClientInfo = {
      ...clientInfo,
      email: clientInfo.email.trim().toLowerCase()
    };
    
    // First try to refresh the session to ensure we have a valid token
    await ensureValidSession();
    
    // For existing clients, try the direct lookup first since we know they exist
    if (normalizedClientInfo.existingClient) {
      contextLogger.info("Client marked as existing, attempting direct lookup first");
      const directResult = await directClientLookup(normalizedClientInfo.email);
      
      if (directResult && directResult.clientId && isValidUUID(directResult.clientId)) {
        contextLogger.info("Found existing client via direct lookup", {
          clientId: directResult.clientId,
          isRegisteredUser: directResult.isRegisteredUser
        });
        return directResult;
      }
      
      contextLogger.warn("Client marked as existing but not found in direct lookup, falling back to edge function");
    }
    
    contextLogger.info("Calling manage-client-profile edge function");
    
    // Call the edge function with improved error handling
    const { data, error } = await supabase.functions.invoke('manage-client-profile', {
      body: {
        name: normalizedClientInfo.name,
        email: normalizedClientInfo.email,
        phone: normalizedClientInfo.phone || null,
        companyName: normalizedClientInfo.companyName || null,
        existingClient: normalizedClientInfo.existingClient
      }
    });

    if (error) {
      contextLogger.error("Error from manage-client-profile function:", { 
        statusCode: error.status,
        message: error.message,
        details: error.stack
      });
      
      // Check for common error types and provide more specific feedback
      if (error.message?.includes('auth') || error.status === 401) {
        throw new Error("Authentication error. Please sign in again and try once more.");
      }
      
      throw new Error(`Failed to manage client profile: ${error.message}`);
    }

    if (!data || !data.clientId || !isValidUUID(data.clientId)) {
      contextLogger.error("Invalid response from manage-client-profile function:", { data });
      throw new Error("Received invalid client ID from server. Please try again.");
    }

    contextLogger.info("Successfully found/created client profile", { 
      clientId: data.clientId,
      isNewProfile: data.isNewProfile,
      isRegisteredUser: data.isRegisteredUser
    });
    
    return {
      clientId: data.clientId,
      isRegisteredUser: data.isRegisteredUser
    };
  } catch (error) {
    contextLogger.error("Unexpected error in findOrCreateClient", { error });
    
    // If this is an Error object, get its message
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Client profile operation failed: ${errorMessage}`);
  }
}
