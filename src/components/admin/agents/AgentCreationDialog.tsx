import { useState, FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCacheInvalidation } from '@/hooks/query/useCacheInvalidation';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface AgentCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AgentFormData {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  licenseNumber: string;
  territory: string;
  agentStatus: 'active' | 'inactive' | 'pending_approval';
  accessLevel: 'standard' | 'premium' | 'enterprise';
  commissionOverride?: number;
}

export function AgentCreationDialog({ open, onOpenChange }: AgentCreationDialogProps) {
  const [formData, setFormData] = useState<AgentFormData>({
    email: '',
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
    licenseNumber: '',
    territory: '',
    agentStatus: 'pending_approval',
    accessLevel: 'standard',
  });

  const { toast } = useToast();
  const { invalidateAgentManagement } = useCacheInvalidation();

  const createAgentMutation = useMutation({
    mutationFn: async (data: AgentFormData) => {
      const { data: result, error } = await supabase.rpc('create_agent_user', {
        email_param: data.email,
        first_name_param: data.firstName,
        last_name_param: data.lastName,
        company_name_param: data.companyName || null,
        phone_param: data.phone || null,
        license_number_param: data.licenseNumber || null,
        territory_param: data.territory || null,
        agent_status_param: data.agentStatus,
        access_level_param: data.accessLevel,
        commission_override_param: data.commissionOverride || null,
      });

      if (error) throw error;
      return result;
    },
    onSuccess: async () => {
      await invalidateAgentManagement();
      toast({
        title: "Agent Created",
        description: "New agent profile has been created. They can now sign up with their email.",
      });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create agent account",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      companyName: '',
      phone: '',
      licenseNumber: '',
      territory: '',
      agentStatus: 'pending_approval',
      accessLevel: 'standard',
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createAgentMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Create a new agent account with the details below
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input
                id="licenseNumber"
                value={formData.licenseNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, licenseNumber: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="territory">Territory</Label>
            <Input
              id="territory"
              value={formData.territory}
              onChange={(e) => setFormData(prev => ({ ...prev, territory: e.target.value }))}
              placeholder="e.g., California, Southwest Region"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agentStatus">Initial Status</Label>
              <Select
                value={formData.agentStatus}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, agentStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accessLevel">Access Level</Label>
              <Select
                value={formData.accessLevel}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, accessLevel: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commissionOverride">Commission Override (%)</Label>
            <Input
              id="commissionOverride"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={formData.commissionOverride || ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                commissionOverride: e.target.value ? parseFloat(e.target.value) : undefined 
              }))}
              placeholder="Leave empty for default rate"
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={createAgentMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={createAgentMutation.isPending}
            >
              {createAgentMutation.isPending ? 'Creating...' : 'Create Agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}