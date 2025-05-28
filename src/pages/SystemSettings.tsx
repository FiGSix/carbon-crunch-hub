
import React from "react";
import { useAuth } from "@/contexts/auth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CarbonPriceManager } from "@/components/admin/CarbonPriceManager";
import { Skeleton } from "@/components/ui/skeleton";

export default function SystemSettings() {
  const { profile, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Redirect non-admin users
  if (!profile || profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-carbon-gray-900">System Settings</h1>
          <p className="text-carbon-gray-600 mt-2">
            Manage system-wide configuration and pricing
          </p>
        </div>

        <div className="grid gap-6">
          <CarbonPriceManager />
          
          {/* Placeholder for future settings */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Settings</CardTitle>
              <CardDescription>
                More system settings will be available here in the future
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-carbon-gray-500">
                Additional configuration options coming soon...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
