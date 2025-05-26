
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
import { Button } from '@/components/ui/button';
import { Users, RefreshCw, Zap, AlertTriangle } from 'lucide-react';
import { ClientData } from '@/hooks/useMyClients';

interface ClientsTableContentProps {
  clients: ClientData[];
  isAdmin: boolean;
  isRefreshing?: boolean;
  autoRefreshEnabled?: boolean;
  onRefresh?: () => void;
  error?: string | null;
}

export function ClientsTableContent({ 
  clients, 
  isAdmin, 
  isRefreshing = false, 
  autoRefreshEnabled = false, 
  onRefresh,
  error = null
}: ClientsTableContentProps) {
  console.log('Rendering clients table with', clients.length, 'clients');
  console.log('Error state:', error, 'Refreshing:', isRefreshing);
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Clients ({clients.length})
              {autoRefreshEnabled && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  <Zap className="h-3 w-3" />
                  Auto-updating
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {isAdmin ? 'All clients across all agents' : 'Your client relationships and project data'}
              {autoRefreshEnabled && ' • Real-time updates enabled'}
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
        {/* Show inline error notification if there's an error but we have cached data */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center text-red-700">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span className="text-sm">
                Failed to refresh: {error}
              </span>
              {onRefresh && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="ml-auto"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Retry
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Show refreshing notification */}
        {isRefreshing && !error && (
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
