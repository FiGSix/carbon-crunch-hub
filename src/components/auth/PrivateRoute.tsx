
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
  const { user, session, userRole, isLoading, isInitialized } = useAuth();
  const location = useLocation();

  // Enhanced access check with better session validation
  const accessCheck = useMemo(() => {
    console.log('🔒 PrivateRoute access check:', { 
      hasUser: !!user,
      hasSession: !!session, 
      userRole,
      isLoading, 
      isInitialized,
      requiredRole, 
      adminOnly,
      allowedRoles
    });

    // Still loading/initializing
    if (!isInitialized || isLoading) {
      console.log('⏳ Auth still initializing or loading');
      return { shouldShowLoading: true, hasAccess: false, shouldRedirect: false };
    }

    // CRITICAL: Check for both user AND session (not just user)
    if (!user || !session) {
      console.log('❌ Missing user or session - redirecting to login');
      return { shouldShowLoading: false, hasAccess: false, shouldRedirect: true };
    }

    // If we have user and session but no role yet, show loading
    // This handles the case where profile is still loading
    if (!userRole) {
      console.log('⏳ User authenticated but profile/role still loading');
      return { shouldShowLoading: true, hasAccess: false, shouldRedirect: false };
    }

    // Check access permissions once we have role
    let hasAccess = true;

    // Admin always has access unless specifically denied
    if (userRole === 'admin') {
      hasAccess = true;
    } else {
      // Check admin-only access
      if (adminOnly) {
        hasAccess = false;
      }

      // Check allowedRoles array
      if (allowedRoles && allowedRoles.length > 0) {
        hasAccess = allowedRoles.includes(userRole);
      }

      // Check specific role requirement
      if (requiredRole) {
        hasAccess = userRole === requiredRole;
      }
    }

    console.log('✅ Access check completed:', { hasAccess });
    return { shouldShowLoading: false, hasAccess, shouldRedirect: false };
  }, [user, session, userRole, isLoading, isInitialized, requiredRole, adminOnly, allowedRoles]);

  // Show loading while auth is initializing or profile is loading
  if (accessCheck.shouldShowLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (accessCheck.shouldRedirect) {
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
