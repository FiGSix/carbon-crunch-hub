
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
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
          <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
          Data Management - Simplified System
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-800 font-medium mb-2">
              ✅ System Simplified Successfully
            </p>
            <p className="text-green-700 text-sm">
              The proposal creation system now uses a streamlined approach with automatic data consistency.
            </p>
          </div>
          <div className="space-y-2 text-sm text-carbon-gray-600">
            <p>• Proposals are created with correct calculations from the start</p>
            <p>• Client references are automatically managed</p>
            <p>• Portfolio-based pricing is calculated in real-time</p>
            <p>• Data correction tools are no longer needed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
