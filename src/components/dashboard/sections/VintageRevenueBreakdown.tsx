import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVintageRevenueBreakdown } from "@/hooks/dashboard/useVintageRevenueBreakdown";
import { useAgentVintageRevenueBreakdown } from "@/hooks/dashboard/useAgentVintageRevenueBreakdown";
import { useAdminVintageRevenueBreakdown } from "@/hooks/dashboard/useAdminVintageRevenueBreakdown";
import { useAuth } from "@/contexts/auth";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VintageRevenueBreakdownProps {
  className?: string;
}

export function VintageRevenueBreakdown({ className }: VintageRevenueBreakdownProps) {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const isAgent = userRole === 'agent';
  
  const { data: clientData, isLoading: clientLoading } = useVintageRevenueBreakdown();
  const { data: agentData, isLoading: agentLoading } = useAgentVintageRevenueBreakdown();
  const { data: adminData, isLoading: adminLoading } = useAdminVintageRevenueBreakdown();
  
  const data = isAdmin ? adminData : (isAgent ? agentData : clientData);
  const isLoading = isAdmin ? adminLoading : (isAgent ? agentLoading : clientLoading);

  // Format currency as South African Rand
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="text-lg">
            {isAdmin ? "Audit Ready Projects Est. Revenue" : "Vintage Est. Revenue:"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!data) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="text-lg">
            {isAdmin ? "Audit Ready Projects Est. Revenue" : "Vintage Est. Revenue:"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">No revenue data available</div>
        </CardContent>
      </Card>
    );
  }

  // Admin table view
  if (isAdmin && adminData) {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader>
          <CardTitle className="text-lg">Audit Ready Projects Est. Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-foreground">Vintage</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-foreground">Client</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-foreground">Agent</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-foreground">Platform</th>
                </tr>
              </thead>
              <tbody>
                {/* Blend Row */}
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-2 px-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: '#8ED973' }}>
                      <span className="text-sm font-medium text-white">Blend</span>
                    </div>
                  </td>
                  <td className="text-right py-2 px-3 text-sm font-medium text-foreground tabular-nums">
                    {adminData.blend ? formatCurrency(adminData.blend.client) : '-'}
                  </td>
                  <td className="text-right py-2 px-3 text-sm font-medium text-foreground tabular-nums">
                    {adminData.blend ? formatCurrency(adminData.blend.agent) : '-'}
                  </td>
                  <td className="text-right py-2 px-3 text-sm font-medium text-foreground tabular-nums">
                    {adminData.blend ? formatCurrency(adminData.blend.platform) : '-'}
                  </td>
                </tr>
                {/* 2025 Row */}
                <tr className="border-b border-border hover:bg-muted/50">
                  <td className="py-2 px-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: '#FF4C44' }}>
                      <span className="text-sm font-medium text-white">2025</span>
                    </div>
                  </td>
                  <td className="text-right py-2 px-3 text-sm font-medium text-foreground tabular-nums">
                    {formatCurrency(adminData.years['2025']?.client || 0)}
                  </td>
                  <td className="text-right py-2 px-3 text-sm font-medium text-foreground tabular-nums">
                    {formatCurrency(adminData.years['2025']?.agent || 0)}
                  </td>
                  <td className="text-right py-2 px-3 text-sm font-medium text-foreground tabular-nums">
                    {formatCurrency(adminData.years['2025']?.platform || 0)}
                  </td>
                </tr>
                {/* 2026-2030 Rows */}
                {['2026', '2027', '2028', '2029', '2030'].map(year => (
                  <tr key={year} className="border-b border-border hover:bg-muted/50">
                    <td className="py-2 px-3">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crunch-yellow">
                        <span className="text-sm font-medium text-black">{year}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 px-3 text-sm font-medium text-foreground tabular-nums">
                      {formatCurrency(adminData.years[year]?.client || 0)}
                    </td>
                    <td className="text-right py-2 px-3 text-sm font-medium text-foreground tabular-nums">
                      {formatCurrency(adminData.years[year]?.agent || 0)}
                    </td>
                    <td className="text-right py-2 px-3 text-sm font-medium text-foreground tabular-nums">
                      {formatCurrency(adminData.years[year]?.platform || 0)}
                    </td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-muted/30 font-semibold">
                  <td className="py-3 px-3 text-sm text-foreground">Totals</td>
                  <td className="text-right py-3 px-3 text-sm text-foreground tabular-nums">
                    {formatCurrency(adminData.totals.client)}
                  </td>
                  <td className="text-right py-3 px-3 text-sm text-foreground tabular-nums">
                    {formatCurrency(adminData.totals.agent)}
                  </td>
                  <td className="text-right py-3 px-3 text-sm text-foreground tabular-nums">
                    {formatCurrency(adminData.totals.platform)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Client/Agent list view (original layout)
  const listData = isAgent ? agentData : clientData;
  
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Vintage Est. Revenue:</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Blend (2024) - Green */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full min-w-[60px]" style={{ backgroundColor: '#8ED973' }}>
            <span className="text-sm font-medium text-white">Blend</span>
          </div>
          <div className="text-left font-semibold text-foreground tabular-nums">
            {listData?.blend !== null ? formatCurrency(listData!.blend!) : (
              <span className="text-muted-foreground">Missed Vintage</span>
            )}
          </div>
        </div>

        {/* 2025 - Red */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full min-w-[60px]" style={{ backgroundColor: '#FF4C44' }}>
            <span className="text-sm font-medium text-white">2025</span>
          </div>
          <div className="text-left font-semibold text-foreground tabular-nums">
            {formatCurrency(listData?.years['2025'] || 0)}
          </div>
        </div>

        {/* 2026 - Crunch Yellow */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crunch-yellow min-w-[60px]">
            <span className="text-sm font-medium text-black">2026</span>
          </div>
          <div className="text-left font-semibold text-foreground tabular-nums">
            {formatCurrency(listData?.years['2026'] || 0)}
          </div>
        </div>

        {/* 2027 - Crunch Yellow */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crunch-yellow min-w-[60px]">
            <span className="text-sm font-medium text-black">2027</span>
          </div>
          <div className="text-left font-semibold text-foreground tabular-nums">
            {formatCurrency(listData?.years['2027'] || 0)}
          </div>
        </div>

        {/* 2028 - Crunch Yellow */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crunch-yellow min-w-[60px]">
            <span className="text-sm font-medium text-black">2028</span>
          </div>
          <div className="text-left font-semibold text-foreground tabular-nums">
            {formatCurrency(listData?.years['2028'] || 0)}
          </div>
        </div>

        {/* 2029 - Crunch Yellow */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crunch-yellow min-w-[60px]">
            <span className="text-sm font-medium text-black">2029</span>
          </div>
          <div className="text-left font-semibold text-foreground tabular-nums">
            {formatCurrency(listData?.years['2029'] || 0)}
          </div>
        </div>

        {/* 2030 - Crunch Yellow */}
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crunch-yellow min-w-[60px]">
            <span className="text-sm font-medium text-black">2030</span>
          </div>
          <div className="text-left font-semibold text-foreground tabular-nums">
            {formatCurrency(listData?.years['2030'] || 0)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
