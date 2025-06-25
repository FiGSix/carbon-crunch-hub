
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

  // Enhanced access check with fallback role handling
  const accessCheck = useMemo(() => {
    console.log('🔒 PrivateRoute access check with fixed RLS:', { 
      hasUser: !!user,
      hasSession: !!session, 
      userRole,
      isLoading, 
      isInitialized,
      requiredRole, 
      adminOnly,
      allowedRoles,
      currentPath: location.pathname
    });

    // Still loading/initializing - show loading state
    if (!isInitialized || isLoading) {
      console.log('⏳ Auth still initializing or loading, showing spinner');
      return { shouldShowLoading: true, hasAccess: false, shouldRedirect: false };
    }

    // Check for both user AND session
    if (!user || !session) {
      console.log('❌ Missing user or session - will redirect to login', {
        hasUser: !!user,
        hasSession: !!session,
        userEmail: user?.email || 'none'
      });
      return { shouldShowLoading: false, hasAccess: false, shouldRedirect: true };
    }

    // If no role requirements, allow access with basic auth
    if (!requiredRole && !adminOnly && (!allowedRoles || allowedRoles.length === 0)) {
      console.log('🔓 No role requirements, allowing access with basic auth');
      return { shouldShowLoading: false, hasAccess: true, shouldRedirect: false };
    }

    // If role is still loading but we have user/session, wait a bit more
    if (!userRole) {
      console.log('⚠️ Role still loading, showing loading state');
      return { shouldShowLoading: true, hasAccess: false, shouldRedirect: false };
    }

    // Check access permissions with role
    let hasAccess = true;

    // Admin always has access unless specifically denied
    if (userRole === 'admin') {
      hasAccess = true;
      console.log('👑 Admin user granted access');
    } else {
      // Check admin-only access
      if (adminOnly) {
        hasAccess = false;
        console.log('🚫 Admin-only route denied for non-admin user');
      }

      // Check allowedRoles array
      if (allowedRoles && allowedRoles.length > 0) {
        hasAccess = allowedRoles.includes(userRole);
        console.log('📋 Allowed roles check:', { userRole, allowedRoles, hasAccess });
      }

      // Check specific role requirement
      if (requiredRole) {
        hasAccess = userRole === requiredRole;
        console.log('🎯 Required role check:', { userRole, requiredRole, hasAccess });
      }
    }

    console.log('✅ Access check completed with fixed RLS:', { hasAccess, finalUserRole: userRole });
    return { shouldShowLoading: false, hasAccess, shouldRedirect: false };
  }, [user, session, userRole, isLoading, isInitialized, requiredRole, adminOnly, allowedRoles, location.pathname]);

  // Show loading while auth is initializing
  if (accessCheck.shouldShowLoading) {
    console.log('🔄 Showing loading state');
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (accessCheck.shouldRedirect) {
    console.log('🔄 Redirecting to login from:', location.pathname);
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check access permissions
  if (!accessCheck.hasAccess) {
    console.log('🚫 Insufficient permissions, redirecting to dashboard from:', location.pathname);
    return <Navigate to="/dashboard" replace />;
  }

  console.log('✅ Access granted with fixed RLS for path:', location.pathname);
  return <>{children}</>;
}
