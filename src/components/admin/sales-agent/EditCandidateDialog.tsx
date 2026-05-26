import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function EditCandidateDialog({ candidate, open, onClose, onSaved }: {
  candidate: any | null; open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (candidate) setForm({
      email: candidate.email ?? "",
      contact_name: candidate.contact_name ?? "",
      phone: candidate.phone ?? "",
      location: candidate.location ?? "",
      notes: candidate.enrichment?.notes ?? "",
    });
  }, [candidate]);

  const save = async () => {
    if (!candidate) return;
    setSaving(true);
    try {
      const newEnrichment = { ...(candidate.enrichment ?? {}), notes: form.notes };
      const { error: updErr } = await (supabase as any)
        .from("discovery_candidates")
        .update({
          email: form.email || null,
          contact_name: form.contact_name || null,
          phone: form.phone || null,
          location: form.location || null,
          enrichment: newEnrichment,
        })
        .eq("id", candidate.id);
      if (updErr) throw updErr;

      const { error: rpcErr } = await (supabase as any).rpc("promote_discovery_candidate", { _candidate_id: candidate.id });
      if (rpcErr) throw rpcErr;

      toast({ title: "Saved & approved" });
      onSaved();
      onClose();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (!candidate) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit & approve candidate</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-muted/40">
            <div><Label className="text-xs text-muted-foreground">Company</Label><div className="font-medium">{candidate.company_name}</div></div>
            <div><Label className="text-xs text-muted-foreground">Score</Label><div className="font-medium">{candidate.score}</div></div>
            <div className="col-span-2"><Label className="text-xs text-muted-foreground">Website</Label><div className="text-xs truncate">{candidate.website ?? "—"}</div></div>
          </div>
          <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Contact name</Label><Input value={form.contact_name} onChange={(e) => setForm((f: any) => ({ ...f, contact_name: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm((f: any) => ({ ...f, location: e.target.value }))} /></div>
          <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save & approve"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
