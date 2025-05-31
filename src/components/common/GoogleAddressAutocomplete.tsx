
import React, { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/proposals/utils/useDebounce";
import { useGoogleMapsLoader } from "@/hooks/useGoogleMapsLoader";
import { useGoogleAutocomplete } from "@/hooks/useGoogleAutocomplete";
import { GoogleMapsStatusIndicator } from "./GoogleMapsStatusIndicator";
import { GoogleMapsMessages } from "./GoogleMapsMessages";
import { useIsMobile } from "@/hooks/use-mobile";

// Properly define Google Maps types
declare global {
  interface Window {
    google: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: google.maps.places.AutocompleteOptions
          ) => google.maps.places.Autocomplete
        }
      }
    };
    initGoogleMapsCallback: () => void;
  }
}

interface GoogleAddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  onError?: (error: boolean) => void;
}

export function GoogleAddressAutocomplete({
  value,
  onChange,
  className,
  placeholder = "Enter project address",
  required = false,
  onError,
}: GoogleAddressAutocompleteProps) {
  const isMobile = useIsMobile();
  
  // Add debouncing for input changes
  const { debounce } = useDebounce(300);
  
  // Check for API key
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  console.log("🗺️ GoogleAddressAutocomplete initialized:", {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    value,
    placeholder,
    isMobile
  });

  // Load Google Maps script
  const {
    isLoading,
    isScriptLoaded,
    error,
    retryInitialization
  } = useGoogleMapsLoader({
    apiKey,
    onError
  });

  // Initialize autocomplete
  const { inputRef } = useGoogleAutocomplete({
    isScriptLoaded,
    error,
    onChange,
    onError,
    retryInitialization
  });

  // Handle user input with debouncing
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log("📝 Input changed:", newValue);
    onChange(newValue);
  }, [onChange]);

  // Determine the current state for UI
  const isInputDisabled = isLoading || !!error;

  console.log("🎨 Rendering with state:", {
    isLoading,
    isScriptLoaded,
    error: !!error,
    isInputDisabled,
    isMobile
  });

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={error ? "Address input unavailable" : placeholder}
        className={className}
        required={required}
        disabled={isInputDisabled}
        // Mobile-specific optimizations
        autoComplete="address-line1"
        autoCapitalize="words"
        autoCorrect="off"
        spellCheck="false"
        inputMode="text"
      />
      
      <GoogleMapsStatusIndicator 
        isLoading={isLoading} 
        error={error} 
      />
      
      <GoogleMapsMessages 
        error={error} 
        isLoading={isLoading} 
      />
    </div>
  );
}
