import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
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
import { Users, RefreshCw, Zap, AlertTriangle, MoreVertical, Trash2, Edit, UserCheck, ArrowUpDown, ArrowUp, ArrowDown, Search, MailCheck, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ClientData } from '@/hooks/clients/types';
import { useState, useMemo, useCallback, useDeferredValue, memo } from 'react';
import { UnifiedClientService } from '@/services/unified/clients/UnifiedClientService';
import { useToast } from '@/hooks/use-toast';
import { EditClientDialog } from '@/components/clients/EditClientDialog';
import { EditAssignedAgentDialog } from '@/components/clients/EditAssignedAgentDialog';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

// ── Memoized row component defined OUTSIDE parent to maintain stable identity ──
const ClientRow = memo(function ClientRow({
  client,
  isAdmin,
  isRefreshing,
  onEdit,
  onReassign,
  onDelete,
  onVerifyEmail,
  onResendInvitation,
}: {
  client: ClientData;
  isAdmin: boolean;
  isRefreshing: boolean;
  onEdit: (client: ClientData) => void;
  onReassign: (client: ClientData) => void;
  onDelete: (client: ClientData) => void;
  onVerifyEmail: (client: ClientData) => void;
  onResendInvitation: (client: ClientData) => void;
}) {
  return (
    <TableRow className={isRefreshing ? 'opacity-70' : ''}>
      <TableCell className="font-medium">
        <div>
          <p className="font-semibold">{client.client_name}</p>
          {client.client_email && (
            <p className="text-sm text-muted-foreground">{client.client_email}</p>
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
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(client)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Client Info
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuItem onClick={() => onReassign(client)}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Edit Assigned Agent
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onVerifyEmail(client)}
                  disabled={!client.client_email}
                >
                  <MailCheck className="h-4 w-4 mr-2" />
                  Verify Email Now
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onResendInvitation(client)}
                  disabled={!client.client_email}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Resend Invitation Email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(client)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Client
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

interface ClientsTableContentProps {
  clients: ClientData[];
  isAdmin: boolean;
  isRefreshing?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  totalCount?: number;
  autoRefreshEnabled?: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  error?: string | null;
}

export function ClientsTableContent({ 
  clients, 
  isAdmin, 
  isRefreshing = false,
  isLoadingMore = false,
  hasMore = false,
  totalCount = 0,
  autoRefreshEnabled = false, 
  onRefresh,
  onLoadMore,
  error = null
}: ClientsTableContentProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<ClientData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<ClientData | null>(null);
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [clientToReassign, setClientToReassign] = useState<ClientData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof ClientData | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [verifyConfirmOpen, setVerifyConfirmOpen] = useState(false);
  const [clientToVerify, setClientToVerify] = useState<ClientData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendConfirmOpen, setResendConfirmOpen] = useState(false);
  const [clientToResend, setClientToResend] = useState<ClientData | null>(null);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const deferredQuery = useDeferredValue(searchQuery);

  const searchIndex = useMemo(() => {
    const index = new Map<string, string>();
    for (const client of clients) {
      index.set(
        client.client_id,
        `${client.client_name || ''} ${client.client_email || ''} ${client.company_name || ''}`.toLowerCase()
      );
    }
    return index;
  }, [clients]);

  const filteredClients = useMemo(() => {
    let filtered = clients;
    if (deferredQuery.trim()) {
      const lowerSearch = deferredQuery.toLowerCase();
      filtered = clients.filter(client => 
        searchIndex.get(client.client_id)?.includes(lowerSearch)
      );
    }

    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
          return sortDirection === 'asc' ? comparison : -comparison;
        }
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          const comparison = aValue === bValue ? 0 : aValue ? 1 : -1;
          return sortDirection === 'asc' ? comparison : -comparison;
        }
        return 0;
      });
    }

    return filtered;
  }, [clients, deferredQuery, sortColumn, sortDirection, searchIndex]);

  // Stable callbacks
  const handleDeleteClick = useCallback((client: ClientData) => {
    setClientToDelete(client);
    setDeleteConfirmOpen(true);
  }, []);

  const handleEditClick = useCallback((client: ClientData) => {
    setClientToEdit(client);
    setEditDialogOpen(true);
  }, []);

  const handleReassignClick = useCallback((client: ClientData) => {
    setClientToReassign(client);
    setReassignDialogOpen(true);
  }, []);

  const handleVerifyEmailClick = useCallback((client: ClientData) => {
    setClientToVerify(client);
    setVerifyConfirmOpen(true);
  }, []);

  const handleResendInvitationClick = useCallback((client: ClientData) => {
    setClientToResend(client);
    setResendConfirmOpen(true);
  }, []);

  const handleSort = (column: keyof ClientData) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (column: keyof ClientData) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 inline opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1 inline" />
      : <ArrowDown className="h-3 w-3 ml-1 inline" />;
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
    <div className="space-y-4">
      {/* Header with title and filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">
                Clients ({filteredClients.length}{searchQuery && ` of ${clients.length}`})
              </h2>
              {autoRefreshEnabled && (
                <Badge variant="secondary" className="ml-2">
                  <Zap className="h-3 w-3 mr-1" />
                  Auto-updating
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {isAdmin ? 'All clients across all agents' : 'Your client relationships and project data'}
            </p>
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

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {deferredQuery && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Found {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} matching "{deferredQuery}"
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-sm text-primary hover:underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <div className="flex items-center text-destructive">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span className="text-sm">Failed to refresh: {error}</span>
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

      {isRefreshing && !error && (
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-md">
          <div className="flex items-center text-primary">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            <span className="text-sm">Refreshing client data...</span>
          </div>
        </div>
      )}
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('client_name')}
              >
                Client Name {renderSortIcon('client_name')}
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('company_name')}
              >
                Company {renderSortIcon('company_name')}
              </TableHead>
              {isAdmin && (
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('agent_company_name')}
                >
                  Agent {renderSortIcon('agent_company_name')}
                </TableHead>
              )}
              <TableHead 
                className="text-center cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('project_count')}
              >
                Projects {renderSortIcon('project_count')}
              </TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-muted/50 select-none"
                onClick={() => handleSort('total_mwp')}
              >
                Total MWp {renderSortIcon('total_mwp')}
              </TableHead>
              {isAdmin && (
                <TableHead 
                  className="text-center cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('is_active')}
                >
                  Status {renderSortIcon('is_active')}
                </TableHead>
              )}
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 5} className="text-center py-8 text-muted-foreground">
                  {deferredQuery ? `No clients found matching "${deferredQuery}"` : 'No clients found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredClients.map((client) => (
                <ClientRow
                  key={client.client_id}
                  client={client}
                  isAdmin={isAdmin}
                  isRefreshing={isRefreshing}
                  onEdit={handleEditClick}
                  onReassign={handleReassignClick}
                  onDelete={handleDeleteClick}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {hasMore && onLoadMore && (
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-sm text-muted-foreground">
            Showing {clients.length} of {totalCount} clients
          </p>
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}

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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
          setEditDialogOpen(false);
          if (onRefresh) onRefresh();
        }}
      />

      <EditAssignedAgentDialog
        open={reassignDialogOpen}
        onOpenChange={setReassignDialogOpen}
        client={clientToReassign}
        onSuccess={() => {
          setReassignDialogOpen(false);
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
}
