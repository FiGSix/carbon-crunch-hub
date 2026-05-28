import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCoraSignals } from "@/hooks/cora/useCoraSignals";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import {
  Activity, Flame, AlertTriangle, Calendar, Mail, Users, ShieldAlert, RefreshCw, Bot,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  onJump: (section: "pipeline" | "conversations" | "meetings" | "controls" | "decisions") => void;
}

export function CommandCentreView({ onJump }: Props) {
  const { signals } = useCoraSignals();
  const { toast } = useToast();

  const { data: latest } = useQuery({
    queryKey: ["cora-latest-actions"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("cora_decision_log")
        .select("id, action, reason, created_at, candidate_id, lead_id, sending_mailbox")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const { data: goal } = useQuery({
    queryKey: ["cora-goal"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [onboardedRes, pipelineRes, enrichRunRes, topupRunRes, expandRunRes] = await Promise.all([
        (supabase as any).from("discovery_candidates").select("id", { count: "exact", head: true }).eq("sales_status", "Signed Up"),
        (supabase as any).from("discovery_candidates").select("id", { count: "exact", head: true })
          .or("research_status.eq.Complete,outreach_status.not.is.null").is("sales_status", null),
        (supabase as any).from("sales_agent_runs").select("status, started_at, completed_at").eq("job_name", "enrich").order("started_at", { ascending: false }).limit(1).maybeSingle(),
        (supabase as any).from("sales_agent_runs").select("started_at").eq("job_name", "discovery_topup").order("started_at", { ascending: false }).limit(1).maybeSingle(),
        (supabase as any).from("sales_agent_runs").select("started_at").eq("job_name", "preset_expand").order("started_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      return {
        onboarded: onboardedRes.count ?? 0,
        pipeline: pipelineRes.count ?? 0,
        lastEnrich: enrichRunRes.data,
        lastTopup: topupRunRes.data?.started_at,
        lastExpand: expandRunRes.data?.started_at,
      };
    },
  });

  const refreshMailbox = async () => {
    const { error } = await (supabase as any).functions.invoke("cora-mailbox-health");
    if (error) toast({ title: "Mailbox check failed", description: error.message, variant: "destructive" });
    else toast({ title: "Mailbox checked", description: "Status refreshed." });
  };

  const sentPct = signals ? Math.min(100, (signals.emailsSentToday / Math.max(1, signals.dailyCap)) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> Cora health</CardTitle>
            <Button size="sm" variant="outline" onClick={refreshMailbox}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-check</Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Mailbox" value={signals?.mailbox?.outcome === "verified" ? "Connected" : signals?.mailbox?.outcome ?? "Unknown"}
            tone={signals?.mailbox?.outcome === "verified" ? "ok" : "bad"} sub={signals?.mailbox?.checked_at ? `Checked ${formatDistanceToNow(new Date(signals.mailbox.checked_at), { addSuffix: true })}` : undefined} />
          <Stat label="Autopilot" value={signals?.settings?.emergency_stop ? "STOPPED" : signals?.settings?.pause_all_sending ? "PAUSED" : (signals?.settings?.autopilot_status ?? "assisted")}
            tone={signals?.settings?.emergency_stop || signals?.settings?.pause_all_sending ? "bad" : "ok"} />
          <Stat label="Prompt version" value={signals?.settings?.prompt_version ?? "v1"} tone="neutral" />
          <Stat label="Sending from" value="cora@crunchcarbon.com" tone="neutral" />
        </CardContent>
      </Card>

      {(() => {
        const target = signals?.settings?.target_agents ?? 250;
        const onboarded = goal?.onboarded ?? 0;
        const pipeline = goal?.pipeline ?? 0;
        const expectedConv = Number(signals?.settings?.expected_conversion ?? 0.1);
        const projected = onboarded + Math.round(pipeline * expectedConv);
        const onTrack = projected >= target;
        const pct = Math.min(100, (onboarded / Math.max(1, target)) * 100);
        const enrichStatus = goal?.lastEnrich?.status === "running"
          ? "Running"
          : signals?.settings?.autopilot_enrichment === false || signals?.settings?.emergency_stop
            ? "Paused" : "Idle";
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" /> Goal — 250 onboarded agents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold">{onboarded} <span className="text-base text-muted-foreground font-normal">/ {target} onboarded</span></div>
                  <div className="text-xs text-muted-foreground">+ {pipeline} in pipeline · projected reach {projected}</div>
                </div>
                <Badge variant={onTrack ? "default" : "outline"} className={onTrack ? "" : "border-amber-500 text-amber-600"}>{onTrack ? "On track" : "Behind"}</Badge>
              </div>
              <Progress value={pct} />
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground uppercase tracking-wide">Enrichment</div>
                  <div className="font-semibold">{enrichStatus}</div>
                  {goal?.lastEnrich?.started_at && <div className="text-muted-foreground">{formatDistanceToNow(new Date(goal.lastEnrich.started_at), { addSuffix: true })}</div>}
                </div>
                <div>
                  <div className="text-muted-foreground uppercase tracking-wide">Last top-up</div>
                  <div className="font-semibold">{goal?.lastTopup ? formatDistanceToNow(new Date(goal.lastTopup), { addSuffix: true }) : "Never"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground uppercase tracking-wide">Preset expand</div>
                  <div className="font-semibold">{goal?.lastExpand ? formatDistanceToNow(new Date(goal.lastExpand), { addSuffix: true }) : "Never"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Tile label="Incomplete" value={signals?.incomplete ?? 0} tone="warn" onClick={() => onJump("pipeline")} hint="Inbox — Cora researching" />
        <Tile label="Complete & ready" value={signals?.completeReady ?? 0} tone="ok" onClick={() => onJump("pipeline")} hint="≥80 completeness" />
        <Tile label="Outreach active" value={signals?.outreachActive ?? 0} tone="neutral" onClick={() => onJump("pipeline")} hint="Emailing / following up" />
        <Tile label="Awaiting reply" value={signals?.awaitingReply ?? 0} tone="neutral" onClick={() => onJump("conversations")} hint="Replied — needs response" />
        <Tile label="Opportunities" value={signals?.opportunities ?? 0} tone="ok" onClick={() => onJump("pipeline")} hint="Meetings / proposals / signups" />
        <Tile label="Blocked" value={signals?.blocked ?? 0} tone="bad" onClick={() => onJump("pipeline")} hint="Existing agent/client/duplicate" />
        <Tile label="Needs human review" value={signals?.needsReview ?? 0} tone="warn" onClick={() => onJump("pipeline")} hint="Cora flagged for admin" />
        <Tile label="Today's send" value={`${signals?.emailsSentToday ?? 0}/${signals?.dailyCap ?? 0}`} tone="neutral" onClick={() => onJump("decisions")} hint="Outlook only" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Today's send</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signals?.emailsSentToday ?? 0} <span className="text-base text-muted-foreground font-normal">/ {signals?.dailyCap ?? 0}</span></div>
            <Progress value={sentPct} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">Emails sent today vs daily cap.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Conversations & meetings</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row icon={Mail} label="Replies needing response" value={signals?.awaitingReply ?? 0} onClick={() => onJump("conversations")} />
            <Row icon={Mail} label="Positive replies today" value={signals?.positiveRepliesToday ?? 0} onClick={() => onJump("conversations")} />
            <Row icon={Calendar} label="Meetings booked today" value={signals?.meetingsBookedToday ?? 0} onClick={() => onJump("meetings")} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Safety signals today</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <Row icon={ShieldAlert} label="Failed sends / bounces" value={signals?.failedSendsToday ?? 0} onClick={() => onJump("decisions")} />
            <Row icon={Users} label="Duplicate / relationship matches" value={signals?.duplicatesToday ?? 0} onClick={() => onJump("decisions")} />
            <Row icon={ShieldAlert} label="Do-not-contact events" value={signals?.doNotContactToday ?? 0} onClick={() => onJump("decisions")} />
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Cora's latest actions</CardTitle></CardHeader>
        <CardContent>
          {(latest?.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No actions logged yet.</p>}
          <ul className="divide-y">
            {(latest ?? []).map((row: any) => (
              <li key={row.id} className="py-2 flex items-start gap-3 text-sm">
                <Badge variant="outline" className="shrink-0 mt-0.5">{row.action}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{row.reason || "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                    {row.sending_mailbox ? ` • ${row.sending_mailbox}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Button variant="link" size="sm" className="px-0 mt-1" onClick={() => onJump("decisions")}>Open full decision log →</Button>
        </CardContent>
      </Card>

    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: "ok" | "bad" | "neutral" }) {
  const cls = tone === "ok" ? "text-emerald-600" : tone === "bad" ? "text-red-600" : "text-foreground";
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className={`text-base font-semibold ${cls}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
function Row({ icon: Icon, label, value, onClick }: { icon: any; label: string; value: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between gap-3 px-2 py-1.5 -mx-2 rounded hover:bg-muted text-left">
      <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /> {label}</span>
      <Badge variant={value > 0 ? "default" : "outline"}>{value}</Badge>
    </button>
  );
}

function Tile({ label, value, hint, tone, onClick }: { label: string; value: number | string; hint?: string; tone: "ok" | "bad" | "warn" | "neutral"; onClick: () => void }) {
  const tones = {
    ok: "border-emerald-500/40 hover:border-emerald-500",
    bad: "border-red-500/40 hover:border-red-500",
    warn: "border-amber-500/40 hover:border-amber-500",
    neutral: "border-border hover:border-primary",
  } as const;
  return (
    <button onClick={onClick} className={`text-left rounded-lg border-2 p-3 transition-colors ${tones[tone]}`}>
      <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
    </button>
  );
}

