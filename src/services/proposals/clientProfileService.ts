
import { supabase } from "@/integrations/supabase/client";
import { ClientInformation } from "@/types/proposals";
import { logger } from "@/lib/logger";
import { refreshSession } from "@/lib/supabase/auth";

/**
 * Create or find a client profile using the secure edge function
 * Added token refresh to handle expired tokens and improved error handling
 */
export async function findOrCreateClient(clientInfo: ClientInformation): Promise<string | null> {
  try {
    // First try to refresh the session to ensure we have a valid token
    await refreshSession();
    
    logger.info("Calling manage-client-profile edge function", { 
      clientEmail: clientInfo.email,
      isExistingClient: clientInfo.existingClient 
    });
    
    const { data, error } = await supabase.functions.invoke('manage-client-profile', {
      body: {
        name: clientInfo.name,
        email: clientInfo.email,
        phone: clientInfo.phone || null,
        companyName: clientInfo.companyName || null,
        existingClient: clientInfo.existingClient
      }
    });

    if (error) {
      logger.error("Error from manage-client-profile function:", { 
        error,
        statusCode: error.status,
        message: error.message
      });
      return null;
    }

    if (!data || !data.clientId) {
      logger.error("Invalid response from manage-client-profile function:", { data });
      return null;
    }

    logger.info("Successfully found/created client profile", { 
      clientId: data.clientId,
      isNewProfile: data.isNewProfile,
      isRegisteredUser: data.isRegisteredUser
    });
    
    return data.clientId;
  } catch (error) {
    logger.error("Unexpected error in findOrCreateClient:", { 
      error,
      clientEmail: clientInfo.email
    });
    return null;
  }
}
