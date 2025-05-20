
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

export function useRegistrationFormLogic(
  proposalId: string,
  clientEmail: string,
  onComplete: () => void
) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError("Passwords don't match. Please try again.");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
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
        
        // First, fetch the current state of the proposal to check both client IDs
        const { data: proposalData, error: proposalFetchError } = await supabase
          .from('proposals')
          .select('client_id, client_contact_id')
          .eq('id', proposalId)
          .single();
          
        if (proposalFetchError) {
          registrationLogger.error("Error fetching proposal before update", { 
            error: proposalFetchError,
            proposalId
          });
          throw proposalFetchError;
        }
        
        // Check if this email exists as a client_contact
        const { data: clientContact, error: contactLookupError } = await supabase
          .from('client_contacts')
          .select('id')
          .eq('email', clientEmail.toLowerCase().trim())
          .maybeSingle();
          
        if (contactLookupError && !contactLookupError.message.includes('No rows found')) {
          registrationLogger.error("Error looking up client contact", { 
            error: contactLookupError,
            email: clientEmail 
          });
        }
        
        // Log the current state for debugging
        registrationLogger.info("Current proposal state before update", {
          proposalId,
          currentClientId: proposalData.client_id,
          currentClientContactId: proposalData.client_contact_id,
          foundClientContactId: clientContact?.id
        });
        
        // Build the update data based on the current state
        const updateData: { client_id: string, client_contact_id?: null } = {
          client_id: data.user.id
        };
        
        // If this proposal was using client_contact_id, ensure we clear it
        // to avoid conflicting identity references
        if (proposalData.client_contact_id || clientContact?.id) {
          updateData.client_contact_id = null;
          registrationLogger.info("Clearing client_contact_id during registration", {
            previousContactId: proposalData.client_contact_id,
            foundContactId: clientContact?.id
          });
        }
        
        // Update the proposal with the new client ID
        const { error: updateError } = await supabase
          .from('proposals')
          .update(updateData)
          .eq('id', proposalId);
        
        if (updateError) {
          registrationLogger.error("Error linking proposal to new client account", { 
            error: updateError,
            userId: data.user.id,
            proposalId,
            updateData
          });
          
          toast({
            title: "Account created",
            description: "Your account was created but there was an issue linking it to this proposal. Please contact support.",
            variant: "default"
          });
        } else {
          registrationLogger.info("Successfully linked proposal to new client account", {
            userId: data.user.id,
            proposalId,
            updateData
          });
          
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
      if (error.message.includes("User already registered")) {
        setError("An account with this email already exists. Please sign in instead.");
        toast({
          title: "Account exists",
          description: "This email is already registered. Please use the login option instead.",
          variant: "destructive"
        });
      } else {
        setError(error.message || "Failed to create account. Please try again.");
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
