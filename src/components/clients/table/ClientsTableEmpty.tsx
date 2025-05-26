
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, RefreshCw, Zap } from 'lucide-react';

interface ClientsTableEmptyProps {
  isAdmin: boolean;
  isRefreshing?: boolean;
  autoRefreshEnabled?: boolean;
  onRefresh?: () => void;
}

export function ClientsTableEmpty({ 
  isAdmin, 
  isRefreshing = false, 
  autoRefreshEnabled = false, 
  onRefresh 
}: ClientsTableEmptyProps) {
  console.log('Rendering empty state');
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clients (0)
            {autoRefreshEnabled && (
              <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                <Zap className="h-3 w-3" />
                Auto-updating
              </span>
            )}
          </CardTitle>
          {onRefresh && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-8">
        <div className="text-center">
          <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <h3 className="text-lg font-semibold text-gray-900">No clients found</h3>
          <p className="text-gray-500 mb-4">
            {isAdmin ? 'No clients have been added to the system yet.' : 'You haven\'t worked with any clients yet.'}
          </p>
          {onRefresh && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Check Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
