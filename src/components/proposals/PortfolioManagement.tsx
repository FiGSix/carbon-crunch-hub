
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export function PortfolioManagement() {
  return (
    <Card className="retro-card mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
          Portfolio Management - Simplified System
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-medium mb-2">
              ✅ Portfolio calculations are handled automatically
            </p>
            <p className="text-green-700 text-sm">
              Client share percentages and agent commissions are calculated in real-time based on portfolio size.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
