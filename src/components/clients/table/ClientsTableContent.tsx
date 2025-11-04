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
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, RefreshCw, Zap, AlertTriangle, MoreVertical, Trash2, Edit } from 'lucide-react';
import { ClientData } from '@/hooks/clients/types';
import { useState } from 'react';
import { UnifiedClientService } from '@/services/unified/clients/UnifiedClientService';
import { useToast } from '@/hooks/use-toast';
import { EditClientDialog } from '@/components/clients/EditClientDialog';

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<ClientData | null>(null);
  const { toast } = useToast();

  const handleDeleteClick = (client: ClientData) => {
    setClientToDelete(client);
    setDeleteConfirmOpen(true);
  };

  const handleEditClick = (client: ClientData) => {
    setClientToEdit(client);
    setEditDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    
    setIsDeleting(true);
    const result = await UnifiedClientService.deleteClient(clientToDelete.client_id);
    
    if (result.success) {
      toast({
        title: 'Client Deleted',
        description: `${clientToDelete.client_name} and all associated projects have been permanently deleted.`,
      });
      setDeleteConfirmOpen(false);
      setClientToDelete(null);
      if (onRefresh) onRefresh();
    } else {
      toast({
        title: 'Delete Failed',
        description: result.error || 'Failed to delete client',
        variant: 'destructive',
      });
    }
    
    setIsDeleting(false);
  };
  
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
              {isAdmin && <TableHead>Agent</TableHead>}
              <TableHead className="text-center">Projects</TableHead>
              <TableHead className="text-center">Total MWp</TableHead>
              {isAdmin && <TableHead className="text-center">Status</TableHead>}
              <TableHead className="text-center">Actions</TableHead>
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
                {isAdmin && (
                  <TableCell>
                    {client.agent_company_name || 'N/A'}
                  </TableCell>
                )}
                <TableCell className="text-center">
                  {client.project_count}
                </TableCell>
                <TableCell className="text-center font-mono">
                  {client.total_mwp.toFixed(3)} MWp
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-center">
                    <Badge variant={client.is_active ? 'default' : 'secondary'}>
                      {client.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(client)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Client Info
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteClick(client)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Client
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{clientToDelete?.client_name}</strong> and 
              all <strong>{clientToDelete?.project_count || 0} associated project(s)</strong>. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={clientToEdit}
        onSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </Card>
  );
}
