import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { logger } from "@/lib/logger";
import { CalculatorResult } from "./useCalculatorResults";

export function useCalculatorResultsAuth(
  result: CalculatorResult | null, 
  clientEmail: string | null, 
  token: string | null
) {
  const { user } = useAuth();
  const [showAuthForm, setShowAuthForm] = useState(false);
  
  const authLogger = logger.withContext({ 
    component: 'CalculatorResultsAuth', 
    feature: 'calculator-results' 
  });

  const handleAuthComplete = useCallback(() => {
    authLogger.info("Authentication completed, refreshing view", { action: 'authComplete' });
    setShowAuthForm(false);
  }, [authLogger]);

  const handleSignInClick = useCallback(() => {
    if (result) {
      authLogger.info("User clicked sign in to save results", { resultId: result.id });
      setShowAuthForm(true);
    }
  }, [result, authLogger]);

  // Show sign-in prompt when: not logged in, has token, and valid result
  const showSignInPrompt = !user && token && clientEmail && !!result;

  return {
    user,
    showAuthForm,
    handleAuthComplete,
    handleSignInClick,
    showSignInPrompt
  };
}
