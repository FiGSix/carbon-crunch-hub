import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, Mail, Clock, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EngagementMetrics {
  total_proposals: number;
  sent_proposals: number;
  opened_proposals: number;
  clicked_proposals: number;
  avg_time_to_open_hours: number;
  engagement_rate: number;
  bounced_proposals: number;
  stale_proposals: number;
}

export function EngagementDashboard() {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['engagement-metrics'],
    queryFn: async () => {
      // Fetch aggregated metrics
      const { data: proposals, error } = await supabase
        .from('proposals')
        .select(`
          id,
          status,
          last_email_sent_at,
          last_engagement_at,
          engagement_count,
          last_email_event_type,
          automation_paused,
          created_at
        `)
        .is('deleted_at', null)
        .is('archived_at', null);

      if (error) throw error;

      const metrics: EngagementMetrics = {
        total_proposals: proposals?.length || 0,
        sent_proposals: proposals?.filter(p => 
          ['sent', 'delivered', 'opened', 'viewed'].includes(p.status)
        ).length || 0,
        opened_proposals: proposals?.filter(p => 
          ['opened', 'viewed'].includes(p.status) || p.engagement_count > 0
        ).length || 0,
        clicked_proposals: proposals?.filter(p => 
          p.last_email_event_type === 'email.clicked'
        ).length || 0,
        bounced_proposals: proposals?.filter(p => 
          p.status === 'bounced'
        ).length || 0,
        stale_proposals: proposals?.filter(p => 
          p.status === 'stale'
        ).length || 0,
        avg_time_to_open_hours: 0,
        engagement_rate: 0
      };

      // Calculate average time to open
      const openedWithSentTime = proposals?.filter(p => 
        p.last_email_sent_at && p.last_engagement_at
      ) || [];

      if (openedWithSentTime.length > 0) {
        const totalHours = openedWithSentTime.reduce((sum, p) => {
          const sent = new Date(p.last_email_sent_at!);
          const opened = new Date(p.last_engagement_at!);
          const hours = (opened.getTime() - sent.getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0);
        metrics.avg_time_to_open_hours = totalHours / openedWithSentTime.length;
      }

      // Calculate engagement rate
      if (metrics.sent_proposals > 0) {
        metrics.engagement_rate = (metrics.opened_proposals / metrics.sent_proposals) * 100;
      }

      return metrics;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load engagement metrics. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const getEngagementLabel = (rate: number) => {
    if (rate >= 70) return { label: 'Excellent', color: 'bg-green-500' };
    if (rate >= 50) return { label: 'Good', color: 'bg-blue-500' };
    if (rate >= 30) return { label: 'Fair', color: 'bg-yellow-500' };
    return { label: 'Needs Attention', color: 'bg-red-500' };
  };

  const engagementStatus = getEngagementLabel(metrics?.engagement_rate || 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Sent */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Proposals Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.sent_proposals || 0}</div>
            <p className="text-xs text-muted-foreground">
              Out of {metrics?.total_proposals || 0} total
            </p>
          </CardContent>
        </Card>

        {/* Engagement Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {metrics?.engagement_rate?.toFixed(1) || 0}%
              </div>
              <Badge variant="secondary" className={`${engagementStatus.color} text-white`}>
                {engagementStatus.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.opened_proposals || 0} of {metrics?.sent_proposals || 0} opened
            </p>
          </CardContent>
        </Card>

        {/* Average Time to Open */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time to Open</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.avg_time_to_open_hours 
                ? metrics.avg_time_to_open_hours < 24
                  ? `${metrics.avg_time_to_open_hours.toFixed(1)}h`
                  : `${(metrics.avg_time_to_open_hours / 24).toFixed(1)}d`
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Response time metric
            </p>
          </CardContent>
        </Card>

        {/* Link Clicks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Link Clicks</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.clicked_proposals || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.sent_proposals 
                ? `${((metrics.clicked_proposals / metrics.sent_proposals) * 100).toFixed(1)}% click rate`
                : '0% click rate'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Proposal Status Overview</CardTitle>
          <CardDescription>Current state of all proposals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bounced</span>
                <Badge variant="destructive">{metrics?.bounced_proposals || 0}</Badge>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-destructive transition-all"
                  style={{ 
                    width: `${metrics?.sent_proposals 
                      ? (metrics.bounced_proposals / metrics.sent_proposals) * 100 
                      : 0}%` 
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Stale</span>
                <Badge variant="secondary">{metrics?.stale_proposals || 0}</Badge>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 transition-all"
                  style={{ 
                    width: `${metrics?.sent_proposals 
                      ? (metrics.stale_proposals / metrics.sent_proposals) * 100 
                      : 0}%` 
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Engagement</span>
                <Badge className="bg-green-500 text-white">
                  {metrics?.opened_proposals || 0}
                </Badge>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ 
                    width: `${metrics?.engagement_rate || 0}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
