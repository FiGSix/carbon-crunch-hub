
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { LoginLayout } from '@/components/auth/LoginLayout';
import { LoginHeader } from '@/components/auth/LoginHeader';
import { LoginForm } from '@/components/auth/LoginForm';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole, isLoading: authLoading, isInitialized } = useAuth();
  const [loginAttempts, setLoginAttempts] = useState(0);
  
  // Track if we're already redirecting to prevent loops
  const isRedirectingRef = useRef(false);
  const mountTimeRef = useRef(Date.now());
  
  useEffect(() => {
    // Only redirect if:
    // 1. Auth is initialized
    // 2. User is authenticated 
    // 3. We're not already redirecting
    // 4. Some time has passed since mounting (prevent immediate redirects)
    const timeSinceMounted = Date.now() - mountTimeRef.current;
    const shouldRedirect = isInitialized && 
                          user && 
                          userRole &&
                          !authLoading && 
                          !isRedirectingRef.current && 
                          timeSinceMounted > 500;
    
    if (shouldRedirect) {
      console.log('✅ User already logged in, redirecting to dashboard. User role:', userRole);
      isRedirectingRef.current = true;
      const from = location.state?.from || '/dashboard';
      
      // Small delay to ensure smooth UX
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 100);
    }
  }, [user, userRole, navigate, authLoading, isInitialized, location.state]);

  const handleLoginAttempt = () => {
    setLoginAttempts(prev => prev + 1);
  };

  // Show loading state while auth is initializing
  if (!isInitialized || (authLoading && !user)) {
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
