
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from 'lucide-react';
import { useAuth } from '@/contexts/auth';

export function DataCorrectionManager() {
  const { userRole } = useAuth();

  // Only show to admins
  if (userRole !== 'admin') {
    return null;
  }

  return (
    <Card className="retro-card mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Data Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-carbon-gray-600 mb-4">
            The proposal creation system has been simplified. Complex data correction tools have been removed in favor of a streamlined approach.
          </p>
          <p className="text-sm text-carbon-gray-500">
            New proposals will automatically have correct calculations and client references.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
