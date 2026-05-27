import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Play } from "lucide-react";

type Preset = { id: string; query: string; location: string; limit_count: number; active: boolean; last_run_at: string | null };

export function DiscoveryPresetsCard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ query: "", location: "", limit_count: 10 });

  const { data: presets } = useQuery({
    queryKey: ["discovery-presets"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("sales_agent_discovery_presets").select("*").order("created_at", { ascending: false });
      return (data ?? []) as Preset[];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!draft.query || !draft.location) throw new Error("Query and location required");
      const { error } = await (supabase as any).from("sales_agent_discovery_presets").insert(draft);
      if (error) throw error;
    },
    onSuccess: () => { setDraft({ query: "", location: "", limit_count: 10 }); qc.invalidateQueries({ queryKey: ["discovery-presets"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any).from("sales_agent_discovery_presets").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discovery-presets"] }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("sales_agent_discovery_presets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discovery-presets"] }),
  });

  const runNow = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("discovery-cron", { body: {} });
      if (error) throw error;
    },
    onSuccess: () => toast({ title: "Discovery run started" }),
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Card className="md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Discovery presets</CardTitle>
        <Button size="sm" variant="outline" onClick={() => runNow.mutate()} disabled={runNow.isPending}>
          <Play className="h-3.5 w-3.5 mr-1" />{runNow.isPending ? "Running…" : "Run discovery now"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Daily cron iterates each active preset, then auto-promotes candidates above your score threshold.</p>
        <div className="space-y-2">
          {(presets ?? []).map((p) => (
            <div key={p.id} className="flex items-center gap-2 border rounded-md p-2">
              <Switch checked={p.active} onCheckedChange={(v) => toggle.mutate({ id: p.id, active: v })} />
              <div className="flex-1 text-sm">
                <div className="font-medium">{p.query}</div>
                <div className="text-xs text-muted-foreground">{p.location} · limit {p.limit_count}{p.last_run_at ? ` · last run ${new Date(p.last_run_at).toLocaleString()}` : " · never run"}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-12 gap-2 pt-2 border-t">
          <Input className="col-span-5" placeholder="Query (e.g. EPC solar installer)" value={draft.query} onChange={(e) => setDraft({ ...draft, query: e.target.value })} />
          <Input className="col-span-5" placeholder="Location (e.g. Gauteng, South Africa)" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
          <Input className="col-span-1" type="number" min={1} max={100} value={draft.limit_count} onChange={(e) => setDraft({ ...draft, limit_count: Math.min(100, Math.max(1, parseInt(e.target.value) || 10)) })} />
          <Button className="col-span-1" size="icon" onClick={() => add.mutate()} disabled={add.isPending}><Plus className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}
