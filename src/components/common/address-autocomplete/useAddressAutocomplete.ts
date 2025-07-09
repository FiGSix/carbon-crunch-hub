
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
  const { 
    isLoading, 
    error, 
    getPlacePredictions, 
    getPlaceDetails, 
    clearError 
  } = useSecureGoogleMaps({ onError });

  // Enhanced error recovery with retry mechanism
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const maxRetries = 2;


  // Sync input value with prop value
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Enhanced function to fetch predictions with retry mechanism
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.trim().length < 3) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    try {
      console.log(`🔍 Fetching predictions for: "${input}" (attempt ${retryCount + 1})`);
      
      // Clear previous error state
      if (error && error !== lastError) {
        clearError();
        setRetryCount(0);
      }
      
      const results = await getPlacePredictions(input);
      
      // Success - reset retry count and error state
      setRetryCount(0);
      setLastError(null);
      setIsRetrying(false);
      
      setPredictions(results);
      setIsOpen(results.length > 0);
      
      console.log(`✅ Successfully fetched ${results.length} predictions`);
      
    } catch (err) {
      console.error('❌ Prediction fetch failed:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setLastError(errorMessage);
      
      // Implement retry logic for transient errors
      if (retryCount < maxRetries && shouldRetry(errorMessage)) {
        console.log(`🔄 Retrying prediction fetch (${retryCount + 1}/${maxRetries})`);
        setIsRetrying(true);
        setRetryCount(prev => prev + 1);
        
        setTimeout(() => {
          fetchPredictions(input);
        }, 1000 * (retryCount + 1)); // Exponential backoff
      } else {
        setIsRetrying(false);
        setPredictions([]);
        setIsOpen(false);
      }
    }
  }, [getPlacePredictions, error, lastError, retryCount, maxRetries, clearError]);

  // Determine if an error should trigger a retry
  const shouldRetry = useCallback((errorMessage: string) => {
    const retryableErrors = [
      'network error',
      'timeout',
      'service unavailable',
      'internal server error',
      'quota exceeded'
    ];
    
    return retryableErrors.some(retryError => 
      errorMessage.toLowerCase().includes(retryError)
    );
  }, []);

  // Create a function that returns a Promise for debouncing
  const handleDebouncedSearch = useCallback(async (): Promise<void> => {
    if (pendingInput && pendingInput.trim().length >= 3) {
      await fetchPredictions(pendingInput);
    }
  }, [fetchPredictions, pendingInput]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    
    setInputValue(newValue);
    onChange(newValue);
    
    // Set pending input and trigger debounced search
    setPendingInput(newValue);
    if (newValue.trim().length >= 3) {
      debounce(handleDebouncedSearch);
    } else {
      setPredictions([]);
      setIsOpen(false);
    }
  }, [onChange, debounce, handleDebouncedSearch]);

  const handleSelectPrediction = useCallback(async (prediction: any) => {
    
    
    setIsOpen(false);
    
    // Get detailed address information
    const details = await getPlaceDetails(prediction.place_id);
    
    if (details?.formatted_address) {
      
      setInputValue(details.formatted_address);
      onChange(details.formatted_address);
    } else {
      // Fallback to prediction description
      
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
    isLoading: isLoading || isRetrying,
    error,
    handleInputChange,
    handleSelectPrediction,
    handleBlur,
    handleFocus,
    isRetrying,
    retryCount
  };
}
