import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CandidateNotesPanel } from "./CandidateNotesPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function EditCandidateDialog({ candidate, open, onClose, onSaved }: {
  candidate: any | null; open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [meetingDraft, setMeetingDraft] = useState({ scheduled_at: "", teams_join_url: "" });
  const [bookingSaving, setBookingSaving] = useState(false);

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

  const markMeetingBooked = async () => {
    if (!candidate?.created_lead_id) {
      toast({ title: "Promote candidate first", variant: "destructive" });
      return;
    }
    if (!meetingDraft.scheduled_at) {
      toast({ title: "Pick a date/time", variant: "destructive" });
      return;
    }
    setBookingSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("meetings").insert({
        lead_id: candidate.created_lead_id,
        candidate_id: candidate.id,
        scheduled_at: new Date(meetingDraft.scheduled_at).toISOString(),
        teams_join_url: meetingDraft.teams_join_url || null,
        source: "manual",
        status: "scheduled",
        created_by: user?.id,
      });
      if (error) throw error;
      await (supabase as any).from("agent_leads").update({ status: "meeting_booked" }).eq("id", candidate.created_lead_id);
      await (supabase as any).from("candidate_notes").insert({
        candidate_id: candidate.id,
        lead_id: candidate.created_lead_id,
        author_role: "admin",
        author_id: user?.id,
        kind: "system_event",
        body: `Meeting manually marked: ${new Date(meetingDraft.scheduled_at).toLocaleString()}`,
      });
      toast({ title: "Meeting recorded" });
      setMeetingDraft({ scheduled_at: "", teams_join_url: "" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setBookingSaving(false); }
  };

  if (!candidate) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Candidate · {candidate.company_name}</DialogTitle></DialogHeader>
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="meeting">Meeting</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
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
          </TabsContent>
          <TabsContent value="notes">
            <CandidateNotesPanel candidateId={candidate.id} leadId={candidate.created_lead_id} />
          </TabsContent>
          <TabsContent value="meeting">
            <div className="space-y-3 text-sm">
              <div className="text-xs text-muted-foreground">
                Meetings are normally captured automatically when a lead books via the MS Bookings link.
                Use this form only as a manual fallback.
              </div>
              <div><Label>Scheduled at</Label><Input type="datetime-local" value={meetingDraft.scheduled_at} onChange={(e) => setMeetingDraft((d) => ({ ...d, scheduled_at: e.target.value }))} /></div>
              <div><Label>Teams join URL (optional)</Label><Input value={meetingDraft.teams_join_url} onChange={(e) => setMeetingDraft((d) => ({ ...d, teams_join_url: e.target.value }))} placeholder="https://teams.microsoft.com/l/meetup-join/…" /></div>
              <div className="flex justify-end">
                <Button onClick={markMeetingBooked} disabled={bookingSaving}>{bookingSaving ? "Saving…" : "Mark meeting booked"}</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Close</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save & approve"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
