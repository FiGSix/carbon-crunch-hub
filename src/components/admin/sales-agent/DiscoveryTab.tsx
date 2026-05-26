import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export function DiscoveryTab({ onReviewPending }: { onReviewPending?: () => void } = {}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [query, setQuery] = useState("solar EPC installers");
  const [location, setLocation] = useState("South Africa");
  const [limit, setLimit] = useState(10);

  const { data: runs } = useQuery({
    queryKey: ["sales-agent-discovery-runs"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("discovery_runs").select("*").order("created_at", { ascending: false }).limit(20);
      return (data ?? []) as any[];
    },
    refetchInterval: 15_000,
  });

  const discover = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("discover-leads", { body: { query, location, limit } });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      toast({ title: "Discovery complete", description: d?.message ?? "Done" });
      qc.invalidateQueries({ queryKey: ["sales-agent-discovery-runs"] });
      qc.invalidateQueries({ queryKey: ["sales-agent-candidates"] });
      qc.invalidateQueries({ queryKey: ["sales-agent-pending-count"] });
      qc.invalidateQueries({ queryKey: ["sales-agent-pipeline"] });
      qc.invalidateQueries({ queryKey: ["sales-agent-funnel"] });
    },
    onError: (e: any) => toast({ title: "Discovery failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="md:col-span-1">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> Run Discovery</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label className="text-xs">Search query</Label><Input value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <div><Label className="text-xs">Region / location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
          <div><Label className="text-xs">Max leads</Label><Input type="number" min={1} max={25} value={limit} onChange={(e) => setLimit(parseInt(e.target.value) || 10)} /></div>
          <Button className="w-full" onClick={() => discover.mutate()} disabled={discover.isPending}>
            {discover.isPending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Discovering…</> : <>Start discovery</>}
          </Button>
          <p className="text-xs text-muted-foreground">Uses Firecrawl + AI to find EPCs and add net-new ones directly to the pipeline.</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader><CardTitle className="text-base">Recent runs</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(runs ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-md border text-sm">
                <div>
                  <div className="font-medium">{r.query} <span className="text-muted-foreground font-normal">· {r.region}</span></div>
                  <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs">found <strong>{r.leads_found}</strong> · new <strong>{r.leads_approved}</strong></span>
                  <Badge variant={r.status === "completed" ? "secondary" : r.status === "failed" ? "destructive" : "outline"}>{r.status}</Badge>
                </div>
              </div>
            ))}
            {(runs ?? []).length === 0 && <div className="text-muted-foreground text-sm py-4 text-center">No runs yet — kick one off on the left.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
