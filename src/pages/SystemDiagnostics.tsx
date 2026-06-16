
import { useAuth } from '@/contexts/auth';
import { RoleValidator } from '@/services/unified/utils/RoleValidator';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Activity } from 'lucide-react';

/**
 * Admin-only System Diagnostics page
 * Provides system monitoring tools
 */
const SystemDiagnostics = () => {
  const { profile } = useAuth();

  if (!RoleValidator.isAdmin(profile?.role)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Alert className="max-w-md">
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              Access denied. This page is restricted to administrators only.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Diagnostics</h1>
            <p className="text-muted-foreground">
              Monitor system components and integrations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Admin Access</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              All mapping services use Mapbox. Google Maps has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Address autocomplete and geocoding are powered by the Mapbox Geocoding API via the <code>mapbox-geocode</code> edge function.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SystemDiagnostics;
