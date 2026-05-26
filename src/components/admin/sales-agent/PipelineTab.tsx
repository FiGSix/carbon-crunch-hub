import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send, ExternalLink, PauseCircle, PlayCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  discovered: "bg-slate-100 text-slate-700",
  contacted: "bg-blue-100 text-blue-700",
  replied: "bg-green-100 text-green-700",
  invited: "bg-purple-100 text-purple-700",
  signed_up: "bg-emerald-100 text-emerald-700",
  first_proposal_sent: "bg-yellow-100 text-yellow-800",
};

export function PipelineTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: funnel, isLoading } = useQuery({
    queryKey: ["sales-agent-pipeline"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_sales_agent_funnel").select("*")
        .order("discovered_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 30_000,
  });

  const { data: settings } = useQuery({
    queryKey: ["sales-agent-settings"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("sales_agent_settings").select("*").eq("id", true).maybeSingle();
      return data;
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["sales-agent-enrollments"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("outreach_enrollments").select("id, lead_id, status, current_step, next_send_at");
      return (data ?? []) as any[];
    },
  });
  const enrMap = new Map((enrollments ?? []).map((e) => [e.lead_id, e]));

  const enroll = useMutation({
    mutationFn: async (leadId: string) => {
      if (!settings?.default_sequence_id) throw new Error("Set a default sequence in Settings first");
      const { error } = await (supabase as any).from("outreach_enrollments").insert({
        lead_id: leadId,
        sequence_id: settings.default_sequence_id,
        current_step: 0,
        next_send_at: new Date().toISOString(),
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Enrolled in sequence" }); qc.invalidateQueries({ queryKey: ["sales-agent-enrollments"] }); },
    onError: (e: any) => toast({ title: "Failed to enroll", description: e.message, variant: "destructive" }),
  });

  const toggleEnrollment = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "paused" }) => {
      const { error } = await (supabase as any).from("outreach_enrollments").update({ status, paused_reason: status === "paused" ? "manually paused" : null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales-agent-enrollments"] }),
  });

  const markReplied = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await (supabase as any).from("agent_leads").update({ status: "qualified" }).eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Marked as replied" }); qc.invalidateQueries({ queryKey: ["sales-agent-pipeline"] }); },
  });

  return (
    <Card>
      <CardHeader><CardTitle>Active Pipeline</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr className="text-left"><th className="py-2 pr-3">Company</th><th className="py-2 pr-3">Stage</th><th className="py-2 pr-3">Outreach</th><th className="py-2 pr-3">Sequence</th><th className="py-2 pr-3">Discovered</th><th className="py-2 pr-3 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {(funnel ?? []).map((r) => {
                  const enr = enrMap.get(r.lead_id);
                  return (
                    <tr key={r.lead_id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{r.company_name}</div>
                        <div className="text-xs text-muted-foreground">{r.email ?? "—"}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="secondary" className={STATUS_COLORS[r.funnel_stage] ?? ""}>{r.funnel_stage.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{r.outreach_count}</td>
                      <td className="py-2 pr-3">
                        {enr ? (
                          <span className="text-xs">
                            Step {enr.current_step + 1} · <Badge variant="outline" className="text-[10px]">{enr.status}</Badge>
                          </span>
                        ) : <span className="text-muted-foreground text-xs">not enrolled</span>}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground text-xs">{r.discovered_at ? formatDistanceToNow(new Date(r.discovered_at), { addSuffix: true }) : ""}</td>
                      <td className="py-2 pr-3 text-right space-x-1">
                        {!enr && r.funnel_stage === "discovered" && r.email && (
                          <Button size="sm" variant="outline" onClick={() => enroll.mutate(r.lead_id)} disabled={enroll.isPending}>
                            <Send className="h-3.5 w-3.5 mr-1" /> Enroll
                          </Button>
                        )}
                        {enr?.status === "active" && (
                          <Button size="sm" variant="ghost" onClick={() => toggleEnrollment.mutate({ id: enr.id, status: "paused" })}><PauseCircle className="h-3.5 w-3.5" /></Button>
                        )}
                        {enr?.status === "paused" && (
                          <Button size="sm" variant="ghost" onClick={() => toggleEnrollment.mutate({ id: enr.id, status: "active" })}><PlayCircle className="h-3.5 w-3.5" /></Button>
                        )}
                        {["contacted"].includes(r.funnel_stage) && (
                          <Button size="sm" variant="ghost" onClick={() => markReplied.mutate(r.lead_id)}>Mark replied</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(funnel ?? []).length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">No leads yet. Head to Discovery to find some.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
