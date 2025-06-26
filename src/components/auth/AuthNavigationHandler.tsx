
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { authLogger } from '@/lib/logger';

/**
 * Separate component to handle auth-related navigation
 * This is outside AuthProvider to avoid circular dependencies
 */
export function AuthNavigationHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { signOut, isAuthenticated } = useAuth();

  useEffect(() => {
    const handleAuthRequired = async (event: CustomEvent) => {
      try {
        authLogger.info('Auth-required event received, handling session expiration', {
          isAuthenticated,
          eventDetail: event.detail,
          currentPath: location.pathname
        });

        // Show user-friendly notification
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please sign in again to continue.",
          variant: "destructive",
        });

        // Sign out the user if they're currently authenticated
        if (isAuthenticated) {
          await signOut();
        }

        // Redirect to login with current path for return navigation
        const currentPath = location.pathname;
        navigate('/login', { 
          state: { from: currentPath },
          replace: true 
        });

      } catch (error) {
        authLogger.error('Error handling auth-required event', { error });
        
        // Fallback: still redirect to login even if signOut fails
        navigate('/login', { replace: true });
      }
    };

    // Add event listener for auth-required events
    window.addEventListener('auth-required', handleAuthRequired as EventListener);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('auth-required', handleAuthRequired as EventListener);
    };
  }, [signOut, isAuthenticated, navigate, location.pathname, toast]);

  return null; // This component doesn't render anything
}
