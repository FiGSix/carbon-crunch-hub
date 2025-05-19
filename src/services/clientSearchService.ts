
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface ClientSearchResult {
  id: string;
  name: string;
  email: string;
  company: string | null;
  isRegistered: boolean;
}

/**
 * Search for clients by name, email, or company
 * Returns results from both registered users and client contacts
 */
export async function searchClients(searchTerm: string): Promise<ClientSearchResult[]> {
  const contextLogger = logger.withContext({ 
    component: 'ClientSearchService', 
    method: 'searchClients' 
  });
  
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .rpc('search_clients', { 
        search_term: searchTerm.trim() 
      });
      
    if (error) {
      contextLogger.error("Error searching clients", { error });
      throw new Error(`Failed to search clients: ${error.message}`);
    }
    
    if (!data) {
      return [];
    }
    
    // Transform the results to match our interface
    return data.map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      company: client.company,
      isRegistered: client.is_registered
    }));
  } catch (error) {
    contextLogger.error("Exception searching clients", { error });
    return [];
  }
}
