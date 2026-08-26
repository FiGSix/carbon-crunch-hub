
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { LoginLayout } from '@/components/auth/LoginLayout';
import { LoginHeader } from '@/components/auth/LoginHeader';
import { LoginForm } from '@/components/auth/LoginForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, session, profile, isLoading: authLoading, isInitialized } = useAuth();
  const [loginAttempts, setLoginAttempts] = useState(0);
  
  // Check if user was logged out due to inactivity
  const logoutReason = searchParams.get('reason');
  
  // Enhanced redirect tracking with loop prevention
  const hasRedirectedRef = useRef(false);
  const lastRedirectAttemptRef = useRef<number>(0);
  
  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Allow a brief grace period for the profile (role) to resolve before redirecting,
  // so a Super Partner never lands on the generic dashboard first.
  const [roleWaitElapsed, setRoleWaitElapsed] = useState(false);
  useEffect(() => {
    if (!user || !session || profile) return;
    const t = setTimeout(() => setRoleWaitElapsed(true), 2500);
    return () => clearTimeout(t);
  }, [user, session, profile]);

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

      // Wait for the role to resolve so the landing page is correct the first time
      if (!profile && !roleWaitElapsed) {
        return;
      }

      // Validate session is not expired
      if (session.expires_at && new Date(session.expires_at * 1000) > new Date()) {
        hasRedirectedRef.current = true;
        lastRedirectAttemptRef.current = now;
        
        // Check for returnTo in URL query params first
        const searchParams = new URLSearchParams(location.search);
        const returnTo = searchParams.get('returnTo');

        // Resolve role-based default landing
        const roleDefault = roleLandingPath(profile?.role);

        const from = returnTo || location.state?.from || roleDefault;

        // Avoid redirecting to login if that's where we came from
        if (from !== '/login') {
          navigate(from, { replace: true });
        } else {
          navigate(roleDefault, { replace: true });
        }
      }
    }
  }, [user, session, profile, roleWaitElapsed, navigate, isInitialized, authLoading, location.state, location.search]);


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
      {logoutReason === 'inactivity' && (
        <Alert className="mb-6 border-amber-200 bg-amber-50 text-amber-800">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            You've been logged out after inactivity for security purposes. Simply sign in again to pick up where you left off.
          </AlertDescription>
        </Alert>
      )}
      <LoginHeader />
      <LoginForm 
        loginAttempts={loginAttempts}
        onLoginAttempt={handleLoginAttempt}
      />
    </LoginLayout>
  );
};

export default Login;
