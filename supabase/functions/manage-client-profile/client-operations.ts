
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { ClientProfileRequest, ClientProfileResponse, ErrorResponse } from "../_shared/types.ts";

// Find an existing client by email
export async function findExistingClient(
  email: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ clientId: string; isRegisteredUser: boolean } | null> {
  try {
    // Normalize email to prevent case mismatch issues
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log(`Searching for existing client with normalized email: ${normalizedEmail}`);
    
    // First, search in profiles (registered users)
    const { data: existingProfile, error: profileSearchError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', normalizedEmail)
      .eq('role', 'client')
      .maybeSingle();
    
    if (profileSearchError && !profileSearchError.message.includes('No rows found')) {
      console.error("Error searching for client in profiles:", profileSearchError);
    }
    
    if (existingProfile) {
      console.log(`Found existing registered user profile: ${existingProfile.id}`);
      return { 
        clientId: existingProfile.id, 
        isRegisteredUser: true 
      };
    }
    
    // If not found in profiles, search in client_contacts
    const { data: existingContact, error: contactSearchError } = await supabase
      .from('client_contacts')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    
    if (contactSearchError && !contactSearchError.message.includes('No rows found')) {
      console.error("Error searching for client in client_contacts:", contactSearchError);
    }
    
    if (existingContact) {
      console.log(`Found existing client contact: ${existingContact.id}`);
      return { 
        clientId: existingContact.id, 
        isRegisteredUser: false 
      };
    }
    
    console.log(`No existing client found with email: ${normalizedEmail}`);
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

// Handle client processing logic
export async function processClientRequest(
  request: ClientProfileRequest,
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<ClientProfileResponse | ErrorResponse> {
  try {
    const { name, email, existingClient } = request;
    
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
