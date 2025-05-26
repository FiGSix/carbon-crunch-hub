import React, { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle } from "lucide-react";
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
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add debouncing for input changes
  const { debounce } = useDebounce(300);
  
  // Check for API key
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  console.log("🗺️ GoogleAddressAutocomplete initialized:", {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    value,
    placeholder
  });

  // Handle user input with debouncing
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log("📝 Input changed:", newValue);
    onChange(newValue);
  }, [onChange]);

  // Check if Google Maps is already loaded
  const checkGoogleMapsLoaded = useCallback(() => {
    const isLoaded = !!(window.google && window.google.maps && window.google.maps.places);
    console.log("🔍 Checking Google Maps status:", { isLoaded, hasWindow: !!window.google });
    return isLoaded;
  }, []);

  // Initialize autocomplete after Google Maps is loaded
  const initializeAutocomplete = useCallback(() => {
    console.log("🚀 Attempting to initialize autocomplete...");
    
    if (!inputRef.current) {
      console.warn("⚠️ Input ref not available");
      return false;
    }

    if (!checkGoogleMapsLoaded()) {
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
      setError(null);
      if (onError) onError(false);
      return true;

    } catch (error) {
      console.error("💥 Error initializing autocomplete:", error);
      const errorMessage = "Failed to initialize address autocomplete.";
      setError(errorMessage);
      if (onError) onError(true);
      return false;
    }
  }, [onChange, onError, checkGoogleMapsLoaded]);

  // Retry initialization with exponential backoff
  const retryInitialization = useCallback(() => {
    if (retryCount >= 3) {
      console.error("💀 Max retries reached, giving up");
      setError("Failed to load Google Maps after multiple attempts.");
      setIsLoading(false);
      if (onError) onError(true);
      return;
    }

    const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
    console.log(`🔄 Retrying initialization in ${delay}ms (attempt ${retryCount + 1}/3)`);
    
    setTimeout(() => {
      setRetryCount(prev => prev + 1);
      if (checkGoogleMapsLoaded()) {
        const success = initializeAutocomplete();
        if (success) {
          setIsLoading(false);
          setIsScriptLoaded(true);
        } else {
          retryInitialization();
        }
      } else {
        retryInitialization();
      }
    }, delay);
  }, [retryCount, checkGoogleMapsLoaded, initializeAutocomplete, onError]);

  // Load Google Maps script
  useEffect(() => {
    console.log("🔧 Script loading effect triggered");
    
    // Validate API key exists
    if (!apiKey || apiKey.trim() === '') {
      const errorMsg = "Google Maps API key is missing. Add VITE_GOOGLE_MAPS_API_KEY to your environment variables.";
      console.error("❌", errorMsg);
      setError(errorMsg);
      if (onError) onError(true);
      return;
    }

    // Check if already loaded
    if (checkGoogleMapsLoaded()) {
      console.log("✅ Google Maps already loaded");
      setIsScriptLoaded(true);
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      console.log("⏳ Script already loading, waiting...");
      setIsLoading(true);
      
      // Set up a timeout to check for completion
      initializationTimeoutRef.current = setTimeout(() => {
        if (checkGoogleMapsLoaded()) {
          setIsScriptLoaded(true);
          setIsLoading(false);
        } else {
          console.warn("⚠️ Script loaded but Google Maps not available, retrying...");
          retryInitialization();
        }
      }, 3000);
      
      return;
    }

    console.log("📦 Loading Google Maps script...");
    setIsLoading(true);
    setError(null);
    setRetryCount(0);

    // Define the global callback BEFORE creating the script
    window.initGoogleMapsCallback = () => {
      console.log("🎉 Google Maps callback triggered");
      
      // Double-check that Google Maps is actually available
      if (checkGoogleMapsLoaded()) {
        console.log("✅ Google Maps confirmed loaded via callback");
        setIsScriptLoaded(true);
        setIsLoading(false);
        if (onError) onError(false);
      } else {
        console.warn("⚠️ Callback triggered but Google Maps not available");
        retryInitialization();
      }
    };

    // Create and load the script
    const googleMapScript = document.createElement("script");
    googleMapScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsCallback`;
    googleMapScript.async = true;
    googleMapScript.defer = true;
    
    // Handle script loading errors
    const handleScriptError = (event: Event) => {
      console.error("💥 Google Maps script failed to load:", event);
      setError("Failed to load Google Maps. Check your API key and internet connection.");
      setIsLoading(false);
      if (onError) onError(true);
    };

    const handleScriptLoad = () => {
      console.log("📜 Script element loaded (but callback may not have fired yet)");
      // Don't set loaded state here, wait for the callback
    };

    googleMapScript.addEventListener("error", handleScriptError);
    googleMapScript.addEventListener("load", handleScriptLoad);
    scriptRef.current = googleMapScript;
    
    console.log("🌐 Appending script to document");
    document.head.appendChild(googleMapScript);

    // Set a fallback timeout
    const fallbackTimeout = setTimeout(() => {
      if (!isScriptLoaded && !error) {
        console.warn("⏰ Script loading timeout, attempting retry");
        retryInitialization();
      }
    }, 10000);

    return () => {
      // Cleanup
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
      clearTimeout(fallbackTimeout);
      if (scriptRef.current) {
        scriptRef.current.removeEventListener("error", handleScriptError);
        scriptRef.current.removeEventListener("load", handleScriptLoad);
      }
      window.initGoogleMapsCallback = () => {};
    };
  }, [apiKey, onError, checkGoogleMapsLoaded, retryInitialization, isScriptLoaded, error]);

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

  // Determine the current state for UI
  const showLoadingSpinner = isLoading && !error;
  const showErrorIcon = !!error;
  const isInputDisabled = isLoading || !!error;

  console.log("🎨 Rendering with state:", {
    isLoading,
    isScriptLoaded,
    error: !!error,
    showLoadingSpinner,
    showErrorIcon,
    isInputDisabled,
    retryCount
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
      />
      
      {showLoadingSpinner && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {showErrorIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
      )}
      
      {error && (
        <p className="text-xs text-destructive mt-1">
          {error}
        </p>
      )}
      
      {isLoading && (
        <p className="text-xs text-muted-foreground mt-1">
          Loading South African address suggestions...
        </p>
      )}
    </div>
  );
}
