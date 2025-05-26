
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProposalListItem } from "@/types/proposals";
import { BarChart3 } from "lucide-react";
import { STATUS_COLORS } from "../charts/StatusColors";

interface DealStatusCardProps {
  proposals: ProposalListItem[];
  loading: boolean;
}

export function DealStatusCard({ proposals, loading }: DealStatusCardProps) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
        className="h-full"
      >
        <Card className="overflow-hidden border border-crunch-black/5 bg-white shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-crunch-black/70">Deal Status</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
                <div className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-gray-100 animate-pulse h-5 w-20"></div>
              </div>
              <div className="rounded-full bg-crunch-yellow/10 text-crunch-yellow p-3 shadow-sm">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
            <div className="pt-4"></div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (proposals.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
        className="h-full"
      >
        <Card className="overflow-hidden border border-crunch-black/5 bg-white shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-crunch-black/70">Deal Status</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold">0</div>
                <div className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  No deals
                </div>
              </div>
              <div className="rounded-full bg-crunch-yellow/10 text-crunch-yellow p-3 shadow-sm">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
            <div className="pt-4"></div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Generate status counts
  const statusCounts = proposals.reduce((counts, proposal) => {
    const status = proposal.status || 'unknown';
    const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);
    
    if (!counts[formattedStatus]) {
      counts[formattedStatus] = 0;
    }
    counts[formattedStatus]++;
    
    return counts;
  }, {} as Record<string, number>);

  // Find the most common status
  const sortedStatuses = Object.entries(statusCounts)
    .sort(([, a], [, b]) => b - a);
  
  const [primaryStatus, primaryCount] = sortedStatuses[0] || ['Draft', 0];
  const totalCount = proposals.length;
  const percentage = totalCount > 0 ? Math.round((primaryCount / totalCount) * 100) : 0;

  // Get color for primary status
  const statusColor = STATUS_COLORS[primaryStatus.toLowerCase()] || '#999';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Card className="overflow-hidden border border-crunch-black/5 bg-white shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-crunch-black/70">Deal Status</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold">{primaryCount}</div>
              <div 
                className="inline-flex items-center text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: statusColor }}
              >
                {primaryStatus} ({percentage}%)
              </div>
            </div>
            <div className="rounded-full bg-crunch-yellow/10 text-crunch-yellow p-3 shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>
          
          {/* Small status distribution indicator */}
          <div className="pt-2">
            <div className="flex space-x-1 h-2 rounded-full overflow-hidden bg-gray-100">
              {sortedStatuses.map(([status, count]) => {
                const width = (count / totalCount) * 100;
                const color = STATUS_COLORS[status.toLowerCase()] || '#999';
                return (
                  <div
                    key={status}
                    className="h-full transition-all duration-300"
                    style={{ 
                      width: `${width}%`, 
                      backgroundColor: color,
                      minWidth: width > 5 ? 'auto' : '2px'
                    }}
                    title={`${status}: ${count} (${Math.round(width)}%)`}
                  />
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
