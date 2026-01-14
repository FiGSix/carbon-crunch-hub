import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Mail, Clock, CheckCircle2, Eye, MousePointer, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface OutreachHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  companyName: string;
}

interface OutreachRecord {
  id: string;
  template_type: string;
  subject: string;
  body_preview: string | null;
  sent_at: string;
  status: string;
  opened_at: string | null;
  clicked_at: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Mail },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  opened: { label: 'Opened', color: 'bg-purple-100 text-purple-700', icon: Eye },
  clicked: { label: 'Clicked', color: 'bg-indigo-100 text-indigo-700', icon: MousePointer },
  bounced: { label: 'Bounced', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

const templateLabels: Record<string, string> = {
  introduction: 'Introduction',
  follow_up_1: 'Follow-up #1',
  follow_up_2: 'Follow-up #2',
};

export function OutreachHistoryDialog({ open, onOpenChange, leadId, companyName }: OutreachHistoryDialogProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['lead-outreach-history', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_outreach_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data as OutreachRecord[];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Outreach History
          </DialogTitle>
          <DialogDescription>
            Email history for {companyName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : !history || history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Mail className="h-10 w-10 mb-3 opacity-50" />
              <p>No outreach emails sent yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record, index) => {
                const config = statusConfig[record.status] || statusConfig.sent;
                const StatusIcon = config.icon;

                return (
                  <div key={record.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {templateLabels[record.template_type] || record.template_type}
                            </Badge>
                            <Badge className={config.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm">{record.subject}</p>
                        </div>
                      </div>

                      {record.body_preview && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {record.body_preview}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Sent {formatDistanceToNow(new Date(record.sent_at), { addSuffix: true })}
                        </div>
                        {record.opened_at && (
                          <div className="flex items-center gap-1 text-purple-600">
                            <Eye className="h-3 w-3" />
                            Opened {format(new Date(record.opened_at), 'PPp')}
                          </div>
                        )}
                        {record.clicked_at && (
                          <div className="flex items-center gap-1 text-indigo-600">
                            <MousePointer className="h-3 w-3" />
                            Clicked {format(new Date(record.clicked_at), 'PPp')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
