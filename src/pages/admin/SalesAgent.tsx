import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Bot, Activity, Compass, Send, Settings as SettingsIcon, ClipboardCheck, Inbox, Calendar, Sparkles, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FunnelScoreboard } from "@/components/admin/sales-agent/FunnelScoreboard";
import { PipelineTab } from "@/components/admin/sales-agent/PipelineTab";
import { DiscoveryTab } from "@/components/admin/sales-agent/DiscoveryTab";
import { ApprovalQueueTab } from "@/components/admin/sales-agent/ApprovalQueueTab";
import { SequencesTab } from "@/components/admin/sales-agent/SequencesTab";
import { LearningTab } from "@/components/admin/sales-agent/LearningTab";
import { SettingsTab } from "@/components/admin/sales-agent/SettingsTab";
import { InboxTab } from "@/components/admin/sales-agent/InboxTab";
import { MeetingsList } from "@/components/admin/sales-agent/MeetingsList";

export default function SalesAgent() {
  const [tab, setTab] = useState("pipeline");
  const navigate = useNavigate();

  const { data: pendingCount } = useQuery({
    queryKey: ["sales-agent-pending-count"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("discovery_candidates")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
    refetchInterval: 20_000,
  });

  const { data: inboxCount } = useQuery({
    queryKey: ["sales-agent-inbox-count"],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("inbound_messages")
        .select("id", { count: "exact", head: true })
        .is("processed_at", null);
      return count ?? 0;
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Sales Agent</h1>
            <Badge variant="secondary">Admin Only</Badge>
            <Badge variant="outline" className="text-xs">Phase 3 · Conversations + Meetings</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Find, invite, onboard and meet with EPC partners — end-to-end, automated.
          </p>
        </div>
      </div>

      <FunnelScoreboard />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pipeline">
            <Activity className="h-4 w-4 mr-1.5" /> Pipeline
            {pendingCount ? <Badge variant="outline" className="ml-2 h-5 cursor-pointer" onClick={(e) => { e.stopPropagation(); setTab("approval"); }}>{pendingCount} to review</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="discovery"><Compass className="h-4 w-4 mr-1.5" /> Discovery</TabsTrigger>
          <TabsTrigger value="approval">
            <ClipboardCheck className="h-4 w-4 mr-1.5" /> Approval Queue
            {pendingCount ? <Badge variant="secondary" className="ml-2 h-5">{pendingCount}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="inbox">
            <Inbox className="h-4 w-4 mr-1.5" /> Inbox
            {inboxCount ? <Badge variant="secondary" className="ml-2 h-5">{inboxCount}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="meetings"><Calendar className="h-4 w-4 mr-1.5" /> Meetings</TabsTrigger>
          <TabsTrigger value="sequences"><Send className="h-4 w-4 mr-1.5" /> Sequences</TabsTrigger>
          <TabsTrigger value="learning"><Sparkles className="h-4 w-4 mr-1.5" /> Learning</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-1.5" /> Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline" className="mt-6"><PipelineTab /></TabsContent>
        <TabsContent value="discovery" className="mt-6"><DiscoveryTab onReviewPending={() => setTab("approval")} /></TabsContent>
        <TabsContent value="approval" className="mt-6"><ApprovalQueueTab /></TabsContent>
        <TabsContent value="inbox" className="mt-6"><InboxTab /></TabsContent>
        <TabsContent value="meetings" className="mt-6"><MeetingsList /></TabsContent>
        <TabsContent value="sequences" className="mt-6"><SequencesTab /></TabsContent>
        <TabsContent value="learning" className="mt-6"><LearningTab /></TabsContent>
        <TabsContent value="settings" className="mt-6"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
