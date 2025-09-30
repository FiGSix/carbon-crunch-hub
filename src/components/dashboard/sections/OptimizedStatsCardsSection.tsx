import { memo, useMemo } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { TrendingUp, Users, DollarSign, Leaf, LucideIcon } from "lucide-react";

interface OptimizedStatsCardsSectionProps {
  userRole: string | null;
  portfolioSize: number;
  totalProposals: number;
  potentialRevenue: number;
  co2Offset: number;
  loading?: boolean;
}

export const OptimizedStatsCardsSection = memo(({
  userRole,
  portfolioSize,
  totalProposals,
  potentialRevenue,
  co2Offset,
  loading = false
}: OptimizedStatsCardsSectionProps) => {
  
  // Memoized stats configuration to prevent recalculation on every render
  const statsConfig = useMemo(() => {
    const baseStats = [
      {
        title: "Portfolio Size",
        value: portfolioSize >= 1000 
          ? `${(portfolioSize / 1000).toFixed(1)} MWp`
          : `${portfolioSize.toFixed(0)} kWp`,
        icon: TrendingUp,
        description: "Total installed capacity"
      },
      {
        title: "Total Proposals",
        value: totalProposals.toString(),
        icon: Users,
        description: "Active proposals"
      },
      {
        title: "Potential Revenue",
        value: `£${potentialRevenue.toLocaleString()}`,
        icon: DollarSign,
        description: "Expected earnings"
      },
      {
        title: "CO₂ Offset",
        value: `${co2Offset.toFixed(1)}t`,
        icon: Leaf,
        description: "Carbon credits generated"
      }
    ];

    // Filter stats based on user role
    if (userRole === 'client') {
      return baseStats.filter(stat => 
        stat.title === 'Portfolio Size' || stat.title === 'CO₂ Offset'
      );
    }

    return baseStats;
  }, [userRole, portfolioSize, totalProposals, potentialRevenue, co2Offset]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsConfig.map((stat) => (
        <StatsCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          icon={<stat.icon className="h-5 w-5" />}
        />
      ))}
    </div>
  );
});

OptimizedStatsCardsSection.displayName = 'OptimizedStatsCardsSection';