import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Suggestion {
  place_name: string;
  lat: number;
  lng: number;
}

interface MapboxAddressAutocompleteProps {
  value: string;
  onChange: (address: string, coords?: { lat: number; lng: number }) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  onError?: (error: boolean) => void;
}

export function MapboxAddressAutocomplete({
  value,
  onChange,
  className,
  placeholder = "Enter project address",
  required = false,
  onError,
}: MapboxAddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('mapbox-geocode', {
        body: { operation: 'autocomplete', query: query.trim() }
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const results: Suggestion[] = data?.suggestions || [];
      setSuggestions(results);
      setIsOpen(results.length > 0);
      onError?.(false);
    } catch (err) {
      console.error('Address autocomplete error:', err);
      setError('Address lookup temporarily unavailable');
      setSuggestions([]);
      setIsOpen(false);
      onError?.(true);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  }, [onChange, fetchSuggestions]);

  const handleSelect = useCallback((suggestion: Suggestion) => {
    setInputValue(suggestion.place_name);
    onChange(suggestion.place_name, { lat: suggestion.lat, lng: suggestion.lng });
    setIsOpen(false);
    setSuggestions([]);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    setTimeout(() => setIsOpen(false), 200);
  }, []);

  const handleFocus = useCallback(() => {
    if (suggestions.length > 0 && inputValue.length >= 3) {
      setIsOpen(true);
    }
  }, [suggestions.length, inputValue.length]);

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={cn(className, error && "border-destructive")}
          required={required}
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
              onMouseDown={() => handleSelect(s)}
            >
              {s.place_name}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="text-xs text-destructive mt-1">{error}</p>
      )}

      {isLoading && (
        <p className="text-xs text-muted-foreground mt-1">
          Loading South African address suggestions...
        </p>
      )}
    </div>
  );
}
