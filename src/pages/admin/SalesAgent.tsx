import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot, ArrowLeft, Gauge, KanbanSquare, MessagesSquare, Calendar, Sliders, ScrollText,
} from "lucide-react";
import { CommandCentreView } from "@/components/admin/cora/CommandCentreView";
import { PipelineView } from "@/components/admin/cora/PipelineView";
import { ConversationsView } from "@/components/admin/cora/ConversationsView";
import { MeetingsView } from "@/components/admin/cora/MeetingsView";
import { CoraControlsView } from "@/components/admin/cora/CoraControlsView";
import { DecisionLogView } from "@/components/admin/cora/DecisionLogView";
import { useCoraSignals } from "@/hooks/cora/useCoraSignals";
import { cn } from "@/lib/utils";

type Section = "command" | "pipeline" | "conversations" | "meetings" | "decisions" | "controls";

const NAV: { id: Section; label: string; icon: typeof Gauge; badgeKey?: "needsReview" | "incomplete" | "awaitingReply" }[] = [
  { id: "command", label: "Command Centre", icon: Gauge },
  { id: "pipeline", label: "CRM", icon: KanbanSquare, badgeKey: "incomplete" },
  { id: "conversations", label: "Conversations", icon: MessagesSquare, badgeKey: "awaitingReply" },
  { id: "meetings", label: "Meetings", icon: Calendar },
  { id: "decisions", label: "Decision Log", icon: ScrollText },
  { id: "controls", label: "Controls", icon: Sliders },
];

export default function SalesAgent() {
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("command");
  const { signals } = useCoraSignals();

  const { signals } = useCoraSignals();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Bot className="h-6 w-6 text-primary" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold leading-tight">Cora Command Centre</h1>
            <p className="text-xs text-muted-foreground">Autonomous Sales Agent for Crunch Carbon — cora@crunchcarbon.com</p>
          </div>
          <MailboxBadge outcome={signals?.mailbox?.outcome} />
          <AutopilotBadge status={signals?.settings?.autopilot_status} paused={signals?.settings?.pause_all_sending} stopped={signals?.settings?.emergency_stop} />
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        <nav className="space-y-1">
          {NAV.map((n) => {
            const active = section === n.id;
            const badge = n.badgeKey ? signals?.[n.badgeKey] ?? 0 : 0;
            return (
              <button
                key={n.id}
                onClick={() => setSection(n.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground",
                )}
              >
                <n.icon className="h-4 w-4" />
                <span className="flex-1 text-left">{n.label}</span>
                {badge > 0 && (
                  <Badge variant={active ? "secondary" : "outline"} className="h-5">{badge}</Badge>
                )}
              </button>
            );
          })}
        </nav>

        <main className="min-w-0">
          {section === "command" && <CommandCentreView onJump={setSection} />}
          {section === "pipeline" && <PipelineView />}
          {section === "conversations" && <ConversationsView />}
          {section === "meetings" && <MeetingsView />}
          {section === "decisions" && <DecisionLogView />}
          {section === "controls" && <CoraControlsView />}
        </main>
      </div>
    </div>
  );
}

function MailboxBadge({ outcome }: { outcome?: string }) {
  const ok = outcome === "verified";
  return (
    <Badge variant={ok ? "default" : "destructive"} className="gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", ok ? "bg-emerald-400" : "bg-red-400")} />
      Outlook {ok ? "connected" : outcome ?? "unknown"}
    </Badge>
  );
}

function AutopilotBadge({ status, paused, stopped }: { status?: string; paused?: boolean; stopped?: boolean }) {
  if (stopped) return <Badge variant="destructive">Emergency stop</Badge>;
  if (paused) return <Badge variant="destructive">Paused</Badge>;
  const tone = status === "full" ? "default" : status === "assisted" ? "secondary" : "outline";
  return <Badge variant={tone as any}>Autopilot: {status ?? "assisted"}</Badge>;
}
