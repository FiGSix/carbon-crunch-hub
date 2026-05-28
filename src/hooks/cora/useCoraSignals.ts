import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CoraSignals {
  mailbox: any;
  settings: any;
  // Counters across the simplified CRM
  incomplete: number;
  completeReady: number;
  outreachActive: number;
  awaitingReply: number;
  opportunities: number;
  blocked: number;
  needsReview: number;
  needsApproval: number; // alias for inbox needing review (keeps sidebar badge)
  // Daily
  emailsSentToday: number;
  dailyCap: number;
  meetingsBookedToday: number;
  positiveRepliesToday: number;
  failedSendsToday: number;
  duplicatesToday: number;
  doNotContactToday: number;
  hotLeads: number;
  stuckLeads: number;
}

export function useCoraSignals() {
  const { data, isLoading } = useQuery({
    queryKey: ["cora-signals"],
    refetchInterval: 30_000,
    queryFn: async (): Promise<CoraSignals> => {
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const iso = startOfDay.toISOString();
      const dc: any = (supabase as any).from("discovery_candidates");

      const [
        mailboxRes,
        settingsRes,
        incompleteRes,
        completeReadyRes,
        outreachActiveRes,
        awaitingReplyRes,
        opportunitiesRes,
        blockedRes,
        needsReviewRes,
        sentTodayRes,
        meetingsTodayRes,
        positiveTodayRes,
        failedSendsRes,
        duplicatesTodayRes,
        dncTodayRes,
        hotLeadsRes,
        stuckLeadsRes,
      ] = await Promise.all([
        (supabase as any).from("cora_mailbox_status").select("*").eq("id", true).maybeSingle(),
        (supabase as any).from("sales_agent_settings").select("*").eq("id", true).maybeSingle(),
        dc.select("id", { count: "exact", head: true }).lt("completeness_score", 80).is("outreach_status", null).is("sales_status", null),
        dc.select("id", { count: "exact", head: true }).gte("completeness_score", 80).is("outreach_status", null).is("sales_status", null),
        dc.select("id", { count: "exact", head: true }).in("outreach_status", ["First Email Sent", "Follow-Up Due", "Follow-Up Sent", "No Response", "Paused", "Ready for Outreach"]).is("sales_status", null),
        dc.select("id", { count: "exact", head: true }).eq("outreach_status", "Replied").is("sales_status", null),
        dc.select("id", { count: "exact", head: true }).not("sales_status", "is", null),
        dc.select("id", { count: "exact", head: true }).in("research_status", ["Existing Agent", "Existing Client", "Duplicate", "Do Not Contact"]),
        dc.select("id", { count: "exact", head: true }).eq("research_status", "Needs Review"),
        (supabase as any).from("lead_outreach_history").select("id", { count: "exact", head: true }).gte("sent_at", iso).eq("status", "sent"),
        (supabase as any).from("meetings").select("id", { count: "exact", head: true }).gte("created_at", iso),
        (supabase as any).from("inbound_messages").select("id", { count: "exact", head: true }).gte("received_at", iso).eq("intent", "positive"),
        (supabase as any).from("lead_outreach_history").select("id", { count: "exact", head: true }).gte("sent_at", iso).neq("status", "sent"),
        (supabase as any).from("cora_decision_log").select("id", { count: "exact", head: true }).gte("created_at", iso).in("action", ["skip_cold_outreach_relationship", "sequence_stopped_relationship"]),
        (supabase as any).from("discovery_candidates").select("id", { count: "exact", head: true }).gte("last_cora_decision_at", iso).eq("contact_permission_status", "blocked"),
        dc.select("id", { count: "exact", head: true }).gte("priority_score", 70),
        (supabase as any).from("outreach_enrollments").select("id", { count: "exact", head: true }).eq("status", "paused"),
      ]);

      const needsReview = needsReviewRes.count ?? 0;
      return {
        mailbox: mailboxRes.data,
        settings: settingsRes.data,
        incomplete: incompleteRes.count ?? 0,
        completeReady: completeReadyRes.count ?? 0,
        outreachActive: outreachActiveRes.count ?? 0,
        awaitingReply: awaitingReplyRes.count ?? 0,
        opportunities: opportunitiesRes.count ?? 0,
        blocked: blockedRes.count ?? 0,
        needsReview,
        needsApproval: needsReview,
        emailsSentToday: sentTodayRes.count ?? 0,
        dailyCap: settingsRes.data?.daily_send_cap ?? 50,
        meetingsBookedToday: meetingsTodayRes.count ?? 0,
        positiveRepliesToday: positiveTodayRes.count ?? 0,
        failedSendsToday: failedSendsRes.count ?? 0,
        duplicatesToday: duplicatesTodayRes.count ?? 0,
        doNotContactToday: dncTodayRes.count ?? 0,
        hotLeads: hotLeadsRes.count ?? 0,
        stuckLeads: stuckLeadsRes.count ?? 0,
      };
    },
  });

  return { signals: data, isLoading };
}
