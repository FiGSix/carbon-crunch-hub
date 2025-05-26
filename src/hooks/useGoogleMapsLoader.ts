
import { useState, useCallback, useRef, useEffect } from "react";

interface UseGoogleMapsLoaderProps {
  apiKey: string;
  onError?: (error: boolean) => void;
}

export function useGoogleMapsLoader({ apiKey, onError }: UseGoogleMapsLoaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if Google Maps is already loaded
  const checkGoogleMapsLoaded = useCallback(() => {
    const isLoaded = !!(window.google && window.google.maps && window.google.maps.places);
    console.log("🔍 Checking Google Maps status:", { isLoaded, hasWindow: !!window.google });
    return isLoaded;
  }, []);

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
        setIsLoading(false);
        setIsScriptLoaded(true);
      } else {
        retryInitialization();
      }
    }, delay);
  }, [retryCount, checkGoogleMapsLoaded, onError]);

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

  return {
    isLoading,
    isScriptLoaded,
    error,
    checkGoogleMapsLoaded,
    retryInitialization
  };
}
