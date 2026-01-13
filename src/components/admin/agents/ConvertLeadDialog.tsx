import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlus, AlertCircle } from 'lucide-react';

interface AgentLead {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  location: string | null;
  source: string | null;
  notes: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  created_at: string;
}

interface ConvertLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: AgentLead;
}

export function ConvertLeadDialog({ open, onOpenChange, lead }: ConvertLeadDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Parse first/last name from contact_name
  const parseContactName = (fullName: string | null) => {
    if (!fullName) return { firstName: '', lastName: '' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return { firstName: parts[0], lastName: '' };
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
    };
  };

  const { firstName: initialFirstName, lastName: initialLastName } = parseContactName(lead.contact_name);

  const [formData, setFormData] = useState({
    email: lead.email || '',
    first_name: initialFirstName,
    last_name: initialLastName,
    company_name: lead.company_name,
  });

  useEffect(() => {
    const { firstName, lastName } = parseContactName(lead.contact_name);
    setFormData({
      email: lead.email || '',
      first_name: firstName,
      last_name: lastName,
      company_name: lead.company_name,
    });
  }, [lead]);

  const convertMutation = useMutation({
    mutationFn: async () => {
      // Create the invitation via edge function
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke(
        'send-agent-invitation',
        {
          body: {
            email: formData.email,
            firstName: formData.first_name,
            lastName: formData.last_name,
            companyName: formData.company_name,
          },
        }
      );

      if (inviteError) throw inviteError;
      if (inviteData?.error) throw new Error(inviteData.error);

      // Get the invitation ID
      const { data: invitation } = await supabase
        .from('agent_invitations')
        .select('id')
        .eq('email', formData.email.toLowerCase().trim())
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Update the lead status to converted
      const { error: updateError } = await supabase
        .from('agent_leads')
        .update({
          status: 'converted',
          converted_at: new Date().toISOString(),
          converted_invitation_id: invitation?.id || null,
        })
        .eq('id', lead.id);

      if (updateError) throw updateError;

      return inviteData;
    },
    onSuccess: () => {
      toast({
        title: 'Lead converted successfully',
        description: 'An invitation has been sent to the agent.',
      });
      queryClient.invalidateQueries({ queryKey: ['agents', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['agents', 'management', 'tab-counts'] });
      queryClient.invalidateQueries({ queryKey: ['agents', 'invitations'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to convert lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      toast({
        title: 'Email is required',
        description: 'Please provide an email address for the invitation.',
        variant: 'destructive',
      });
      return;
    }

    convertMutation.mutate();
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convert to Agent Invitation
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join as an agent
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!lead.email && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This lead doesn't have an email address. Please add one to send the invitation.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="convert_email">Email *</Label>
              <Input
                id="convert_email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="agent@company.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="convert_first_name">First Name</Label>
                <Input
                  id="convert_first_name"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  placeholder="John"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="convert_last_name">Last Name</Label>
                <Input
                  id="convert_last_name"
                  value={formData.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  placeholder="Smith"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="convert_company">Company Name</Label>
              <Input
                id="convert_company"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="Solar Solutions SA"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={convertMutation.isPending}>
              {convertMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
