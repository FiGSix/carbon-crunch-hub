
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export function PortfolioManagement() {
  // This is a placeholder component for portfolio management
  // Can be expanded later with actual portfolio management features
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Portfolio Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">
          Portfolio calculations are automatically handled when creating proposals.
        </p>
      </CardContent>
    </Card>
  );
}
