import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Bot, User, Mail, Sparkles } from "lucide-react";

const roleIcon = (role: string) => {
  if (role === "ai") return <Bot className="h-3.5 w-3.5" />;
  if (role === "system") return <Sparkles className="h-3.5 w-3.5" />;
  if (role === "inbound") return <Mail className="h-3.5 w-3.5" />;
  return <User className="h-3.5 w-3.5" />;
};

export function CandidateNotesPanel({ candidateId, leadId }: { candidateId?: string | null; leadId?: string | null }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  const queryKey = ["candidate-notes", candidateId, leadId];
  const { data: notes, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = (supabase as any).from("candidate_notes").select("*").order("created_at", { ascending: false }).limit(50);
      if (candidateId) q = q.or(`candidate_id.eq.${candidateId}${leadId ? `,lead_id.eq.${leadId}` : ""}`);
      else if (leadId) q = q.eq("lead_id", leadId);
      const { data } = await q;
      return (data ?? []) as any[];
    },
    enabled: !!(candidateId || leadId),
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("candidate_notes").insert({
        candidate_id: candidateId ?? null,
        lead_id: leadId ?? null,
        author_id: user?.id,
        author_role: "admin",
        kind: "comment",
        body: draft.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => { setDraft(""); qc.invalidateQueries({ queryKey }); toast({ title: "Note added" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium"><MessageSquare className="h-4 w-4" /> Notes & activity</div>
      <div className="space-y-2">
        <Textarea rows={2} placeholder="Add a note for this candidate…" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <div className="flex justify-end">
          <Button size="sm" onClick={() => add.mutate()} disabled={!draft.trim() || add.isPending}>{add.isPending ? "Adding…" : "Add note"}</Button>
        </div>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
        {(notes ?? []).map((n) => (
          <div key={n.id} className="text-xs border rounded-md p-2 bg-muted/30">
            <div className="flex items-center gap-1.5 mb-1">
              {roleIcon(n.author_role)}
              <Badge variant="outline" className="h-4 text-[10px] capitalize">{n.author_role}</Badge>
              <Badge variant="secondary" className="h-4 text-[10px] capitalize">{n.kind.replace("_", " ")}</Badge>
              <span className="ml-auto text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
            </div>
            <div className="whitespace-pre-wrap leading-snug">{n.body}</div>
          </div>
        ))}
        {!isLoading && (notes ?? []).length === 0 && <div className="text-xs text-muted-foreground">No notes yet.</div>}
      </div>
    </div>
  );
}
