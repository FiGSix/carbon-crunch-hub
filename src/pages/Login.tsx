
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { LoginLayout } from '@/components/auth/LoginLayout';
import { LoginHeader } from '@/components/auth/LoginHeader';
import { LoginForm } from '@/components/auth/LoginForm';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session, isLoading: authLoading, isInitialized } = useAuth();
  const [loginAttempts, setLoginAttempts] = useState(0);
  
  // Simplified redirect tracking
  const hasRedirectedRef = useRef(false);
  
  useEffect(() => {
    // Only log in development for debugging

    // IMPROVED: Only redirect if we have valid session and auth is fully initialized
    if (isInitialized && !authLoading && user && session && !hasRedirectedRef.current) {
      // Validate session is not expired
      if (session.expires_at && new Date(session.expires_at * 1000) > new Date()) {
        hasRedirectedRef.current = true;
        const from = location.state?.from || '/dashboard';
        
        navigate(from, { replace: true });
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
    <LoginLayout>
      <LoginHeader />
      <LoginForm 
        loginAttempts={loginAttempts}
        onLoginAttempt={handleLoginAttempt}
      />
    </LoginLayout>
  );
};

export default Login;
