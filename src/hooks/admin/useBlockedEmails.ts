import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";

export interface BlockedEmail {
  id: string;
  email: string;
  reason: string;
  notes: string | null;
  source: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SuggestedBlock {
  client_email: string;
  client_name: string | null;
  unsigned_count: number;
}

const QUERY_KEY = ["admin", "blocked-emails"];
const SUGGEST_KEY = ["admin", "blocked-emails", "suggestions"];

export function useBlockedEmails() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<BlockedEmail[]> => {
      const { data, error } = await (supabase as any)
        .from("client_email_suppressions")
        .select("id,email,reason,notes,source,created_by,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as BlockedEmail[]) ?? [];
    },
  });
}

export function useAddBlockedEmail() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      email: string;
      reason?: string;
      notes?: string;
    }) => {
      const email = input.email.trim().toLowerCase();
      if (!email) throw new Error("Email is required");
      const { error } = await (supabase as any)
        .from("client_email_suppressions")
        .insert({
          email,
          reason: input.reason || "manual",
          notes: input.notes || null,
          source: "admin_ui",
          created_by: user?.id ?? null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Email blocked");
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: SUGGEST_KEY });
    },
    onError: (e: any) => {
      const msg = e?.message?.includes("duplicate")
        ? "This email is already blocked"
        : e?.message || "Failed to block email";
      toast.error(msg);
    },
  });
}

export function useRemoveBlockedEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("client_email_suppressions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Block removed");
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: SUGGEST_KEY });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to remove block"),
  });
}

/**
 * Suggested blocks: clients with 2+ unsigned proposals, not yet suppressed.
 * Reuses the portfolio_reminder_candidates view.
 */
export function useSuggestedBlocks() {
  return useQuery({
    queryKey: SUGGEST_KEY,
    queryFn: async (): Promise<SuggestedBlock[]> => {
      const [{ data: candidates, error: cErr }, { data: blocked, error: bErr }] =
        await Promise.all([
          (supabase as any)
            .from("portfolio_reminder_candidates")
            .select("client_email,client_name,unsigned_count")
            .gte("unsigned_count", 2),
          (supabase as any)
            .from("client_email_suppressions")
            .select("email"),
        ]);
      if (cErr) throw cErr;
      if (bErr) throw bErr;
      const blockedSet = new Set(
        ((blocked as Array<{ email: string }>) ?? []).map((b) =>
          b.email.toLowerCase()
        )
      );
      const rows = (candidates as Array<SuggestedBlock>) ?? [];
      return rows
        .filter(
          (r) => r.client_email && !blockedSet.has(r.client_email.toLowerCase())
        )
        .slice(0, 25);
    },
  });
}
