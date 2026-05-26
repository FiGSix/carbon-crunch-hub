import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { BlocklistManager } from "./BlocklistManager";
import { ExternalLink, RefreshCw } from "lucide-react";
import { DiscoveryPresetsCard } from "./DiscoveryPresetsCard";

export function SettingsTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["sales-agent-settings"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("sales_agent_settings").select("*").eq("id", true).maybeSingle();
      return data;
    },
  });

  const { data: sequences } = useQuery({
    queryKey: ["sales-agent-sequences-min"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("outreach_sequences").select("id,name,is_active");
      return (data ?? []) as any[];
    },
  });

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        autopilot_discovery: form.autopilot_discovery,
        autopilot_outreach: form.autopilot_outreach,
        autopilot_replies: form.autopilot_replies,
        reply_confidence_threshold: form.reply_confidence_threshold,
        autopilot_reply_min_confidence: form.autopilot_reply_min_confidence,
        daily_send_cap: form.daily_send_cap,
        quiet_hours_start: form.quiet_hours_start,
        quiet_hours_end: form.quiet_hours_end,
        score_threshold: form.score_threshold,
        default_sequence_id: form.default_sequence_id,
        mailbox_address: form.mailbox_address,
        bookings_url: form.bookings_url,
        bookings_cta_label: form.bookings_cta_label,
        meeting_timezone: form.meeting_timezone,
        notify_enabled: form.notify_enabled,
        notify_email: form.notify_email,
        notify_pending_threshold: form.notify_pending_threshold,
        notify_inbox_threshold: form.notify_inbox_threshold,
        notify_stuck_hours: form.notify_stuck_hours,
        notify_min_interval_hours: form.notify_min_interval_hours,
        notify_daily_digest: form.notify_daily_digest,
        blocked_domains: typeof form.blocked_domains === "string" ? form.blocked_domains.split(",").map((s: string) => s.trim()).filter(Boolean) : form.blocked_domains,
        target_regions: typeof form.target_regions === "string" ? form.target_regions.split(",").map((s: string) => s.trim()).filter(Boolean) : form.target_regions,
      };
      const { error } = await (supabase as any).from("sales_agent_settings").update(payload).eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Settings saved" }); qc.invalidateQueries({ queryKey: ["sales-agent-settings"] }); },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const rescore = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("sales-agent-rescore", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => toast({ title: "Re-scored", description: `${data.changed ?? 0} updated · ${data.promoted ?? 0} promoted` }),
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  if (!settings) return <div className="text-muted-foreground text-sm">Loading…</div>;
  const blocked = Array.isArray(form.blocked_domains) ? form.blocked_domains.join(", ") : (form.blocked_domains ?? "");
  const regions = Array.isArray(form.target_regions) ? form.target_regions.join(", ") : (form.target_regions ?? "");

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Autopilot</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>Auto-approve discovery</Label><p className="text-xs text-muted-foreground">Leads above score threshold flow straight into pipeline.</p></div>
            <Switch checked={!!form.autopilot_discovery} onCheckedChange={(v) => setForm((f: any) => ({ ...f, autopilot_discovery: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Auto-enroll outreach</Label><p className="text-xs text-muted-foreground">New leads with email auto-enrolled in default sequence.</p></div>
            <Switch checked={!!form.autopilot_outreach} onCheckedChange={(v) => setForm((f: any) => ({ ...f, autopilot_outreach: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Auto-send AI replies</Label><p className="text-xs text-muted-foreground">When confidence ≥ threshold, AI drafts are sent automatically.</p></div>
            <Switch checked={!!form.autopilot_replies} onCheckedChange={(v) => setForm((f: any) => ({ ...f, autopilot_replies: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Reply confidence threshold ({form.reply_confidence_threshold ?? 80}%)</Label>
              <Input type="number" min={50} max={100} value={form.reply_confidence_threshold ?? 80} onChange={(e) => setForm((f: any) => ({ ...f, reply_confidence_threshold: parseInt(e.target.value) || 80 }))} />
              <p className="text-xs text-muted-foreground mt-1">Min confidence to draft a reply.</p>
            </div>
            <div>
              <Label>Auto-send min confidence ({form.autopilot_reply_min_confidence ?? 90}%)</Label>
              <Input type="number" min={50} max={100} value={form.autopilot_reply_min_confidence ?? 90} onChange={(e) => setForm((f: any) => ({ ...f, autopilot_reply_min_confidence: parseInt(e.target.value) || 90 }))} />
              <p className="text-xs text-muted-foreground mt-1">Required to auto-send (when autopilot on).</p>
            </div>
          </div>
          <div>
            <Label>Score threshold ({form.score_threshold})</Label>
            <Input type="number" min={0} max={100} value={form.score_threshold ?? 60} onChange={(e) => setForm((f: any) => ({ ...f, score_threshold: parseInt(e.target.value) || 0 }))} />
            <Button size="sm" variant="outline" className="mt-2" onClick={() => rescore.mutate()} disabled={rescore.isPending}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${rescore.isPending ? "animate-spin" : ""}`} />
              {rescore.isPending ? "Re-scoring…" : "Re-score all pending"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Send controls (Outlook mailbox)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Mailbox address</Label><Input value={form.mailbox_address ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, mailbox_address: e.target.value }))} />
            <p className="text-xs text-muted-foreground mt-1">Outbound and inbound flow through this Microsoft Outlook account.</p>
          </div>
          <div><Label>Daily send cap</Label><Input type="number" min={1} max={1000} value={form.daily_send_cap ?? 50} onChange={(e) => setForm((f: any) => ({ ...f, daily_send_cap: parseInt(e.target.value) || 0 }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Quiet from (UTC hour)</Label><Input type="number" min={0} max={23} value={form.quiet_hours_start ?? 20} onChange={(e) => setForm((f: any) => ({ ...f, quiet_hours_start: parseInt(e.target.value) || 0 }))} /></div>
            <div><Label>Quiet until</Label><Input type="number" min={0} max={23} value={form.quiet_hours_end ?? 8} onChange={(e) => setForm((f: any) => ({ ...f, quiet_hours_end: parseInt(e.target.value) || 0 }))} /></div>
          </div>
          <div>
            <Label>Default sequence</Label>
            <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.default_sequence_id ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, default_sequence_id: e.target.value }))}>
              <option value="">— none —</option>
              {(sequences ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_active ? "" : " (inactive)"}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-base">Meetings (MS Bookings)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
            Booking rules (Tue & Thu, 08:30–15:30, 30-min slots) are enforced inside Microsoft Bookings on Shaun's calendar — not in this app.
            Leads receive this booking link in every outreach reply; Teams join links arrive automatically in the inbox.
          </div>
          <div><Label>Bookings link</Label>
            <div className="flex gap-2">
              <Input value={form.bookings_url ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, bookings_url: e.target.value }))} />
              {form.bookings_url && (
                <Button size="sm" variant="outline" asChild>
                  <a href={form.bookings_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1" />Open</a>
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>CTA label</Label><Input value={form.bookings_cta_label ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, bookings_cta_label: e.target.value }))} /></div>
            <div><Label>Timezone (display)</Label><Input value={form.meeting_timezone ?? "Africa/Johannesburg"} onChange={(e) => setForm((f: any) => ({ ...f, meeting_timezone: e.target.value }))} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-base">Email notifications</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>Enable notifications</Label><p className="text-xs text-muted-foreground">Threshold alerts + optional daily digest emailed to you.</p></div>
            <Switch checked={!!form.notify_enabled} onCheckedChange={(v) => setForm((f: any) => ({ ...f, notify_enabled: v }))} />
          </div>
          <div><Label>Notify email</Label><Input value={form.notify_email ?? ""} onChange={(e) => setForm((f: any) => ({ ...f, notify_email: e.target.value }))} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Pending queue ≥</Label><Input type="number" min={1} value={form.notify_pending_threshold ?? 10} onChange={(e) => setForm((f: any) => ({ ...f, notify_pending_threshold: parseInt(e.target.value) || 10 }))} /></div>
            <div><Label>Unhandled inbox ≥</Label><Input type="number" min={1} value={form.notify_inbox_threshold ?? 5} onChange={(e) => setForm((f: any) => ({ ...f, notify_inbox_threshold: parseInt(e.target.value) || 5 }))} /></div>
            <div><Label>Min interval (h)</Label><Input type="number" min={1} value={form.notify_min_interval_hours ?? 6} onChange={(e) => setForm((f: any) => ({ ...f, notify_min_interval_hours: parseInt(e.target.value) || 6 }))} /></div>
          </div>
          <div className="flex items-center justify-between">
            <div><Label>Daily digest (08:00)</Label><p className="text-xs text-muted-foreground">One-line summary every morning.</p></div>
            <Switch checked={!!form.notify_daily_digest} onCheckedChange={(v) => setForm((f: any) => ({ ...f, notify_daily_digest: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Target regions (comma-separated)</Label><Input value={regions} onChange={(e) => setForm((f: any) => ({ ...f, target_regions: e.target.value }))} placeholder="South Africa, Namibia, Botswana" /></div>
          <div><Label>Blocked domains (comma-separated)</Label><Input value={blocked} onChange={(e) => setForm((f: any) => ({ ...f, blocked_domains: e.target.value }))} placeholder="example.com, gmail.com" /></div>
        </CardContent>
      </Card>

      <div className="md:col-span-2 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save settings"}</Button>
      </div>

      <DiscoveryPresetsCard />

      <div className="md:col-span-2">
        <BlocklistManager />
      </div>
    </div>
  );
}
