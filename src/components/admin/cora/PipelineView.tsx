import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LeadDetailDrawer } from "./LeadDetailDrawer";
import { ApprovalQueueTab } from "@/components/admin/sales-agent/ApprovalQueueTab";
import { PipelineTab } from "@/components/admin/sales-agent/PipelineTab";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

const STAGES = [
  "new", "researching", "duplicate_check", "existing_relationship_review",
  "qualified", "outreach_active", "follow_up_active", "engaged",
  "meeting_requested", "meeting_booked", "proposal_opportunity",
  "agent_invitation_sent", "signed_up", "first_proposal_sent",
  "nurture", "not_fit", "existing_agent", "existing_client", "duplicate", "do_not_contact",
] as const;

const STAGE_LABEL: Record<string, string> = {
  new: "New",
  researching: "Researching",
  duplicate_check: "Duplicate check",
  existing_relationship_review: "Existing relationship review",
  qualified: "Qualified",
  outreach_active: "Outreach active",
  follow_up_active: "Follow-up",
  engaged: "Engaged",
  meeting_requested: "Meeting requested",
  meeting_booked: "Meeting booked",
  proposal_opportunity: "Proposal opportunity",
  agent_invitation_sent: "Invitation sent",
  signed_up: "Signed up",
  first_proposal_sent: "First proposal sent",
  nurture: "Nurture",
  not_fit: "Not fit",
  existing_agent: "Existing agent",
  existing_client: "Existing client",
  duplicate: "Duplicate",
  do_not_contact: "Do not contact",
};

export function PipelineView() {
  const [view, setView] = useState("board");
  const [openLeadId, setOpenLeadId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="action">Action required</TabsTrigger>
          <TabsTrigger value="commercial">Commercial priority</TabsTrigger>
          <TabsTrigger value="relationships">Existing relationship review</TabsTrigger>
          <TabsTrigger value="approval">Needs approval</TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="mt-4"><BoardView onOpen={setOpenLeadId} /></TabsContent>
        <TabsContent value="table" className="mt-4"><PipelineTab /></TabsContent>
        <TabsContent value="action" className="mt-4">
          <FilteredList title="Leads where Cora is blocked or needs a human" onOpen={setOpenLeadId}
            filter={(q) => q.not("next_best_action", "is", null).neq("contact_permission_status", "allowed")} />
        </TabsContent>
        <TabsContent value="commercial" className="mt-4">
          <FilteredList title="Highest commercial priority" onOpen={setOpenLeadId}
            filter={(q) => q.order("priority_score", { ascending: false, nullsFirst: false })} />
        </TabsContent>
        <TabsContent value="relationships" className="mt-4">
          <FilteredList title="Existing-relationship matches" onOpen={setOpenLeadId}
            filter={(q) => q.in("existing_relationship_status", ["existing_agent", "existing_invited_agent", "existing_client", "existing_prospect", "duplicate_company", "duplicate_contact", "related_needs_review"])} />
        </TabsContent>
        <TabsContent value="approval" className="mt-4"><ApprovalQueueTab /></TabsContent>
      </Tabs>

      <LeadDetailDrawer leadId={openLeadId} onClose={() => setOpenLeadId(null)} />
    </div>
  );
}

function BoardView({ onOpen }: { onOpen: (id: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["cora-board"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("discovery_candidates")
        .select("id, company_name, contact_name, email, pipeline_stage, status, fit_score, personalisation_score, research_confidence, priority_score, cora_summary, next_best_action, existing_relationship_status, contact_permission_status, last_cora_decision_at")
        .order("priority_score", { ascending: false, nullsFirst: false })
        .limit(500);
      return data ?? [];
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  const grouped = new Map<string, any[]>();
  STAGES.forEach((s) => grouped.set(s, []));
  (data ?? []).forEach((r: any) => {
    const stage = r.pipeline_stage ?? r.status ?? "new";
    if (!grouped.has(stage)) grouped.set(stage, []);
    grouped.get(stage)!.push(r);
  });

  const visibleStages = STAGES.filter((s) => (grouped.get(s) ?? []).length > 0);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max">
        {visibleStages.map((s) => (
          <div key={s} className="w-72 shrink-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{STAGE_LABEL[s] ?? s}</h3>
              <Badge variant="outline" className="h-5">{(grouped.get(s) ?? []).length}</Badge>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {(grouped.get(s) ?? []).map((r) => <LeadCard key={r.id} row={r} onOpen={onOpen} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadCard({ row, onOpen }: { row: any; onOpen: (id: string) => void }) {
  const rel = row.existing_relationship_status;
  const blocked = row.contact_permission_status && row.contact_permission_status !== "allowed";
  return (
    <button onClick={() => onOpen(row.id)} className="w-full text-left">
      <Card className="hover:border-primary transition-colors">
        <CardContent className="p-3 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="font-medium text-sm truncate">{row.company_name || "—"}</div>
            {row.priority_score != null && <Badge variant="secondary" className="h-5 shrink-0">{Math.round(row.priority_score)}</Badge>}
          </div>
          <div className="text-xs text-muted-foreground truncate">{row.contact_name || row.email || "No contact"}</div>
          {row.cora_summary && <p className="text-xs line-clamp-2 text-foreground/80">{row.cora_summary}</p>}
          <div className="flex flex-wrap gap-1">
            {row.fit_score != null && <Badge variant="outline" className="h-5 text-[10px]">Fit {row.fit_score}</Badge>}
            {row.personalisation_score != null && <Badge variant="outline" className="h-5 text-[10px]">Pers {row.personalisation_score}</Badge>}
            {row.research_confidence != null && <Badge variant="outline" className="h-5 text-[10px]">Conf {row.research_confidence}</Badge>}
            {rel && rel !== "safe_new_lead" && <Badge variant="destructive" className="h-5 text-[10px]">{rel.replaceAll("_", " ")}</Badge>}
            {blocked && <Badge variant="destructive" className="h-5 text-[10px]">{row.contact_permission_status}</Badge>}
          </div>
          {row.next_best_action && (
            <div className="text-[11px] text-muted-foreground border-t pt-1.5">
              <span className="font-medium text-foreground">Next:</span> {row.next_best_action}
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  );
}

function FilteredList({
  title, filter, onOpen,
}: { title: string; filter: (q: any) => any; onOpen: (id: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["cora-filtered", title],
    queryFn: async () => {
      let q: any = (supabase as any).from("discovery_candidates").select("*").limit(200);
      q = filter(q);
      const { data } = await q;
      return data ?? [];
    },
  });
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title} ({data?.length ?? 0})</CardTitle></CardHeader>
      <CardContent className="p-0">
        {(data?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground p-4">Nothing to show.</p>}
        <ul className="divide-y">
          {(data ?? []).map((r: any) => (
            <li key={r.id} className="px-4 py-3 flex items-center gap-3">
              <button className="flex-1 text-left min-w-0" onClick={() => onOpen(r.id)}>
                <div className="font-medium text-sm truncate">{r.company_name || "—"}</div>
                <div className="text-xs text-muted-foreground truncate">{r.email || r.contact_name || "—"}</div>
                {r.next_best_action && <div className="text-xs mt-0.5"><span className="font-medium">Next:</span> {r.next_best_action}</div>}
              </button>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="outline">{STAGE_LABEL[r.pipeline_stage] ?? r.pipeline_stage ?? r.status}</Badge>
                {r.last_cora_decision_at && (
                  <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(r.last_cora_decision_at), { addSuffix: true })}</span>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => onOpen(r.id)}>Open</Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
