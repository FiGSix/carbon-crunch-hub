
import React from "react";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CO2OffsetChart } from "@/components/dashboard/CO2OffsetChart";
import { DealStatusChart } from "@/components/dashboard/preview/DealStatusChart";

interface ChartsSectionProps {
  userRole: string | null;
}

export function ChartsSection({ userRole }: ChartsSectionProps) {
  if (userRole === 'agent') {
    return (
      <div className="lg:col-span-1 h-full">
        <DealStatusChart />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <RevenueChart />
      <CO2OffsetChart />
    </div>
  );
}
