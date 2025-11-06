
import { useState, useEffect } from 'react';
import { RegistrationForm } from './client-registration/RegistrationForm';
import { LoginForm } from './client-login/LoginForm';
import { useAuth } from "@/contexts/auth";
import { logger } from "@/lib/logger";
import { AuthTabSwitcher } from './auth/AuthTabSwitcher';
import { AuthErrorDisplay } from './auth/AuthErrorDisplay';

interface ClientAuthWrapperProps {
  proposalId: string;
  clientEmail: string;
  onAuthComplete: () => void;
  requireAuth?: boolean;
  context?: 'proposal' | 'calculator';
}

export function ClientAuthWrapper({ 
  proposalId, 
  clientEmail, 
  onAuthComplete,
  requireAuth = true,
  context = 'proposal'
}: ClientAuthWrapperProps) {
  // Default to "register" tab for new users
  const [activeTab, setActiveTab] = useState<string>("register");
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  // Create a contextualized logger
  const authLogger = logger.withContext({
    component: 'ClientAuthWrapper',
    feature: 'client-auth'
  });
  
  // Phase 4: Effect to handle auth completion with delay for database sync
  useEffect(() => {
    if (user && requireAuth) {
      authLogger.info("User authenticated, completing auth flow", {
        userId: user.id,
        proposalId
      });
      
      // Add a small delay to ensure database sync
      const timer = setTimeout(() => {
        onAuthComplete();
      }, 500);
      
      return () => clearTimeout(timer);
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
    <RegistrationForm 
      proposalId={proposalId} 
      clientEmail={clientEmail} 
      onComplete={handleAuthComplete}
      onError={handleAuthError}
    />
  );
  
  const loginForm = (
    <LoginForm 
      clientEmail={clientEmail} 
      onComplete={handleAuthComplete}
      onError={handleAuthError}
    />
  );

  const isCalculator = context === 'calculator';
  
  return (
    <div className="max-w-md mx-auto my-8">
      {isCalculator && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            Once signed in, your results will be saved to your dashboard and you'll be able to access them anytime.
          </p>
        </div>
      )}
      
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
