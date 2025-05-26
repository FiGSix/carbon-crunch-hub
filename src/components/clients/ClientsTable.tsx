
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Users } from 'lucide-react';
import { ClientData } from '@/hooks/useMyClients';

interface ClientsTableProps {
  clients: ClientData[];
  isLoading: boolean;
  error: string | null;
  isAdmin: boolean;
}

// Helper function to get stage color variant
const getStageVariant = (stage: string) => {
  switch (stage) {
    case 'Onboarded':
      return 'default'; // Green
    case 'Agreement':
      return 'secondary'; // Blue/gray
    case 'Proposal':
    default:
      return 'outline'; // Gray outline
  }
};

export function ClientsTable({ clients, isLoading, error, isAdmin }: ClientsTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Clients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex space-x-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-gray-900">Error loading clients</h3>
            <p className="text-gray-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-gray-900">No clients found</h3>
            <p className="text-gray-500">
              {isAdmin ? 'No clients have been added to the system yet.' : 'You haven\'t worked with any clients yet.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Clients ({clients.length})
        </CardTitle>
        <CardDescription>
          {isAdmin ? 'All clients across all agents' : 'Your client relationships and project data'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-center">Projects</TableHead>
              <TableHead className="text-center">Total MWp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Stage</TableHead>
              {isAdmin && <TableHead>Agent</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.client_id}>
                <TableCell className="font-medium">
                  <div>
                    <p className="font-semibold">{client.client_name}</p>
                    <p className="text-sm text-gray-500">{client.client_email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {client.company_name || 'No Company'}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">
                    {client.project_count}
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-mono">
                  {client.total_mwp.toFixed(3)} MWp
                </TableCell>
                <TableCell>
                  <Badge variant={client.is_registered ? "default" : "outline"}>
                    {client.is_registered ? 'Registered' : 'Contact'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getStageVariant(client.client_stage)}>
                    {client.client_stage}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    {client.agent_name}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
