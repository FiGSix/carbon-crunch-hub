import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  const queryClient = useQueryClient();

  const createAgentMutation = useMutation({
    mutationFn: async (data: AgentFormData) => {
      // First create the auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        email_confirm: true,
        user_metadata: {
          first_name: data.firstName,
          last_name: data.lastName,
          company_name: data.companyName,
          role: 'agent',
        },
      });

      if (authError) throw authError;

      // Then update the profile with agent-specific data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          company_name: data.companyName,
          phone: data.phone,
          license_number: data.licenseNumber,
          territory: data.territory,
          agent_status: data.agentStatus,
          access_level: data.accessLevel,
          commission_override: data.commissionOverride || null,
          role: 'agent',
          onboarding_completed: false,
          join_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents-management'] });
      queryClient.invalidateQueries({ queryKey: ['agent-management-stats'] });
      toast({
        title: "Agent Created",
        description: "New agent account has been created successfully.",
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

  const handleSubmit = (e: React.FormEvent) => {
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