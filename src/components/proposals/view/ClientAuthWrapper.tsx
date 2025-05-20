
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
  requireAuth?: boolean; // Whether auth is required or optional viewing is allowed
}

export function ClientAuthWrapper({ 
  proposalId, 
  clientEmail, 
  onAuthComplete,
  requireAuth = false
}: ClientAuthWrapperProps) {
  const [activeTab, setActiveTab] = useState<string>("register");
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  // Create a contextualized logger
  const authLogger = logger.withContext({
    component: 'ClientAuthWrapper',
    feature: 'client-auth'
  });
  
  // Effect to handle auth completion
  useEffect(() => {
    if (user) {
      // User is authenticated, complete the auth process
      authLogger.info("User authenticated, completing auth flow", {
        userId: user.id,
        proposalId
      });
      onAuthComplete();
    } else if (!requireAuth) {
      // Auth is not required and user is not logged in, still complete the flow
      // This handles the token-based view-only access case
      authLogger.info("Auth not required, proceeding with token-based access", {
        proposalId
      });
      onAuthComplete();
    }
  }, [user, requireAuth, onAuthComplete, proposalId, authLogger]);
  
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
            onError={handleAuthError}
          />
        </TabsContent>
        
        <TabsContent value="login">
          <ClientLoginForm 
            clientEmail={clientEmail} 
            onComplete={handleAuthComplete}
            onError={handleAuthError}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
