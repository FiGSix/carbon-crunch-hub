
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, Users, RefreshCw } from 'lucide-react';
import { ClientData } from '@/hooks/useMyClients';

interface ClientsTableProps {
  clients: ClientData[];
  isLoading: boolean;
  isRefreshing?: boolean;
  error: string | null;
  isAdmin: boolean;
  onRefresh?: () => void;
}

export function ClientsTable({ 
  clients, 
  isLoading, 
  isRefreshing = false,
  error, 
  isAdmin,
  onRefresh 
}: ClientsTableProps) {
  console.log('=== ClientsTable Render ===');
  console.log('Props - Loading:', isLoading, 'Refreshing:', isRefreshing, 'Error:', error, 'Clients:', clients.length);

  if (isLoading) {
    console.log('Rendering loading state');
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clients (Loading...)
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
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex space-x-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
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

  if (clients.length === 0) {
    console.log('Rendering empty state');
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clients (0)
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

  console.log('Rendering clients table with', clients.length, 'clients');
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clients ({clients.length})
            </CardTitle>
            <CardDescription>
              {isAdmin ? 'All clients across all agents' : 'Your client relationships and project data'}
            </CardDescription>
          </div>
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
      <CardContent>
        {isRefreshing && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center text-blue-700">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              <span className="text-sm">Refreshing client data...</span>
            </div>
          </div>
        )}
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-center">Projects</TableHead>
              <TableHead className="text-center">Total MWp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.client_id} className={isRefreshing ? 'opacity-70' : ''}>
                <TableCell className="font-medium">
                  <div>
                    <p className="font-semibold">{client.client_name}</p>
                    {client.client_email && (
                      <p className="text-sm text-gray-500">{client.client_email}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {client.company_name || 'No Company'}
                </TableCell>
                <TableCell className="text-center">
                  {client.project_count}
                </TableCell>
                <TableCell className="text-center font-mono">
                  {client.total_mwp.toFixed(3)} MWp
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
