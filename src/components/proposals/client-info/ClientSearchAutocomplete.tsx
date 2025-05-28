
import React from "react";
import { useClientSearch } from "@/hooks/useClientSearch";
import { ClientInformation } from "@/types/proposals";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, User, Building2, Mail, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientSearchAutocompleteProps {
  onClientSelect: (clientInfo: ClientInformation, clientId: string) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ClientSearchAutocomplete({ 
  onClientSelect, 
  value, 
  onChange,
  placeholder = "Enter client name..."
}: ClientSearchAutocompleteProps) {
  const { 
    searchTerm, 
    setSearchTerm, 
    results, 
    isLoading, 
    error, 
    selectedClient,
    setSelectedClient 
  } = useClientSearch();
  
  // Ensure results is always an array to prevent iteration errors
  const safeResults = Array.isArray(results) ? results : [];
  
  // Sync internal search term with external value
  React.useEffect(() => {
    setSearchTerm(value);
  }, [value, setSearchTerm]);
  
  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setSearchTerm(newValue);
    // Clear selection when user types
    if (selectedClient) {
      setSelectedClient(null);
    }
  };
  
  const handleSelect = (client: typeof safeResults[0]) => {
    setSelectedClient(client);
    
    // Convert to ClientInformation format and pass to parent
    onClientSelect({
      name: client.name,
      email: client.email,
      companyName: client.company || "",
      phone: "", // We don't have phone in search results
      existingClient: true,
    }, client.id);
  };

  const showResults = searchTerm.length > 1 && !selectedClient;

  return (
    <div className="relative">
      <Command className="border rounded-md shadow-sm">
        <CommandInput 
          placeholder={placeholder}
          value={searchTerm}
          onValueChange={handleInputChange}
        />
        <CommandList className={showResults ? "max-h-48 overflow-y-auto" : "hidden"}>
          {showResults && isLoading && (
            <div className="py-6 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Searching clients...</p>
            </div>
          )}
          
          {showResults && !isLoading && error && (
            <div className="py-6 text-center text-destructive">
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          {showResults && !isLoading && !error && (
            <>
              <CommandEmpty>
                {searchTerm.length > 1 ? (
                  <div className="py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      No existing clients found - entering new client details
                    </p>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-sm text-muted-foreground">Type at least 2 characters to search</p>
                  </div>
                )}
              </CommandEmpty>
              
              {safeResults.length > 0 && (
                <CommandGroup heading="Existing Clients">
                  {safeResults.map((client) => (
                    <CommandItem
                      key={`${client.id}-${client.isRegistered}`}
                      value={`${client.name} ${client.email}`}
                      onSelect={() => handleSelect(client)}
                      className="cursor-pointer hover:bg-accent"
                    >
                      <div className="flex items-center space-x-2 w-full">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate font-medium">
                            {client.name}
                            {client.company && (
                              <span className="text-muted-foreground"> @ {client.company}</span>
                            )}
                          </p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Mail className="h-3 w-3 mr-1" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        </div>
                        <Badge variant={client.isRegistered ? "default" : "secondary"}>
                          {client.isRegistered ? "Registered" : "Unregistered"}
                        </Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </Command>
      
      {selectedClient && (
        <div className="mt-2 text-sm text-green-600 flex items-center">
          <CheckCircle2 className="h-4 w-4 mr-1" />
          <span>Existing client selected: {selectedClient.name}</span>
        </div>
      )}
    </div>
  );
}
