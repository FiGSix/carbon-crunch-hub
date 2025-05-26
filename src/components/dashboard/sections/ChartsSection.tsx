
import React from "react";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CO2OffsetChart } from "@/components/dashboard/CO2OffsetChart";

interface ChartsSectionProps {
  userRole: string | null;
}

export function ChartsSection({ userRole }: ChartsSectionProps) {
  // Only render charts for non-agent users
  if (userRole === 'agent') {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <RevenueChart />
      <CO2OffsetChart />
    </div>
  );
}
