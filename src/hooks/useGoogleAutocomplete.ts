
import { useRef, useCallback, useEffect } from "react";

interface UseGoogleAutocompleteProps {
  isScriptLoaded: boolean;
  error: string | null;
  onChange: (address: string) => void;
  onError?: (error: boolean) => void;
  retryInitialization: () => void;
}

export function useGoogleAutocomplete({
  isScriptLoaded,
  error,
  onChange,
  onError,
  retryInitialization
}: UseGoogleAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Initialize autocomplete after Google Maps is loaded
  const initializeAutocomplete = useCallback(() => {
    console.log("🚀 Attempting to initialize autocomplete...");
    
    if (!inputRef.current) {
      console.warn("⚠️ Input ref not available");
      return false;
    }

    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.warn("⚠️ Google Maps not loaded yet");
      return false;
    }

    try {
      // Clear any existing instances
      if (autocompleteRef.current) {
        console.log("🧹 Cleaning up existing autocomplete");
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
      
      console.log("✨ Creating new autocomplete instance with South Africa restriction");
      autocompleteRef.current = new google.maps.places.Autocomplete(
        inputRef.current,
        { 
          types: ["address"],
          componentRestrictions: { country: "ZA" } // Restrict to South Africa
        }
      );

      const placeChangedListener = autocompleteRef.current.addListener("place_changed", () => {
        if (!autocompleteRef.current) return;
        
        const place = autocompleteRef.current.getPlace();
        console.log("📍 Place selected:", { 
          hasFormattedAddress: !!place.formatted_address,
          address: place.formatted_address 
        });
        
        if (place && place.formatted_address) {
          onChange(place.formatted_address);
        }
      });

      console.log("✅ Autocomplete initialized successfully with South Africa restriction");
      if (onError) onError(false);
      return true;

    } catch (error) {
      console.error("💥 Error initializing autocomplete:", error);
      const errorMessage = "Failed to initialize address autocomplete.";
      if (onError) onError(true);
      return false;
    }
  }, [onChange, onError]);

  // Initialize autocomplete when script is loaded
  useEffect(() => {
    if (isScriptLoaded && !error) {
      console.log("🎯 Script loaded, initializing autocomplete");
      const success = initializeAutocomplete();
      if (!success) {
        console.warn("⚠️ Initial autocomplete setup failed, retrying");
        retryInitialization();
      }
    }

    return () => {
      // Cleanup on unmount
      if (autocompleteRef.current) {
        console.log("🧹 Cleaning up autocomplete on unmount");
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isScriptLoaded, error, initializeAutocomplete, retryInitialization]);

  return {
    inputRef,
    autocompleteRef
  };
}
