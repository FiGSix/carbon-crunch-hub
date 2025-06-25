
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
  
  // Enhanced redirect tracking with better logging
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
    // Enhanced redirect logic with comprehensive logging
    console.log('🔄 Login redirect check:', {
      isInitialized,
      hasUser: !!user,
      hasSession: !!session,
      authLoading,
      hasRedirected: hasRedirectedRef.current,
      userEmail: user?.email || 'none',
      sessionExpiry: session?.expires_at || 'none',
      currentPath: location.pathname,
      intendedDestination: location.state?.from || '/dashboard'
    });

    // Only redirect if we have both user and session, auth is initialized, 
    // we're not loading, and we haven't redirected yet
    if (isInitialized && user && session && !authLoading && !hasRedirectedRef.current) {
      console.log('✅ User authenticated with valid session, preparing redirect');
      hasRedirectedRef.current = true;
      
      const from = location.state?.from || '/dashboard';
      console.log('🎯 Redirecting to:', from);
      
      // Add a small delay to ensure auth state is fully settled
      redirectTimeoutRef.current = setTimeout(() => {
        console.log('🚀 Executing redirect to:', from);
        navigate(from, { replace: true });
      }, 100);
    } else if (isInitialized && !authLoading && (!user || !session)) {
      console.log('ℹ️ No valid authentication found on login page');
    }
  }, [user, session, navigate, authLoading, isInitialized, location.state]);

  const handleLoginAttempt = () => {
    console.log('📈 Login attempt incremented');
    setLoginAttempts(prev => prev + 1);
  };

  // Show loading while auth is initializing or if we're about to redirect
  if (!isInitialized || authLoading || (user && session && !hasRedirectedRef.current)) {
    console.log('⏳ Showing login loading state');
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
  
  console.log('📋 Rendering login form');
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
