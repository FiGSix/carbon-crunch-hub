
import { ClientSearch } from "@/services/unified/clients/ClientSearch";

export interface ClientSearchResult {
  id: string;
  name: string;
  email: string;
  company?: string;
  isRegistered: boolean;
}

export async function searchClients(searchTerm: string): Promise<ClientSearchResult[]> {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  try {
    return await ClientSearch.searchClients(searchTerm.trim());
  } catch (error) {
    console.error("Error searching clients:", error);
    return [];
  }
}
