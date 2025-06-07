
import React, { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/proposals/utils/useDebounce";
import { useSecureGoogleMaps } from "@/hooks/useSecureGoogleMaps";
import { GoogleMapsStatusIndicator } from "./GoogleMapsStatusIndicator";
import { GoogleMapsMessages } from "./GoogleMapsMessages";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { MapPin } from "lucide-react";

interface SecureGoogleAddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  onError?: (error: boolean) => void;
}

export function SecureGoogleAddressAutocomplete({
  value,
  onChange,
  className,
  placeholder = "Enter project address",
  required = false,
  onError,
}: SecureGoogleAddressAutocompleteProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { debounce } = useDebounce(500);
  const { isLoading, error, getPlacePredictions, getPlaceDetails } = useSecureGoogleMaps({ onError });

  console.log("🗺️ SecureGoogleAddressAutocomplete initialized:", {
    value,
    inputValue,
    placeholder,
    isMobile,
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

  // Debounced version of fetchPredictions
  const debouncedFetchPredictions = useCallback(
    debounce(() => {
      const currentInput = inputRef.current?.value;
      if (currentInput) {
        fetchPredictions(currentInput);
      }
    }),
    [debounce, fetchPredictions]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log("📝 Input changed:", newValue);
    
    setInputValue(newValue);
    onChange(newValue);
    
    // Trigger debounced search for predictions
    debouncedFetchPredictions();
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

  const isInputDisabled = error !== null;

  console.log("🎨 Rendering with state:", {
    isLoading,
    error: !!error,
    isInputDisabled,
    isOpen,
    predictionsCount: predictions.length,
    isMobile
  });

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={error ? "Address input unavailable" : placeholder}
        className={className}
        required={required}
        disabled={isInputDisabled}
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
      
      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <Command>
            <CommandList>
              <CommandGroup>
                {predictions.map((prediction, index) => (
                  <CommandItem
                    key={`${prediction.place_id}-${index}`}
                    value={prediction.description}
                    onSelect={() => handleSelectPrediction(prediction)}
                    className="cursor-pointer hover:bg-accent"
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm">
                          {prediction.structured_formatting?.main_text || prediction.description}
                        </p>
                        {prediction.structured_formatting?.secondary_text && (
                          <p className="truncate text-xs text-muted-foreground">
                            {prediction.structured_formatting.secondary_text}
                          </p>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
      
      <GoogleMapsMessages 
        error={error} 
        isLoading={isLoading} 
      />
    </div>
  );
}
