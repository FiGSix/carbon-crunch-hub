
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ClientProfileRequest, ClientProfileResponse, ErrorResponse } from "../_shared/types.ts";

// Find an existing client by email
export async function findExistingClient(
  email: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ clientId: string; isRegisteredUser: boolean } | null> {
  try {
    // First, search in profiles (registered users)
    const { data: existingProfile, error: profileSearchError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', email)
      .eq('role', 'client')
      .maybeSingle();
    
    if (profileSearchError && !profileSearchError.message.includes('No rows found')) {
      console.error("Error searching for client in profiles:", profileSearchError);
    }
    
    if (existingProfile) {
      console.log("Found existing registered user profile:", existingProfile.id);
      return { 
        clientId: existingProfile.id, 
        isRegisteredUser: true 
      };
    }
    
    // If not found in profiles, search in client_contacts
    const { data: existingContact, error: contactSearchError } = await supabase
      .from('client_contacts')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    
    if (contactSearchError && !contactSearchError.message.includes('No rows found')) {
      console.error("Error searching for client in client_contacts:", contactSearchError);
    }
    
    if (existingContact) {
      console.log("Found existing client contact:", existingContact.id);
      return { 
        clientId: existingContact.id, 
        isRegisteredUser: false 
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error in findExistingClient:", error);
    return null;
  }
}

// Create a new client contact
export async function createClientContact(
  clientData: ClientProfileRequest,
  creatorId: string,
  supabase: ReturnType<typeof createClient>
): Promise<ClientProfileResponse | ErrorResponse> {
  try {
    // Parse name into first and last name
    const firstName = clientData.name.split(' ')[0] || '';
    const lastName = clientData.name.split(' ').slice(1).join(' ') || '';
    
    // Create a new client contact
    const { data: newContact, error: createError } = await supabase
      .from('client_contacts')
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: clientData.email,
        phone: clientData.phone,
        company_name: clientData.companyName,
        created_by: creatorId
      })
      .select('id')
      .single();
    
    if (createError) {
      console.error("Error creating client contact:", createError);
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
    
    console.log("Successfully created new client contact:", newContact.id);
    return { 
      clientId: newContact.id,
      isNewProfile: true,
      isRegisteredUser: false
    };
  } catch (error) {
    console.error("Unexpected error creating client:", error);
    return {
      error: `Unexpected error creating client: ${error.message}`,
      status: 500
    };
  }
}

// Handle client processing logic
export async function processClientRequest(
  request: ClientProfileRequest,
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<ClientProfileResponse | ErrorResponse> {
  const { name, email, existingClient } = request;
  
  if (!email) {
    console.error("Email is required");
    return {
      error: 'Email is required',
      status: 400
    };
  }
  
  // For existing clients, search in the database
  if (existingClient) {
    console.log("Searching for existing client with email:", email);
    
    const existingClient = await findExistingClient(email, supabase);
    
    if (existingClient) {
      return { 
        clientId: existingClient.clientId,
        isNewProfile: false,
        isRegisteredUser: existingClient.isRegisteredUser
      };
    }
    
    console.error("No existing client found with email:", email);
    return {
      error: `No existing client found with email: ${email}`,
      status: 404
    };
  } 
  // For new clients, check if they exist first, then create if not
  else {
    console.log("Creating new client contact with email:", email);
    
    // Check if a client with this email already exists
    const existingClient = await findExistingClient(email, supabase);
    
    if (existingClient) {
      return { 
        clientId: existingClient.clientId,
        isNewProfile: false,
        isRegisteredUser: existingClient.isRegisteredUser
      };
    }
    
    // Create new client contact
    return await createClientContact(request, userId, supabase);
  }
}
