
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

        // Show user-friendly notification with more context
        const reason = event.detail?.reason || 'session_expired';
        const message = event.detail?.message || "Your session has expired. Please sign in again to continue.";
        
        toast({
          title: "Session Expired",
          description: message,
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

    const handleAuthRecovery = async (event: CustomEvent) => {
      try {
        authLogger.info('Auth-recovery event received, attempting silent recovery', {
          eventDetail: event.detail,
          currentPath: location.pathname
        });

        // Show subtle notification for recovery attempt
        toast({
          title: "Reconnecting...",
          description: "Restoring your session, please wait.",
        });

      } catch (error) {
        authLogger.error('Error handling auth-recovery event', { error });
      }
    };

    const handleNetworkError = async (event: CustomEvent) => {
      authLogger.info('Network error detected', {
        eventDetail: event.detail,
        currentPath: location.pathname
      });

      // Show network-specific message
      toast({
        title: "Connection Issue",
        description: "Please check your internet connection.",
        variant: "destructive",
      });
    };

    // Add event listeners for enhanced auth events
    window.addEventListener('auth-required', handleAuthRequired as EventListener);
    window.addEventListener('auth-recovery', handleAuthRecovery as EventListener);
    window.addEventListener('network-error', handleNetworkError as EventListener);

    // Cleanup listeners on unmount
    return () => {
      window.removeEventListener('auth-required', handleAuthRequired as EventListener);
      window.removeEventListener('auth-recovery', handleAuthRecovery as EventListener);
      window.removeEventListener('network-error', handleNetworkError as EventListener);
    };
  }, [signOut, isAuthenticated, navigate, location.pathname, toast]);

  return null; // This component doesn't render anything
}
