import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sequenceId: string;
  stepIndex: number;
  variant?: any;
}

const TOKENS = ["{{first_name}}", "{{contact_name}}", "{{company_name}}", "{{location}}", "{{bookings_url}}", "{{bookings_cta_label}}"];

export function VariantEditorDialog({ open, onOpenChange, sequenceId, stepIndex, variant }: Props) {
  const qc = useQueryClient();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setSubject(variant?.subject ?? "");
    setBody(variant?.body_template ?? "");
    setCtaLabel(variant?.cta_label ?? "");
    setCtaUrl(variant?.cta_url ?? "");
    setNotes(variant?.notes ?? "");
  }, [variant, open]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        sequence_id: sequenceId,
        step_index: stepIndex,
        subject,
        body_template: body,
        cta_label: ctaLabel || null,
        cta_url: ctaUrl || null,
        notes: notes || null,
      };
      if (variant?.id) {
        const { error } = await (supabase as any).from("outreach_template_variants").update(payload).eq("id", variant.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("outreach_template_variants").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(variant?.id ? "Variant updated" : "Variant created");
      qc.invalidateQueries({ queryKey: ["outreach-variants"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Save failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{variant?.id ? "Edit variant" : "New variant"} · Step {stepIndex + 1}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="font-mono text-xs" />
            <div className="flex flex-wrap gap-1 pt-1">
              {TOKENS.map((t) => (
                <button key={t} type="button" className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-accent" onClick={() => setBody((b) => b + t)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>CTA label (optional)</Label><Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} /></div>
            <div className="space-y-1"><Label>CTA URL (optional)</Label><Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>Notes (internal)</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !subject || !body}>{save.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
