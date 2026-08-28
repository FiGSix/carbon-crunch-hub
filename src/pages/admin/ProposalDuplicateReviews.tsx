import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface ReviewRow {
  id: string;
  created_at: string;
  status: string;
  proposed_title: string;
  proposed_address: string | null;
  proposed_system_size_kwp: number | null;
  proposed_commissioning_date: string | null;
  matched_proposal_id: string;
  match_reasons: string[];
  submitting_agent_id: string | null;
}

export default function ProposalDuplicateReviews() {
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<{ row: ReviewRow; value: "approved_separate" | "rejected_duplicate" } | null>(null);
  const [reason, setReason] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["proposal-duplicate-reviews"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("proposal_duplicate_reviews").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReviewRow[];
    },
  });
  const mutate = useMutation({
    mutationFn: async () => {
      if (!decision || !reason.trim()) throw new Error("A decision reason is required.");
      const { error } = await (supabase as any).rpc("decide_proposal_duplicate_review", { p_review_id: decision.row.id, p_decision: decision.value, p_reason: reason.trim() });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Review decision saved");
      setDecision(null); setReason("");
      await queryClient.invalidateQueries({ queryKey: ["proposal-duplicate-reviews"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const pending = data.filter((row) => row.status === "pending");

  return <DashboardLayout><div className="space-y-6">
    <div><h1 className="text-3xl font-bold tracking-tight">Duplicate project reviews</h1><p className="text-muted-foreground">Resolve sites blocked before a second partner can claim the same installation.</p></div>
    <div className="rounded-lg border bg-card">
      <Table><TableHeader><TableRow><TableHead>Submitted</TableHead><TableHead>Proposed project</TableHead><TableHead>Why flagged</TableHead><TableHead>Existing project</TableHead><TableHead className="text-right">Decision</TableHead></TableRow></TableHeader>
      <TableBody>{isLoading ? <TableRow><TableCell colSpan={5}>Loading reviews…</TableCell></TableRow> : pending.length === 0 ? <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">No duplicate projects are awaiting review.</TableCell></TableRow> : pending.map((row) => <TableRow key={row.id}>
        <TableCell className="whitespace-nowrap">{new Date(row.created_at).toLocaleDateString("en-ZA")}</TableCell>
        <TableCell><div className="font-medium">{row.proposed_title}</div><div className="max-w-xs text-xs text-muted-foreground">{row.proposed_address || "Address not supplied"} · {row.proposed_system_size_kwp?.toLocaleString() ?? "—"} kWp</div></TableCell>
        <TableCell><div className="flex flex-wrap gap-1">{row.match_reasons.map((item) => <Badge key={item} variant="outline">{item.replaceAll("_", " ")}</Badge>)}</div></TableCell>
        <TableCell><Button asChild size="sm" variant="ghost"><Link to={`/proposals/${row.matched_proposal_id}`}>Open <ExternalLink className="ml-1 h-3.5 w-3.5" /></Link></Button></TableCell>
        <TableCell><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setDecision({ row, value: "rejected_duplicate" })}>Confirm duplicate</Button><Button size="sm" onClick={() => setDecision({ row, value: "approved_separate" })}>Allow separate site</Button></div></TableCell>
      </TableRow>)}</TableBody></Table>
    </div>
    <Dialog open={Boolean(decision)} onOpenChange={(open) => { if (!open) { setDecision(null); setReason(""); } }}><DialogContent><DialogHeader><DialogTitle>{decision?.value === "approved_separate" ? "Allow as a separate site?" : "Confirm duplicate?"}</DialogTitle><DialogDescription>This decision is recorded in the audit history. Enter the evidence or reason for the decision.</DialogDescription></DialogHeader><div className="flex items-start gap-2 rounded-md border p-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 text-crunch-yellow" /><span>{decision?.row.proposed_title}</span></div><Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Decision reason" /><DialogFooter><Button variant="outline" onClick={() => setDecision(null)}>Cancel</Button><Button disabled={!reason.trim() || mutate.isPending} onClick={() => mutate.mutate()}>Save decision</Button></DialogFooter></DialogContent></Dialog>
  </div></DashboardLayout>;
}
