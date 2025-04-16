
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { UserRole } from '@/contexts/auth/types';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { user, userRole, isLoading, refreshUser } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Refresh user data when mounting a protected route if we have a user but no role
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

  // Special case: if we know there should be a role but it's missing, show force-logout option
  if (allowedRoles && !userRole) {
    console.log("Role required but missing, showing force-logout option");
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Authentication Issue Detected</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">
              Your session appears to be corrupted. Your user account exists, but your role information is missing.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => refreshUser()}
                className="flex-1"
              >
                Try Again
              </Button>
              <Button 
                variant="destructive"
                className="flex-1"
                asChild
              >
                <Link to="/force-logout">Force Logout</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If role-specific route and user doesn't have permission
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    console.log(`User role ${userRole} not allowed, redirecting to dashboard`);
    return <Navigate to="/dashboard" replace />;
  }

  // Render children if authenticated and authorized
  console.log("User authorized, rendering protected content");
  return <>{children}</>;
}
