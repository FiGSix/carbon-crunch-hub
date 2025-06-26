
// This hook has been deprecated and replaced with AuthNavigationHandler component
// to avoid circular dependencies between AuthProvider and navigation hooks.
// 
// The functionality has been moved to:
// src/components/auth/AuthNavigationHandler.tsx

export function useAuthRequiredListener() {
  console.warn('useAuthRequiredListener is deprecated. Navigation logic has been moved to AuthNavigationHandler component.');
  return;
}
