
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { user, userRole, isLoading, refreshUser } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Refresh user data when mounting a protected route
    if (user && !userRole) {
      console.log("User exists but role is missing, refreshing user data");
      refreshUser();
    }
  }, [user, userRole, refreshUser]);

  // Debug logging
  useEffect(() => {
    console.log("PrivateRoute - Current user:", user?.id);
    console.log("PrivateRoute - Current role:", userRole);
    console.log("PrivateRoute - Allowed roles:", allowedRoles);
    console.log("PrivateRoute - Is loading:", isLoading);
  }, [user, userRole, allowedRoles, isLoading]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-carbon-green-500" />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    console.log("User not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If role-specific route and user doesn't have permission
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    console.log(`User role ${userRole} not allowed, redirecting to dashboard`);
    return <Navigate to="/dashboard" replace />;
  }

  // Special case: if we know there should be a role but it's missing
  if (allowedRoles && !userRole) {
    console.log("Role required but missing, refreshing and showing loading");
    refreshUser();
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-carbon-green-500" />
      </div>
    );
  }

  // Render children if authenticated and authorized
  console.log("User authorized, rendering protected content");
  return <>{children}</>;
}
