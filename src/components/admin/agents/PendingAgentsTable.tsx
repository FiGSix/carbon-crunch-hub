import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { useCacheInvalidation } from '@/hooks/query/useCacheInvalidation';
import { useToast } from '@/hooks/use-toast';
import { createNotification } from '@/services/notificationService';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Check, X, Clock, Building2, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { SectionLoading } from '@/components/ui/loading-states';

interface PendingAgent {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  join_date: string | null;
  created_at: string;
}

export function PendingAgentsTable() {
  const { toast } = useToast();
  const { invalidateAgentManagement } = useCacheInvalidation();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.agents.management.pending(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, company_name, join_date, created_at')
        .eq('role', 'agent')
        .eq('agent_status', 'pending_approval')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PendingAgent[];
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ agentId, status, agentEmail, agentFirstName }: { 
      agentId: string; 
      status: 'active' | 'suspended';
      agentEmail: string;
      agentFirstName?: string;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ agent_status: status })
        .eq('id', agentId);

      if (error) throw error;

      // Send notification and email if approved
      if (status === 'active') {
        await createNotification({
          userId: agentId,
          title: 'Account Approved!',
          message: 'Your agent account has been approved. You can now start creating proposals and managing clients.',
          type: 'success',
          relatedType: 'agent_approval',
          relatedId: agentId
        });

        // Send approval email
        try {
          const { error: emailError } = await supabase.functions.invoke('send-agent-approval-email', {
            body: {
              agentId,
              agentEmail,
              agentFirstName,
            },
          });

          if (emailError) {
            console.error('Failed to send approval email:', emailError);
            // Don't throw - approval succeeded, email is secondary
          }
        } catch (emailErr) {
          console.error('Error invoking approval email function:', emailErr);
        }
      }
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: variables.status === 'active' ? "Agent approved" : "Agent rejected",
        description: variables.status === 'active' 
          ? "The agent has been notified and can now access the platform."
          : "The agent account has been suspended."
      });
      invalidateAgentManagement();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Action failed", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  if (isLoading) {
    return <SectionLoading title="Loading pending agents..." rows={5} className="py-12" />;
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Error loading pending agents: {error.message}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No agents pending approval</h3>
        <p className="text-muted-foreground mt-1">
          All agent applications have been processed
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((agent) => (
            <TableRow key={agent.id}>
              <TableCell className="font-medium">
                {agent.first_name || agent.last_name
                  ? `${agent.first_name || ''} ${agent.last_name || ''}`.trim()
                  : '—'}
              </TableCell>
              <TableCell>{agent.email}</TableCell>
              <TableCell>
                {agent.company_name ? (
                  <div className="flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    {agent.company_name}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {format(new Date(agent.join_date || agent.created_at), 'MMM d, yyyy')}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => updateStatusMutation.mutate({ 
                        agentId: agent.id, 
                        status: 'active',
                        agentEmail: agent.email,
                        agentFirstName: agent.first_name || undefined
                      })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve Agent
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => updateStatusMutation.mutate({ 
                        agentId: agent.id, 
                        status: 'suspended',
                        agentEmail: agent.email
                      })}
                      disabled={updateStatusMutation.isPending}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject Agent
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
