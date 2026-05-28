import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  leadId: string | null;
  onClose: () => void;
}

export function LeadDetailDrawer({ leadId, onClose }: Props) {
  const { toast } = useToast();
  const open = Boolean(leadId);

  const { data: lead, isLoading, refetch } = useQuery({
    queryKey: ["cora-lead-detail", leadId],
    enabled: open,
    queryFn: async () => {
      const { data } = await (supabase as any).from("discovery_candidates").select("*").eq("id", leadId).maybeSingle();
      return data;
    },
  });

  const { data: outreach } = useQuery({
    queryKey: ["cora-lead-outreach", leadId, lead?.email],
    enabled: Boolean(lead?.email),
    queryFn: async () => {
      const { data } = await (supabase as any).from("lead_outreach_history").select("*").order("sent_at", { ascending: false }).limit(20);
      return (data ?? []).filter((r: any) => !lead?.email || r.lead_id);
    },
  });

  const { data: replies } = useQuery({
    queryKey: ["cora-lead-replies", lead?.email],
    enabled: Boolean(lead?.email),
    queryFn: async () => {
      const { data } = await (supabase as any).from("inbound_messages").select("*").eq("from_email", lead.email).order("received_at", { ascending: false }).limit(10);
      return data ?? [];
    },
  });

  const { data: decisions } = useQuery({
    queryKey: ["cora-lead-decisions", leadId],
    enabled: open,
    queryFn: async () => {
      const { data } = await (supabase as any).from("cora_decision_log").select("*").eq("candidate_id", leadId).order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const runRelationshipCheck = async () => {
    if (!leadId) return;
    const { error } = await (supabase as any).functions.invoke("cora-relationship-check", { body: { candidateId: leadId, persist: true } });
    if (error) toast({ title: "Check failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Relationship check complete" }); refetch(); }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        {!lead && isLoading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>}
        {lead && (
          <>
            <SheetHeader>
              <SheetTitle>{lead.company_name || "Unnamed company"}</SheetTitle>
              <div className="flex flex-wrap gap-1.5">
                {lead.pipeline_stage && <Badge variant="outline">{lead.pipeline_stage}</Badge>}
                {lead.existing_relationship_status && lead.existing_relationship_status !== "safe_new_lead" && <Badge variant="destructive">{lead.existing_relationship_status.replaceAll("_", " ")}</Badge>}
                {lead.contact_permission_status && <Badge variant={lead.contact_permission_status === "allowed" ? "default" : "destructive"}>{lead.contact_permission_status}</Badge>}
              </div>
            </SheetHeader>

            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="research">Cora research</TabsTrigger>
                <TabsTrigger value="relationship">Relationship</TabsTrigger>
                <TabsTrigger value="conversation">Conversation</TabsTrigger>
                <TabsTrigger value="decisions">Decisions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3 mt-4">
                <Field label="Contact" value={lead.contact_name} />
                <Field label="Email" value={lead.email} />
                <Field label="Website" value={lead.website} link />
                <Field label="Location" value={lead.location} />
                <Field label="Segment" value={lead.lead_segment} />
                <Field label="Estimated portfolio" value={lead.estimated_portfolio_size_mwp ? `${lead.estimated_portfolio_size_mwp} MWp` : null} />
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <ScoreCard label="Fit" value={lead.fit_score} />
                  <ScoreCard label="Personalisation" value={lead.personalisation_score} />
                  <ScoreCard label="Research conf." value={lead.research_confidence} />
                </div>
                {lead.next_best_action && (
                  <Card><CardContent className="p-3">
                    <div className="text-xs uppercase text-muted-foreground">Next best action</div>
                    <div className="text-sm mt-1">{lead.next_best_action}</div>
                    {lead.next_action_owner && <div className="text-xs text-muted-foreground mt-1">Owner: {lead.next_action_owner}</div>}
                  </CardContent></Card>
                )}
                {lead.escalation_required && (
                  <Card className="border-destructive"><CardContent className="p-3">
                    <div className="text-xs uppercase text-destructive">Escalation required</div>
                    <div className="text-sm mt-1">{lead.escalation_reason || "Flagged for human attention."}</div>
                  </CardContent></Card>
                )}
              </TabsContent>

              <TabsContent value="research" className="space-y-3 mt-4">
                {lead.cora_summary ? <Block title="Cora summary" body={lead.cora_summary} /> : <Empty text="No Cora research yet." />}
                {lead.best_angle && <Block title="Recommended angle" body={lead.best_angle} />}
                {lead.recommended_cta && <Block title="Recommended CTA" body={lead.recommended_cta} />}
                {lead.research_evidence && (
                  <Card><CardContent className="p-3">
                    <div className="text-xs uppercase text-muted-foreground mb-1">Research evidence</div>
                    <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(lead.research_evidence, null, 2)}</pre>
                  </CardContent></Card>
                )}
                <Field label="Prompt version" value={lead.prompt_version} />
              </TabsContent>

              <TabsContent value="relationship" className="space-y-3 mt-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">Existing-agent / client / duplicate check.</p>
                  <Button size="sm" variant="outline" onClick={runRelationshipCheck}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-check</Button>
                </div>
                <Field label="Status" value={lead.existing_relationship_status} />
                <Field label="Matched record" value={lead.matched_existing_record_type ? `${lead.matched_existing_record_type} (${lead.matched_existing_record_id ?? "—"})` : null} />
                <Field label="Permission" value={lead.contact_permission_status} />
                <Field label="Reason" value={lead.contact_permission_reason || lead.do_not_contact_reason} />
                <Field label="Duplicate check" value={lead.duplicate_check_status} />
              </TabsContent>

              <TabsContent value="conversation" className="space-y-3 mt-4">
                <div>
                  <h4 className="text-xs uppercase text-muted-foreground mb-1.5">Outbound</h4>
                  {(outreach?.length ?? 0) === 0 && <Empty text="No outbound emails yet." />}
                  <ul className="divide-y border rounded-md">
                    {(outreach ?? []).slice(0, 5).map((o: any) => (
                      <li key={o.id} className="p-2.5 text-sm">
                        <div className="font-medium truncate">{o.subject}</div>
                        <div className="text-xs text-muted-foreground">{o.template_type} • {o.sending_mailbox ?? "—"} • {o.sent_at && formatDistanceToNow(new Date(o.sent_at), { addSuffix: true })}</div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs uppercase text-muted-foreground mb-1.5">Inbound</h4>
                  {(replies?.length ?? 0) === 0 && <Empty text="No replies yet." />}
                  <ul className="divide-y border rounded-md">
                    {(replies ?? []).map((r: any) => (
                      <li key={r.id} className="p-2.5 text-sm">
                        <div className="font-medium truncate">{r.subject}</div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.body_text}</p>
                        <div className="text-[11px] text-muted-foreground mt-1">{r.intent ?? "—"} • {formatDistanceToNow(new Date(r.received_at), { addSuffix: true })}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="decisions" className="space-y-2 mt-4">
                {(decisions?.length ?? 0) === 0 && <Empty text="No autonomous decisions logged for this lead yet." />}
                <ul className="divide-y border rounded-md">
                  {(decisions ?? []).map((d: any) => (
                    <li key={d.id} className="p-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{d.action}</Badge>
                        <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                      </div>
                      {d.reason && <div className="mt-1">{d.reason}</div>}
                      {(d.status_before || d.status_after) && (
                        <div className="text-xs text-muted-foreground mt-0.5">{d.status_before ?? "—"} → {d.status_after ?? "—"}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value, link }: { label: string; value?: string | null; link?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="col-span-2 break-words">
        {!value && <span className="text-muted-foreground">—</span>}
        {value && link && <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer" className="text-primary underline">{value}</a>}
        {value && !link && value}
      </div>
    </div>
  );
}
function Block({ title, body }: { title: string; body: string }) {
  return (
    <Card><CardContent className="p-3">
      <div className="text-xs uppercase text-muted-foreground mb-1">{title}</div>
      <p className="text-sm whitespace-pre-wrap">{body}</p>
    </CardContent></Card>
  );
}
function ScoreCard({ label, value }: { label: string; value?: number | null }) {
  return (
    <Card><CardContent className="p-2 text-center">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value ?? "—"}</div>
    </CardContent></Card>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
