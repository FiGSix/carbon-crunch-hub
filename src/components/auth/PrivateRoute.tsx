
import React from 'react';
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

  console.log('🔒 PrivateRoute check:', { 
    user: !!user, 
    userRole, 
    isLoading, 
    isInitialized,
    requiredRole, 
    adminOnly,
    allowedRoles 
  });

  // Show loading while auth is initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user || !userRole) {
    console.log('❌ User not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Check admin-only access
  if (adminOnly && userRole !== 'admin') {
    console.log('❌ Admin access required, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Check allowedRoles array (new implementation)
  if (allowedRoles && allowedRoles.length > 0) {
    const hasAllowedRole = userRole === 'admin' || allowedRoles.includes(userRole);
    if (!hasAllowedRole) {
      console.log('❌ User role not in allowed roles, redirecting to dashboard');
      return <Navigate to="/dashboard" replace />;
    }
  }

  // Check specific role requirement (backward compatibility)
  if (requiredRole) {
    const hasAccess = userRole === 'admin' || userRole === requiredRole;
    if (!hasAccess) {
      console.log('❌ Insufficient role access, redirecting to dashboard');
      return <Navigate to="/dashboard" replace />;
    }
  }

  console.log('✅ Access granted');
  return <>{children}</>;
}
