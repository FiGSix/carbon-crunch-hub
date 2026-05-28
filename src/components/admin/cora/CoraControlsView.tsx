import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SettingsTab } from "@/components/admin/sales-agent/SettingsTab";
import { BlocklistManager } from "@/components/admin/sales-agent/BlocklistManager";
import { SequencesTab } from "@/components/admin/sales-agent/SequencesTab";
import { LearningTab } from "@/components/admin/sales-agent/LearningTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, AlertOctagon, PauseCircle, PlayCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function CoraControlsView() {
  return (
    <Tabs defaultValue="autopilot" className="space-y-4">
      <TabsList>
        <TabsTrigger value="autopilot">Autopilot & mailbox</TabsTrigger>
        <TabsTrigger value="thresholds">Thresholds & caps</TabsTrigger>
        <TabsTrigger value="sequences">Sequences</TabsTrigger>
        <TabsTrigger value="learning">Learning</TabsTrigger>
        <TabsTrigger value="blocklist">Blocklist</TabsTrigger>
        <TabsTrigger value="legacy">Legacy settings</TabsTrigger>
      </TabsList>
      <TabsContent value="autopilot"><AutopilotPanel /></TabsContent>
      <TabsContent value="thresholds"><ThresholdsPanel /></TabsContent>
      <TabsContent value="sequences"><SequencesTab /></TabsContent>
      <TabsContent value="learning"><LearningTab /></TabsContent>
      <TabsContent value="blocklist"><BlocklistManager /></TabsContent>
      <TabsContent value="legacy"><SettingsTab /></TabsContent>
    </Tabs>
  );
}

function AutopilotPanel() {
  const { toast } = useToast();
  const { data: settings, refetch } = useQuery({
    queryKey: ["cora-settings"],
    queryFn: async () => (await (supabase as any).from("sales_agent_settings").select("*").eq("id", true).maybeSingle()).data,
  });
  const { data: mailbox, refetch: refetchMailbox } = useQuery({
    queryKey: ["cora-mailbox-status"],
    refetchInterval: 30_000,
    queryFn: async () => (await (supabase as any).from("cora_mailbox_status").select("*").eq("id", true).maybeSingle()).data,
  });

  const update = async (patch: any) => {
    const { error } = await (supabase as any).from("sales_agent_settings").update(patch).eq("id", true);
    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved" }); refetch(); }
  };

  const recheckMailbox = async () => {
    const { error } = await (supabase as any).functions.invoke("cora-mailbox-health");
    if (error) toast({ title: "Mailbox check failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Mailbox checked" }); refetchMailbox(); }
  };

  const ok = mailbox?.outcome === "verified";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            Outlook mailbox — cora@crunchcarbon.com
            <Button size="sm" variant="outline" onClick={recheckMailbox}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Re-check</Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant={ok ? "default" : "destructive"}>{mailbox?.outcome ?? "unknown"}</Badge>
            {mailbox?.latency_ms != null && <span className="text-xs text-muted-foreground">{mailbox.latency_ms} ms</span>}
            {mailbox?.checked_at && <span className="text-xs text-muted-foreground">Checked {formatDistanceToNow(new Date(mailbox.checked_at), { addSuffix: true })}</span>}
          </div>
          {mailbox?.error && <p className="text-xs text-destructive">{mailbox.error}</p>}
          <p className="text-xs text-muted-foreground">When the mailbox is not verified, Cora pauses all sending automatically. She never falls back to another mailer.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Autopilot mode</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {(["off", "assisted", "full"] as const).map((s) => (
              <Button key={s} size="sm" variant={settings?.autopilot_status === s ? "default" : "outline"} onClick={() => update({ autopilot_status: s })}>
                {s === "off" ? "Off" : s === "assisted" ? "Assisted" : "Full autopilot"}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            <strong>Off</strong> — Cora does nothing automatically. <strong>Assisted</strong> — Cora researches and drafts; admin approves sends.
            <strong> Full</strong> — Cora sends within the configured guardrails.
          </p>
          <div className="flex items-center gap-3 pt-2">
            <Switch checked={!!settings?.pause_all_sending} onCheckedChange={(v) => update({ pause_all_sending: v })} />
            <Label className="text-sm flex items-center gap-1"><PauseCircle className="h-4 w-4" /> Pause all sending</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={!!settings?.emergency_stop} onCheckedChange={(v) => update({ emergency_stop: v })} />
            <Label className="text-sm flex items-center gap-1 text-destructive"><AlertOctagon className="h-4 w-4" /> Emergency stop</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ThresholdsPanel() {
  const { toast } = useToast();
  const { data: settings, refetch } = useQuery({
    queryKey: ["cora-settings"],
    queryFn: async () => (await (supabase as any).from("sales_agent_settings").select("*").eq("id", true).maybeSingle()).data,
  });
  const [draft, setDraft] = useState<any>(null);
  const d = draft ?? settings ?? {};

  const save = async () => {
    const patch: any = {
      fit_score_threshold: Number(d.fit_score_threshold ?? 3),
      personalisation_score_threshold: Number(d.personalisation_score_threshold ?? 2),
      research_confidence_threshold: Number(d.research_confidence_threshold ?? 70),
      daily_send_cap: Number(d.daily_send_cap ?? 50),
      max_auto_approvals_per_day: Number(d.max_auto_approvals_per_day ?? 50),
      max_auto_enrollments_per_day: Number(d.max_auto_enrollments_per_day ?? 50),
      max_auto_replies_per_day: Number(d.max_auto_replies_per_day ?? 50),
      reply_confidence_threshold: Number(d.reply_confidence_threshold ?? 70),
      prompt_version: d.prompt_version ?? "v1",
    };
    const { error } = await (supabase as any).from("sales_agent_settings").update(patch).eq("id", true);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved" }); setDraft(null); refetch(); }
  };

  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Thresholds & daily caps</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <NumberField label="Fit score min" k="fit_score_threshold" d={d} setDraft={setDraft} />
          <NumberField label="Personalisation min" k="personalisation_score_threshold" d={d} setDraft={setDraft} />
          <NumberField label="Research confidence min" k="research_confidence_threshold" d={d} setDraft={setDraft} />
          <NumberField label="Reply auto-send confidence" k="reply_confidence_threshold" d={d} setDraft={setDraft} />
          <NumberField label="Daily send cap" k="daily_send_cap" d={d} setDraft={setDraft} />
          <NumberField label="Max auto-approvals/day" k="max_auto_approvals_per_day" d={d} setDraft={setDraft} />
          <NumberField label="Max auto-enrollments/day" k="max_auto_enrollments_per_day" d={d} setDraft={setDraft} />
          <NumberField label="Max auto-replies/day" k="max_auto_replies_per_day" d={d} setDraft={setDraft} />
          <div>
            <Label className="text-xs">Prompt version</Label>
            <Input value={d.prompt_version ?? ""} onChange={(e) => setDraft({ ...d, prompt_version: e.target.value })} />
          </div>
        </div>
        <Button onClick={save} disabled={!draft}>Save</Button>
      </CardContent>
    </Card>
  );
}

function NumberField({ label, k, d, setDraft }: { label: string; k: string; d: any; setDraft: (v: any) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={d[k] ?? ""} onChange={(e) => setDraft({ ...d, [k]: e.target.value })} />
    </div>
  );
}
