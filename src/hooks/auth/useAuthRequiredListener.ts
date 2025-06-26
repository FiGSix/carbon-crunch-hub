
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { authLogger } from '@/lib/logger';

interface UseAuthRequiredListenerProps {
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

/**
 * Hook to listen for 'auth-required' events and handle session expiration gracefully
 */
export function useAuthRequiredListener({ signOut, isAuthenticated }: UseAuthRequiredListenerProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isHandlingRef = useRef(false);

  useEffect(() => {
    const handleAuthRequired = async (event: CustomEvent) => {
      // Prevent multiple simultaneous handlers
      if (isHandlingRef.current) {
        return;
      }

      isHandlingRef.current = true;

      try {
        authLogger.info('Auth-required event received, handling session expiration', {
          isAuthenticated,
          eventDetail: event.detail,
          currentPath: window.location.pathname
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
        const currentPath = window.location.pathname;
        navigate('/login', { 
          state: { from: currentPath },
          replace: true 
        });

      } catch (error) {
        authLogger.error('Error handling auth-required event', { error });
        
        // Fallback: still redirect to login even if signOut fails
        navigate('/login', { replace: true });
      } finally {
        isHandlingRef.current = false;
      }
    };

    // Add event listener for auth-required events
    window.addEventListener('auth-required', handleAuthRequired as EventListener);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('auth-required', handleAuthRequired as EventListener);
    };
  }, [signOut, isAuthenticated, navigate, toast]);
}
