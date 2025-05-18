
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ClientProfileRequest, ClientProfileResponse, ErrorResponse } from "../../_shared/types.ts";
import { findExistingClient } from "./client-lookup.ts";

// Create a new client contact
export async function createClientContact(
  clientData: ClientProfileRequest,
  creatorId: string,
  supabase: ReturnType<typeof createClient>
): Promise<ClientProfileResponse | ErrorResponse> {
  try {
    // Normalize email to prevent case mismatch issues
    const normalizedEmail = clientData.email.toLowerCase().trim();
    console.log(`Creating new client contact with normalized email: ${normalizedEmail}`);
    
    // Parse name into first and last name
    const nameParts = clientData.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Create a new client contact
    const { data: newContact, error: createError } = await supabase
      .from('client_contacts')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: normalizedEmail,
        phone: clientData.phone,
        company_name: clientData.companyName,
        created_by: creatorId
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error("Error creating client contact:", createError);
      
      // Check if the error is related to unique violation (duplicate email)
      if (createError.message.includes('duplicate') || createError.message.includes('unique constraint')) {
        // Try to find the existing contact one more time
        const retryResult = await findExistingClient(normalizedEmail, supabase);
        
        if (retryResult) {
          console.log("Found client on retry after duplicate error:", retryResult);
          return {
            clientId: retryResult.clientId,
            isNewProfile: false,
            isRegisteredUser: retryResult.isRegisteredUser
          };
        }
      }
      
      return {
        error: `Error creating client contact: ${createError.message}`,
        status: 500
      };
    }
    
    if (!newContact || !newContact.id) {
      console.error("Failed to create client contact, no ID returned");
      return {
        error: "Failed to create client contact, no ID returned",
        status: 500
      };
    }
    
    console.log(`Successfully created new client contact: ${newContact.id}`);
    return { 
      clientId: newContact.id,
      isNewProfile: true,
      isRegisteredUser: false
    };
  } catch (error) {
    console.error("Unexpected error creating client:", error);
    return {
      error: `Unexpected error creating client: ${error instanceof Error ? error.message : String(error)}`,
      status: 500
    };
  }
}
