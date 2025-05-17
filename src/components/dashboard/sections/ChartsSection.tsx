
import React from "react";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { CO2OffsetChart } from "@/components/dashboard/CO2OffsetChart";
import { DealStatusChart } from "@/components/dashboard/preview/DealStatusChart";
import { ProposalListItem } from "@/types/proposals";

interface ChartsSectionProps {
  userRole: string | null;
  proposals?: ProposalListItem[];
  loading?: boolean;
}

export function ChartsSection({ userRole, proposals = [], loading = false }: ChartsSectionProps) {
  if (userRole === 'agent') {
    return (
      <div className="lg:col-span-1 h-full">
        <DealStatusChart proposals={proposals} loading={loading} />
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
