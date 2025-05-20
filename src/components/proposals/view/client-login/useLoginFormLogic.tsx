import { useState } from 'react';
import { signIn } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { logger } from "@/lib/logger";
import { useFormValidation } from '../client-registration/hooks/useFormValidation';

export function useLoginFormLogic(
  clientEmail: string, 
  onComplete: () => void, 
  onError?: (errorMessage: string) => void
) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const { validateRequired } = useFormValidation();
  
  const { error, handleError, clearError } = useErrorHandler({
    context: "client-login",
    toastOnError: false
  });
  
  // Create a contextualized logger
  const loginLogger = logger.withContext({
    component: 'useLoginFormLogic',
    feature: 'client-auth'
  });

  const validateForm = (): boolean => {
    const passwordError = validateRequired(password, 'Password');
    if (passwordError) {
      handleError(new Error(passwordError), passwordError);
      return false;
    }
    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    clearError();

    try {
      loginLogger.info("Attempting client login", { email: clientEmail });
      
      const { data, error: signInError } = await signIn(clientEmail, password);

      if (signInError) {
        loginLogger.error("Login failed", { 
          error: signInError.message,
          email: clientEmail
        });
        throw signInError;
      }

      if (data?.session) {
        loginLogger.info("Login successful, refreshing user data", { 
          userId: data.session.user.id,
          email: clientEmail 
        });
        
        // Refresh user data after login
        await refreshUser();
        
        toast({
          title: "Login successful",
          description: "You are now logged in and can view the proposal.",
        });
        
        // Notify the parent component that login is complete
        onComplete();
      } else {
        throw new Error("Login successful but no session was created");
      }
    } catch (error: any) {
      loginLogger.error("Login error", { 
        errorMessage: error.message,
        email: clientEmail
      });
      
      const errorMessage = error.message?.includes("Invalid login credentials")
        ? "Invalid email or password. Please try again."
        : "Failed to log in. Please try again.";
      
      handleError(error, errorMessage);
      
      // Call the onError callback if provided
      if (onError) {
        onError(errorMessage);
      }
      
      toast({
        title: "Login failed",
        description: "Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return {
    password,
    setPassword,
    loading,
    error,
    handleSignIn
  };
}
