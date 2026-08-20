import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BroadcastAttachment } from "@/lib/broadcasts/documents";

export type BroadcastCategory = "operational" | "opportunity" | "newsletter";

export const CATEGORY_LABELS: Record<BroadcastCategory, string> = {
  operational: "Service notice (not unsubscribable)",
  opportunity: "Partner update (unsubscribable)",
  newsletter: "Newsletter (unsubscribable)",
};

export const FROM_EMAIL = "hello@updates.crunchcarbon.com";
export const FROM_NAME = "Crunch Carbon";
export const REPLY_TO = "hello@crunchcarbon.com";

export interface AudienceDefinition {
  type:
    | "onboarding_stage"
    | "role"
    | "partner_clients"
    | "super_partner_partners"
    | "company"
    | "manual";
  stages?: string[];
  roles?: string[];
  agent_id?: string;
  super_partner_id?: string;
  client_company_ids?: string[];
  emails?: string[];
}

export interface BroadcastCampaign {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  body_html: string;
  category: BroadcastCategory;
  from_name: string;
  from_email: string;
  reply_to: string;
  audience: AudienceDefinition;
  attachments: BroadcastAttachment[];
  status: "draft" | "sending" | "sent" | "cancelled" | "failed";
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ResolvedRecipient {
  email: string;
  recipient_name: string | null;
  user_id: string | null;
  client_id: string | null;
  context: Record<string, any>;
  flags: {
    source: string;
    self_authored: boolean;
    is_staff: boolean;
    staff_roles: string[];
    staff_expected: boolean;
  };
  excluded_by_default: boolean;
}

export interface AudiencePreview {
  audience: AudienceDefinition;
  summary: {
    total: number;
    excluded_by_default: number;
    staff: number;
    self_authored: number;
    from_json_snapshot: number;
  };
  recipients: ResolvedRecipient[];
}

const asCampaign = (row: any): BroadcastCampaign => row as BroadcastCampaign;

export function useBroadcastCampaigns() {
  return useQuery({
    queryKey: ["broadcast-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcast_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(asCampaign);
    },
  });
}

export function useBroadcastCampaign(id: string | null, pollWhileSending = false) {
  return useQuery({
    queryKey: ["broadcast-campaign", id],
    enabled: !!id,
    refetchInterval: (query) =>
      pollWhileSending && (query.state.data as BroadcastCampaign | undefined)?.status === "sending"
        ? 3000
        : false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcast_campaigns")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data ? asCampaign(data) : null;
    },
  });
}

export function useSaveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<BroadcastCampaign> & { id?: string }) => {
      const payload: Record<string, any> = {
        name: input.name,
        subject: input.subject,
        preheader: input.preheader ?? null,
        body_html: input.body_html ?? "",
        category: input.category,
        audience: input.audience ?? {},
        attachments: input.attachments ?? [],
        // Sender identity is fixed platform-wide — written on every save so a
        // legacy row can never keep an old From address.
        from_name: FROM_NAME,
        from_email: FROM_EMAIL,
        reply_to: REPLY_TO,
      };

      if (input.id) {
        const { data, error } = await supabase
          .from("broadcast_campaigns")
          .update(payload)
          .eq("id", input.id)
          .select("*")
          .single();
        if (error) throw error;
        return asCampaign(data);
      }

      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("broadcast_campaigns")
        .insert({ ...payload, created_by: userData.user?.id ?? null } as any)
        .select("*")
        .single();
      if (error) throw error;
      return asCampaign(data);
    },
    onSuccess: (campaign) => {
      qc.invalidateQueries({ queryKey: ["broadcast-campaigns"] });
      qc.invalidateQueries({ queryKey: ["broadcast-campaign", campaign.id] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("broadcast_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["broadcast-campaigns"] }),
  });
}

export function useResolveAudience() {
  return useMutation({
    mutationFn: async (audience: AudienceDefinition): Promise<AudiencePreview> => {
      const { data, error } = await supabase.functions.invoke("resolve-broadcast-audience", {
        body: { audience },
      });
      if (error) {
        const detail = (error as any)?.context
          ? await (error as any).context.text().catch(() => error.message)
          : error.message;
        throw new Error(detail || error.message);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as AudiencePreview;
    },
  });
}

export function useTestSend() {
  return useMutation({
    mutationFn: async ({ campaignId, email }: { campaignId: string; email: string }) => {
      const { data, error } = await supabase.functions.invoke("send-broadcast", {
        body: { campaign_id: campaignId, test_to: email },
      });
      if (error) {
        const detail = (error as any)?.context
          ? await (error as any).context.text().catch(() => error.message)
          : error.message;
        throw new Error(detail || error.message);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
  });
}

export function useSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campaignId,
      excludeEmails,
    }: {
      campaignId: string;
      excludeEmails: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke("send-broadcast", {
        body: { campaign_id: campaignId, exclude_emails: excludeEmails },
      });
      if (error) {
        const detail = (error as any)?.context
          ? await (error as any).context.text().catch(() => error.message)
          : error.message;
        throw new Error(detail || error.message);
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["broadcast-campaign", vars.campaignId] });
      qc.invalidateQueries({ queryKey: ["broadcast-campaigns"] });
    },
  });
}

export function useCancelCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("broadcast_campaigns")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", campaignId);
      if (error) throw error;
    },
    onSuccess: (_d, campaignId) => {
      qc.invalidateQueries({ queryKey: ["broadcast-campaign", campaignId] });
      qc.invalidateQueries({ queryKey: ["broadcast-campaigns"] });
    },
  });
}

/** Option lists for the audience builder. */
export function useAudienceOptions() {
  return useQuery({
    queryKey: ["broadcast-audience-options"],
    queryFn: async () => {
      const [agents, superPartners, companies] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .eq("role", "agent")
          .order("first_name"),
        supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .eq("role", "super_partner")
          .order("first_name"),
        supabase.from("client_companies").select("id, name").order("name"),
      ]);

      const people = (rows: any[] | null) =>
        (rows ?? []).map((p) => ({
          id: p.id,
          label:
            [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.email || "Unnamed",
        }));

      return {
        agents: people(agents.data),
        superPartners: people(superPartners.data),
        companies: (companies.data ?? []).map((c: any) => ({
          id: c.id,
          label: c.name ?? "Unnamed company",
        })),
      };
    },
  });
}
