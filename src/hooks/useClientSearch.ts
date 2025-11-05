
import { useState, useEffect } from "react";
import { searchClients, ClientSearchResult } from "@/services/clientSearchService";

export function useClientSearch() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  
  
  // Reset selected client when search term changes significantly
  useEffect(() => {
    if (searchTerm && selectedClient && !searchTerm.includes(selectedClient.name)) {
      setSelectedClient(null);
    }
  }, [searchTerm, selectedClient]);

  // Debounce search queries
  useEffect(() => {
    setError(null);
    
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    
    // Don't search if we have a selected client and the term matches
    if (selectedClient && searchTerm === selectedClient.name) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    
    const debounceTimeout = setTimeout(async () => {
      setIsLoading(true);
      
      try {
        const clientResults = await searchClients(searchTerm);
        setResults(Array.isArray(clientResults) ? clientResults : []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to search clients";
        setError(errorMessage);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(debounceTimeout);
  }, [searchTerm, selectedClient]);
  
  return {
    searchTerm,
    setSearchTerm,
    results,
    isLoading,
    error,
    selectedClient,
    setSelectedClient
  };
}
