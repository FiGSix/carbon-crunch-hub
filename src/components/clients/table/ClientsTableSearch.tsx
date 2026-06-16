import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

interface ClientsTableSearchProps {
  onDebouncedChange: (value: string) => void;
  debounceMs?: number;
  placeholder?: string;
}

export function ClientsTableSearch({
  onDebouncedChange,
  debounceMs = 300,
  placeholder = 'Search clients by name, email, or company...'
}: ClientsTableSearchProps) {
  const [term, setTerm] = useState('');

  useEffect(() => {
    const id = setTimeout(() => onDebouncedChange(term), debounceMs);
    return () => clearTimeout(id);
  }, [term, debounceMs, onDebouncedChange]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="pl-10 pr-10"
      />
      {term && (
        <button
          onClick={() => setTerm('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
