import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, Percent, Clock, CheckCircle2 } from "lucide-react";

interface Stats {
  total_agents: number;
  aggregated_mwp: number;
  current_rate: number;
  pending_commission: number;
  paid_commission: number;
}

export default function SuperPartnerDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_super_partner_dashboard_stats");
      if (!error && data && data.length > 0) setStats(data[0] as any);
      setLoading(false);
    })();
  }, []);

  const fmtZar = (n: number) =>
    new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(n || 0);

  return (
    <DashboardLayout requiredRole="super_partner">
      <DashboardHeader
        title="Super Partner Dashboard"
        description="Overview of your aggregated agent portfolio and commission earnings."
      />
      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={<Users className="h-5 w-5" />} label="Linked Agents" value={String(stats?.total_agents ?? 0)} />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Aggregated MWp" value={(stats?.aggregated_mwp ?? 0).toFixed(2)} />
          <StatCard icon={<Percent className="h-5 w-5" />} label="Current Rate" value={`${stats?.current_rate ?? 0}%`} />
          <StatCard icon={<Clock className="h-5 w-5" />} label="Pending Commission" value={fmtZar(Number(stats?.pending_commission ?? 0))} />
          <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Paid Commission" value={fmtZar(Number(stats?.paid_commission ?? 0))} />
        </div>
      )}
    </DashboardLayout>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
