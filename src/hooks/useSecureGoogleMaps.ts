
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseSecureGoogleMapsProps {
  onError?: (error: boolean) => void;
}

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlaceDetails {
  formatted_address: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export function useSecureGoogleMaps({ onError }: UseSecureGoogleMapsProps = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken] = useState(() => crypto.randomUUID());

  const clearError = useCallback(() => {
    setError(null);
    if (onError) onError(false);
  }, [onError]);

  const setErrorState = useCallback((errorMessage: string) => {
    setError(errorMessage);
    if (onError) onError(true);
  }, [onError]);

  const getPlacePredictions = useCallback(async (input: string): Promise<PlacePrediction[]> => {
    if (!input || input.trim().length < 3) {
      return [];
    }

    setIsLoading(true);
    clearError();

    try {
      console.log("🔍 Fetching place predictions for:", input);

      const { data, error: functionError } = await supabase.functions.invoke('google-places-autocomplete', {
        body: { input: input.trim(), sessionToken }
      });

      if (functionError) {
        console.error("❌ Function error:", functionError);
        throw new Error(`API call failed: ${functionError.message}`);
      }

      if (data.error) {
        console.error("❌ Google API error:", data.error);
        throw new Error(data.error);
      }

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error("❌ Google API status error:", data.status);
        throw new Error(`Google API error: ${data.status}`);
      }

      const predictions = data.predictions || [];
      console.log("✅ Got predictions:", predictions.length);
      
      return predictions;

    } catch (error) {
      console.error("💥 Error getting place predictions:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get address suggestions';
      setErrorState(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, clearError, setErrorState]);

  const getPlaceDetails = useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    setIsLoading(true);
    clearError();

    try {
      console.log("📍 Fetching place details for:", placeId);

      const { data, error: functionError } = await supabase.functions.invoke('google-place-details', {
        body: { placeId, sessionToken }
      });

      if (functionError) {
        console.error("❌ Function error:", functionError);
        throw new Error(`API call failed: ${functionError.message}`);
      }

      if (data.error) {
        console.error("❌ Google API error:", data.error);
        throw new Error(data.error);
      }

      if (data.status !== 'OK') {
        console.error("❌ Google API status error:", data.status);
        throw new Error(`Google API error: ${data.status}`);
      }

      const placeDetails = data.result;
      console.log("✅ Got place details:", placeDetails?.formatted_address);
      
      return placeDetails;

    } catch (error) {
      console.error("💥 Error getting place details:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get place details';
      setErrorState(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken, clearError, setErrorState]);

  return {
    isLoading,
    error,
    getPlacePredictions,
    getPlaceDetails,
    clearError
  };
}
