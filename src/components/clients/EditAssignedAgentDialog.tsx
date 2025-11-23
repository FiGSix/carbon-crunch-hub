import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnifiedClientService } from '@/services/unified/clients/UnifiedClientService';
import { useToast } from '@/hooks/use-toast';
import { ClientData } from '@/hooks/clients/types';
import { Loader2, UserCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EditAssignedAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientData | null;
  onSuccess: () => void;
}

interface Agent {
  id: string;
  email: string;
  name: string;
  company: string;
}

export function EditAssignedAgentDialog({ open, onOpenChange, client, onSuccess }: EditAssignedAgentDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAgents();
      if (client?.agent_id) {
        setSelectedAgentId(client.agent_id);
      }
    }
  }, [open, client?.agent_id]);

  const fetchAgents = async () => {
    setIsLoadingAgents(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, company_name')
      .eq('role', 'agent')
      .eq('agent_status', 'active')
      .order('first_name');
    
    if (!error && data) {
      setAgents(data.map(a => ({
        id: a.id,
        email: a.email,
        name: `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'Unknown',
        company: a.company_name || 'No Company'
      })));
    } else if (error) {
      toast({
        title: 'Error Loading Agents',
        description: 'Could not fetch active agents',
        variant: 'destructive',
      });
    }
    setIsLoadingAgents(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client || !selectedAgentId) return;

    if (selectedAgentId === client.agent_id) {
      toast({
        title: 'No Change',
        description: 'The selected agent is already assigned to this client.',
      });
      return;
    }

    setIsSubmitting(true);

    const result = await UnifiedClientService.updateClient(client.client_id, {
      createdBy: selectedAgentId,
    });

    if (result.success) {
      const newAgent = agents.find(a => a.id === selectedAgentId);
      toast({
        title: 'Agent Reassigned',
        description: `${client.client_name} is now assigned to ${newAgent?.name || 'the selected agent'}.`,
      });
      onOpenChange(false);
      onSuccess();
    } else {
      toast({
        title: 'Reassignment Failed',
        description: result.error || 'Failed to reassign agent',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  const currentAgent = agents.find(a => a.id === client?.agent_id);
  const newAgent = agents.find(a => a.id === selectedAgentId);
  const isChanging = selectedAgentId && selectedAgentId !== client?.agent_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Edit Assigned Agent
          </DialogTitle>
          <DialogDescription>
            Reassign this client to a different agent. This will transfer ownership and responsibility.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-muted/50 p-3 rounded-md space-y-1">
            <div className="text-sm font-medium">Client</div>
            <div className="text-sm text-muted-foreground">{client?.client_name}</div>
            <div className="text-xs text-muted-foreground">{client?.client_email}</div>
          </div>

          {client?.agent_id && (
            <div className="space-y-2">
              <Label>Current Agent</Label>
              <div className="bg-muted/30 p-3 rounded-md">
                <div className="text-sm font-medium">{currentAgent?.name || 'Unknown'}</div>
                <div className="text-xs text-muted-foreground">{currentAgent?.email || client.agent_company_name}</div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="agent">New Agent *</Label>
            <Select
              value={selectedAgentId}
              onValueChange={setSelectedAgentId}
              disabled={isSubmitting || isLoadingAgents}
            >
              <SelectTrigger id="agent">
                <SelectValue placeholder={isLoadingAgents ? "Loading agents..." : "Select an agent"} />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{agent.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {agent.email} • {agent.company}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isChanging && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-800">
                <strong>Important:</strong> This will reassign all proposals and projects from{' '}
                <span className="font-medium">{currentAgent?.name}</span> to{' '}
                <span className="font-medium">{newAgent?.name}</span> for this client.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedAgentId || !isChanging}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reassign Agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
