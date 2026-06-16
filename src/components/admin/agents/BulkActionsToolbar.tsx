import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCacheInvalidation } from '@/hooks/query/useCacheInvalidation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { CheckSquare, Users, Trash2, UserCheck, UserX, AlertTriangle } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedAgents: string[];
  onClearSelection: () => void;
  totalAgents: number;
}

export function BulkActionsToolbar({ 
  selectedAgents, 
  onClearSelection, 
  totalAgents 
}: BulkActionsToolbarProps) {
  const [bulkAction, setBulkAction] = useState<string>('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const { invalidateAgentManagement } = useCacheInvalidation();

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ action, agentIds }: { action: string; agentIds: string[] }) => {
      let updateData: any = {};
      
      switch (action) {
        case 'activate':
          updateData = { agent_status: 'active' };
          break;
        case 'deactivate':
          updateData = { agent_status: 'inactive' };
          break;
        case 'suspend':
          updateData = { agent_status: 'suspended' };
          break;
        case 'pending':
          updateData = { agent_status: 'pending_approval' };
          break;
        case 'delete':
          // Hard delete via delete-user edge function
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('No active session');
          
          // Delete each agent permanently
          const deleteResults = await Promise.allSettled(
            agentIds.map(async (agentId) => {
              const { data, error } = await supabase.functions.invoke('delete-user', {
                body: { userId: agentId },
                headers: {
                  Authorization: `Bearer ${session.access_token}`
                }
              });
              
              if (error) throw new Error(error.message);
              if (!data?.success) throw new Error(data?.error || 'Delete failed');
              return data;
            })
          );
          
          // Check for any failures
          const failures = deleteResults.filter(r => r.status === 'rejected');
          if (failures.length > 0) {
            throw new Error(`Failed to delete ${failures.length} agent(s)`);
          }
          return;
        default:
          throw new Error('Invalid bulk action');
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .in('id', agentIds);

      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateAgentManagement();
      
      const actionLabels = {
        activate: 'activated',
        deactivate: 'deactivated',
        suspend: 'suspended',
        pending: 'marked as pending',
        delete: 'deleted'
      };
      
      toast({
        title: "Bulk Action Completed",
        description: `Successfully ${actionLabels[bulkAction as keyof typeof actionLabels]} ${selectedAgents.length} agent(s).`,
      });
      
      onClearSelection();
      setBulkAction('');
      setIsConfirmDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Action Failed",
        description: error.message || "Failed to perform bulk action",
        variant: "destructive",
      });
    }
  });

  const handleBulkAction = () => {
    if (!bulkAction || selectedAgents.length === 0) return;
    
    setIsConfirmDialogOpen(true);
  };

  const confirmBulkAction = () => {
    bulkUpdateMutation.mutate({
      action: bulkAction,
      agentIds: selectedAgents
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'activate': return <UserCheck className="h-4 w-4" />;
      case 'deactivate': return <UserX className="h-4 w-4" />;
      case 'suspend': return <AlertTriangle className="h-4 w-4" />;
      case 'pending': return <Users className="h-4 w-4" />;
      case 'delete': return <Trash2 className="h-4 w-4" />;
      default: return null;
    }
  };

  const getActionDescription = () => {
    const count = selectedAgents.length;
    switch (bulkAction) {
      case 'activate': 
        return `This will set ${count} agent(s) status to Active, allowing them full access to the system.`;
      case 'deactivate': 
        return `This will set ${count} agent(s) status to Inactive, preventing them from accessing the system.`;
      case 'suspend': 
        return `This will suspend ${count} agent(s), temporarily blocking their access.`;
      case 'pending': 
        return `This will mark ${count} agent(s) as Pending Approval, requiring admin review.`;
      case 'delete': 
        return `This will PERMANENTLY delete ${count} agent(s). Their login will be revoked and they will no longer have access. This action cannot be undone.`;
      default: 
        return '';
    }
  };

  if (selectedAgents.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="font-medium">
            {selectedAgents.length} of {totalAgents} agents selected
          </span>
          <Badge variant="secondary">
            {selectedAgents.length}
          </Badge>
        </div>
        
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Clear Selection
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Select value={bulkAction} onValueChange={setBulkAction}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Choose bulk action..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="activate">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Activate Agents
              </div>
            </SelectItem>
            <SelectItem value="deactivate">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4" />
                Deactivate Agents
              </div>
            </SelectItem>
            <SelectItem value="suspend">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Suspend Agents
              </div>
            </SelectItem>
            <SelectItem value="pending">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Mark as Pending
              </div>
            </SelectItem>
            <SelectItem value="delete">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Agents
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button 
              onClick={handleBulkAction}
              disabled={!bulkAction || bulkUpdateMutation.isPending}
              variant={bulkAction === 'delete' ? 'destructive' : 'default'}
            >
              {getActionIcon(bulkAction)}
              {bulkUpdateMutation.isPending ? 'Processing...' : 'Apply Action'}
            </Button>
          </AlertDialogTrigger>
          
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Confirm Bulk Action
              </AlertDialogTitle>
              <AlertDialogDescription>
                {getActionDescription()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmBulkAction}
                className={bulkAction === 'delete' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
              >
                {bulkAction === 'delete' ? 'Permanently Delete' : 'Confirm Action'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}