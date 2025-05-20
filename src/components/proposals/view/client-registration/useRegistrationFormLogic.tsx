
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { useProposalUpdate } from './hooks/useProposalUpdate';
import { useFormValidation } from './hooks/useFormValidation';

export function useRegistrationFormLogic(
  proposalId: string,
  clientEmail: string,
  onComplete: () => void,
  onError?: (errorMessage: string) => void
) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { updateProposalClientId } = useProposalUpdate();
  const { validatePasswords, validateRequired } = useFormValidation();
  
  // Create a contextualized logger
  const registrationLogger = logger.withContext({
    component: 'useRegistrationFormLogic', 
    feature: 'client-auth'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    switch(name) {
      case 'firstName':
        setFirstName(value);
        break;
      case 'lastName':
        setLastName(value);
        break;
      case 'password':
        setPassword(value);
        break;
      case 'confirmPassword':
        setConfirmPassword(value);
        break;
    }
  };

  const validateForm = (): string | null => {
    const firstNameError = validateRequired(firstName, 'First name');
    if (firstNameError) return firstNameError;
    
    const lastNameError = validateRequired(lastName, 'Last name');
    if (lastNameError) return lastNameError;
    
    const passwordError = validatePasswords(password, confirmPassword);
    if (passwordError) return passwordError;
    
    return null;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form inputs
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      if (onError) {
        onError(validationError);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      registrationLogger.info("Starting client registration", { 
        email: clientEmail,
        proposalId
      });
      
      // Create a new user with Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: clientEmail,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: 'client',
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // Once registered, update the proposal's client_id
      if (data?.user) {
        registrationLogger.info("User registered successfully, updating proposal", {
          userId: data.user.id,
          proposalId
        });
        
        const updateSuccess = await updateProposalClientId({
          proposalId,
          userId: data.user.id
        });
        
        if (updateSuccess) {
          toast({
            title: "Registration successful!",
            description: "Your account has been created and linked to this proposal.",
            variant: "default"
          });
        }

        // Notify the parent component that registration is complete
        onComplete();
      }
    } catch (error: any) {
      registrationLogger.error("Registration error", { 
        error: error.message,
        email: clientEmail
      });
      
      // Handle common errors
      let errorMessage: string;
      if (error.message.includes("User already registered")) {
        errorMessage = "An account with this email already exists. Please sign in instead.";
        toast({
          title: "Account exists",
          description: "This email is already registered. Please use the login option instead.",
          variant: "destructive"
        });
      } else {
        errorMessage = error.message || "Failed to create account. Please try again.";
      }
      
      setError(errorMessage);
      
      // Call the onError callback if provided
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    firstName,
    lastName,
    password,
    confirmPassword,
    loading,
    error,
    handleChange,
    handleSignUp
  };
}
