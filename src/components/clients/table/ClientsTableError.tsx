
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Users, RefreshCw } from 'lucide-react';

interface ClientsTableErrorProps {
  error: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export function ClientsTableError({ error, isRefreshing = false, onRefresh }: ClientsTableErrorProps) {
  console.log('Rendering error state:', error);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clients
          </CardTitle>
          {onRefresh && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-8">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-gray-900">Error loading clients</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          {onRefresh && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Try Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
