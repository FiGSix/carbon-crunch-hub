import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";

export interface CloseoutItem {
  proposal_id: string;
  title: string;
  client_id: string | null;
  agent_id: string | null;
  bucket: string;
  days_since_sent: number;
  estimated_client_revenue: number;
  archived_at: string | null;
  client_name?: string | null;
  client_email?: string | null;
}

/**
 * Step 6 — Close-out queue. Surfaces proposals classified `dead` with
 * days_since_sent ≥ 30 and not yet archived. Agent can archive (soft
 * close-out) or skip. Also returns recently-archived items for one-click
 * reactivation.
 */
export function useCloseoutQueue(limit = 10) {
  const { user, userRole } = useAuth();
  const enabled = !!user?.id && (userRole === "agent" || userRole === "admin");

  return useQuery({
    queryKey: ["closeout-queue", user?.id, userRole, limit],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      let query = (supabase as any)
        .from("proposal_engagement_buckets")
        .select(
          "proposal_id, title, client_id, agent_id, bucket, days_since_sent, estimated_client_revenue, archived_at"
        )
        .eq("bucket", "dead")
        .is("archived_at", null)
        .gte("days_since_sent", 30);

      // Agents only see their own proposals; admins see all.
      if (userRole === "agent" && user?.id) {
        query = query.eq("agent_id", user.id);
      }

      const { data: buckets, error } = await query
        .order("days_since_sent", { ascending: false })
        .limit(limit);

      if (error) {
        logger.error("Failed to load closeout queue", error);
        throw error;
      }

      const rows = (buckets ?? []) as CloseoutItem[];
      const clientIds = Array.from(
        new Set(rows.map((r) => r.client_id).filter(Boolean) as string[])
      );

      if (clientIds.length === 0) return rows;

      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, first_name, last_name, email, company_name")
        .in("id", clientIds);

      const map = new Map((clientsData ?? []).map((c: any) => [c.id, c]));
      return rows.map((r) => {
        const c: any = r.client_id ? map.get(r.client_id) : null;
        const name = c
          ? [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name
          : null;
        return { ...r, client_name: name, client_email: c?.email ?? null };
      });
    },
  });
}

export function useArchiveProposal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase
        .from("proposals")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", proposalId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Proposal archived", description: "Moved out of active pipeline. Reactivate any time." });
      qc.invalidateQueries({ queryKey: ["closeout-queue"] });
      qc.invalidateQueries({ queryKey: ["agent-warm-cards"] });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't archive", description: e?.message ?? "Unknown error", variant: "destructive" }),
  });
}

export function useReactivateProposal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase
        .from("proposals")
        .update({ archived_at: null })
        .eq("id", proposalId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Proposal reactivated", description: "Back in your active pipeline." });
      qc.invalidateQueries({ queryKey: ["closeout-queue"] });
      qc.invalidateQueries({ queryKey: ["agent-warm-cards"] });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't reactivate", description: e?.message ?? "Unknown error", variant: "destructive" }),
  });
}
