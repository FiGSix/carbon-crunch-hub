
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { LoginLayout } from '@/components/auth/LoginLayout';
import { LoginHeader } from '@/components/auth/LoginHeader';
import { LoginForm } from '@/components/auth/LoginForm';
import { PageErrorBoundary } from '@/lib/errors/errorBoundaryHelpers';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, isLoading: authLoading, isInitialized } = useAuth();
  const [loginAttempts, setLoginAttempts] = useState(0);
  
  // Enhanced redirect tracking with loop prevention
  const hasRedirectedRef = useRef(false);
  const lastRedirectAttemptRef = useRef<number>(0);
  
  useEffect(() => {
    // Prevent rapid redirect attempts
    const now = Date.now();
    const timeSinceLastAttempt = now - lastRedirectAttemptRef.current;
    
    // Only redirect if we have valid session and auth is fully initialized
    if (isInitialized && !authLoading && user && session && !hasRedirectedRef.current) {
      // Rate limit redirect attempts to prevent loops
      if (timeSinceLastAttempt < 2000) {
        return;
      }
      
      // Validate session is not expired
      if (session.expires_at && new Date(session.expires_at * 1000) > new Date()) {
        hasRedirectedRef.current = true;
        lastRedirectAttemptRef.current = now;
        const from = location.state?.from || '/dashboard';
        
        // Avoid redirecting to login if that's where we came from
        if (from !== '/login') {
          navigate(from, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    }
  }, [user, session, navigate, isInitialized, authLoading, location.state]);

  const handleLoginAttempt = () => {
    setLoginAttempts(prev => prev + 1);
  };

  // Show loading while auth is initializing or if we're about to redirect
  if (!isInitialized || authLoading || (user && session && !hasRedirectedRef.current)) {
    return (
      <LoginLayout>
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {user && session ? 'Redirecting...' : 'Loading...'}
            </p>
          </div>
        </div>
      </LoginLayout>
    );
  }
  
  return (
    <PageErrorBoundary pageName="Login">
      <LoginLayout>
        <LoginHeader />
        <LoginForm 
          loginAttempts={loginAttempts}
          onLoginAttempt={handleLoginAttempt}
        />
      </LoginLayout>
    </PageErrorBoundary>
  );
};

export default Login;
