
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ClientProfileRequest, ClientProfileResponse, ErrorResponse } from "../../_shared/types.ts";

export async function createClientContact(
  clientData: ClientProfileRequest,
  createdBy: string,
  supabase: ReturnType<typeof createClient>
): Promise<ClientProfileResponse | ErrorResponse> {
  try {
    const { email, firstName, lastName, phone, companyName } = clientData;
    
    // Validate required fields
    if (!email || !email.trim()) {
      console.error("Email is required for client creation");
      return {
        error: "Email is required for client creation",
        status: 400
      };
    }

    if (!firstName || !firstName.trim()) {
      console.error("First name is required for client creation");
      return {
        error: "First name is required for client creation", 
        status: 400
      };
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    console.log(`Creating new client contact for email: ${normalizedEmail}`);
    
    // Double-check that client doesn't already exist before creating
    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();
    
    if (checkError && !checkError.message.includes('No rows found')) {
      console.error("Error checking for existing client:", checkError);
      return {
        error: `Failed to verify client uniqueness: ${checkError.message}`,
        status: 500
      };
    }

    if (existingClient) {
      console.log(`Client already exists with ID: ${existingClient.id}`);
      return {
        clientId: existingClient.id,
        isNewProfile: false,
        isRegisteredUser: false
      };
    }
    
    // Create a new client contact record with validation
    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName?.trim() || null,
        email: normalizedEmail,
        phone: phone?.trim() || null,
        company_name: companyName?.trim() || null,
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
    
    if (!newClient || !newClient.id) {
      console.error("No client data returned after insert");
      return {
        error: "Failed to create client contact - no data returned",
        status: 500
      };
    }

    // Validate the created client
    const { data: validationClient, error: validationError } = await supabase
      .from('clients')
      .select('id, email, first_name')
      .eq('id', newClient.id)
      .single();

    if (validationError || !validationClient) {
      console.error("Client validation failed after creation:", validationError);
      return {
        error: "Client was created but validation failed",
        status: 500
      };
    }
    
    console.log(`Successfully created and validated client contact: ${newClient.id}`);
    
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
