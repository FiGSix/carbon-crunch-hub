
import { useState, useEffect } from "react";
import { searchClients, ClientSearchResult } from "@/services/clientSearchService";

export function useClientSearch() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  
  // Reset selected client when search term changes
  useEffect(() => {
    if (searchTerm && selectedClient) {
      setSelectedClient(null);
    }
  }, [searchTerm]);

  // Debounce search queries
  useEffect(() => {
    setError(null);
    
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    
    const debounceTimeout = setTimeout(async () => {
      setIsLoading(true);
      
      try {
        const clientResults = await searchClients(searchTerm);
        // Ensure we always set an array, never undefined
        setResults(Array.isArray(clientResults) ? clientResults : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search clients");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(debounceTimeout);
  }, [searchTerm]);
  
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
