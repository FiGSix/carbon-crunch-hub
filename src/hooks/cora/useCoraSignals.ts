import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CoraSignals {
  mailbox: any;
  settings: any;
  needsApproval: number;
  needsReview: number;
  emailsSentToday: number;
  dailyCap: number;
  meetingsBookedToday: number;
  positiveRepliesToday: number;
  hotLeads: number;
  stuckLeads: number;
  failedSendsToday: number;
  duplicatesToday: number;
  doNotContactToday: number;
}

export function useCoraSignals() {
  const { data, isLoading } = useQuery({
    queryKey: ["cora-signals"],
    refetchInterval: 30_000,
    queryFn: async (): Promise<CoraSignals> => {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const iso = startOfDay.toISOString();

      const [
        mailboxRes,
        settingsRes,
        needsApprovalRes,
        needsReviewRes,
        sentTodayRes,
        meetingsTodayRes,
        positiveTodayRes,
        hotLeadsRes,
        stuckLeadsRes,
        failedSendsRes,
        duplicatesTodayRes,
        dncTodayRes,
      ] = await Promise.all([
        (supabase as any).from("cora_mailbox_status").select("*").eq("id", true).maybeSingle(),
        (supabase as any).from("sales_agent_settings").select("*").eq("id", true).maybeSingle(),
        (supabase as any).from("discovery_candidates").select("id", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("outreach_replies").select("id", { count: "exact", head: true }).eq("status", "pending"),
        (supabase as any).from("lead_outreach_history").select("id", { count: "exact", head: true }).gte("sent_at", iso).eq("status", "sent"),
        (supabase as any).from("meetings").select("id", { count: "exact", head: true }).gte("created_at", iso),
        (supabase as any).from("inbound_messages").select("id", { count: "exact", head: true }).gte("received_at", iso).eq("intent", "positive"),
        (supabase as any).from("discovery_candidates").select("id", { count: "exact", head: true }).gte("priority_score", 70).neq("pipeline_stage", "do_not_contact"),
        (supabase as any).from("outreach_enrollments").select("id", { count: "exact", head: true }).eq("status", "paused"),
        (supabase as any).from("lead_outreach_history").select("id", { count: "exact", head: true }).gte("sent_at", iso).neq("status", "sent"),
        (supabase as any).from("cora_decision_log").select("id", { count: "exact", head: true }).gte("created_at", iso).in("action", ["skip_cold_outreach_relationship", "sequence_stopped_relationship"]),
        (supabase as any).from("discovery_candidates").select("id", { count: "exact", head: true }).gte("last_cora_decision_at", iso).eq("contact_permission_status", "blocked"),
      ]);

      return {
        mailbox: mailboxRes.data,
        settings: settingsRes.data,
        needsApproval: needsApprovalRes.count ?? 0,
        needsReview: needsReviewRes.count ?? 0,
        emailsSentToday: sentTodayRes.count ?? 0,
        dailyCap: settingsRes.data?.daily_send_cap ?? 50,
        meetingsBookedToday: meetingsTodayRes.count ?? 0,
        positiveRepliesToday: positiveTodayRes.count ?? 0,
        hotLeads: hotLeadsRes.count ?? 0,
        stuckLeads: stuckLeadsRes.count ?? 0,
        failedSendsToday: failedSendsRes.count ?? 0,
        duplicatesToday: duplicatesTodayRes.count ?? 0,
        doNotContactToday: dncTodayRes.count ?? 0,
      };
    },
  });

  return { signals: data, isLoading };
}
