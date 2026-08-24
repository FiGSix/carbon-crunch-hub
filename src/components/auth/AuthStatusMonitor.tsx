import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export function AuthStatusMonitor() {
  const { session, user, userRole, authError, refreshAuth, isInitialized } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAuth();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Never render anything on the public signing page — clients must not see
  // developer diagnostics or auth chrome while reviewing a legal agreement.
  const isPublicSigningPage =
    typeof window !== 'undefined' && /^\/proposals\/[^/]+\/accept/.test(window.location.pathname);

  // Only show debug info in development, but always show auth errors
  const showDebugInfo = import.meta.env.DEV;

  if (isPublicSigningPage || (!authError && !showDebugInfo)) {
    return null;
  }

  const sessionValid = session && session.expires_at && new Date(session.expires_at * 1000) > new Date();

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm hidden sm:block">
      {authError && (
        <Alert variant="destructive" className="mb-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{authError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="ml-2"
            >
              {isRefreshing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {showDebugInfo && (
        <div className="bg-background border rounded-lg p-3 shadow-lg text-xs space-y-2">
          <div className="font-semibold text-foreground">Auth Status</div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>Initialized:</span>
              <Badge variant={isInitialized ? "default" : "secondary"}>
                {isInitialized ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {isInitialized ? 'Yes' : 'No'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span>Session:</span>
              <Badge variant={sessionValid ? "default" : "destructive"}>
                {sessionValid ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {sessionValid ? 'Valid' : 'Invalid'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span>User:</span>
              <Badge variant={user ? "default" : "secondary"}>
                {user ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {user ? 'Loaded' : 'None'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span>Role:</span>
              <Badge variant={userRole ? "default" : "secondary"}>
                {userRole || 'None'}
              </Badge>
            </div>

            {session?.expires_at && (
              <div className="text-muted-foreground">
                Expires: {new Date(session.expires_at * 1000).toLocaleTimeString()}
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full"
          >
            {isRefreshing ? (
              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Refresh Auth
          </Button>
        </div>
      )}
    </div>
  );
}