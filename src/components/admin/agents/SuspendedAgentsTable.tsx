import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { useCacheInvalidation } from '@/hooks/query/useCacheInvalidation';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, RefreshCw, Building2, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { SectionLoading } from '@/components/ui/loading-states';

interface SuspendedAgent {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  status_changed_at: string | null;
  notes: string | null;
}

export function SuspendedAgentsTable() {
  const { toast } = useToast();
  const { invalidateAgentManagement } = useCacheInvalidation();

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.agents.management.suspended(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, company_name, status_changed_at, notes')
        .eq('role', 'agent')
        .eq('agent_status', 'suspended')
        .order('status_changed_at', { ascending: false });

      if (error) throw error;
      return data as SuspendedAgent[];
    }
  });

  const reactivateMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ agent_status: 'active', status_changed_at: new Date().toISOString() })
        .eq('id', agentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Agent reactivated successfully" });
      invalidateAgentManagement();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to reactivate agent", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  if (isLoading) {
    return <SectionLoading title="Loading suspended agents..." rows={5} className="py-12" />;
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Error loading suspended agents: {error.message}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No suspended agents</h3>
        <p className="text-muted-foreground mt-1">
          All agents are in good standing
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
            <TableHead>Suspended On</TableHead>
            <TableHead>Notes</TableHead>
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
                {agent.status_changed_at ? (
                  format(new Date(agent.status_changed_at), 'MMM d, yyyy')
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {agent.notes ? (
                  <span className="text-sm truncate max-w-[200px] block" title={agent.notes}>
                    {agent.notes}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
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
                      onClick={() => reactivateMutation.mutate(agent.id)}
                      disabled={reactivateMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reactivate Agent
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
