
import { useState, useEffect } from "react";
import { searchClients, ClientSearchResult } from "@/services/clientSearchService";

export function useClientSearch() {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientSearchResult | null>(null);
  
  console.log('=== useClientSearch Debug ===');
  console.log('searchTerm:', searchTerm);
  console.log('results length:', results.length);
  console.log('selectedClient:', selectedClient);
  console.log('isLoading:', isLoading);
  
  // Reset selected client when search term changes significantly
  useEffect(() => {
    if (searchTerm && selectedClient && !searchTerm.includes(selectedClient.name)) {
      console.log('Clearing selectedClient due to search term change');
      setSelectedClient(null);
    }
  }, [searchTerm, selectedClient]);

  // Debounce search queries
  useEffect(() => {
    setError(null);
    
    if (!searchTerm || searchTerm.length < 2) {
      console.log('Search term too short, clearing results');
      setResults([]);
      setIsLoading(false);
      return;
    }
    
    // Don't search if we have a selected client and the term matches
    if (selectedClient && searchTerm === selectedClient.name) {
      console.log('Search term matches selected client, skipping search');
      setResults([]);
      setIsLoading(false);
      return;
    }
    
    const debounceTimeout = setTimeout(async () => {
      console.log('Starting search for:', searchTerm);
      setIsLoading(true);
      
      try {
        const clientResults = await searchClients(searchTerm);
        console.log('Search results:', clientResults);
        // Ensure we always set an array, never undefined
        setResults(Array.isArray(clientResults) ? clientResults : []);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to search clients";
        console.error('Search error:', errorMessage);
        setError(errorMessage);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce
    
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
