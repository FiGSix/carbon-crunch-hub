
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle } from "lucide-react";
import { useDebounce } from "@/hooks/proposals/utils/useDebounce";

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
    initGoogleMapsAutocomplete: () => void;
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
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Add debouncing for input changes
  const { debounce } = useDebounce(300);
  
  // Check for API key
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // Add console logging to help debug
  console.log("API Key length:", apiKey ? apiKey.length : 0);

  // Handle user input with debouncing
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
  }, [onChange]);
  
  // Initialize Google Maps script
  useEffect(() => {
    // Validate API key exists and has the right format
    if (!apiKey || apiKey.trim() === '') {
      setError("Google Maps API key is missing. Add it to your .env file.");
      if (onError) onError(true);
      return;
    }

    // REMOVED: Specific API key validation check that was causing problems
    // No longer comparing against "AIzaSyDUS2rwcKPonuhM70RYUXaqCFlfOH_2dvQ"
    
    // Check if script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsScriptLoaded(true);
      return;
    }

    // Prevent duplicate script loading
    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      setIsScriptLoaded(true);
      return;
    }

    setIsLoading(true);
    const googleMapScript = document.createElement("script");
    googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsAutocomplete`;
    googleMapScript.async = true;
    googleMapScript.defer = true;
    
    // Define global callback function
    window.initGoogleMapsAutocomplete = () => {
      setIsScriptLoaded(true);
      setIsLoading(false);
      if (onError) onError(false);
    };

    // Handle script loading errors
    const handleScriptError = () => {
      console.error("Google Maps script failed to load");
      setError("Failed to load Google Maps. Check your API key and internet connection.");
      setIsLoading(false);
      if (onError) onError(true);
    };

    googleMapScript.addEventListener("error", handleScriptError);
    scriptRef.current = googleMapScript;
    window.document.body.appendChild(googleMapScript);

    return () => {
      // Clean up event listeners and global callback
      if (scriptRef.current) {
        scriptRef.current.removeEventListener("error", handleScriptError);
      }
      window.initGoogleMapsAutocomplete = () => {};
    };
  }, [apiKey, onError]);

  // Initialize autocomplete after script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || error) return;

    try {
      // Clear any existing instances before creating a new one
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      
      autocompleteRef.current = new google.maps.places.Autocomplete(
        inputRef.current,
        { 
          types: ["address"]
          // Removed country restriction to allow global addresses
        }
      );

      const placeChangedListener = autocompleteRef.current.addListener("place_changed", () => {
        if (!autocompleteRef.current) return;
        
        const place = autocompleteRef.current.getPlace();
        if (place && place.formatted_address) {
          onChange(place.formatted_address);
        }
      });

      return () => {
        // Proper cleanup of event listeners
        if (autocompleteRef.current) {
          google.maps.event.removeListener(placeChangedListener);
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    } catch (error) {
      console.error("Error initializing Google Places Autocomplete:", error);
      setError("Failed to initialize address autocomplete.");
      if (onError) onError(true);
    }
  }, [isScriptLoaded, onChange, error, onError]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={className}
        required={required}
        disabled={isLoading || !!error}
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="mt-2 flex items-center text-destructive text-sm">
          <AlertCircle className="h-4 w-4 mr-1" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

