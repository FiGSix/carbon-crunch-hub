import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Activity, Users, Key, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface UsageStats {
  totalPartners: number;
  activePartners: number;
  totalApiKeys: number;
  totalRequests: number;
  recentLogs: {
    id: string;
    partner_name: string;
    method: string;
    path: string;
    status_code: number;
    created_at: string;
    duration_ms: number | null;
  }[];
}

export function PartnerUsageStats() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Fetch partners count
      const { data: partners, error: partnersError } = await supabase
        .from("partners")
        .select("id, is_active, name");

      if (partnersError) throw partnersError;

      // Fetch API keys with request counts
      const { data: apiKeys, error: keysError } = await supabase
        .from("partner_api_keys")
        .select("id, request_count, partner_id");

      if (keysError) throw keysError;

      // Fetch recent API logs
      const { data: logs, error: logsError } = await supabase
        .from("partner_api_logs")
        .select(`
          id,
          method,
          path,
          status_code,
          created_at,
          duration_ms,
          partner_id
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (logsError) throw logsError;

      // Create a partner lookup map
      const partnerMap = new Map(partners?.map(p => [p.id, p.name]) || []);

      // Calculate stats
      const totalPartners = partners?.length || 0;
      const activePartners = partners?.filter(p => p.is_active).length || 0;
      const totalApiKeys = apiKeys?.length || 0;
      const totalRequests = apiKeys?.reduce((sum, key) => sum + (key.request_count || 0), 0) || 0;

      // Enrich logs with partner names
      const recentLogs = (logs || []).map(log => ({
        ...log,
        partner_name: partnerMap.get(log.partner_id) || "Unknown",
      }));

      setStats({
        totalPartners,
        activePartners,
        totalApiKeys,
        totalRequests,
        recentLogs,
      });
    } catch (error) {
      console.error("Failed to fetch usage stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Failed to load usage statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPartners}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activePartners} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApiKeys}</div>
            <p className="text-xs text-muted-foreground">
              Across all partners
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRequests.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All-time API calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.recentLogs.length > 0
                ? Math.round(
                    stats.recentLogs
                      .filter(l => l.duration_ms)
                      .reduce((sum, l) => sum + (l.duration_ms || 0), 0) /
                    Math.max(1, stats.recentLogs.filter(l => l.duration_ms).length)
                  )
                : 0}
              ms
            </div>
            <p className="text-xs text-muted-foreground">
              Recent requests
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent API Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No API activity recorded yet</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partner</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {log.partner_name}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.method} {log.path}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status_code >= 200 && log.status_code < 300
                              ? "default"
                              : log.status_code >= 400
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {log.status_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.duration_ms ? `${log.duration_ms}ms` : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
