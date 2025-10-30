import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/auth";
import { Loader2 } from "lucide-react";
import type { ProjectOnboarding } from "@/types/onboarding";
import { useRevenueCalculations } from "@/components/proposals/summary/carbon/hooks/useRevenueCalculations";

// Currency formatter
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Percentage formatter - rounds to 2 decimals and strips trailing zeros
const formatPercentage = (percentage: number): string => {
  return percentage.toFixed(2).replace(/\.?0+$/, '');
};

interface RevenueTabProps {
  project: ProjectOnboarding;
  proposal: any;
  onRefresh: () => void;
}

export function RevenueTab({ project, proposal, onRefresh }: RevenueTabProps) {
  const { userRole } = useAuth();
  
  // Extract proposal data
  const systemSize = proposal.system_size_kwp?.toString() || "0";
  const commissionDate = proposal.content?.projectInfo?.commissionDate;
  const phases = proposal.content?.projectInfo?.phases;
  const isMultiPhase = proposal.content?.projectInfo?.isMultiPhase;
  const clientSharePercentage = proposal.client_share_percentage || 75;
  const agentCommissionPercentage = proposal.agent_commission_percentage || 4;
  const crunchCommissionPercentage = parseFloat((100 - clientSharePercentage - agentCommissionPercentage).toFixed(2));

  // Calculate revenues using existing hook
  const { calculationResult, clientSpecificRevenue, loading } = useRevenueCalculations({
    systemSize,
    commissionDate,
    portfolioData: null,
    proposalId: proposal.id,
    phases,
    isMultiPhase
  });

  // Calculate agent and platform revenues by year
  const agentRevenueByYear: Record<string, number> = {};
  const platformRevenueByYear: Record<string, number> = {};
  
  Object.entries(clientSpecificRevenue).forEach(([year, clientRevenue]) => {
    const totalRevenue = clientRevenue / (clientSharePercentage / 100);
    agentRevenueByYear[year] = Math.round(totalRevenue * (agentCommissionPercentage / 100));
    platformRevenueByYear[year] = Math.round(totalRevenue * (crunchCommissionPercentage / 100));
  });

  // Calculate totals
  const totalClientRevenue = Object.values(clientSpecificRevenue).reduce((sum, val) => sum + val, 0);
  const totalAgentRevenue = Object.values(agentRevenueByYear).reduce((sum, val) => sum + val, 0);
  const totalPlatformRevenue = Object.values(platformRevenueByYear).reduce((sum, val) => sum + val, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!proposal.signed_at) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Projection</CardTitle>
          <CardDescription>
            Revenue projection will be available once the proposal is signed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            System Size: {systemSize} kWp
          </p>
        </CardContent>
      </Card>
    );
  }

  const years = Object.keys(clientSpecificRevenue).sort();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Client Revenue Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Client Revenue (6 Years)</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(totalClientRevenue)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {formatPercentage(clientSharePercentage)}% of total revenue
            </p>
          </CardContent>
        </Card>

        {/* Agent Commission Card - Agent & Admin only */}
        {(userRole === 'agent' || userRole === 'admin') && (
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Agent Commission (6 Years)</CardDescription>
              <CardTitle className="text-3xl">{formatCurrency(totalAgentRevenue)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {formatPercentage(agentCommissionPercentage)}% commission rate
              </p>
            </CardContent>
          </Card>
        )}

        {/* Platform Revenue Card - Admin only */}
        {userRole === 'admin' && (
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Platform Revenue (6 Years)</CardDescription>
              <CardTitle className="text-3xl">{formatCurrency(totalPlatformRevenue)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {formatPercentage(crunchCommissionPercentage)}% platform fee
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Unified Revenue Projection Table */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Projection (2025-2030)</CardTitle>
          <CardDescription>
            Annual revenue breakdown by stakeholder
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Client Revenue ({formatPercentage(clientSharePercentage)}%)</TableHead>
                {(userRole === 'agent' || userRole === 'admin') && (
                  <TableHead className="text-right">Agent Commission ({formatPercentage(agentCommissionPercentage)}%)</TableHead>
                )}
                {userRole === 'admin' && (
                  <TableHead className="text-right">Platform Fee ({formatPercentage(crunchCommissionPercentage)}%)</TableHead>
                )}
                {(userRole === 'agent' || userRole === 'admin') && (
                  <TableHead className="text-right">Total Revenue</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((year) => {
                const totalRev = clientSpecificRevenue[year] / (clientSharePercentage / 100);
                return (
                  <TableRow key={year}>
                    <TableCell className="font-medium">{year}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(clientSpecificRevenue[year])}
                    </TableCell>
                    {(userRole === 'agent' || userRole === 'admin') && (
                      <TableCell className="text-right">
                        {formatCurrency(agentRevenueByYear[year])}
                      </TableCell>
                    )}
                    {userRole === 'admin' && (
                      <TableCell className="text-right">
                        {formatCurrency(platformRevenueByYear[year])}
                      </TableCell>
                    )}
                    {(userRole === 'agent' || userRole === 'admin') && (
                      <TableCell className="text-right">
                        {formatCurrency(Math.round(totalRev))}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {/* Total Row */}
              <TableRow className="font-bold bg-muted/50">
                <TableCell>Total (6 Years)</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(totalClientRevenue)}
                </TableCell>
                {(userRole === 'agent' || userRole === 'admin') && (
                  <TableCell className="text-right">
                    {formatCurrency(totalAgentRevenue)}
                  </TableCell>
                )}
                {userRole === 'admin' && (
                  <TableCell className="text-right">
                    {formatCurrency(totalPlatformRevenue)}
                  </TableCell>
                )}
                {(userRole === 'agent' || userRole === 'admin') && (
                  <TableCell className="text-right">
                    {formatCurrency(Math.round(totalClientRevenue / (clientSharePercentage / 100)))}
                  </TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
