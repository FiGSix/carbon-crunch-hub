
import { useState, useCallback, useRef, useEffect } from "react";
import { useDebounce } from "@/hooks/proposals/utils/useDebounce";
import { useSecureGoogleMaps } from "@/hooks/useSecureGoogleMaps";

interface UseAddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  onError?: (error: boolean) => void;
}

export function useAddressAutocomplete({ value, onChange, onError }: UseAddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState(value);
  const [pendingInput, setPendingInput] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { debounce } = useDebounce(500);
  const { isLoading, error, getPlacePredictions, getPlaceDetails } = useSecureGoogleMaps({ onError });

  console.log("🗺️ useAddressAutocomplete initialized:", {
    value,
    inputValue,
    isLoading,
    error: !!error,
    predictionsCount: predictions.length
  });

  // Sync input value with prop value
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Function to fetch predictions
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.trim().length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    console.log("🔍 Fetching predictions for:", input);
    const results = await getPlacePredictions(input);
    setPredictions(results);
    setIsOpen(results.length > 0);
  }, [getPlacePredictions]);

  // Create a function that returns a Promise for debouncing
  const handleDebouncedSearch = useCallback(async (): Promise<void> => {
    if (pendingInput && pendingInput.trim().length >= 3) {
      await fetchPredictions(pendingInput);
    }
  }, [fetchPredictions, pendingInput]);

  // Debounced function
  const debouncedFetchPredictions = useCallback(
    debounce(handleDebouncedSearch),
    [debounce, handleDebouncedSearch]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log("📝 Input changed:", newValue);
    
    setInputValue(newValue);
    onChange(newValue);
    
    // Set pending input and trigger debounced search
    setPendingInput(newValue);
    if (newValue.trim().length >= 3) {
      debouncedFetchPredictions();
    } else {
      setPredictions([]);
      setIsOpen(false);
    }
  }, [onChange, debouncedFetchPredictions]);

  const handleSelectPrediction = useCallback(async (prediction: any) => {
    console.log("📍 Prediction selected:", prediction);
    
    setIsOpen(false);
    
    // Get detailed address information
    const details = await getPlaceDetails(prediction.place_id);
    
    if (details?.formatted_address) {
      console.log("✅ Setting address:", details.formatted_address);
      setInputValue(details.formatted_address);
      onChange(details.formatted_address);
    } else {
      // Fallback to prediction description
      console.log("⚠️ Using fallback address:", prediction.description);
      setInputValue(prediction.description);
      onChange(prediction.description);
    }
  }, [getPlaceDetails, onChange]);

  const handleBlur = useCallback(() => {
    // Delay closing to allow for click on prediction
    setTimeout(() => setIsOpen(false), 200);
  }, []);

  const handleFocus = useCallback(() => {
    if (predictions.length > 0 && inputValue.length >= 3) {
      setIsOpen(true);
    }
  }, [predictions.length, inputValue.length]);

  return {
    inputRef,
    inputValue,
    predictions,
    isOpen,
    isLoading,
    error,
    handleInputChange,
    handleSelectPrediction,
    handleBlur,
    handleFocus
  };
}
