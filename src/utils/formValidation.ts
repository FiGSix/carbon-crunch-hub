import { z } from 'zod';

/**
 * Common validation rules used across forms
 */
export const validationRules = {
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  confirmPassword: (passwordField: string = 'password') => z.string()
    .min(1, 'Please confirm your password'),
  
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  
  phone: z.string()
    .optional()
    .refine((val) => !val || /^[\+]?[1-9][\d]{0,15}$/.test(val), 'Please enter a valid phone number'),
  
  companyName: z.string()
    .optional()
    .refine((val) => !val || val.length >= 2, 'Company name must be at least 2 characters'),
  
  required: (fieldName: string) => z.string()
    .min(1, `${fieldName} is required`),
  
  optional: () => z.string().optional(),
  
  url: z.string()
    .optional()
    .refine((val) => !val || /^https?:\/\/.+/.test(val), 'Please enter a valid URL')
};

/**
 * Common form schemas
 */
export const formSchemas = {
  login: z.object({
    email: validationRules.email,
    password: z.string().min(1, 'Password is required')
  }),
  
  register: z.object({
    firstName: validationRules.name,
    lastName: validationRules.name,
    email: validationRules.email,
    password: validationRules.password,
    confirmPassword: validationRules.confirmPassword(),
    companyName: validationRules.companyName,
    role: z.enum(['client', 'agent'])
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }),
  
  forgotPassword: z.object({
    email: validationRules.email
  }),
  
  resetPassword: z.object({
    password: validationRules.password,
    confirmPassword: validationRules.confirmPassword()
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }),
  
  profile: z.object({
    firstName: validationRules.name,
    lastName: validationRules.name,
    email: validationRules.email,
    phone: validationRules.phone,
    companyName: validationRules.companyName
  }),
  
  contact: z.object({
    name: validationRules.name,
    email: validationRules.email,
    phoneNumber: validationRules.phone,
    company: validationRules.companyName,
    subject: z.string().min(3, 'Subject must be at least 3 characters'),
    question: z.string().min(10, 'Question must be at least 10 characters')
  })
};

/**
 * Validation error formatting utility
 */
export function formatValidationError(error: z.ZodError): string[] {
  return error.errors.map(err => {
    const field = err.path.join('.');
    return `${field}: ${err.message}`;
  });
}

/**
 * Async validation helpers
 */
export const asyncValidators = {
  /**
   * Check if email is available (not already registered)
   */
  emailAvailable: async (email: string): Promise<boolean> => {
    // This would typically make an API call to check email availability
    // For now, we'll return true as a placeholder
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 500);
    });
  },
  
  /**
   * Validate password strength in real-time
   */
  passwordStrength: (password: string): {
    score: number;
    feedback: string[];
  } => {
    const feedback: string[] = [];
    let score = 0;
    
    if (password.length >= 8) score += 1;
    else feedback.push('At least 8 characters');
    
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('At least one lowercase letter');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('At least one uppercase letter');
    
    if (/\d/.test(password)) score += 1;
    else feedback.push('At least one number');
    
    if (/[^a-zA-Z\d]/.test(password)) score += 1;
    else feedback.push('At least one special character');
    
    return { score, feedback };
  }
};

/**
 * Form field validation utilities
 */
export const fieldValidators = {
  /**
   * Real-time email validation
   */
  validateEmail: (email: string): { isValid: boolean; message?: string } => {
    if (!email) return { isValid: false, message: 'Email is required' };
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }
    
    return { isValid: true };
  },
  
  /**
   * Real-time password validation
   */
  validatePassword: (password: string): { isValid: boolean; message?: string } => {
    if (!password) return { isValid: false, message: 'Password is required' };
    
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters' };
    }
    
    const strength = asyncValidators.passwordStrength(password);
    if (strength.score < 3) {
      return { isValid: false, message: 'Password is too weak' };
    }
    
    return { isValid: true };
  },
  
  /**
   * Real-time confirm password validation
   */
  validateConfirmPassword: (password: string, confirmPassword: string): { isValid: boolean; message?: string } => {
    if (!confirmPassword) return { isValid: false, message: 'Please confirm your password' };
    
    if (password !== confirmPassword) {
      return { isValid: false, message: "Passwords don't match" };
    }
    
    return { isValid: true };
  }
};