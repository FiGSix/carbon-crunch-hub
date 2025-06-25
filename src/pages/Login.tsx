
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
  
  // Performance optimization: Track redirects to prevent loops
  const isRedirectingRef = useRef(false);
  const mountTimeRef = useRef(Date.now());
  const hasRedirectedRef = useRef(false);
  
  useEffect(() => {
    // Only redirect if all conditions are met and we haven't already redirected
    const timeSinceMounted = Date.now() - mountTimeRef.current;
    const shouldRedirect = isInitialized && 
                          user && 
                          userRole &&
                          !authLoading && 
                          !isRedirectingRef.current && 
                          !hasRedirectedRef.current &&
                          timeSinceMounted > 300; // Reduced from 500ms for faster UX
    
    if (shouldRedirect) {
      console.log('✅ User already logged in, redirecting to dashboard. User role:', userRole);
      isRedirectingRef.current = true;
      hasRedirectedRef.current = true;
      
      const from = location.state?.from || '/dashboard';
      
      // Immediate redirect for better performance
      navigate(from, { replace: true });
    }
  }, [user, userRole, navigate, authLoading, isInitialized, location.state]);

  const handleLoginAttempt = () => {
    setLoginAttempts(prev => prev + 1);
  };

  // Optimized loading state with faster render
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
