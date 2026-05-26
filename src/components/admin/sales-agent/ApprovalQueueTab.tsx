import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Check, X, Pencil, Loader2 } from "lucide-react";
import { EditCandidateDialog } from "./EditCandidateDialog";
import { RejectReasonDialog } from "./RejectReasonDialog";

export function ApprovalQueueTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [belowOnly, setBelowOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<any | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ ids: string[] } | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["sales-agent-settings"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("sales_agent_settings").select("*").eq("id", true).maybeSingle();
      return data;
    },
  });
  const threshold = settings?.score_threshold ?? 60;

  const { data: candidates, isLoading } = useQuery({
    queryKey: ["sales-agent-candidates", "pending"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("discovery_candidates")
        .select("*")
        .eq("status", "pending")
        .order("score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 20_000,
  });

  const filtered = useMemo(() => {
    let list = candidates ?? [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.company_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
    }
    if (belowOnly) list = list.filter((c) => c.score < threshold);
    return list;
  }, [candidates, search, belowOnly, threshold]);

  const aboveCount = (candidates ?? []).filter((c) => c.score >= threshold).length;
  const belowCount = (candidates ?? []).filter((c) => c.score < threshold).length;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["sales-agent-candidates"] });
    qc.invalidateQueries({ queryKey: ["sales-agent-pipeline"] });
    qc.invalidateQueries({ queryKey: ["sales-agent-funnel"] });
  };

  const approveOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("promote_discovery_candidate", { _candidate_id: id });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Approved" }); refresh(); },
    onError: (e: any) => toast({ title: "Approve failed", description: e.message, variant: "destructive" }),
  });

  const bulkAction = useMutation({
    mutationFn: async ({ ids, action, reason }: { ids: string[]; action: "approve" | "reject"; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke("sales-agent-bulk-action", { body: { candidate_ids: ids, action, reason } });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast({ title: `Done — ${d.ok} ok, ${d.fail} failed` });
      setSelected(new Set());
      refresh();
    },
    onError: (e: any) => toast({ title: "Bulk action failed", description: e.message, variant: "destructive" }),
  });

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  };

  const approveAllAboveThreshold = () => {
    const ids = (candidates ?? []).filter((c) => c.score >= threshold).map((c) => c.id);
    if (ids.length === 0) { toast({ title: "Nothing above threshold" }); return; }
    if (!confirm(`Approve ${ids.length} candidate(s) at or above threshold (${threshold})?`)) return;
    bulkAction.mutate({ ids, action: "approve" });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base">Approval Queue</CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline">{candidates?.length ?? 0} pending</Badge>
            <Badge variant="secondary">{aboveCount} ≥ {threshold}</Badge>
            <Badge variant="outline">{belowCount} below</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Input placeholder="Search company or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={belowOnly} onCheckedChange={(v) => setBelowOnly(!!v)} /> Below threshold only
          </label>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={approveAllAboveThreshold} disabled={bulkAction.isPending}>
              Approve all ≥ {threshold}
            </Button>
            <Button size="sm" disabled={selected.size === 0 || bulkAction.isPending} onClick={() => bulkAction.mutate({ ids: [...selected], action: "approve" })}>
              Approve selected ({selected.size})
            </Button>
            <Button size="sm" variant="destructive" disabled={selected.size === 0 || bulkAction.isPending} onClick={() => setRejectTarget({ ids: [...selected] })}>
              Reject selected ({selected.size})
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm py-6 text-center"><Loader2 className="h-4 w-4 inline animate-spin mr-1.5" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground text-sm py-8 text-center">No pending candidates. Run a discovery to find more.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr className="text-left">
                  <th className="py-2 pr-2 w-8"><Checkbox checked={selected.size > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} /></th>
                  <th className="py-2 pr-3">Company</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Score</th>
                  <th className="py-2 pr-3">Found</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const above = c.score >= threshold;
                  return (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-2"><Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} /></td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{c.company_name}</div>
                        {c.website && <div className="text-xs text-muted-foreground truncate max-w-[220px]">{c.website}</div>}
                      </td>
                      <td className="py-2 pr-3">{c.email ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2 pr-3">{c.location ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={above ? "secondary" : "outline"} className={above ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-800"}>{c.score}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</td>
                      <td className="py-2 pr-3 text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => approveOne.mutate(c.id)} disabled={approveOne.isPending}><Check className="h-3.5 w-3.5 text-emerald-600" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setRejectTarget({ ids: [c.id] })}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <EditCandidateDialog candidate={editing} open={!!editing} onClose={() => setEditing(null)} onSaved={refresh} />
      <RejectReasonDialog
        open={!!rejectTarget}
        count={rejectTarget?.ids.length ?? 0}
        onClose={() => setRejectTarget(null)}
        onConfirm={(reason) => {
          if (!rejectTarget) return;
          bulkAction.mutate({ ids: rejectTarget.ids, action: "reject", reason });
          setRejectTarget(null);
        }}
      />
    </Card>
  );
}
