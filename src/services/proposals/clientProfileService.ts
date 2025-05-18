
import { supabase } from "@/integrations/supabase/client";
import { ClientInformation } from "@/types/proposals";
import { logger } from "@/lib/logger";
import { refreshSession } from "@/lib/supabase/auth";

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
    const { error: refreshError } = await refreshSession();
    
    if (refreshError) {
      contextLogger.warn("Session refresh failed, attempting operation anyway", { 
        refreshError: refreshError.message 
      });
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

    if (!data || !data.clientId) {
      contextLogger.error("Invalid response from manage-client-profile function:", { data });
      throw new Error("Received invalid response from server. Please try again.");
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
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Client profile operation failed: ${errorMessage}`);
  }
}

/**
 * Utility function to attempt direct database lookup for a client
 * This serves as a fallback when the edge function fails
 */
export async function directClientLookup(email: string): Promise<{ clientId: string | null, isRegisteredUser: boolean } | null> {
  const contextLogger = logger.withContext({
    function: 'directClientLookup',
    clientEmail: email
  });
  
  try {
    contextLogger.info("Attempting direct client lookup as fallback");
    
    // First, search in profiles (registered users)
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .eq('role', 'client')
      .maybeSingle();
    
    if (profileError && !profileError.message.includes('No rows found')) {
      contextLogger.error("Error searching for client in profiles", { error: profileError });
      return null;
    }
    
    if (existingProfile?.id) {
      contextLogger.info("Found existing registered user profile", { id: existingProfile.id });
      return {
        clientId: existingProfile.id,
        isRegisteredUser: true
      };
    }
    
    // If not found in profiles, search in client_contacts
    const { data: existingContact, error: contactError } = await supabase
      .from('client_contacts')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    
    if (contactError && !contactError.message.includes('No rows found')) {
      contextLogger.error("Error searching for client in client_contacts", { error: contactError });
      return null;
    }
    
    if (existingContact?.id) {
      contextLogger.info("Found existing client contact", { id: existingContact.id });
      return {
        clientId: existingContact.id,
        isRegisteredUser: false
      };
    }
    
    contextLogger.info("No existing client found in direct lookup");
    return null;
  } catch (error) {
    contextLogger.error("Error in directClientLookup fallback", { error });
    return null;
  }
}
