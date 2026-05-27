import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Plus, Pause, Play, Archive } from "lucide-react";
import { VariantEditorDialog } from "./VariantEditorDialog";
import { toast } from "sonner";

export function SequencesTab() {
  const qc = useQueryClient();
  const [editor, setEditor] = useState<{ open: boolean; sequenceId: string; stepIndex: number; variant?: any }>({ open: false, sequenceId: "", stepIndex: 0 });
  const [newSeqOpen, setNewSeqOpen] = useState(false);
  const [newSeq, setNewSeq] = useState({ name: "", description: "", dayOffsets: "0, 3, 7" });

  const { data: sequences } = useQuery({
    queryKey: ["sales-agent-sequences"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("outreach_sequences").select("*").order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: variants } = useQuery({
    queryKey: ["outreach-variants"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("outreach_template_variants").select("*").order("created_at");
      return (data ?? []) as any[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("outreach_template_variants").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Variant updated");
      qc.invalidateQueries({ queryKey: ["outreach-variants"] });
    },
  });

  return (
    <div className="space-y-4">
      {(sequences ?? []).map((s) => {
        const steps = Array.isArray(s.steps) ? s.steps : [];
        return (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {s.name}
                {s.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
                <Badge variant="outline" className="text-xs">{steps.length} steps</Badge>
              </CardTitle>
              {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {steps.map((st: any, i: number) => {
                  const stepVariants = (variants ?? []).filter((v) => v.sequence_id === s.id && v.step_index === i);
                  return (
                    <div key={i} className="border rounded-md p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium">Step {i + 1} · Day {st.day_offset} <span className="text-muted-foreground font-normal">· {stepVariants.length} variant{stepVariants.length === 1 ? "" : "s"}</span></div>
                        <Button size="sm" variant="outline" onClick={() => setEditor({ open: true, sequenceId: s.id, stepIndex: i })}>
                          <Plus className="h-3 w-3 mr-1" /> Variant
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {stepVariants.map((v) => (
                          <div key={v.id} className="border rounded p-2 text-xs bg-muted/30">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <Badge variant={v.status === "active" ? "default" : v.status === "paused" ? "secondary" : "outline"} className="text-[10px]">{v.status}</Badge>
                                <span className="font-medium truncate">{v.subject}</span>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditor({ open: true, sequenceId: s.id, stepIndex: i, variant: v })}><Pencil className="h-3 w-3" /></Button>
                                {v.status === "active" ? (
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setStatus.mutate({ id: v.id, status: "paused" })}><Pause className="h-3 w-3" /></Button>
                                ) : (
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setStatus.mutate({ id: v.id, status: "active" })}><Play className="h-3 w-3" /></Button>
                                )}
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setStatus.mutate({ id: v.id, status: "retired" })}><Archive className="h-3 w-3" /></Button>
                              </div>
                            </div>
                            <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-sans mt-1 line-clamp-4">{v.body_template}</pre>
                          </div>
                        ))}
                        {stepVariants.length === 0 && <div className="text-xs text-muted-foreground italic">No variants — add one to make this step send.</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
      {(sequences ?? []).length === 0 && (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No sequences yet.</CardContent></Card>
      )}
      <VariantEditorDialog
        open={editor.open}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        sequenceId={editor.sequenceId}
        stepIndex={editor.stepIndex}
        variant={editor.variant}
      />
    </div>
  );
}
