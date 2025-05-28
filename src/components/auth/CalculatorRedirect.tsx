
import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';

interface CalculatorRedirectProps {
  children: ReactNode;
}

/**
 * Component that redirects authenticated users away from the calculator
 * to maintain it as a freemium lead generator feature
 */
export function CalculatorRedirect({ children }: CalculatorRedirectProps) {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if we're done loading and user is authenticated
    if (!isLoading && user) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  // Show loading state while checking auth
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Only render calculator for non-authenticated users
  if (user) {
    return null;
  }

  return <>{children}</>;
}
