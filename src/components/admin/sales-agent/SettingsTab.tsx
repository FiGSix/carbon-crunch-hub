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
      const { error } = await (supabase as any).from("sales_agent_settings").update({
        autopilot_discovery: form.autopilot_discovery,
        autopilot_outreach: form.autopilot_outreach,
        daily_send_cap: form.daily_send_cap,
        quiet_hours_start: form.quiet_hours_start,
        quiet_hours_end: form.quiet_hours_end,
        score_threshold: form.score_threshold,
        default_sequence_id: form.default_sequence_id,
        blocked_domains: typeof form.blocked_domains === "string" ? form.blocked_domains.split(",").map((s: string) => s.trim()).filter(Boolean) : form.blocked_domains,
        target_regions: typeof form.target_regions === "string" ? form.target_regions.split(",").map((s: string) => s.trim()).filter(Boolean) : form.target_regions,
      }).eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Settings saved" }); qc.invalidateQueries({ queryKey: ["sales-agent-settings"] }); },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
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
          <div>
            <Label>Score threshold ({form.score_threshold})</Label>
            <Input type="number" min={0} max={100} value={form.score_threshold ?? 60} onChange={(e) => setForm((f: any) => ({ ...f, score_threshold: parseInt(e.target.value) || 0 }))} />
            <p className="text-xs text-muted-foreground mt-1">Applies to new discoveries only. Use "Approve all ≥ threshold" in the Approval Queue to backfill existing pending candidates.</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={async () => {
              const { count } = await (supabase as any).from("discovery_candidates").select("id", { count: "exact", head: true }).eq("status", "pending").gte("score", form.score_threshold ?? 60);
              toast({ title: `${count ?? 0} pending candidate(s) would qualify`, description: `At threshold ${form.score_threshold ?? 60}` });
            }}>Test promote (preview)</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Send controls</CardTitle></CardHeader>
        <CardContent className="space-y-4">
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
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Target regions (comma-separated)</Label><Input value={regions} onChange={(e) => setForm((f: any) => ({ ...f, target_regions: e.target.value }))} placeholder="South Africa, Namibia, Botswana" /></div>
          <div><Label>Blocked domains (comma-separated)</Label><Input value={blocked} onChange={(e) => setForm((f: any) => ({ ...f, blocked_domains: e.target.value }))} placeholder="example.com, gmail.com" /></div>
        </CardContent>
      </Card>

      <div className="md:col-span-2 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save settings"}</Button>
      </div>
    </div>
  );
}
