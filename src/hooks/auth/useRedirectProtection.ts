import React, { useRef, useCallback } from 'react';

/**
 * Hook to prevent multiple simultaneous redirects that can cause infinite loops
 */
export function useRedirectProtection() {
  const redirectInProgressRef = useRef(false);
  const lastRedirectTimeRef = useRef(0);
  
  const canRedirect = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRedirect = now - lastRedirectTimeRef.current;
    
    // Prevent redirects if one is in progress or if less than 1 second has passed
    if (redirectInProgressRef.current || timeSinceLastRedirect < 1000) {
      return false;
    }
    
    return true;
  }, []);
  
  const setRedirectInProgress = useCallback((inProgress: boolean) => {
    redirectInProgressRef.current = inProgress;
    if (inProgress) {
      lastRedirectTimeRef.current = Date.now();
    }
  }, []);
  
  return {
    canRedirect,
    setRedirectInProgress,
    isRedirecting: redirectInProgressRef.current
  };
}