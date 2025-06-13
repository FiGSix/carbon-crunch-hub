
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export function useFormValidation() {
  const validateField = (value: any, rules: ValidationRule, fieldName: string): string | null => {
    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return `${fieldName} is required`;
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    const stringValue = String(value);

    // Min length validation
    if (rules.minLength && stringValue.length < rules.minLength) {
      return `${fieldName} must be at least ${rules.minLength} characters`;
    }

    // Max length validation
    if (rules.maxLength && stringValue.length > rules.maxLength) {
      return `${fieldName} must be no more than ${rules.maxLength} characters`;
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      return `${fieldName} format is invalid`;
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        return customError;
      }
    }

    return null;
  };

  const validateForm = (data: Record<string, any>, schema: ValidationSchema): Record<string, string> => {
    const errors: Record<string, string> = {};

    Object.entries(schema).forEach(([fieldName, rules]) => {
      const error = validateField(data[fieldName], rules, fieldName);
      if (error) {
        errors[fieldName] = error;
      }
    });

    return errors;
  };

  const validateRequired = (value: any, fieldName: string): string | null => {
    return validateField(value, { required: true }, fieldName);
  };

  const validateEmail = (email: string): string | null => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return validateField(email, { 
      required: true, 
      pattern: emailPattern 
    }, 'Email');
  };

  const validatePasswords = (password: string, confirmPassword: string): string | null => {
    const passwordError = validateField(password, { 
      required: true, 
      minLength: 6 
    }, 'Password');
    
    if (passwordError) return passwordError;

    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }

    return null;
  };

  return {
    validateField,
    validateForm,
    validateRequired,
    validateEmail,
    validatePasswords
  };
}
