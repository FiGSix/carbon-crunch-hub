
import { useInactivityLogout } from '@/hooks/auth/useInactivityLogout';
import { useAuth } from '@/contexts/auth';

/**
 * Component that monitors user inactivity and triggers logout after 30 minutes
 * Renders nothing - purely functional component
 */
export function InactivityMonitor() {
  const { user, isInitialized } = useAuth();
  
  // Only activate for authenticated users after auth is initialized
  const shouldMonitor = isInitialized && !!user;
  
  // The hook handles all the logic internally
  useInactivityLogout();
  
  // This component renders nothing
  return null;
}
