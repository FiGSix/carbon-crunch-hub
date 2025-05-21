
import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle } from "lucide-react";

declare global {
  interface Window {
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

  // Check for API key
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  useEffect(() => {
    if (!apiKey) {
      setError("Google Maps API key is missing. Add it to your .env file.");
      if (onError) onError(true);
      return;
    }
    
    // Check if script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsScriptLoaded(true);
      return;
    }

    setIsLoading(true);
    const googleMapScript = document.createElement("script");
    googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    googleMapScript.async = true;
    googleMapScript.defer = true;
    window.document.body.appendChild(googleMapScript);

    googleMapScript.addEventListener("load", () => {
      setIsScriptLoaded(true);
      setIsLoading(false);
      if (onError) onError(false);
    });

    googleMapScript.addEventListener("error", () => {
      console.error("Google Maps script failed to load");
      setError("Failed to load Google Maps. Check your API key and internet connection.");
      setIsLoading(false);
      if (onError) onError(true);
    });

    return () => {
      googleMapScript.removeEventListener("load", () => {});
      googleMapScript.removeEventListener("error", () => {});
    };
  }, [apiKey, onError]);

  // Initialize autocomplete after script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || error) return;

    try {
      autocompleteRef.current = new google.maps.places.Autocomplete(
        inputRef.current,
        { 
          types: ["address"],
          componentRestrictions: { country: "za" } // Restrict to South Africa
        }
      );

      autocompleteRef.current.addListener("place_changed", () => {
        if (!autocompleteRef.current) return;
        
        const place = autocompleteRef.current.getPlace();
        if (place && place.formatted_address) {
          onChange(place.formatted_address);
        }
      });
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
        onChange={(e) => onChange(e.target.value)}
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
