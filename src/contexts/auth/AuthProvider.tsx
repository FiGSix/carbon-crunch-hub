
import { ReactNode } from 'react';
import { AuthState } from './components/AuthState';

/**
 * AuthProvider component for handling authentication state
 * This is the recommended way to access auth context in the application
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthState>{children}</AuthState>;
}
