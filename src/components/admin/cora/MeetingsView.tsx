import { MeetingsList } from "@/components/admin/sales-agent/MeetingsList";
import { useCoraSignals } from "@/hooks/cora/useCoraSignals";
import { Card, CardContent } from "@/components/ui/card";

export function MeetingsView() {
  const { signals } = useCoraSignals();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat label="Meetings booked today" value={signals?.meetingsBookedToday ?? 0} />
        <Stat label="Positive replies today" value={signals?.positiveRepliesToday ?? 0} />
        <Stat label="Hot leads" value={signals?.hotLeads ?? 0} />
      </div>
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        All meeting invites use Cora's Outlook identity and the approved MS Bookings link configured in Cora Controls.
        Meetings with existing agents, clients, or partners are surfaced so they can be routed to Shaun directly.
      </div>
      <MeetingsList />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
    </CardContent></Card>
  );
}
