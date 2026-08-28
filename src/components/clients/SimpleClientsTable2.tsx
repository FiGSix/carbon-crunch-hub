import { useState, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';

import { ClientData } from '@/hooks/clients/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { MoreHorizontal, Pencil, Percent, UserCheck, Trash2, Loader2, MailCheck, Send, Building2 } from 'lucide-react';
import { EditClientDialog } from './EditClientDialog';
import { PortfolioClientShareDialog } from './PortfolioClientShareDialog';
import { EditAssignedAgentDialog } from './EditAssignedAgentDialog';
import { ManageCompanyLinkDialog } from '@/components/admin/users/ManageCompanyLinkDialog';
import { ClientDeleter } from '@/services/unified/clients/operations/ClientDeleter';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// ── Memoized row component defined OUTSIDE parent ──
const ClientRow2 = memo(function ClientRow2({
  client,
  isAdmin,
  onEdit,
  onPortfolio,
  onReassign,
  onCompanyLink,
  onDelete,
  onVerifyEmail,
  onResendInvitation,
}: {
  client: ClientData;
  isAdmin: boolean;
  onEdit: (client: ClientData) => void;
  onPortfolio: (client: ClientData) => void;
  onReassign: (client: ClientData) => void;
  onCompanyLink: (client: ClientData) => void;
  onDelete: (client: ClientData) => void;
  onVerifyEmail: (client: ClientData) => void;
  onResendInvitation: (client: ClientData) => void;
}) {
  return (
    <tr className="border-b hover:bg-muted/30 transition-colors">
      <td className="p-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium">{client.client_name}</span>
            {isAdmin && client.has_profile === false && (
              <Badge variant="outline" className="text-xs">Prospect</Badge>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{client.client_email}</span>
        </div>
      </td>
      <td className="p-4">
        <span className="text-sm">
          {client.company_name ? (
            isAdmin && client.client_company_id ? (
              <Link
                to={`/admin/companies/${client.client_company_id}`}
                className="text-primary hover:underline"
              >
                {client.company_name}
              </Link>
            ) : (
              client.company_name
            )
          ) : (
            <span className="text-muted-foreground italic">Private</span>
          )}
        </span>
      </td>

      {isAdmin && (
        <td className="p-4">
          <span className="text-sm">
            {client.agent_company_name || <span className="text-muted-foreground italic">No Agent</span>}
          </span>
        </td>
      )}
      <td className="p-4 text-center">
        <span className="text-sm font-medium">{client.project_count}</span>
      </td>
      <td className="p-4 text-right">
        <span className="text-sm font-medium">{client.total_mwp.toFixed(2)} MWp</span>
      </td>
      <td className="p-4">
        <div className="flex justify-center">
          <Badge variant={client.is_active ? 'default' : 'secondary'}>
            {client.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </td>
      <td className="p-4">
        <div className="flex justify-center">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(client)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Client Info
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => onPortfolio(client)}>
                  <Percent className="mr-2 h-4 w-4" />
                  Company Fee % for Portfolio
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem onClick={() => onReassign(client)}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Edit Assigned Agent
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem onClick={() => onCompanyLink(client)}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Manage Company Link
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onVerifyEmail(client)}
                    disabled={!client.client_email}
                  >
                    <MailCheck className="mr-2 h-4 w-4" />
                    Verify Email Now
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onResendInvitation(client)}
                    disabled={!client.client_email}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Resend Invitation Email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(client)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Client
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
});

interface SimpleClientsTable2Props {
  clients: ClientData[];
  onRefresh: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  totalCount?: number;
  onLoadMore?: () => void;
}

export function SimpleClientsTable2({ 
  clients, 
  onRefresh,
  isLoadingMore = false,
  hasMore = false,
  totalCount = 0,
  onLoadMore
}: SimpleClientsTable2Props) {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const isAdmin = userRole === 'admin';
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [portfolioClient, setPortfolioClient] = useState<ClientData | null>(null);
  const [reassignClient, setReassignClient] = useState<ClientData | null>(null);
  const [companyLinkClient, setCompanyLinkClient] = useState<ClientData | null>(null);
  const [deleteClient, setDeleteClient] = useState<ClientData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [verifyClient, setVerifyClient] = useState<ClientData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendClient, setResendClient] = useState<ClientData | null>(null);
  const [isResending, setIsResending] = useState(false);

  // Stable callbacks
  const handleEdit = useCallback((client: ClientData) => setEditingClient(client), []);
  const handlePortfolio = useCallback((client: ClientData) => setPortfolioClient(client), []);
  const handleReassign = useCallback((client: ClientData) => setReassignClient(client), []);
  const handleCompanyLink = useCallback((client: ClientData) => setCompanyLinkClient(client), []);
  const handleDelete = useCallback((client: ClientData) => setDeleteClient(client), []);
  const handleVerifyEmail = useCallback((client: ClientData) => setVerifyClient(client), []);
  const handleResendInvitation = useCallback((client: ClientData) => setResendClient(client), []);

  const handleVerifyConfirm = async () => {
    if (!verifyClient?.client_email) return;
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-auth-verification', {
        body: { action: 'verify_user', email: verifyClient.client_email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Email verified', description: data?.message || `Email confirmed for ${verifyClient.client_email}.` });
      setVerifyClient(null);
      onRefresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Verify failed', description: err?.message || 'Could not verify email' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendConfirm = async () => {
    if (!resendClient?.client_email) return;
    setIsResending(true);
    try {
      const [firstName, ...rest] = (resendClient.client_name || '').trim().split(' ');
      const lastName = rest.join(' ') || undefined;
      const { data, error } = await supabase.functions.invoke('send-client-invitation', {
        body: { email: resendClient.client_email, firstName: firstName || undefined, lastName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Invitation sent', description: `An invitation email has been sent to ${resendClient.client_email}.` });
      setResendClient(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Send failed', description: err?.message || 'Could not send invitation' });
    } finally {
      setIsResending(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteClient) return;
    
    setIsDeleting(true);
    try {
      const result = await ClientDeleter.deleteClient(deleteClient.client_id);
      
      if (result.success) {
        toast({
          title: "Client deleted",
          description: `${deleteClient.client_name} has been permanently deleted.`,
        });
        setDeleteClient(null);
        onRefresh();
      } else {
        toast({
          variant: "destructive",
          title: "Failed to delete client",
          description: result.error || "An unexpected error occurred.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to delete client",
        description: error instanceof Error ? error.message : "An unexpected error occurred.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="border rounded-lg bg-card overflow-hidden">
        <div className="overflow-x-auto lg:overflow-visible">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-sm">Client Name</th>
                <th className="text-left p-4 font-semibold text-sm">Company</th>
                {isAdmin && <th className="text-left p-4 font-semibold text-sm">Agent</th>}
                <th className="text-center p-4 font-semibold text-sm">Projects</th>
                <th className="text-right p-4 font-semibold text-sm">Total MWp</th>
                <th className="text-center p-4 font-semibold text-sm">Status</th>
                <th className="text-center p-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-muted-foreground">
                    No clients found
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <ClientRow2
                    key={client.client_id}
                    client={client}
                    isAdmin={isAdmin}
                    onEdit={handleEdit}
                    onPortfolio={handlePortfolio}
                    onReassign={handleReassign}
                    onCompanyLink={handleCompanyLink}
                    onDelete={handleDelete}
                    onVerifyEmail={handleVerifyEmail}
                    onResendInvitation={handleResendInvitation}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {clients.length > 0 && (
          <div className="border-t p-4 flex items-center justify-between bg-muted/20">
            <div className="text-sm text-muted-foreground">
              Showing {clients.length} {totalCount > 0 ? `of ${totalCount}` : ''} client{clients.length !== 1 ? 's' : ''}
            </div>
            {hasMore && onLoadMore && (
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading...' : 'Load More'}
              </Button>
            )}
          </div>
        )}
      </div>

      <EditClientDialog
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
        client={editingClient}
        onSuccess={onRefresh}
      />

      <PortfolioClientShareDialog
        open={!!portfolioClient}
        onOpenChange={(open) => !open && setPortfolioClient(null)}
        client={portfolioClient}
        onSuccess={onRefresh}
      />

      {companyLinkClient && (
        <ManageCompanyLinkDialog
          open={!!companyLinkClient}
          onOpenChange={(open) => !open && setCompanyLinkClient(null)}
          user={{
            id: companyLinkClient.client_id,
            email: companyLinkClient.client_email,
            first_name: companyLinkClient.client_name?.split(' ')[0] ?? null,
            last_name: companyLinkClient.client_name?.split(' ').slice(1).join(' ') || null,
            company_name: companyLinkClient.company_name || null,
            company_id: companyLinkClient.client_company_id || null,
            company_type: 'client',
            role: 'client',
            source: 'client_record',
          }}
          onSuccess={onRefresh}
        />
      )}

      <EditAssignedAgentDialog
        open={!!reassignClient}
        onOpenChange={(open) => !open && setReassignClient(null)}
        client={reassignClient}
        onSuccess={onRefresh}
      />

      <AlertDialog open={!!deleteClient} onOpenChange={(open) => !open && setDeleteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteClient?.client_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!verifyClient} onOpenChange={(open) => !open && setVerifyClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manually verify this client's email?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark <strong>{verifyClient?.client_email}</strong> as confirmed,
              skipping the email verification link. The client will be able to log in immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isVerifying}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVerifyConfirm} disabled={isVerifying}>
              {isVerifying ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>) : 'Verify Email'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resendClient} onOpenChange={(open) => !open && setResendClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend invitation email?</AlertDialogTitle>
            <AlertDialogDescription>
              A new invitation email will be sent to <strong>{resendClient?.client_email}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResendConfirm} disabled={isResending}>
              {isResending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</>) : 'Send Invitation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
