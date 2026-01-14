import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Sparkles, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Lead {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
}

interface SendOutreachDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: Lead[];
  onComplete?: () => void;
}

type TemplateType = 'introduction' | 'follow_up_1' | 'follow_up_2';

const templateLabels: Record<TemplateType, string> = {
  introduction: 'Introduction Email',
  follow_up_1: 'Follow-up #1 (3 days)',
  follow_up_2: 'Follow-up #2 (7 days)',
};

const templateDescriptions: Record<TemplateType, string> = {
  introduction: 'Initial outreach introducing CrunchCarbon partnership opportunity',
  follow_up_1: 'First follow-up for leads who haven\'t responded',
  follow_up_2: 'Final follow-up with simple "reply interested" CTA',
};

export function SendOutreachDialog({ open, onOpenChange, leads, onComplete }: SendOutreachDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [templateType, setTemplateType] = useState<TemplateType>('introduction');
  const [useAiPersonalization, setUseAiPersonalization] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ leadId: string; success: boolean; error?: string }[] | null>(null);

  const leadsWithEmail = leads.filter(lead => lead.email);
  const leadsWithoutEmail = leads.filter(lead => !lead.email);

  const sendMutation = useMutation({
    mutationFn: async () => {
      const leadIds = leadsWithEmail.map(lead => lead.id);
      
      const { data, error } = await supabase.functions.invoke('send-cold-outreach', {
        body: {
          leadIds,
          templateType,
          useAiPersonalization,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setResults(data.results);
      const successCount = data.results.filter((r: { success: boolean }) => r.success).length;
      toast({
        title: 'Outreach Complete',
        description: `Successfully sent ${successCount} of ${leadsWithEmail.length} emails`,
      });
      queryClient.invalidateQueries({ queryKey: ['agents', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-outreach-history'] });
      onComplete?.();
    },
    onError: (error) => {
      toast({
        title: 'Failed to send outreach',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsSending(false);
      setProgress(100);
    },
  });

  const handleSend = () => {
    if (leadsWithEmail.length === 0) {
      toast({
        title: 'No valid leads',
        description: 'None of the selected leads have email addresses',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    setProgress(0);
    setResults(null);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + 10;
      });
    }, 500);

    sendMutation.mutate();
  };

  const handleClose = () => {
    if (!isSending) {
      setResults(null);
      setProgress(0);
      onOpenChange(false);
    }
  };

  const getLeadResult = (leadId: string) => {
    return results?.find(r => r.leadId === leadId);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Cold Outreach
          </DialogTitle>
          <DialogDescription>
            Send introduction emails to potential agent partners
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recipients */}
          <div className="space-y-2">
            <Label>Recipients</Label>
            <ScrollArea className="h-[120px] rounded-md border p-3">
              <div className="flex flex-wrap gap-2">
                {leads.map(lead => {
                  const result = getLeadResult(lead.id);
                  const hasEmail = Boolean(lead.email);
                  
                  return (
                    <Badge
                      key={lead.id}
                      variant={hasEmail ? 'secondary' : 'outline'}
                      className={`flex items-center gap-1 ${
                        result?.success ? 'bg-green-100 text-green-700' : 
                        result && !result.success ? 'bg-red-100 text-red-700' :
                        !hasEmail ? 'opacity-50' : ''
                      }`}
                    >
                      {result?.success && <CheckCircle2 className="h-3 w-3" />}
                      {result && !result.success && <X className="h-3 w-3" />}
                      {lead.company_name}
                      {!hasEmail && ' (no email)'}
                    </Badge>
                  );
                })}
              </div>
            </ScrollArea>
            <p className="text-sm text-muted-foreground">
              {leadsWithEmail.length} leads with email
              {leadsWithoutEmail.length > 0 && `, ${leadsWithoutEmail.length} without email (will be skipped)`}
            </p>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label htmlFor="template">Email Template</Label>
            <Select
              value={templateType}
              onValueChange={(value) => setTemplateType(value as TemplateType)}
              disabled={isSending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(templateLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {templateDescriptions[templateType]}
            </p>
          </div>

          {/* AI Personalization Toggle */}
          {templateType === 'introduction' && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <Label htmlFor="ai-personalization" className="font-medium">
                    AI Personalization
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI will analyze each company to add a personalized opening sentence
                </p>
              </div>
              <Switch
                id="ai-personalization"
                checked={useAiPersonalization}
                onCheckedChange={setUseAiPersonalization}
                disabled={isSending}
              />
            </div>
          )}

          {/* Progress */}
          {isSending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Sending emails...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results Summary */}
          {results && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="font-medium">
                  {results.filter(r => r.success).length} sent successfully
                </span>
              </div>
              {results.filter(r => !r.success).length > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">
                    {results.filter(r => !r.success).length} failed
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Warning for no emails */}
          {leadsWithEmail.length === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>None of the selected leads have email addresses</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results && (
            <Button
              onClick={handleSend}
              disabled={isSending || leadsWithEmail.length === 0}
            >
              {isSending ? 'Sending...' : `Send to ${leadsWithEmail.length} Lead${leadsWithEmail.length !== 1 ? 's' : ''}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
