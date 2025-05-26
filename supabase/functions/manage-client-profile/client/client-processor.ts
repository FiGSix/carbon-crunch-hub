
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ClientProfileRequest, ClientProfileResponse, ErrorResponse } from "../../_shared/types.ts";
import { createClientContact } from "./client-creation.ts";

export async function processClientRequest(
  clientData: ClientProfileRequest,
  createdBy: string,
  supabase: ReturnType<typeof createClient>
): Promise<ClientProfileResponse | ErrorResponse> {
  try {
    const { email, existingClient } = clientData;
    
    console.log(`Processing client request for email: ${email}`);
    
    // If this is marked as an existing client, try to find them in registered users first
    if (existingClient) {
      console.log("Looking for existing registered client");
      
      // Check if this email exists as a registered user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', email.toLowerCase().trim())
        .eq('role', 'client')
        .maybeSingle();
      
      if (profileError && !profileError.message.includes('No rows found')) {
        console.error("Error checking for existing profile:", profileError);
        return {
          error: `Error checking for existing client: ${profileError.message}`,
          status: 500
        };
      }
      
      if (profile) {
        console.log(`Found existing registered client: ${profile.id}`);
        return {
          clientId: profile.id,
          isNewProfile: false,
          isRegisteredUser: true
        };
      }
      
      // Check if this email exists in the unified clients table
      const { data: existingClient, error: clientError } = await supabase
        .from('clients')
        .select('id, user_id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      
      if (clientError && !clientError.message.includes('No rows found')) {
        console.error("Error checking for existing client:", clientError);
        return {
          error: `Error checking for existing client: ${clientError.message}`,
          status: 500
        };
      }
      
      if (existingClient) {
        console.log(`Found existing client: ${existingClient.id}`);
        return {
          clientId: existingClient.id,
          isNewProfile: false,
          isRegisteredUser: existingClient.user_id !== null
        };
      }
    }
    
    // No existing client found, create a new one
    console.log("No existing client found, creating new client");
    return await createClientContact(clientData, createdBy, supabase);
    
  } catch (error) {
    console.error("Error in processClientRequest:", error);
    return {
      error: `Error processing client request: ${error instanceof Error ? error.message : String(error)}`,
      status: 500
    };
  }
}
