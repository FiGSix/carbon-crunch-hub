
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ClientProfileRequest, ClientProfileResponse, ErrorResponse } from "../../_shared/types.ts";

// Create a new client in the unified clients table
export async function createClientContact(
  clientData: ClientProfileRequest,
  createdBy: string,
  supabase: ReturnType<typeof createClient>
): Promise<ClientProfileResponse | ErrorResponse> {
  try {
    const { email, firstName, lastName, phone, companyName } = clientData;
    
    console.log(`Creating new client in unified clients table: ${email}`);
    
    // Insert client record into the unified clients table
    const { data, error } = await supabase
      .from('clients')
      .insert({
        email: email.toLowerCase().trim(),
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
        company_name: companyName || null,
        is_registered_user: false, // This is for non-registered clients
        created_by: createdBy
      })
      .select('id')
      .single();
    
    if (error) {
      console.error("Error creating client:", error);
      return {
        error: `Failed to create client: ${error.message}`,
        status: 500
      };
    }
    
    if (!data || !data.id) {
      console.error("No client ID returned from insert operation");
      return {
        error: `Failed to create client: No ID returned`,
        status: 500
      };
    }
    
    console.log(`Successfully created client with ID: ${data.id}`);
    
    // Return successful creation response
    return {
      clientId: data.id,
      isNewProfile: true,
      isRegisteredUser: false
    };
  } catch (error) {
    console.error("Error in createClientContact:", error);
    return {
      error: `Error creating client: ${error instanceof Error ? error.message : String(error)}`,
      status: 500
    };
  }
}
