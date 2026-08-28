import { useEffect, useState } from 'react';
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
import { Loader2, Unlink } from 'lucide-react';

export type CompanyKind = 'agent' | 'client';

export interface CompanyLinkUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name?: string | null;
  company_id?: string | null;
  company_type?: CompanyKind | null;
  role: string;
  /** 'client_record' = contact-only client with no login */
  source?: 'profile' | 'client_record';
}

interface ManageCompanyLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: CompanyLinkUser;
  onSuccess: () => void;
}

const PERSONAL_DOMAINS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'me.com'];

function extractDomain(email: string) {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain && !PERSONAL_DOMAINS.includes(domain) ? domain : '';
}

/**
 * Admin control for linking / unlinking a person to either a partner (agent)
 * company or a client company. Contact-only client records are linked through
 * clients.client_company_id; signed-up users through the membership tables.
 */
export function ManageCompanyLinkDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: ManageCompanyLinkDialogProps) {
  const isContactRecord = user.source === 'client_record';
  const defaultKind: CompanyKind = isContactRecord || user.role === 'client' ? 'client' : 'agent';

  const [companyKind, setCompanyKind] = useState<CompanyKind>(user.company_type || defaultKind);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState(user.company_name || '');
  const [emailDomain, setEmailDomain] = useState('');
  const [role, setRole] = useState<'member' | 'team_lead'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCompanyKind(user.company_type || defaultKind);
    setMode('existing');
    setSelectedCompanyId('');
    setNewCompanyName(user.company_name || '');
    setEmailDomain(extractDomain(user.email));
    setRole('member');
  }, [open, user.id]);

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['company-link-options', companyKind],
    queryFn: async () => {
      if (companyKind === 'agent') {
        const { data, error } = await supabase
          .from('companies')
          .select('id, company_name')
          .order('company_name');
        if (error) throw error;
        return data || [];
      }
      const { data, error } = await supabase
        .from('client_companies')
        .select('id, company_name')
        .order('company_name');
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const isLinked = !!user.company_id;

  const handleUnlink = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_unlink_person_from_company', {
        _person_id: user.id,
        _is_client_record: isContactRecord,
      });
      if (error) throw error;
      toast.success('Unlinked from company');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to unlink from company');
    } finally {
      setIsSubmitting(false);
    }
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

      if (mode === 'new') {
        if (!newCompanyName.trim()) {
          toast.error('Company name is required');
          return;
        }
        if (companyKind === 'agent') {
          const { data, error } = await supabase
            .from('companies')
            .insert({
              company_name: newCompanyName.trim(),
              email_domain: emailDomain.trim() || null,
              created_by: currentUser.id,
            })
            .select('id')
            .single();
          if (error) throw error;
          companyId = data.id;
        } else {
          const { data, error } = await supabase
            .from('client_companies')
            .insert({
              company_name: newCompanyName.trim(),
              email_domain: emailDomain.trim() || null,
            })
            .select('id')
            .single();
          if (error) throw error;
          companyId = data.id;
        }
      } else if (!selectedCompanyId) {
        toast.error('Please select a company');
        return;
      }

      const { error } = await supabase.rpc('admin_link_person_to_company', {
        _person_id: user.id,
        _company_id: companyId,
        _company_kind: isContactRecord ? 'client' : companyKind,
        _role: role,
        _is_client_record: isContactRecord,
      });
      if (error) throw error;

      toast.success(mode === 'new' ? 'Company created and linked' : 'Linked to company');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error linking to company:', error);
      toast.error(error.message || 'Failed to link to company');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Company Link</DialogTitle>
          <DialogDescription>
            Manage the company link for {user.first_name} {user.last_name} ({user.email})
          </DialogDescription>
        </DialogHeader>

        {isLinked && (
          <div className="flex items-center justify-between gap-3 rounded-md border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.company_name}</p>
              <p className="text-xs text-muted-foreground">
                Currently linked {user.company_type === 'client' ? 'client company' : 'partner company'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleUnlink} disabled={isSubmitting}>
              <Unlink className="h-4 w-4 mr-2" /> Unlink
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label>Company type</Label>
          <Select
            value={companyKind}
            onValueChange={(v) => {
              setCompanyKind(v as CompanyKind);
              setSelectedCompanyId('');
            }}
            disabled={isContactRecord}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agent">Partner / agent company</SelectItem>
              <SelectItem value="client">Client company</SelectItem>
            </SelectContent>
          </Select>
          {isContactRecord && (
            <p className="text-xs text-muted-foreground">
              Contact-only records can only be linked to a client company.
            </p>
          )}
        </div>

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
                    ))}
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
                Auto-suggested from the user's email. Leave empty for generic domains.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {!isContactRecord && (
          <div className="space-y-2">
            <Label htmlFor="role">Company Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'member' | 'team_lead')}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="team_lead">
                  {companyKind === 'client' ? 'Account Admin' : 'Team Lead'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'new' ? 'Create & Link' : 'Link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
