import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { useCacheInvalidation } from '@/hooks/query/useCacheInvalidation';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, RefreshCw, X, Mail, Clock, Building2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { SectionLoading } from '@/components/ui/loading-states';

interface InvitedAgent {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  created_at: string;
  expires_at: string;
  status: string;
}

export function InvitedAgentsTable() {
  const { toast } = useToast();
  const { invalidateAgentManagement } = useCacheInvalidation();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.agents.management.invited(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_invitations')
        .select('id, email, first_name, last_name, company_name, created_at, expires_at, status')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InvitedAgent[];
    }
  });

  const resendMutation = useMutation({
    mutationFn: async (invitation: InvitedAgent) => {
      const { error } = await supabase.functions.invoke('send-agent-invitation', {
        body: {
          email: invitation.email,
          firstName: invitation.first_name,
          lastName: invitation.last_name,
          companyName: invitation.company_name,
          resend: true,
        }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Invitation resent successfully" });
      invalidateAgentManagement();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to resend invitation", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('agent_invitations')
        .delete()
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Invitation cancelled" });
      invalidateAgentManagement();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to cancel invitation", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  if (isLoading) {
    return <SectionLoading title="Loading invited agents..." rows={5} className="py-12" />;
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Error loading invited agents: {error.message}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No pending invitations</h3>
        <p className="text-muted-foreground mt-1">
          Invite new agents using the "Invite Agent" button above
        </p>
      </div>
    );
  }

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Invited</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell className="font-medium">
                {invitation.first_name || invitation.last_name
                  ? `${invitation.first_name || ''} ${invitation.last_name || ''}`.trim()
                  : '—'}
              </TableCell>
              <TableCell>{invitation.email}</TableCell>
              <TableCell>
                {invitation.company_name ? (
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    {invitation.company_name}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                </div>
              </TableCell>
              <TableCell>
                {isExpired(invitation.expires_at) ? (
                  <Badge variant="destructive">Expired</Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => resendMutation.mutate(invitation)}
                      disabled={resendMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Resend Invitation
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => cancelMutation.mutate(invitation.id)}
                      disabled={cancelMutation.isPending}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel Invitation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
