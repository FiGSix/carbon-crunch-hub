import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";

export type NetworkSegment = "producing" | "needs_attention" | "not_activated";

export interface NetworkCompany {
  company_id: string;
  company_name: string;
  active_member_count: number;
  total_signed_mwp: number;
  linked_days: number | null;
  segment: NetworkSegment;
}

export interface SuperPartnerNetwork {
  companies: NetworkCompany[];
  networkMwp: number;
}

const DAY = 1000 * 60 * 60 * 24;

function classify(mwp: number, linkedDays: number | null): NetworkSegment {
  if (mwp > 0) return "producing";
  if (linkedDays != null && linkedDays >= 30) return "needs_attention";
  return "not_activated";
}

/**
 * Super Partner network, derived entirely from get_super_partner_companies.
 * No invented activation scores — segmentation uses signed MWp and the real
 * link date only.
 */
export function useSuperPartnerNetwork() {
  const { user, userRole } = useAuth();

  return useQuery({
    queryKey: ["super-partner-network", user?.id],
    enabled: !!user?.id && (userRole === "super_partner" || userRole === "admin"),
    staleTime: 60_000,
    queryFn: async (): Promise<SuperPartnerNetwork> => {
      const { data, error } = await supabase.rpc("get_super_partner_companies", {});
      if (error) throw error;

      const companies: NetworkCompany[] = ((data as any[]) ?? []).map((row) => {
        const mwp = Number(row.total_signed_mwp ?? 0);
        const linkedAt = row.super_partner_linked_at
          ? new Date(row.super_partner_linked_at)
          : null;
        const linkedDays = linkedAt
          ? Math.floor((Date.now() - linkedAt.getTime()) / DAY)
          : null;

        return {
          company_id: String(row.company_id),
          company_name: String(row.company_name ?? "Unnamed company"),
          active_member_count: Number(row.active_member_count ?? 0),
          total_signed_mwp: mwp,
          linked_days: linkedDays,
          segment: classify(mwp, linkedDays),
        };
      });

      return {
        companies,
        networkMwp: companies.reduce((s, c) => s + c.total_signed_mwp, 0),
      };
    },
  });
}
