/**
 * Utility types for improved type safety throughout the application
 */

// Strict utility types
export type NonEmptyArray<T> = [T, ...T[]];

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

// Event handler types
export type EventHandler<T = Event> = (event: T) => void;

export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

// Function types with better constraints
export type AsyncFunction<TArgs extends readonly unknown[] = [], TReturn = unknown> = 
  (...args: TArgs) => Promise<TReturn>;

export type SyncFunction<TArgs extends readonly unknown[] = [], TReturn = unknown> = 
  (...args: TArgs) => TReturn;

// State update types
export type StateUpdater<T> = T | ((prevState: T) => T);

export type SetState<T> = (updater: StateUpdater<T>) => void;

// Object utilities
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// Array utilities
export type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never;

export type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer Tail] ? Tail : [];

export type Last<T extends readonly unknown[]> = T extends readonly [...unknown[], infer L] ? L : never;

// String utilities
export type Join<T extends readonly string[], D extends string = ','> = 
  T extends readonly [] ? '' :
  T extends readonly [string] ? T[0] :
  T extends readonly [string, ...infer Rest] ? 
    Rest extends readonly string[] ? `${T[0]}${D}${Join<Rest, D>}` : never :
  never;

// Branded types for better type safety
export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type UserId = Brand<string, 'UserId'>;
export type ProposalId = Brand<string, 'ProposalId'>;
export type ClientId = Brand<string, 'ClientId'>;
export type AgentId = Brand<string, 'AgentId'>;
export type Email = Brand<string, 'Email'>;
export type Url = Brand<string, 'Url'>;

// Validation types
export type ValidationSchema<T> = {
  [K in keyof T]: {
    required?: boolean;
    validate?: (value: T[K]) => string | null;
  };
};

// Form field types with better constraints
export interface TypedFormField<T> {
  readonly value: T;
  readonly error: string | null;
  readonly isValid: boolean;
  readonly isDirty: boolean;
  readonly isTouched: boolean;
}

export type FormFields<T extends Record<string, unknown>> = {
  [K in keyof T]: TypedFormField<T[K]>;
};

// API response wrapper types
export type ApiData<T> = {
  readonly success: true;
  readonly data: T;
  readonly error?: never;
  readonly timestamp: number;
};

export type ApiError = {
  readonly success: false;
  readonly data?: never;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: string;
  };
  readonly timestamp: number;
};

export type ApiResponse<T> = ApiData<T> | ApiError;

// Result types for error handling
export type Result<T, E = Error> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E };

// Async state types
export interface AsyncState<T, E = Error> {
  readonly data: T | null;
  readonly error: E | null;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly isSuccess: boolean;
  readonly isIdle: boolean;
}

// Component prop types
export type ComponentProps<T extends React.ComponentType> = 
  T extends React.ComponentType<infer P> ? P : never;

export type ComponentRef<T extends React.ComponentType> = 
  T extends React.ForwardRefExoticComponent<infer P> 
    ? P extends React.RefAttributes<infer R> 
      ? R 
      : never 
    : never;

// Event types with better constraints
export type InputChangeEvent = React.ChangeEvent<HTMLInputElement>;
export type TextAreaChangeEvent = React.ChangeEvent<HTMLTextAreaElement>;
export type SelectChangeEvent = React.ChangeEvent<HTMLSelectElement>;
export type FormSubmitEvent = React.FormEvent<HTMLFormElement>;
export type ButtonClickEvent = React.MouseEvent<HTMLButtonElement>;

// URL and navigation types
export type RouteParams<T extends string> = {
  [K in T]: string;
};

export interface NavigationState {
  readonly from?: string;
  readonly data?: Record<string, unknown>;
}

// Date and time utilities
export type DateString = Brand<string, 'DateString'>; // ISO date string
export type Timestamp = Brand<number, 'Timestamp'>; // Unix timestamp

// File and upload types
export interface TypedFile {
  readonly file: File;
  readonly preview?: string;
  readonly uploadProgress?: number;
  readonly error?: string;
}

export type FileStatus = 'idle' | 'uploading' | 'success' | 'error';

// Configuration types
export interface AppConfig {
  readonly api: {
    readonly baseUrl: string;
    readonly timeout: number;
  };
  readonly auth: {
    readonly tokenKey: string;
    readonly redirectUrl: string;
  };
  readonly features: {
    readonly enableAnalytics: boolean;
    readonly enableErrorReporting: boolean;
  };
}

// Environment types
export type Environment = 'development' | 'staging' | 'production';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';

// Permission types
export type Permission = 
  | 'read:proposals'
  | 'write:proposals'
  | 'delete:proposals'
  | 'read:clients'
  | 'write:clients'
  | 'read:agents'
  | 'write:agents'
  | 'admin:all';

export type UserPermissions = readonly Permission[];

// Sorting and filtering types
export type SortDirection = 'asc' | 'desc';

export interface SortOption<T extends string = string> {
  readonly field: T;
  readonly direction: SortDirection;
}

export interface FilterOption<T = unknown> {
  readonly field: string;
  readonly operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
  readonly value: T;
}

// Cache types
export interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: number;
  readonly ttl: number;
}

export type CacheKey = readonly (string | number)[];

// Logger types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: number;
  readonly context?: Record<string, unknown>;
}

// Performance types
export interface PerformanceEntry {
  readonly name: string;
  readonly duration: number;
  readonly startTime: number;
  readonly endTime: number;
}

// Type guards for better runtime type checking
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isNonEmptyArray<T>(value: T[]): value is NonEmptyArray<T> {
  return value.length > 0;
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

// Async utilities
export function isPromise<T>(value: unknown): value is Promise<T> {
  return value instanceof Promise || (
    typeof value === 'object' &&
    value !== null &&
    'then' in value &&
    typeof (value as Promise<T>).then === 'function'
  );
}

// Type assertion utilities
export function assertIsDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is not defined');
  }
}

export function assertIsString(value: unknown, message?: string): asserts value is string {
  if (!isString(value)) {
    throw new Error(message ?? 'Value is not a string');
  }
}

export function assertIsNumber(value: unknown, message?: string): asserts value is number {
  if (!isNumber(value)) {
    throw new Error(message ?? 'Value is not a number');
  }
}