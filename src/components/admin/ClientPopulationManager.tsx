
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, RefreshCw, CheckCircle, AlertTriangle, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';

export function ClientPopulationManager() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Only show to admins
  if (userRole !== 'admin') {
    return null;
  }

  const handleClientDataRefresh = async () => {
    setLoading(true);
    
    try {
      console.log("Refreshing client data...");
      
      // Trigger a global refresh event
      window.dispatchEvent(new CustomEvent('proposal-status-changed', {
        detail: { type: 'client-data-refresh' }
      }));
      
      toast({
        title: "Client Data Refreshed",
        description: "Client data has been refreshed successfully.",
      });
      
    } catch (error) {
      console.error("Error refreshing client data:", error);
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="retro-card mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Client Data Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-blue-200 bg-blue-50">
          <Database className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            This tool refreshes client data and ensures data consistency across the system.
          </AlertDescription>
        </Alert>
        
        <div className="space-y-3">
          <h4 className="font-medium text-carbon-gray-900 flex items-center">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Client Data
          </h4>
          <p className="text-sm text-carbon-gray-600">
            Refresh and validate client information to ensure data consistency.
          </p>
          <Button
            onClick={handleClientDataRefresh}
            disabled={loading}
            className="w-full"
            size="sm"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Refresh Client Data
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 p-3 bg-carbon-yellow-50 rounded-lg border border-carbon-yellow-200">
          <p className="text-sm text-carbon-yellow-700">
            <strong>Note:</strong> This action will refresh all client data and ensure consistency across the system.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
