import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ExternalLink, Video } from "lucide-react";

export function MeetingsList() {
  const { data: meetings, isLoading } = useQuery({
    queryKey: ["sales-agent-meetings"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("meetings")
        .select("id, scheduled_at, teams_join_url, status, source, lead_id, agent_leads:lead_id(company_name, contact_name, email)")
        .order("scheduled_at", { ascending: true })
        .limit(50);
      return (data ?? []) as any[];
    },
    refetchInterval: 60_000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Meetings</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
        {!isLoading && (meetings ?? []).length === 0 && (
          <div className="text-sm text-muted-foreground">No meetings yet. Leads will book via the MS Bookings link in your outreach emails.</div>
        )}
        <div className="space-y-2">
          {(meetings ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-3 border rounded-md p-3 text-sm">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{m.agent_leads?.company_name ?? "Unknown company"}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {m.agent_leads?.contact_name ?? "—"} · {m.agent_leads?.email ?? "—"}
                </div>
              </div>
              <div className="text-xs text-right">
                <div className="font-medium">{new Date(m.scheduled_at).toLocaleString()}</div>
                <div className="flex items-center gap-2 justify-end mt-1">
                  <Badge variant={m.status === "cancelled" ? "destructive" : m.status === "held" ? "default" : "secondary"} className="h-5 text-[10px] capitalize">{m.status}</Badge>
                  {m.teams_join_url && (
                    <a href={m.teams_join_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      <Video className="h-3 w-3" /> Teams <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
