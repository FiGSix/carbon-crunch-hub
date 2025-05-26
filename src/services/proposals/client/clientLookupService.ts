
import { supabase } from "@/integrations/supabase/client";
import { isValidUUID } from "@/utils/validationUtils";
import { logger } from "@/lib/logger";

/**
 * Utility function to attempt direct database lookup for a client
 * This serves as a fallback when the edge function fails or as a first try for existing clients
 */
export async function directClientLookup(email: string): Promise<{ clientId: string | null, isRegisteredUser: boolean } | null> {
  const contextLogger = logger.withContext({
    function: 'directClientLookup',
    clientEmail: email
  });
  
  if (!email) {
    contextLogger.error("Cannot lookup client with empty email");
    return null;
  }
  
  try {
    contextLogger.info("Attempting direct client lookup");
    const normalizedEmail = email.toLowerCase().trim();
    
    // First, search in profiles (registered users)
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .eq('role', 'client')
      .maybeSingle();
    
    if (profileError && !profileError.message.includes('No rows found')) {
      contextLogger.error("Error searching for client in profiles", { error: profileError });
    } else if (profileError) {
      contextLogger.info("No matching profile found in registered users");
    }
    
    if (existingProfile?.id && isValidUUID(existingProfile.id)) {
      contextLogger.info("Found existing registered user profile", { 
        id: existingProfile.id,
        email: existingProfile.email 
      });
      return {
        clientId: existingProfile.id,
        isRegisteredUser: true
      };
    }
    
    // If not found in profiles, search in unified clients table
    const { data: existingClient, error: clientError } = await supabase
      .from('clients')
      .select('id, email, user_id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    
    if (clientError && !clientError.message.includes('No rows found')) {
      contextLogger.error("Error searching for client in clients table", { error: clientError });
    } else if (clientError) {
      contextLogger.info("No matching client found in clients table");
    }
    
    if (existingClient?.id && isValidUUID(existingClient.id)) {
      contextLogger.info("Found existing client in unified table", { 
        id: existingClient.id,
        email: existingClient.email,
        isRegisteredUser: existingClient.user_id !== null
      });
      return {
        clientId: existingClient.id,
        isRegisteredUser: existingClient.user_id !== null
      };
    }
    
    contextLogger.info("No existing client found in direct lookup with email:", { email: normalizedEmail });
    return null;
  } catch (error) {
    contextLogger.error("Error in directClientLookup", { error });
    return null;
  }
}
