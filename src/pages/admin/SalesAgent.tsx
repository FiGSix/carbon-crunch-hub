import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Activity, Compass, Send, Settings as SettingsIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FunnelScoreboard } from "@/components/admin/sales-agent/FunnelScoreboard";
import { PipelineTab } from "@/components/admin/sales-agent/PipelineTab";
import { DiscoveryTab } from "@/components/admin/sales-agent/DiscoveryTab";
import { SequencesTab } from "@/components/admin/sales-agent/SequencesTab";
import { SettingsTab } from "@/components/admin/sales-agent/SettingsTab";

export default function SalesAgent() {
  const [tab, setTab] = useState("pipeline");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Sales Agent</h1>
            <Badge variant="secondary">Admin Only</Badge>
            <Badge variant="outline" className="text-xs">Phase 1 · Discovery + Outreach</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Find, invite, and onboard EPC partners — end-to-end, automated.
          </p>
        </div>
      </div>

      <FunnelScoreboard />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pipeline"><Activity className="h-4 w-4 mr-1.5" /> Pipeline</TabsTrigger>
          <TabsTrigger value="discovery"><Compass className="h-4 w-4 mr-1.5" /> Discovery</TabsTrigger>
          <TabsTrigger value="sequences"><Send className="h-4 w-4 mr-1.5" /> Sequences</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="h-4 w-4 mr-1.5" /> Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline" className="mt-6"><PipelineTab /></TabsContent>
        <TabsContent value="discovery" className="mt-6"><DiscoveryTab /></TabsContent>
        <TabsContent value="sequences" className="mt-6"><SequencesTab /></TabsContent>
        <TabsContent value="settings" className="mt-6"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
