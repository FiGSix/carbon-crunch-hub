/**
 * Comprehensive error types for improved error handling
 */

import { Database } from "@/integrations/supabase/types";

// Base error types
export interface BaseError {
  readonly message: string;
  readonly code?: string;
  readonly timestamp: number;
}

// Error severity levels
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

// Detailed error state interface
export interface ErrorState extends BaseError {
  readonly details?: string | null;
  readonly severity: ErrorSeverity;
  readonly context?: string;
  readonly userId?: string;
}

// API specific errors
export interface ApiError extends BaseError {
  readonly statusCode?: number;
  readonly endpoint?: string;
  readonly method?: string;
}

// Validation errors
export interface ValidationError extends BaseError {
  readonly field: string;
  readonly value: unknown;
  readonly rule: string;
}

// Network errors
export interface NetworkError extends BaseError {
  readonly isOffline: boolean;
  readonly retryable: boolean;
  readonly timeout?: boolean;
}

// Authentication errors
export interface AuthError extends BaseError {
  readonly authFlow?: 'login' | 'register' | 'refresh' | 'logout';
  readonly requiresReauth?: boolean;
}

// Database errors
export interface DatabaseError extends BaseError {
  readonly table?: keyof Database['public']['Tables'];
  readonly operation?: 'select' | 'insert' | 'update' | 'delete';
  readonly isRLSError?: boolean;
}

// File upload errors
export interface FileUploadError extends BaseError {
  readonly fileName: string;
  readonly fileSize?: number;
  readonly fileType?: string;
  readonly bucket?: string;
}

// Form validation errors
export interface FormError extends BaseError {
  readonly formName: string;
  readonly fieldErrors: Record<string, string>;
}

// Business logic errors
export interface BusinessLogicError extends BaseError {
  readonly businessRule: string;
  readonly entityType: string;
  readonly entityId?: string;
}

// Error result types for functions
export interface ErrorResult<T = never> {
  readonly success: false;
  readonly error: ErrorState;
  readonly data?: never;
}

export interface SuccessResult<T> {
  readonly success: true;
  readonly data: T;
  readonly error?: never;
}

export type Result<T> = SuccessResult<T> | ErrorResult;

// Error handler function types
export type ErrorHandler = (error: ErrorState) => void;

export type AsyncErrorHandler = (error: ErrorState) => Promise<void>;

// Error boundary types
export interface ErrorBoundaryState {
  hasError: boolean;
  error: ErrorState | null;
  errorId: string | null;
}

// Error recovery strategies
export type ErrorRecoveryStrategy = 
  | 'retry' 
  | 'fallback' 
  | 'navigate' 
  | 'reload' 
  | 'ignore';

export interface ErrorRecoveryOptions {
  strategy: ErrorRecoveryStrategy;
  maxRetries?: number;
  retryDelay?: number;
  fallbackUrl?: string;
  fallbackComponent?: React.ComponentType;
}

// Typed error classes
export class TypedError extends Error implements ErrorState {
  readonly timestamp: number;
  readonly severity: ErrorSeverity;
  readonly details?: string | null;
  readonly context?: string;
  readonly userId?: string;
  readonly code?: string;

  constructor(
    message: string,
    options: {
      code?: string;
      severity?: ErrorSeverity;
      details?: string | null;
      context?: string;
      userId?: string;
    } = {}
  ) {
    super(message);
    
    this.name = 'TypedError';
    this.timestamp = Date.now();
    this.severity = options.severity ?? 'error';
    this.details = options.details;
    this.context = options.context;
    this.userId = options.userId;
    this.code = options.code;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TypedError);
    }
  }
}

// Specific error classes
export class ValidationErrorClass extends TypedError {
  readonly field: string;
  readonly value: unknown;
  readonly rule: string;

  constructor(
    field: string,
    value: unknown,
    rule: string,
    message?: string
  ) {
    super(message ?? `Validation failed for field '${field}'`, {
      code: 'VALIDATION_ERROR',
      severity: 'warning',
      context: 'validation'
    });
    
    this.name = 'ValidationError';
    Object.defineProperty(this, 'field', { value: field, writable: false });
    Object.defineProperty(this, 'value', { value: value, writable: false });
    Object.defineProperty(this, 'rule', { value: rule, writable: false });
  }
}

export class ApiErrorClass extends TypedError {
  readonly statusCode?: number;
  readonly endpoint?: string;
  readonly method?: string;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      endpoint?: string;
      method?: string;
      code?: string;
    } = {}
  ) {
    super(message, {
      code: options.code ?? 'API_ERROR',
      severity: 'error',
      context: 'api'
    });
    
    this.name = 'ApiError';
    Object.defineProperty(this, 'statusCode', { value: options.statusCode, writable: false });
    Object.defineProperty(this, 'endpoint', { value: options.endpoint, writable: false });
    Object.defineProperty(this, 'method', { value: options.method, writable: false });
  }
}

export class AuthErrorClass extends TypedError {
  readonly authFlow?: 'login' | 'register' | 'refresh' | 'logout';
  readonly requiresReauth?: boolean;

  constructor(
    message: string,
    options: {
      authFlow?: 'login' | 'register' | 'refresh' | 'logout';
      requiresReauth?: boolean;
      code?: string;
    } = {}
  ) {
    super(message, {
      code: options.code ?? 'AUTH_ERROR',
      severity: 'error',
      context: 'authentication'
    });
    
    this.name = 'AuthError';
    Object.defineProperty(this, 'authFlow', { value: options.authFlow, writable: false });
    Object.defineProperty(this, 'requiresReauth', { value: options.requiresReauth, writable: false });
  }
}

// Error type guards
export function isTypedError(error: unknown): error is TypedError {
  return error instanceof TypedError;
}

export function isValidationError(error: unknown): error is ValidationErrorClass {
  return error instanceof ValidationErrorClass;
}

export function isApiError(error: unknown): error is ApiErrorClass {
  return error instanceof ApiErrorClass;
}

export function isAuthError(error: unknown): error is AuthErrorClass {
  return error instanceof AuthErrorClass;
}

// Error severity predicates
export function isErrorSevere(error: ErrorState): boolean {
  return error.severity === 'error' || error.severity === 'fatal';
}

export function isErrorFatal(error: ErrorState): boolean {
  return error.severity === 'fatal';
}

// Error transformation utilities
export function toErrorState(error: unknown): ErrorState {
  if (isTypedError(error)) {
    return error;
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      code: error.name,
      details: error.stack ?? null,
      severity: 'error',
      timestamp: Date.now()
    };
  }
  
  return {
    message: String(error),
    severity: 'error',
    timestamp: Date.now()
  };
}

export function createErrorState(
  message: string,
  options: {
    code?: string;
    details?: string | null;
    severity?: ErrorSeverity;
    context?: string;
    userId?: string;
  } = {}
): ErrorState {
  return {
    message,
    code: options.code,
    details: options.details,
    severity: options.severity ?? 'error',
    context: options.context,
    userId: options.userId,
    timestamp: Date.now()
  };
}