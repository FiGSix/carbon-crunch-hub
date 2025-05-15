
import { FieldValues, FieldErrors, UseFormReturn } from "react-hook-form";
import { useErrorHandler, ErrorSeverity } from "./useErrorHandler";
import { logger } from "@/lib/logger";

interface FormErrorOptions {
  context: string;
  logFieldErrors?: boolean;
}

/**
 * A hook that integrates form error handling with our global error handling system
 * 
 * @param options Configuration options for form error handling
 * @returns Form error handling utilities
 */
export function useFormErrorHandler<T extends FieldValues>(options: FormErrorOptions) {
  const { context, logFieldErrors = true } = options;
  const { handleError } = useErrorHandler({
    context,
    toastOnError: false // We don't want toasts for form validation errors
  });
  
  const formLogger = logger.withContext({ component: 'FormHandler', context });
  
  /**
   * Process form submission errors
   */
  const handleFormError = (
    error: unknown, 
    form?: UseFormReturn<T>,
    fieldErrors?: FieldErrors<T>,
    customMessage?: string,
    severity: ErrorSeverity = "error"
  ) => {
    // First handle field validation errors if available
    if (fieldErrors && Object.keys(fieldErrors).length > 0 && logFieldErrors) {
      formLogger.warn("Form validation errors", { fieldErrors });
    }
    
    // Then handle any other errors
    if (error) {
      return handleError(error, customMessage, severity);
    }
    
    return null;
  };
  
  /**
   * Wrap an async form submission handler with error handling
   */
  const withFormErrorHandling = <R,>(
    fn: (data: T, form: UseFormReturn<T>) => Promise<R>,
    form: UseFormReturn<T>,
    customMessage?: string
  ) => {
    return async (formData: T): Promise<{ data: R | null; error: Error | null }> => {
      try {
        formLogger.debug("Form submission started", { formType: context });
        const result = await fn(formData, form);
        formLogger.info("Form submission successful", { formType: context });
        return { data: result, error: null };
      } catch (err) {
        const errorState = handleFormError(err, form, form.formState.errors, customMessage);
        return { data: null, error: errorState ? new Error(errorState.message || "Form submission failed") : null };
      }
    };
  };
  
  return {
    handleFormError,
    withFormErrorHandling
  };
}
