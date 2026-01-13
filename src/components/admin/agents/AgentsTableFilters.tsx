
import { Search, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AgentsTableFiltersProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  showAdvancedFilters: boolean;
  onToggleAdvancedFilters: () => void;
}

export function AgentsTableFilters({
  searchTerm,
  onSearchTermChange,
  showAdvancedFilters,
  onToggleAdvancedFilters
}: AgentsTableFiltersProps) {
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

        <Button
          variant={showAdvancedFilters ? "default" : "outline"}
          size="sm"
          onClick={onToggleAdvancedFilters}
          className="h-10"
        >
          <Settings className="h-4 w-4 mr-2" />
          Advanced
        </Button>
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