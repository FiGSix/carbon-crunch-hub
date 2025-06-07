
import React from "react";
import { GoogleMapsStatusIndicator } from "./GoogleMapsStatusIndicator";
import { GoogleMapsMessages } from "./GoogleMapsMessages";
import { AddressAutocompleteInput } from "./address-autocomplete/AddressAutocompleteInput";
import { PredictionsList } from "./address-autocomplete/PredictionsList";
import { useAddressAutocomplete } from "./address-autocomplete/useAddressAutocomplete";

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
  const {
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
  } = useAddressAutocomplete({ value, onChange, onError });

  const isInputDisabled = error !== null;

  console.log("🎨 Rendering SecureGoogleAddressAutocomplete:", {
    isLoading,
    error: !!error,
    isInputDisabled,
    isOpen,
    predictionsCount: predictions.length
  });

  return (
    <div className="relative">
      <AddressAutocompleteInput
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className}
        required={required}
        disabled={isInputDisabled}
        error={error}
      />
      
      <GoogleMapsStatusIndicator 
        isLoading={isLoading} 
        error={error} 
      />
      
      <PredictionsList
        predictions={predictions}
        onSelectPrediction={handleSelectPrediction}
        isOpen={isOpen}
      />
      
      <GoogleMapsMessages 
        error={error} 
        isLoading={isLoading} 
      />
    </div>
  );
}
