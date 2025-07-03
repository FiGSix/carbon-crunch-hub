import React from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface AgentsTableFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
}

export function AgentsTableFilters({
  statusFilter,
  onStatusFilterChange,
  searchTerm,
  onSearchTermChange
}: AgentsTableFiltersProps) {
  const statusOptions = [
    { value: 'all', label: 'All Statuses', count: null },
    { value: 'active', label: 'Active', count: null },
    { value: 'inactive', label: 'Inactive', count: null },
    { value: 'suspended', label: 'Suspended', count: null },
    { value: 'pending_approval', label: 'Pending Approval', count: null }
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents by name, email, or company..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.label}
                  {option.count && (
                    <Badge variant="secondary" className="text-xs">
                      {option.count}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {searchTerm && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Searching for: "{searchTerm}"
          </span>
          <button
            onClick={() => onSearchTermChange('')}
            className="text-sm text-primary hover:underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}