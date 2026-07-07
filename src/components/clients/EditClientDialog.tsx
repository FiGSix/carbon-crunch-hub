import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UnifiedClientService } from '@/services/unified/clients/UnifiedClientService';
import { useToast } from '@/hooks/use-toast';
import { ClientData } from '@/hooks/clients/types';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { carbonRateSetsService, CarbonRateSet } from '@/services/carbonRateSetsService';
import { supabase } from '@/integrations/supabase/client';
import { dynamicCarbonPricingService } from '@/lib/calculations/carbon/dynamicPricing';

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientData | null;
  onSuccess: () => void;
}

export function EditClientDialog({ open, onOpenChange, client, onSuccess }: EditClientDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    notes: '',
  });

  useEffect(() => {
    if (client) {
      const nameParts = client.client_name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setFormData({
        firstName,
        lastName,
        email: client.client_email || '',
        phone: '',
        companyName: client.company_name || '',
        notes: '',
      });
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setIsSubmitting(true);

    const result = await UnifiedClientService.updateClient(client.client_id, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone || undefined,
      companyName: formData.companyName || undefined,
      notes: formData.notes || undefined,
    });

    if (result.success) {
      toast({
        title: 'Client Updated',
        description: `${formData.firstName} ${formData.lastName}'s information has been updated.`,
      });
      onOpenChange(false);
      onSuccess();
    } else {
      toast({
        title: 'Update Failed',
        description: result.error || 'Failed to update client information',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client Information</DialogTitle>
          <DialogDescription>
            Update the client's contact information and details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={isSubmitting}
              rows={3}
              placeholder="Internal notes about this client..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
