
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
  
  // Enhanced redirect tracking with timeout protection
  const hasRedirectedRef = useRef(false);
  const redirectTimeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    // Clear any existing timeout on component unmount
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);
  
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔄 Login redirect check:', {
        isInitialized,
        hasUser: !!user,
        hasSession: !!session,
        authLoading,
        hasRedirected: hasRedirectedRef.current,
        currentPath: location.pathname,
        intendedDestination: location.state?.from || '/dashboard'
      });
    }

    // SIMPLIFIED REDIRECT LOGIC: Redirect immediately if we have both user and session
    if (isInitialized && user && session && !hasRedirectedRef.current) {
      if (import.meta.env.DEV) {
        console.log('✅ User authenticated with valid session, executing immediate redirect');
      }
      hasRedirectedRef.current = true;
      
      const from = location.state?.from || '/dashboard';
      if (import.meta.env.DEV) {
        console.log('🚀 Redirecting to:', from);
      }
      
      // Immediate redirect - don't wait for profile loading
      navigate(from, { replace: true });
      
      // Fallback redirect with timeout protection
      redirectTimeoutRef.current = setTimeout(() => {
        if (!hasRedirectedRef.current) {
          if (import.meta.env.DEV) {
            console.log('⏰ Timeout fallback redirect triggered');
          }
          hasRedirectedRef.current = true;
          navigate(from, { replace: true });
        }
      }, 2000); // 2 second timeout
    } else if (isInitialized && !authLoading && (!user || !session)) {
      if (import.meta.env.DEV) {
        console.log('ℹ️ No valid authentication found on login page');
      }
    }
  }, [user, session, navigate, authLoading, isInitialized, location.state]);

  const handleLoginAttempt = () => {
    if (import.meta.env.DEV) {
      console.log('📈 Login attempt incremented');
    }
    setLoginAttempts(prev => prev + 1);
  };

  // Show loading while auth is initializing or if we're about to redirect
  if (!isInitialized || authLoading || (user && session && !hasRedirectedRef.current)) {
    if (import.meta.env.DEV) {
      console.log('⏳ Showing login loading state');
    }
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
  
  if (import.meta.env.DEV) {
    console.log('📋 Rendering login form');
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
