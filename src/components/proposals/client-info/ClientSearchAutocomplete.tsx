
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
import { Loader2, User, Building2, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientSearchAutocompleteProps {
  onClientSelect: (clientInfo: ClientInformation, clientId: string) => void;
}

export function ClientSearchAutocomplete({ onClientSelect }: ClientSearchAutocompleteProps) {
  const { 
    searchTerm, 
    setSearchTerm, 
    results, 
    isLoading, 
    error, 
    selectedClient,
    setSelectedClient 
  } = useClientSearch();
  
  const handleSelect = (client: typeof results[0]) => {
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

  return (
    <div className="space-y-1">
      <Command className="border rounded-md shadow-sm">
        <CommandInput 
          placeholder="Search clients by name, email or company..." 
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <CommandList>
          {isLoading && (
            <div className="py-6 text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Searching clients...</p>
            </div>
          )}
          
          {!isLoading && error && (
            <div className="py-6 text-center text-destructive">
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          <CommandEmpty>
            {searchTerm.length > 1 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No clients found. Try a different search term.</p>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">Type at least 2 characters to search</p>
              </div>
            )}
          </CommandEmpty>
          
          {results.length > 0 && (
            <CommandGroup heading="Clients">
              {results.map((client) => (
                <CommandItem
                  key={`${client.id}-${client.isRegistered}`}
                  value={`${client.name} ${client.email}`}
                  onSelect={() => handleSelect(client)}
                >
                  <div className="flex items-center space-x-2 w-full">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate">{client.name}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 mr-1" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      {client.company && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Building2 className="h-3 w-3 mr-1" />
                          <span className="truncate">{client.company}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant={client.isRegistered ? "default" : "outline"}>
                      {client.isRegistered ? "Registered" : "Contact"}
                    </Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
      
      {selectedClient && (
        <div className="text-sm text-green-600 flex items-center">
          <div className="bg-green-100 text-green-800 px-2 py-1 rounded-md">
            Selected: {selectedClient.name} ({selectedClient.email})
          </div>
        </div>
      )}
    </div>
  );
}
