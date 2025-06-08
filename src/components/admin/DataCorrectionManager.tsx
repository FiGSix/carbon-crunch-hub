
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Database, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function DataCorrectionManager() {
  return (
    <Card className="retro-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="h-5 w-5 mr-2 text-green-600" />
          System Status - Simplified Architecture
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>System Operational</strong> - The simplified architecture is running optimally.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600 mr-2" />
              <h4 className="font-medium text-blue-900">Portfolio Calculations</h4>
            </div>
            <p className="text-blue-700 text-sm">
              Automated real-time calculation of client share percentages and agent commissions based on portfolio size.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
              <h4 className="font-medium text-green-900">Data Integrity</h4>
            </div>
            <p className="text-green-700 text-sm">
              Streamlined data flow ensures consistency across all proposal operations.
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Architecture Benefits</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Simplified proposal creation workflow</li>
            <li>• Automatic portfolio percentage calculations</li>
            <li>• Reduced complexity and maintenance overhead</li>
            <li>• Improved system reliability and performance</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
