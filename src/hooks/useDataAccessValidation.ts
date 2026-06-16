import { useState, useCallback } from "react";
import { validateDataAccessField, validateDataAccessConfig } from "@/lib/validation/dataAccessSchema";
import type { DataAccessConfig } from "@/types/onboarding";

export interface UseDataAccessValidationResult {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  validateFieldOnBlur: (fieldName: string, value: any, formData?: Partial<DataAccessConfig>) => void;
  validateAll: (config: Partial<DataAccessConfig>) => Record<string, string>;
  setFieldTouched: (fieldName: string) => void;
  clearFieldError: (fieldName: string) => void;
  hasErrors: boolean;
  isValid: (config: Partial<DataAccessConfig>) => boolean;
  resetValidation: () => void;
}

export function useDataAccessValidation(): UseDataAccessValidationResult {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validateFieldOnBlur = useCallback((fieldName: string, value: any, formData?: Partial<DataAccessConfig>) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    const error = validateDataAccessField(fieldName, value, formData);
    setErrors(prev => {
      if (error) {
        return { ...prev, [fieldName]: error };
      } else {
        const { [fieldName]: _, ...rest } = prev;
        return rest;
      }
    });
  }, []);

  const validateAll = useCallback((config: Partial<DataAccessConfig>): Record<string, string> => {
    const allErrors = validateDataAccessConfig(config);
    setErrors(allErrors);
    
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(config).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(prev => ({ ...prev, ...allTouched }));
    
    return allErrors;
  }, []);

  const setFieldTouched = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const { [fieldName]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const isValid = useCallback((config: Partial<DataAccessConfig>): boolean => {
    const validationErrors = validateDataAccessConfig(config);
    return Object.keys(validationErrors).length === 0;
  }, []);

  const resetValidation = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  return {
    errors,
    touched,
    validateFieldOnBlur,
    validateAll,
    setFieldTouched,
    clearFieldError,
    hasErrors: Object.keys(errors).length > 0,
    isValid,
    resetValidation,
  };
}
