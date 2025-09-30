

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, RefreshCw } from 'lucide-react';
import { TableLoading } from '@/components/ui/loading-states';

interface ClientsTableLoadingProps {
  onRefresh?: () => void;
}

export function ClientsTableLoading({ onRefresh }: ClientsTableLoadingProps) {
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
              disabled={true}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <TableLoading 
          title="Loading client data..."
          columns={4}
          rows={5}
          className="border-0 p-0"
        />
      </CardContent>
    </Card>
  );
}
