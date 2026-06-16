
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { logger } from '@/lib/logger';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

const ACTIVITY_EVENTS = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart'
] as const;

/**
 * Hook that monitors user activity and logs out after 30 minutes of inactivity
 */
export function useInactivityLogout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  const handleInactivityLogout = useCallback(async () => {
    logger.info('Logging out user due to inactivity', { 
      component: 'useInactivityLogout',
      inactiveMinutes: 30 
    });
    
    try {
      await signOut();
    } catch (error) {
      logger.error('Error during inactivity logout', { error });
    }
    
    // Redirect to login with inactivity reason
    navigate('/login?reason=inactivity', { replace: true });
  }, [signOut, navigate]);

  useEffect(() => {
    // Only run for authenticated users
    if (!user) return;

    // Reset activity timestamp on mount
    resetActivity();

    // Activity event handlers
    const handleActivity = () => {
      resetActivity();
    };

    // Add activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start interval to check inactivity
    checkIntervalRef.current = setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      
      if (timeSinceActivity >= INACTIVITY_TIMEOUT_MS) {
        handleInactivityLogout();
      }
    }, CHECK_INTERVAL_MS);

    // Cleanup
    return () => {
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [user, resetActivity, handleInactivityLogout]);

  return { resetActivity };
}
