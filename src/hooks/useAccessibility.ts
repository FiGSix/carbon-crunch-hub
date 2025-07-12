import { useEffect, useRef, useCallback } from 'react';

interface UseAccessibilityOptions {
  announceErrors?: boolean;
  trapFocus?: boolean;
  skipToContent?: boolean;
}

export function useAccessibility({
  announceErrors = true,
  trapFocus = false,
  skipToContent = false
}: UseAccessibilityOptions = {}) {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  // Create or get the live region for announcements
  useEffect(() => {
    if (announceErrors && !liveRegionRef.current) {
      let liveRegion = document.getElementById('accessibility-live-region') as HTMLDivElement;
      
      if (!liveRegion) {
        liveRegion = document.createElement('div');
        liveRegion.id = 'accessibility-live-region';
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        document.body.appendChild(liveRegion);
      }
      
      liveRegionRef.current = liveRegion;
    }
  }, [announceErrors]);

  // Announce messages to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegionRef.current) return;

    liveRegionRef.current.setAttribute('aria-live', priority);
    liveRegionRef.current.textContent = message;

    // Clear after announcement
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  // Focus management
  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Skip to main content
  const skipToMainContent = useCallback(() => {
    const main = document.querySelector('main, [role="main"], #main-content') as HTMLElement;
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus();
      main.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Keyboard navigation handler
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    // Skip to content with Ctrl+/
    if (event.ctrlKey && event.key === '/') {
      event.preventDefault();
      skipToMainContent();
    }

    // Escape key handling
    if (event.key === 'Escape') {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.blur) {
        activeElement.blur();
      }
    }
  }, [skipToMainContent]);

  // Focus trap for modals/dialogs
  const trapFocusWithin = useCallback((container: HTMLElement) => {
    if (!trapFocus) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [trapFocus]);

  // Set up global keyboard listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation);
    };
  }, [handleKeyboardNavigation]);

  return {
    announce,
    focusElement,
    skipToMainContent,
    trapFocusWithin,
    liveRegionRef
  };
}

// Helper hook for form accessibility
export function useFormAccessibility() {
  const { announce } = useAccessibility({ announceErrors: true });

  const announceFormError = useCallback((fieldName: string, error: string) => {
    announce(`Error in ${fieldName}: ${error}`, 'assertive');
  }, [announce]);

  const announceFormSuccess = useCallback((message: string) => {
    announce(message, 'polite');
  }, [announce]);

  const announceFieldChange = useCallback((fieldName: string, value: string) => {
    announce(`${fieldName} changed to ${value}`, 'polite');
  }, [announce]);

  return {
    announceFormError,
    announceFormSuccess,
    announceFieldChange
  };
}