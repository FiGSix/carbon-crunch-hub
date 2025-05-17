
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProposalListItem } from "@/types/proposals";
import { ChartLoadingState } from "../charts/ChartLoadingState";
import { ChartEmptyState } from "../charts/ChartEmptyState";
import { PieChartContent } from "../charts/PieChartContent";
import { STATUS_COLORS } from "../charts/StatusColors";

interface DealStatusChartProps {
  proposals: ProposalListItem[];
  loading: boolean;
}

export function DealStatusChart({ proposals, loading }: DealStatusChartProps) {
  // If loading, show loading state
  if (loading) {
    return <ChartLoadingState />;
  }
  
  // If no proposals, show empty state
  if (proposals.length === 0) {
    return <ChartEmptyState />;
  }

  // Generate chart data from proposals
  const statusCounts = proposals.reduce((counts, proposal) => {
    const status = proposal.status || 'unknown';
    const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);
    
    if (!counts[formattedStatus]) {
      counts[formattedStatus] = 0;
    }
    counts[formattedStatus]++;
    
    return counts;
  }, {} as Record<string, number>);
  
  // Convert to array format for recharts
  const data = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name.toLowerCase()] || '#999'
  }));
  
  // Calculate total value for percentage
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="h-full"
    >
      <Card className="border border-crunch-black/5 bg-white h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center">
            <span className="bg-gradient-to-r from-crunch-black to-crunch-black/80 bg-clip-text text-transparent">
              Deal Status
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 flex-1 flex items-center justify-center">
          <PieChartContent data={data} total={total} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
