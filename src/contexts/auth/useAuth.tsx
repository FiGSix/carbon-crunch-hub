
import { useContext } from 'react';
import { AuthContext } from './components/AuthContextProvider';

/**
 * Hook to access the authentication context
 * Usage: const { user, userRole, isLoading } = useAuth();
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
