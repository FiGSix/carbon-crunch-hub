import { useRef, useCallback } from "react";
import { logger } from "@/lib/logger";

export function useDebounce(delay: number = 300) {
  const debounceTimerRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);
  
  const debounceLogger = logger.withContext({ 
    component: 'Debounce', 
    feature: 'proposals' 
  });
  
  const debounce = useCallback((callback: () => Promise<void>, forceImmediate: boolean = false) => {
    // Check if a fetch operation is already in progress
    if (isFetchingRef.current && !forceImmediate) {
      debounceLogger.info("Operation already in progress, skipping duplicate request");
      return;
    }
    
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    // If forced, execute immediately
    if (forceImmediate) {
      if (!isFetchingRef.current) {
        isFetchingRef.current = true;
        callback().finally(() => {
          isFetchingRef.current = false;
        });
      }
      return;
    }
    
    // Otherwise debounce
    debounceTimerRef.current = window.setTimeout(() => {
      if (!isFetchingRef.current) {
        isFetchingRef.current = true;
        callback().finally(() => {
          isFetchingRef.current = false;
        });
      }
    }, delay);
  }, [delay, debounceLogger]);
  
  return { debounce, isFetchingRef };
}
