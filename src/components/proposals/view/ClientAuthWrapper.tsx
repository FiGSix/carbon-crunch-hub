
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
  requireAuth?: boolean; // New prop to determine if auth is required
}

export function ClientAuthWrapper({ 
  proposalId, 
  clientEmail, 
  onAuthComplete,
  requireAuth = false // Default to false - view without auth
}: ClientAuthWrapperProps) {
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
    } else if (!requireAuth) {
      // If auth is not required and no user, we still complete the auth flow
      // This allows viewing the proposal without authentication
      authLogger.info("Auth not required for viewing, proceeding without login", {
        proposalId,
        email: clientEmail
      });
      onAuthComplete();
    }
  }, [user, onAuthComplete, proposalId, requireAuth, authLogger, clientEmail]);
  
  // If auth is not required and user is not logged in, we don't need to show the auth form
  if (!requireAuth && !user) {
    return null;
  }
  
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
