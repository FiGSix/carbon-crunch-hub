import React from 'react';
import { useAuth } from '@/contexts/auth';
import { RoleValidator } from '@/services/unified/utils/RoleValidator';
import { GoogleMapsIntegrationTest } from '@/components/testing/GoogleMapsIntegrationTest';
import { GoogleMapsHealthMonitor } from '@/components/common/GoogleMapsHealthMonitor';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, Activity, TestTube } from 'lucide-react';

/**
 * Admin-only System Diagnostics page
 * Provides comprehensive system monitoring and testing tools
 */
const SystemDiagnostics = () => {
  const { profile } = useAuth();

  // Double-check admin access at component level
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
              Monitor and test system components and integrations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Admin Access</span>
          </div>
        </div>

        <Tabs defaultValue="health-monitor" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="health-monitor" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Health Monitor
            </TabsTrigger>
            <TabsTrigger value="integration-test" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Integration Tests
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="health-monitor" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Google Maps API Health Monitor</CardTitle>
                <CardDescription>
                  Real-time monitoring of Google Maps API status and performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GoogleMapsHealthMonitor 
                  autoRefresh={true}
                  refreshInterval={300}
                  showDetails={true}
                  compact={false}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="integration-test" className="mt-6">
            <GoogleMapsIntegrationTest />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SystemDiagnostics;