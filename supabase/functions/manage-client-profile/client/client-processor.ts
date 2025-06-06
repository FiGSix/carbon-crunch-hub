
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
    
    // Validate input data
    if (!email || !email.trim()) {
      console.error("Email is required for client processing");
      return {
        error: "Email is required",
        status: 400
      };
    }

    if (!createdBy) {
      console.error("Created by user ID is required");
      return {
        error: "Invalid user context",
        status: 400
      };
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`Processing client request for email: ${normalizedEmail}`);
    
    // If this is marked as an existing client, try to find them in registered users first
    if (existingClient) {
      console.log("Looking for existing registered client");
      
      // Check if this email exists as a registered user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', normalizedEmail)
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
        
        // Validate the profile exists and is accessible
        const { data: validationProfile, error: validationError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', profile.id)
          .single();

        if (!validationError && validationProfile) {
          return {
            clientId: profile.id,
            isNewProfile: false,
            isRegisteredUser: true
          };
        }
      }
      
      // Check if this email exists in the unified clients table
      const { data: existingClient, error: clientError } = await supabase
        .from('clients')
        .select('id, user_id')
        .eq('email', normalizedEmail)
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
        
        // Validate the client exists and is accessible
        const { data: validationClient, error: validationError } = await supabase
          .from('clients')
          .select('id')
          .eq('id', existingClient.id)
          .single();

        if (!validationError && validationClient) {
          return {
            clientId: existingClient.id,
            isNewProfile: false,
            isRegisteredUser: existingClient.user_id !== null
          };
        }
      }
    }
    
    // No existing client found, create a new one
    console.log("No existing client found, creating new client");
    const createResult = await createClientContact(clientData, createdBy, supabase);
    
    // Additional validation after creation
    if ('clientId' in createResult && createResult.clientId) {
      const { data: finalValidation, error: finalValidationError } = await supabase
        .from('clients')
        .select('id, email')
        .eq('id', createResult.clientId)
        .single();

      if (finalValidationError || !finalValidation) {
        console.error("Final validation failed for created client:", finalValidationError);
        return {
          error: "Client creation succeeded but final validation failed",
          status: 500
        };
      }

      console.log(`Client creation and validation completed successfully: ${createResult.clientId}`);
    }
    
    return createResult;
    
  } catch (error) {
    console.error("Error in processClientRequest:", error);
    return {
      error: `Error processing client request: ${error instanceof Error ? error.message : String(error)}`,
      status: 500
    };
  }
}
