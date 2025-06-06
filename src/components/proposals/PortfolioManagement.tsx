
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { usePortfolioUpdates } from '@/hooks/proposals/usePortfolioUpdates';
import { useAuth } from '@/contexts/auth';

export function PortfolioManagement() {
  const { userRole } = useAuth();
  const { updateClientPortfolio, validatePortfolios, loading } = usePortfolioUpdates();
  const [clientId, setClientId] = useState('');

  // Only show to agents and admins
  if (userRole !== 'agent' && userRole !== 'admin') {
    return null;
  }

  const handleUpdateSinglePortfolio = async () => {
    if (!clientId.trim()) return;
    await updateClientPortfolio(clientId.trim());
    setClientId('');
  };

  const handleValidateAll = async () => {
    await validatePortfolios();
  };

  return (
    <Card className="retro-card mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <RefreshCw className="h-5 w-5 mr-2" />
          Portfolio Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Single Portfolio Update */}
          <div className="space-y-3">
            <h4 className="font-medium text-carbon-gray-900">Update Single Portfolio</h4>
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                placeholder="Enter client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={loading}
              />
              <Button
                onClick={handleUpdateSinglePortfolio}
                disabled={loading || !clientId.trim()}
                className="w-full"
                size="sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Update Portfolio
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Global Portfolio Validation */}
          <div className="space-y-3">
            <h4 className="font-medium text-carbon-gray-900">Global Portfolio Validation</h4>
            <p className="text-sm text-carbon-gray-600">
              Validate and fix portfolio percentage inconsistencies across all clients.
            </p>
            <Button
              onClick={handleValidateAll}
              disabled={loading}
              variant="outline"
              className="w-full"
              size="sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Validate All Portfolios
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-carbon-yellow-50 rounded-lg border border-carbon-yellow-200">
          <p className="text-sm text-carbon-yellow-700">
            <strong>Note:</strong> Portfolio updates recalculate client share percentages based on the total portfolio size across all projects for each client.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
