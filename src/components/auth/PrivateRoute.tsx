
import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { UserRole } from '@/contexts/auth/types';
import { authLogger } from '@/lib/logger';
import { PageLoading } from '@/components/ui/loading-states';

interface PrivateRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  adminOnly?: boolean;
  allowedRoles?: UserRole[];
}

export function PrivateRoute({ children, requiredRole, adminOnly, allowedRoles }: PrivateRouteProps) {
  const { user, session, userRole, isLoading, isInitialized } = useAuth();
  const location = useLocation();

  // Enhanced access check with redirect protection
  const accessCheck = useMemo(() => {
    authLogger.debug('PrivateRoute access check', { 
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
    if (!isInitialized) {
      authLogger.debug('Auth still initializing, showing spinner');
      return { shouldShowLoading: true, hasAccess: false, shouldRedirect: false };
    }

    // Check for valid session first
    if (!user || !session) {
      authLogger.info('Missing user or session - redirecting to login', {
        hasUser: !!user,
        hasSession: !!session
      });
      return { shouldShowLoading: false, hasAccess: false, shouldRedirect: true };
    }

    // Validate session expiry
    if (session.expires_at && new Date(session.expires_at * 1000) <= new Date()) {
      authLogger.warn('Session expired - redirecting to login');
      return { shouldShowLoading: false, hasAccess: false, shouldRedirect: true };
    }

    // If no role requirements, allow access with basic auth
    if (!requiredRole && !adminOnly && (!allowedRoles || allowedRoles.length === 0)) {
      authLogger.debug('No role requirements, allowing access with basic auth');
      return { shouldShowLoading: false, hasAccess: true, shouldRedirect: false };
    }

    // If role is still loading but we have valid user/session, wait a bit more
    if (!userRole && isLoading) {
      authLogger.debug('Role still loading, showing loading state');
      return { shouldShowLoading: true, hasAccess: false, shouldRedirect: false };
    }

    // Check access permissions with role
    let hasAccess = true;

    // Admin always has access unless specifically denied
    if (userRole === 'admin') {
      hasAccess = true;
      authLogger.debug('Admin user granted access');
    } else {
      // Check admin-only access
      if (adminOnly) {
        hasAccess = false;
        authLogger.warn('Admin-only route denied for non-admin user');
      }

      // Check allowedRoles array
      if (allowedRoles && allowedRoles.length > 0) {
        hasAccess = allowedRoles.includes(userRole);
        authLogger.debug('Allowed roles check', { userRole, allowedRoles, hasAccess });
      }

      // Check specific role requirement
      if (requiredRole) {
        hasAccess = userRole === requiredRole;
        authLogger.debug('Required role check', { userRole, requiredRole, hasAccess });
      }
    }

    authLogger.debug('Access check completed', { hasAccess, finalUserRole: userRole });
    return { shouldShowLoading: false, hasAccess, shouldRedirect: false };
  }, [user, session, userRole, isLoading, isInitialized, requiredRole, adminOnly, allowedRoles, location.pathname]);

  // Show loading while auth is initializing
  if (accessCheck.shouldShowLoading) {
    authLogger.debug('Showing loading state');
    return (
      <PageLoading 
        title="Verifying access..."
        description="Checking your authentication status"
        minimal
      />
    );
  }

  // Redirect to login if not authenticated
  if (accessCheck.shouldRedirect) {
    authLogger.info('Redirecting to login', { from: location.pathname });
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check access permissions
  if (!accessCheck.hasAccess) {
    authLogger.warn('Insufficient permissions, redirecting to dashboard', { from: location.pathname });
    return <Navigate to="/dashboard" replace />;
  }

  authLogger.debug('Access granted with fixed RLS', { path: location.pathname });
  return <>{children}</>;
}
