
import React, { forwardRef } from "react";
import { Input } from "@/components/ui/input";

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  onFocus: () => void;
  placeholder: string;
  className?: string;
  required?: boolean;
  disabled: boolean;
  error: string | null;
}

export const AddressAutocompleteInput = forwardRef<HTMLInputElement, AddressAutocompleteInputProps>(
  ({ value, onChange, onBlur, onFocus, placeholder, className, required, disabled, error }, ref) => {
    return (
      <Input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder={error ? "Address input unavailable" : placeholder}
        className={className}
        required={required}
        disabled={disabled}
        autoComplete="address-line1"
        autoCapitalize="words"
        autoCorrect="off"
        spellCheck="false"
        inputMode="text"
      />
    );
  }
);

AddressAutocompleteInput.displayName = "AddressAutocompleteInput";
