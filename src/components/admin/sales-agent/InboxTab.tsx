import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, Sparkles, RefreshCw } from "lucide-react";

const intentVariant = (intent: string): any => {
  if (intent === "interested" || intent === "meeting_booked") return "default";
  if (intent === "question") return "secondary";
  if (intent === "not_interested" || intent === "unsubscribe" || intent === "bounce") return "destructive";
  return "outline";
};

export function InboxTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["sales-agent-inbox"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("inbound_messages").select("*").order("received_at", { ascending: false }).limit(100);
      return (data ?? []) as any[];
    },
    refetchInterval: 30_000,
  });

  const selected = (messages ?? []).find((m: any) => m.id === selectedId) ?? (messages?.[0] ?? null);

  const { data: draft } = useQuery({
    queryKey: ["inbox-draft", selected?.id],
    queryFn: async () => {
      if (!selected?.id) return null;
      const { data } = await (supabase as any).from("outreach_replies").select("*").eq("inbound_message_id", selected.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!selected?.id,
  });

  const [draftBody, setDraftBody] = useState("");
  // sync local state when draft changes
  if (draft && draft.id && draftBody === "" && draft.status === "draft") {
    setDraftBody(draft.draft_body ?? "");
  }

  const poll = useMutation({
    mutationFn: async () => { await supabase.functions.invoke("poll-inbound", { body: {} }); },
    onSuccess: () => { toast({ title: "Inbox refreshed" }); qc.invalidateQueries({ queryKey: ["sales-agent-inbox"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const generate = useMutation({
    mutationFn: async () => { await supabase.functions.invoke("sales-agent-draft-reply", { body: { inbound_message_id: selected.id, auto_send: false } }); },
    onSuccess: () => { setDraftBody(""); qc.invalidateQueries({ queryKey: ["inbox-draft", selected?.id] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const send = useMutation({
    mutationFn: async () => {
      // mark draft as sent + push via draft-reply with auto_send
      if (draft && draft.status === "draft") {
        await (supabase as any).from("outreach_replies").update({ draft_body: draftBody }).eq("id", draft.id);
      }
      await supabase.functions.invoke("sales-agent-draft-reply", { body: { inbound_message_id: selected.id, auto_send: true } });
    },
    onSuccess: () => { toast({ title: "Reply sent" }); qc.invalidateQueries({ queryKey: ["inbox-draft", selected?.id] }); qc.invalidateQueries({ queryKey: ["sales-agent-inbox"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="grid gap-4 md:grid-cols-[320px_1fr]">
      <Card>
        <CardContent className="p-2">
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="text-sm font-medium flex items-center gap-2"><Mail className="h-4 w-4" /> Inbox</div>
            <Button size="sm" variant="ghost" onClick={() => poll.mutate()} disabled={poll.isPending}>
              <RefreshCw className={`h-3.5 w-3.5 ${poll.isPending ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <div className="space-y-1 max-h-[600px] overflow-y-auto">
            {isLoading && <div className="text-xs text-muted-foreground p-2">Loading…</div>}
            {!isLoading && (messages ?? []).length === 0 && (
              <div className="text-xs text-muted-foreground p-2">No replies yet. Click refresh to poll Outlook.</div>
            )}
            {(messages ?? []).map((m: any) => (
              <button
                key={m.id}
                onClick={() => { setSelectedId(m.id); setDraftBody(""); }}
                className={`w-full text-left rounded p-2 text-xs hover:bg-muted/50 ${selected?.id === m.id ? "bg-muted" : ""}`}
              >
                <div className="font-medium truncate">{m.from_name ?? m.from_email}</div>
                <div className="truncate text-muted-foreground">{m.subject}</div>
                <div className="flex items-center gap-1 mt-1">
                  {m.intent && <Badge variant={intentVariant(m.intent)} className="h-4 text-[10px] capitalize">{m.intent.replace("_", " ")}</Badge>}
                  <span className="ml-auto text-muted-foreground">{new Date(m.received_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {!selected ? (
            <div className="text-sm text-muted-foreground">Select a message.</div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="font-medium">{selected.subject}</div>
                <div className="text-xs text-muted-foreground">
                  From {selected.from_email} · {new Date(selected.received_at).toLocaleString()}
                </div>
                {selected.intent && (
                  <div className="mt-1"><Badge variant={intentVariant(selected.intent)} className="capitalize">{selected.intent.replace("_", " ")} · {selected.confidence ?? 0}%</Badge></div>
                )}
              </div>
              <div className="border rounded-md p-3 max-h-72 overflow-y-auto text-sm whitespace-pre-wrap bg-muted/30">
                {selected.body_text ?? "(no body)"}
              </div>

              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">Reply</div>
                  <Button size="sm" variant="outline" onClick={() => generate.mutate()} disabled={generate.isPending}>
                    <Sparkles className="h-3.5 w-3.5 mr-1" /> {generate.isPending ? "Drafting…" : "AI draft"}
                  </Button>
                </div>
                <Textarea rows={8} value={draftBody || draft?.draft_body || ""} onChange={(e) => setDraftBody(e.target.value)} placeholder="Type a reply or click AI draft" />
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={() => send.mutate()} disabled={send.isPending || !(draftBody || draft?.draft_body)}>
                    <Send className="h-3.5 w-3.5 mr-1" /> {send.isPending ? "Sending…" : "Send via Outlook"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
