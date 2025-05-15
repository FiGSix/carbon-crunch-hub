
// This file centralizes all exports from the auth context
// to promote consistent imports across the application

// Export the main provider component
export { AuthProvider } from './AuthProvider';

// Export the useAuth hook for component access to auth state
export { useAuth } from './useAuth';

// Export types for TypeScript support
export type { AuthContextType, UserProfile, UserRole } from './types';

// Export hooks for specialized auth functionality
export { useAuthInitialization } from './hooks/useAuthInitialization';
export { useAuthRefresh } from './hooks/useAuthRefresh';
export { useAuthDebug } from './hooks/useAuthDebug';
