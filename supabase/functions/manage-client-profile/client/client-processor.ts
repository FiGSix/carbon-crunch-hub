
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ClientProfileRequest, ClientProfileResponse, ErrorResponse } from "../../_shared/types.ts";
import { findExistingClient } from "./client-lookup.ts";
import { createClientContact } from "./client-creation.ts";

// Handle client processing logic
export async function processClientRequest(
  request: ClientProfileRequest,
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<ClientProfileResponse | ErrorResponse> {
  try {
    const { email, existingClient } = request;
    
    if (!email) {
      console.error("Email is required");
      return {
        error: 'Email is required',
        status: 400
      };
    }
    
    // Normalize email to prevent case mismatch issues
    const normalizedEmail = email.toLowerCase().trim();
    
    // For existing clients, search in the database
    if (existingClient) {
      console.log(`Searching for existing client with email: ${normalizedEmail}`);
      
      const existingClient = await findExistingClient(normalizedEmail, supabase);
      
      if (existingClient) {
        return { 
          clientId: existingClient.clientId,
          isNewProfile: false,
          isRegisteredUser: existingClient.isRegisteredUser
        };
      }
      
      console.error(`No existing client found with email: ${normalizedEmail}`);
      return {
        error: `No existing client found with email: ${normalizedEmail}`,
        status: 404
      };
    } 
    // For new clients, check if they exist first, then create if not
    else {
      console.log(`Processing new client with email: ${normalizedEmail}`);
      
      // Check if a client with this email already exists
      const existingClient = await findExistingClient(normalizedEmail, supabase);
      
      if (existingClient) {
        console.log(`Client already exists with email ${normalizedEmail}, returning existing client`);
        return { 
          clientId: existingClient.clientId,
          isNewProfile: false,
          isRegisteredUser: existingClient.isRegisteredUser
        };
      }
      
      // Create new client contact
      return await createClientContact(
        { ...request, email: normalizedEmail },
        userId, 
        supabase
      );
    }
  } catch (error) {
    console.error("Error in processClientRequest:", error);
    return {
      error: `Error processing client request: ${error instanceof Error ? error.message : String(error)}`,
      status: 500
    };
  }
}
