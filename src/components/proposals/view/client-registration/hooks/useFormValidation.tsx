
import { useState } from 'react';

interface ValidationOptions {
  passwordMinLength?: number;
}

export function useFormValidation(options: ValidationOptions = {}) {
  const { passwordMinLength = 6 } = options;
  
  // Validate a set of passwords match and meet requirements
  const validatePasswords = (password: string, confirmPassword: string): string | null => {
    if (password !== confirmPassword) {
      return "Passwords don't match. Please try again.";
    }
    
    if (password.length < passwordMinLength) {
      return `Password must be at least ${passwordMinLength} characters long.`;
    }
    
    return null;
  };
  
  // Validate email format
  const validateEmail = (email: string): string | null => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailPattern.test(email)) {
      return "Please enter a valid email address.";
    }
    
    return null;
  };
  
  // Validate required fields
  const validateRequired = (value: string, fieldName: string): string | null => {
    if (!value || value.trim() === '') {
      return `${fieldName} is required.`;
    }
    
    return null;
  };
  
  return {
    validatePasswords,
    validateEmail,
    validateRequired
  };
}
