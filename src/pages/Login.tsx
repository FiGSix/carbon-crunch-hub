
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
    // FIXED: Only redirect if we have both user and session, auth is initialized, and we haven't redirected yet
    if (isInitialized && user && session && !authLoading && !hasRedirectedRef.current) {
      console.log('✅ User authenticated with valid session after RLS fix, redirecting to dashboard');
      hasRedirectedRef.current = true;
      
      const from = location.state?.from || '/dashboard';
      console.log('🔄 Redirecting to:', from);
      
      // Use replace to prevent back button issues
      navigate(from, { replace: true });
    }
  }, [user, session, navigate, authLoading, isInitialized, location.state]);

  const handleLoginAttempt = () => {
    setLoginAttempts(prev => prev + 1);
  };

  // Show loading while auth is initializing or if we're about to redirect
  if (!isInitialized || authLoading || (user && session)) {
    return (
      <LoginLayout>
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
