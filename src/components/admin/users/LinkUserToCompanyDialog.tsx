import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface LinkUserToCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    company_name?: string | null;
  };
  onSuccess: () => void;
}

export function LinkUserToCompanyDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: LinkUserToCompanyDialogProps) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [newCompanyName, setNewCompanyName] = useState(user.company_name || '');
  const [emailDomain, setEmailDomain] = useState('');
  const [role, setRole] = useState<'member' | 'team_lead'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch companies for existing mode
  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['companies-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_name')
        .order('company_name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Extract domain suggestion
  const extractDomain = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase();
    const personalDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'me.com'];
    if (domain && !personalDomains.includes(domain)) {
      return domain;
    }
    return '';
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        toast.error('Not authenticated');
        return;
      }

      let companyId = selectedCompanyId;

      // If creating new company
      if (mode === 'new') {
        if (!newCompanyName.trim()) {
          toast.error('Company name is required');
          setIsSubmitting(false);
          return;
        }

        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            company_name: newCompanyName.trim(),
            email_domain: emailDomain.trim() || null,
            created_by: currentUser.id,
          })
          .select('id')
          .single();

        if (companyError) throw companyError;
        companyId = newCompany.id;
      } else {
        // Existing company validation
        if (!selectedCompanyId) {
          toast.error('Please select a company');
          setIsSubmitting(false);
          return;
        }
      }

      // Insert into company_members
      const { error: memberError } = await supabase
        .from('company_members')
        .insert({
          user_id: user.id,
          company_id: companyId,
          role,
          status: 'active',
          approved_by: currentUser.id,
          approved_at: new Date().toISOString(),
          invited_by: currentUser.id,
        });

      if (memberError) throw memberError;

      toast.success(
        mode === 'new'
          ? 'Company created and user linked successfully'
          : 'User linked to company successfully'
      );
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error linking user to company:', error);
      toast.error(error.message || 'Failed to link user to company');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auto-suggest domain when dialog opens
  useState(() => {
    if (open && user.email) {
      const domain = extractDomain(user.email);
      if (domain) setEmailDomain(domain);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link User to Company</DialogTitle>
          <DialogDescription>
            Link {user.first_name} {user.last_name} ({user.email}) to a company
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'existing' | 'new')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Select Existing</TabsTrigger>
            <TabsTrigger value="new">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              {loadingCompanies ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger id="company">
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.company_name}
                      </SelectItem>
                    ))
                    }
                  </SelectContent>
                </Select>
              )}
            </div>
          </TabsContent>

          <TabsContent value="new" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newCompanyName">Company Name</Label>
              <Input
                id="newCompanyName"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailDomain">Email Domain (optional)</Label>
              <Input
                id="emailDomain"
                value={emailDomain}
                onChange={(e) => setEmailDomain(e.target.value)}
                placeholder="example.com"
              />
              <p className="text-xs text-muted-foreground">
                Auto-suggested from user's email. Leave empty for generic domains.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="role">Company Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as 'member' | 'team_lead')}>
            <SelectTrigger id="role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="team_lead">Team Lead</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'new' ? 'Create & Link' : 'Link User'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
