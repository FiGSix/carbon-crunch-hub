
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { LoginLayout } from '@/components/auth/LoginLayout';
import { LoginHeader } from '@/components/auth/LoginHeader';
import { LoginForm } from '@/components/auth/LoginForm';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const [loginAttempts, setLoginAttempts] = useState(0);
  
  // Track if we're already redirecting to prevent loops
  const isRedirectingRef = useRef(false);
  const mountTimeRef = useRef(Date.now());
  
  useEffect(() => {
    // Only redirect if user is authenticated and we're not already redirecting
    const timeSinceMounted = Date.now() - mountTimeRef.current;
    const shouldRedirect = user && 
                          !authLoading && 
                          !isRedirectingRef.current && 
                          timeSinceMounted > 1000;
    
    if (shouldRedirect) {
      console.log('User already logged in, redirecting to dashboard. User role:', userRole);
      isRedirectingRef.current = true;
      const from = location.state?.from || '/dashboard';
      setTimeout(() => {
        navigate(from);
      }, 300);
    }
  }, [user, navigate, userRole, authLoading, location.state]);

  const handleLoginAttempt = () => {
    setLoginAttempts(prev => prev + 1);
  };
  
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
