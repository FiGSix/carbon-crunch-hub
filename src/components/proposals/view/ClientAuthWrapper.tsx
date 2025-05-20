
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientRegistrationForm } from './ClientRegistrationForm';
import { ClientLoginForm } from './ClientLoginForm';
import { useAuth } from "@/contexts/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { logger } from "@/lib/logger";

interface ClientAuthWrapperProps {
  proposalId: string;
  clientEmail: string;
  onAuthComplete: () => void;
}

export function ClientAuthWrapper({ proposalId, clientEmail, onAuthComplete }: ClientAuthWrapperProps) {
  const [activeTab, setActiveTab] = useState<string>("register");
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  // Create a contextualized logger
  const authLogger = logger.withContext({
    component: 'ClientAuthWrapper',
    feature: 'client-auth'
  });
  
  // If user is already authenticated, complete the process
  useEffect(() => {
    if (user) {
      authLogger.info("User already authenticated, completing auth flow", {
        userId: user.id,
        proposalId
      });
      onAuthComplete();
    }
  }, [user, onAuthComplete, proposalId, authLogger]);
  
  // Handle authentication completion
  const handleAuthComplete = () => {
    authLogger.info("Auth completed successfully", {
      proposalId,
      email: clientEmail,
      activeTab
    });
    onAuthComplete();
  };
  
  // Handle authentication errors
  const handleAuthError = (errorMessage: string) => {
    authLogger.error("Auth error", {
      proposalId,
      email: clientEmail,
      activeTab,
      error: errorMessage
    });
    setError(errorMessage);
  };

  return (
    <div className="max-w-md mx-auto my-8">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Tabs defaultValue="register" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="register">Create Account</TabsTrigger>
          <TabsTrigger value="login">Sign In</TabsTrigger>
        </TabsList>
        
        <TabsContent value="register">
          <ClientRegistrationForm 
            proposalId={proposalId} 
            clientEmail={clientEmail} 
            onComplete={handleAuthComplete} 
          />
        </TabsContent>
        
        <TabsContent value="login">
          <ClientLoginForm 
            clientEmail={clientEmail} 
            onComplete={handleAuthComplete} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
