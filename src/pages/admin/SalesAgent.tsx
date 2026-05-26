import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Activity, Compass, Send, Settings as SettingsIcon, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FunnelScoreboard } from "@/components/admin/sales-agent/FunnelScoreboard";
import { PipelineTab } from "@/components/admin/sales-agent/PipelineTab";
import { DiscoveryTab } from "@/components/admin/sales-agent/DiscoveryTab";
import { ApprovalQueueTab } from "@/components/admin/sales-agent/ApprovalQueueTab";
import { SequencesTab } from "@/components/admin/sales-agent/SequencesTab";
import { SettingsTab } from "@/components/admin/sales-agent/SettingsTab";

export default function SalesAgent() {
  const [tab, setTab] = useState("pipeline");

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Sales Agent</h1>
            <Badge variant="secondary">Admin Only</Badge>
            <Badge variant="outline" className="text-xs">Phase 2 · Approval Queue + Autopilot</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Find, invite, and onboard EPC partners — end-to-end, automated.
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
          <TabsTrigger value="sequences"><Send className="h-4 w-4 mr-1.5" /> Sequences</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-1.5" /> Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline" className="mt-6"><PipelineTab /></TabsContent>
        <TabsContent value="discovery" className="mt-6"><DiscoveryTab onReviewPending={() => setTab("approval")} /></TabsContent>
        <TabsContent value="approval" className="mt-6"><ApprovalQueueTab /></TabsContent>
        <TabsContent value="sequences" className="mt-6"><SequencesTab /></TabsContent>
        <TabsContent value="settings" className="mt-6"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
