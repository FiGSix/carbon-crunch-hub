
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    
    // If not found in profiles, search in unified clients table
    const { data: existingClient, error: clientSearchError } = await supabase
      .from('clients')
      .select('id, user_id')
      .eq('email', normalizedEmail)
      .maybeSingle();
    
    if (clientSearchError && !clientSearchError.message.includes('No rows found')) {
      console.error("Error searching for client in clients table:", clientSearchError);
    }
    
    if (existingClient) {
      console.log(`Found existing client in unified table: ${existingClient.id}`);
      return { 
        clientId: existingClient.id, 
        isRegisteredUser: existingClient.user_id !== null
      };
    }
    
    console.log(`No existing client found with email: ${normalizedEmail}`);
    return null;
  } catch (error) {
    console.error("Error in findExistingClient:", error);
    return null;
  }
}
