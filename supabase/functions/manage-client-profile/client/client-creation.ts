
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ClientProfileRequest, ClientProfileResponse, ErrorResponse } from "../../_shared/types.ts";

export async function createClientContact(
  clientData: ClientProfileRequest,
  createdBy: string,
  supabase: ReturnType<typeof createClient>
): Promise<ClientProfileResponse | ErrorResponse> {
  try {
    const { email, firstName, lastName, phone, companyName } = clientData;
    
    console.log(`Creating new client contact for email: ${email}`);
    
    // Create a new client contact record
    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase().trim(),
        phone: phone || null,
        company_name: companyName || null,
        created_by: createdBy,
        user_id: null // Not a registered user
      })
      .select()
      .single();
    
    if (insertError) {
      console.error("Error creating client contact:", insertError);
      return {
        error: `Failed to create client contact: ${insertError.message}`,
        status: 500
      };
    }
    
    if (!newClient) {
      console.error("No client data returned after insert");
      return {
        error: "Failed to create client contact - no data returned",
        status: 500
      };
    }
    
    console.log(`Successfully created client contact: ${newClient.id}`);
    
    return {
      clientId: newClient.id,
      isNewProfile: true,
      isRegisteredUser: false
    };
  } catch (error) {
    console.error("Error in createClientContact:", error);
    return {
      error: `Error creating client contact: ${error instanceof Error ? error.message : String(error)}`,
      status: 500
    };
  }
}
