
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { UserRole } from '@/contexts/auth/types';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Refresh user data when mounting a protected route if we have a user but no role
    if (user && !userRole && !refreshAttempted) {
      console.log("User exists but role is missing, refreshing user data");
      setIsRefreshing(true);
      refreshUser().finally(() => {
        setRefreshAttempted(true);
        setIsRefreshing(false);
      });
    }
  }, [user, userRole, refreshUser, refreshAttempted]);

  // Debug logging
  useEffect(() => {
    console.log("PrivateRoute - Current user:", user?.id);
    console.log("PrivateRoute - Current role:", userRole);
    console.log("PrivateRoute - Allowed roles:", allowedRoles);
    console.log("PrivateRoute - Is loading:", isLoading);
    console.log("PrivateRoute - Refresh attempted:", refreshAttempted);
  }, [user, userRole, allowedRoles, isLoading, refreshAttempted]);

  // Handle retry for refresh
  const handleRetryRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUser();
      setRefreshAttempted(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show loading state while checking authentication
  if (isLoading || isRefreshing) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-carbon-green-500 mx-auto mb-4" />
          <p className="text-carbon-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    console.log("User not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Special case: if we know there should be a role but it's missing, show force-logout option
  if (allowedRoles && !userRole && refreshAttempted) {
    console.log("Role required but missing, showing force-logout option");
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertTitle className="font-medium">Authentication Issue Detected</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-4">
              Your session appears to be corrupted. Your user account exists, but your role information is missing.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={handleRetryRefresh}
                className="flex-1"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : "Try Again"}
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
