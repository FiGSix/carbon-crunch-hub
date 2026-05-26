import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Archive, Play } from "lucide-react";
import { toast } from "sonner";

export function LearningTab() {
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["variant-stats"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("v_outreach_variant_stats").select("*");
      return (data ?? []) as any[];
    },
    refetchInterval: 30_000,
  });

  const { data: sequences } = useQuery({
    queryKey: ["sales-agent-sequences"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("outreach_sequences").select("id,name,steps");
      return (data ?? []) as any[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("outreach_template_variants").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["variant-stats"] });
      qc.invalidateQueries({ queryKey: ["outreach-variants"] });
    },
  });

  const runTune = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).functions.invoke("sales-agent-tune", { body: {} });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Auto-tune run complete");
      qc.invalidateQueries({ queryKey: ["variant-stats"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Tune failed"),
  });

  const bySeq = new Map<string, any[]>();
  (stats ?? []).forEach((r) => {
    const k = `${r.sequence_id}::${r.step_index}`;
    bySeq.set(k, [...(bySeq.get(k) ?? []), r]);
  });

  const seqName = (id: string) => (sequences ?? []).find((s: any) => s.id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Variant performance — bandit picks winners automatically. Manual overrides apply immediately.</div>
        <Button size="sm" variant="outline" onClick={() => runTune.mutate()} disabled={runTune.isPending}>
          {runTune.isPending ? "Running…" : "Run auto-tune now"}
        </Button>
      </div>

      {Array.from(bySeq.entries()).map(([key, rows]) => {
        const [seqId, stepIdx] = key.split("::");
        const sorted = [...rows].sort((a, b) => b.positive_reply_rate - a.positive_reply_rate);
        const leader = sorted.find((r) => r.sample_size_ok);
        return (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {seqName(seqId)} · Step {Number(stepIdx) + 1}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                    <TableHead className="text-right">Reply</TableHead>
                    <TableHead className="text-right">Positive</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((r) => (
                    <TableRow key={r.variant_id}>
                      <TableCell className="max-w-[300px] truncate">
                        {leader?.variant_id === r.variant_id && <Trophy className="h-3 w-3 inline mr-1 text-amber-500" />}
                        {r.subject}
                      </TableCell>
                      <TableCell><Badge variant={r.status === "active" ? "default" : r.status === "paused" ? "secondary" : "outline"} className="text-[10px]">{r.status}</Badge></TableCell>
                      <TableCell className="text-right tabular-nums">{r.sent}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.open_rate}%</TableCell>
                      <TableCell className="text-right tabular-nums">{r.reply_rate}%</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{r.positive_reply_rate}%</TableCell>
                      <TableCell className="text-right">
                        {r.status !== "active" && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setStatus.mutate({ id: r.variant_id, status: "active" })}><Play className="h-3 w-3" /></Button>}
                        {r.status !== "retired" && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setStatus.mutate({ id: r.variant_id, status: "retired" })}><Archive className="h-3 w-3" /></Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
      {bySeq.size === 0 && <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No variants yet — add some in the Sequences tab.</CardContent></Card>}
    </div>
  );
}
