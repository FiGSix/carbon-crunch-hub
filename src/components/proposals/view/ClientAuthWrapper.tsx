
import React, { useState, useEffect } from 'react';
import { ClientRegistrationForm } from './ClientRegistrationForm';
import { ClientLoginForm } from './ClientLoginForm';
import { useAuth } from "@/contexts/auth";
import { logger } from "@/lib/logger";
import { AuthTabSwitcher } from './auth/AuthTabSwitcher';
import { AuthErrorDisplay } from './auth/AuthErrorDisplay';

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

  // Components for each tab
  const registrationForm = (
    <ClientRegistrationForm 
      proposalId={proposalId} 
      clientEmail={clientEmail} 
      onComplete={handleAuthComplete}
      onError={handleAuthError}
    />
  );
  
  const loginForm = (
    <ClientLoginForm 
      clientEmail={clientEmail} 
      onComplete={handleAuthComplete}
      onError={handleAuthError}
    />
  );

  return (
    <div className="max-w-md mx-auto my-8">
      <AuthErrorDisplay error={error} />
      
      <AuthTabSwitcher
        activeTab={activeTab}
        onTabChange={setActiveTab}
        registerContent={registrationForm}
        loginContent={loginForm}
      />
    </div>
  );
}
