import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";

export type EngagementBucket =
  | "hot"
  | "warm"
  | "cold"
  | "dead"
  | "signed"
  | "archived"
  | "inactive";

export interface WarmCard {
  proposal_id: string;
  title: string;
  client_id: string | null;
  agent_id: string | null;
  bucket: EngagementBucket;
  days_since_sent: number | null;
  days_since_engagement: number | null;
  engagement_count: number | null;
  estimated_client_revenue: number;
  invitation_viewed_at: string | null;
  last_email_event_type: string | null;
  automation_paused: boolean | null;
  client_name: string | null;
  client_first_name: string | null;
  client_email: string | null;
  client_phone: string | null;
}

const BUCKET_PRIORITY: Record<EngagementBucket, number> = {
  hot: 0,
  warm: 1,
  cold: 2,
  dead: 3,
  signed: 9,
  archived: 9,
  inactive: 9,
};

/**
 * Agent warm cards — surfaces hot + warm unsigned proposals so the agent
 * can take the next human action (call / WhatsApp / email).
 *
 * Reads from `proposal_engagement_buckets` view (RLS via underlying
 * proposals table — agents see their own, admins see all).
 */
export function useAgentWarmCards(limit = 12) {
  const { user, userRole } = useAuth();
  const enabled = !!user?.id && (userRole === "agent" || userRole === "admin");

  return useQuery({
    queryKey: ["agent-warm-cards", user?.id, userRole, limit],
    enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<WarmCard[]> => {
      let query = (supabase as any)
        .from("proposal_engagement_buckets")
        .select(
          "proposal_id, title, client_id, client_reference_id, agent_id, bucket, days_since_sent, days_since_engagement, engagement_count, estimated_client_revenue, invitation_viewed_at, last_email_event_type, automation_paused"
        )
        .in("bucket", ["hot", "warm"]);

      // Agents only see their own proposals; admins see all.
      if (userRole === "agent" && user?.id) {
        query = query.eq("agent_id", user.id);
      }

      const { data: buckets, error } = await query
        .order("days_since_sent", { ascending: true })
        .limit(limit * 2); // over-fetch in case some clients are missing

      if (error) {
        logger.error("Failed to load engagement buckets", error);
        throw error;
      }

      const rows = (buckets ?? []) as (Omit<
        WarmCard,
        "client_name" | "client_first_name" | "client_email" | "client_phone"
      > & { client_reference_id: string | null })[];

      // Resolve a single effective client id per proposal — prefer
      // client_reference_id when set (newer linkage), fall back to client_id.
      const effectiveClientId = (r: { client_id: string | null; client_reference_id: string | null }) =>
        r.client_reference_id ?? r.client_id ?? null;

      const clientIds = Array.from(
        new Set(rows.map(effectiveClientId).filter(Boolean) as string[])
      );

      let clientsById = new Map<
        string,
        { first_name: string | null; last_name: string | null; email: string | null; phone: string | null; company_name: string | null }
      >();

      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from("clients")
          .select("id, first_name, last_name, email, phone, company_name")
          .in("id", clientIds);
        clientsById = new Map(
          (clientsData ?? []).map((c: any) => [c.id, c])
        );
      }

      const enriched: WarmCard[] = rows.map((r) => {
        const cid = effectiveClientId(r);
        const c = cid ? clientsById.get(cid) : undefined;
        const fullName =
          c && (c.first_name || c.last_name)
            ? [c.first_name, c.last_name].filter(Boolean).join(" ")
            : c?.company_name ?? null;
        return {
          ...r,
          client_id: cid,
          client_name: fullName,
          client_first_name: c?.first_name ?? null,
          client_email: c?.email ?? null,
          client_phone: c?.phone ?? null,
        };
      });

      enriched.sort((a, b) => {
        const p = BUCKET_PRIORITY[a.bucket] - BUCKET_PRIORITY[b.bucket];
        if (p !== 0) return p;
        // Within bucket, prioritise higher revenue, then fresher engagement
        if (b.estimated_client_revenue !== a.estimated_client_revenue) {
          return b.estimated_client_revenue - a.estimated_client_revenue;
        }
        return (a.days_since_engagement ?? 999) - (b.days_since_engagement ?? 999);
      });

      return enriched.slice(0, limit);
    },
  });
}
