import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink, Mail, Clock, Eye, MousePointer, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

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
  updated_at: string;
  converted_at: string | null;
  converted_invitation_id: string | null;
  last_outreach_at?: string | null;
  outreach_count?: number;
}

interface LeadDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: AgentLead;
}

interface OutreachRecord {
  id: string;
  template_type: string;
  subject: string;
  sent_at: string;
  status: string;
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-green-100 text-green-700',
  converted: 'bg-purple-100 text-purple-700',
  rejected: 'bg-red-100 text-red-700',
};

const outreachStatusConfig: Record<string, { color: string; icon: React.ElementType }> = {
  sent: { color: 'bg-blue-100 text-blue-700', icon: Mail },
  delivered: { color: 'bg-green-100 text-green-700', icon: Mail },
  opened: { color: 'bg-purple-100 text-purple-700', icon: Eye },
  clicked: { color: 'bg-indigo-100 text-indigo-700', icon: MousePointer },
  bounced: { color: 'bg-red-100 text-red-700', icon: AlertCircle },
  failed: { color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

const templateLabels: Record<string, string> = {
  introduction: 'Introduction',
  follow_up_1: 'Follow-up #1',
  follow_up_2: 'Follow-up #2',
};

export function LeadDetailsDialog({ open, onOpenChange, lead }: LeadDetailsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    company_name: lead.company_name,
    contact_name: lead.contact_name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    website: lead.website || '',
    location: lead.location || '',
    source: lead.source || 'ChatGPT Research',
    notes: lead.notes || '',
    status: lead.status,
  });

  // Fetch recent outreach history
  const { data: recentOutreach } = useQuery({
    queryKey: ['lead-outreach-history', lead.id, 'recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_outreach_history')
        .select('id, template_type, subject, sent_at, status')
        .eq('lead_id', lead.id)
        .order('sent_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data as OutreachRecord[];
    },
    enabled: open,
  });

  useEffect(() => {
    setFormData({
      company_name: lead.company_name,
      contact_name: lead.contact_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      website: lead.website || '',
      location: lead.location || '',
      source: lead.source || 'ChatGPT Research',
      notes: lead.notes || '',
      status: lead.status,
    });
    setIsEditing(false);
  }, [lead]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('agent_leads')
        .update({
          company_name: formData.company_name,
          contact_name: formData.contact_name || null,
          email: formData.email || null,
          phone: formData.phone || null,
          website: formData.website || null,
          location: formData.location || null,
          source: formData.source || null,
          notes: formData.notes || null,
          status: formData.status,
        })
        .eq('id', lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Lead updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['agents', 'leads'] });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: 'Failed to update lead',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.company_name.trim()) {
      toast({
        title: 'Company name is required',
        variant: 'destructive',
      });
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{lead.company_name}</DialogTitle>
            <Badge className={statusColors[lead.status]}>
              {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
            </Badge>
          </div>
          <DialogDescription>
            Added {format(new Date(lead.created_at), 'PPP')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isEditing ? (
            <>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit_company_name">Company Name *</Label>
                  <Input
                    id="edit_company_name"
                    value={formData.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit_contact_name">Contact Name</Label>
                    <Input
                      id="edit_contact_name"
                      value={formData.contact_name}
                      onChange={(e) => handleChange('contact_name', e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit_email">Email</Label>
                    <Input
                      id="edit_email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit_phone">Phone</Label>
                    <Input
                      id="edit_phone"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit_location">Location</Label>
                    <Input
                      id="edit_location"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit_website">Website</Label>
                  <Input
                    id="edit_website"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit_source">Source</Label>
                    <Select
                      value={formData.source}
                      onValueChange={(value) => handleChange('source', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ChatGPT Research">ChatGPT Research</SelectItem>
                        <SelectItem value="Website">Website</SelectItem>
                        <SelectItem value="Referral">Referral</SelectItem>
                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                        <SelectItem value="Industry Event">Industry Event</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit_status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleChange('status', value)}
                      disabled={lead.status === 'converted'}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="qualified">Qualified</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        {lead.status === 'converted' && (
                          <SelectItem value="converted">Converted</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit_notes">Notes</Label>
                  <Textarea
                    id="edit_notes"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact</p>
                  <p>{lead.contact_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{lead.email || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p>{lead.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <p>{lead.location || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Website</p>
                {lead.website ? (
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {lead.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p>-</p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Source</p>
                <p>{lead.source || '-'}</p>
              </div>

              {lead.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap text-sm">{lead.notes}</p>
                </div>
              )}

              {lead.converted_at && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Converted</p>
                  <p>{format(new Date(lead.converted_at), 'PPP')}</p>
                </div>
              )}

              {/* Outreach History Section */}
              {recentOutreach && recentOutreach.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">Recent Outreach</p>
                    <div className="space-y-2">
                      {recentOutreach.map((outreach) => {
                        const config = outreachStatusConfig[outreach.status] || outreachStatusConfig.sent;
                        const StatusIcon = config.icon;
                        return (
                          <div
                            key={outreach.id}
                            className="flex items-center justify-between rounded-lg border p-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {templateLabels[outreach.template_type] || outreach.template_type}
                              </Badge>
                              <Badge className={`${config.color} text-xs`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {outreach.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground text-xs">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(outreach.sent_at), { addSuffix: true })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Outreach Stats */}
              {(lead.outreach_count ?? 0) > 0 && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{lead.outreach_count} email{(lead.outreach_count ?? 0) !== 1 ? 's' : ''} sent</span>
                  </div>
                  {lead.last_outreach_at && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>Last: {formatDistanceToNow(new Date(lead.last_outreach_at), { addSuffix: true })}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                Edit Lead
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
