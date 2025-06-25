
import React, { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { UserRole } from '@/contexts/auth/types';
import { Loader2 } from 'lucide-react';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  adminOnly?: boolean;
  allowedRoles?: UserRole[];
}

export function PrivateRoute({ children, requiredRole, adminOnly, allowedRoles }: PrivateRouteProps) {
  const { user, userRole, isLoading, isInitialized } = useAuth();
  const location = useLocation();

  // Performance optimization: Memoize access check
  const accessCheck = useMemo(() => {
    if (!isInitialized || isLoading) {
      return { shouldShowLoading: true, hasAccess: false, shouldRedirect: false };
    }

    if (!user || !userRole) {
      return { shouldShowLoading: false, hasAccess: false, shouldRedirect: true };
    }

    let hasAccess = true;

    // Check admin-only access
    if (adminOnly && userRole !== 'admin') {
      hasAccess = false;
    }

    // Check allowedRoles array
    if (allowedRoles && allowedRoles.length > 0) {
      hasAccess = userRole === 'admin' || allowedRoles.includes(userRole);
    }

    // Check specific role requirement
    if (requiredRole) {
      hasAccess = userRole === 'admin' || userRole === requiredRole;
    }

    return { shouldShowLoading: false, hasAccess, shouldRedirect: false };
  }, [user, userRole, isLoading, isInitialized, requiredRole, adminOnly, allowedRoles]);

  console.log('🔒 PrivateRoute check:', { 
    user: !!user, 
    userRole, 
    isLoading, 
    isInitialized,
    requiredRole, 
    adminOnly,
    allowedRoles,
    ...accessCheck
  });

  // Show loading while auth is initializing
  if (accessCheck.shouldShowLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (accessCheck.shouldRedirect || !user || !userRole) {
    console.log('❌ User not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check access permissions
  if (!accessCheck.hasAccess) {
    console.log('❌ Insufficient permissions, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('✅ Access granted');
  return <>{children}</>;
}
