import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Mail, MailOpen, MousePointerClick, AlertCircle, CheckCircle, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EmailEvent {
  id: string;
  event_type: string;
  occurred_at: string;
  click_url?: string | null;
  bounce_reason?: string | null;
  subject?: string | null;
}

interface EmailActivityTimelineProps {
  proposalId: string;
}

export function EmailActivityTimeline({ proposalId }: EmailActivityTimelineProps) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['email-events', proposalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_events' as any)
        .select('*')
        .eq('proposal_id', proposalId)
        .order('occurred_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as EmailEvent[];
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading email activity...</div>
      </div>
    );
  }

  if (!events?.length) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">No email activity yet</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative space-y-6">
        {/* Timeline line */}
        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border" />
        
        {events.map((event, index) => (
          <div key={event.id} className="relative flex gap-4">
            {/* Icon */}
            <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-background border-2 border-border">
              {getEventIcon(event.event_type)}
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{getEventLabel(event.event_type)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.occurred_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {event.subject && index === 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {event.subject}
                    </div>
                  )}
                  
                  {event.click_url && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Clicked: <span className="font-mono">{truncateUrl(event.click_url)}</span>
                    </div>
                  )}
                  
                  {event.bounce_reason && (
                    <div className="mt-1 text-xs text-destructive">
                      Bounce reason: {event.bounce_reason}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getEventIcon(eventType: string) {
  const iconClasses = "h-4 w-4";
  
  switch (eventType) {
    case 'email.sent':
      return <Send className={`${iconClasses} text-muted-foreground`} />;
    case 'email.delivered':
    case 'email.delivered_delayed':
      return <CheckCircle className={`${iconClasses} text-success`} />;
    case 'email.opened':
      return <MailOpen className={`${iconClasses} text-primary`} />;
    case 'email.clicked':
      return <MousePointerClick className={`${iconClasses} text-primary`} />;
    case 'email.bounced':
    case 'email.complained':
      return <AlertCircle className={`${iconClasses} text-destructive`} />;
    default:
      return <Mail className={`${iconClasses} text-muted-foreground`} />;
  }
}

function getEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    'email.sent': 'Email Sent',
    'email.delivered': 'Email Delivered',
    'email.delivered_delayed': 'Email Delivered (Delayed)',
    'email.opened': 'Email Opened',
    'email.clicked': 'Link Clicked',
    'email.bounced': 'Email Bounced',
    'email.complained': 'Spam Report'
  };
  
  return labels[eventType] || eventType.replace('email.', '').replace(/_/g, ' ').toUpperCase();
}

function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + '...';
}
