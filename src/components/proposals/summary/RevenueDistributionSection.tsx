
import React from "react";
import { 
  getClientSharePercentage,
  getAgentCommissionPercentage
} from "../utils/proposalCalculations";
import { useAuth } from "@/contexts/AuthContext";

interface RevenueDistributionSectionProps {
  systemSize: string;
}

export function RevenueDistributionSection({ systemSize }: RevenueDistributionSectionProps) {
  const { profile } = useAuth();
  const isClient = profile?.role === 'client';
  
  const clientSharePercentage = getClientSharePercentage(systemSize);
  const agentCommissionPercentage = getAgentCommissionPercentage(systemSize);
  const crunchCarbonSharePercentage = 100 - clientSharePercentage - agentCommissionPercentage;

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Revenue Distribution</h3>
      <div className={`grid grid-cols-1 ${isClient ? 'md:grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
        <div className="p-4 bg-carbon-green-50 rounded-lg border border-carbon-green-200">
          <p className="text-sm text-carbon-gray-500">Client Share</p>
          <p className="text-xl font-bold text-carbon-green-600">{clientSharePercentage}%</p>
          <p className="text-xs text-carbon-gray-500 mt-1">Based on portfolio size</p>
        </div>
        
        {!isClient && (
          <>
            <div className="p-4 bg-carbon-blue-50 rounded-lg border border-carbon-blue-200">
              <p className="text-sm text-carbon-gray-500">Agent Commission</p>
              <p className="text-xl font-bold text-carbon-blue-600">{agentCommissionPercentage}%</p>
              <p className="text-xs text-carbon-gray-500 mt-1">Based on portfolio size</p>
            </div>
            <div className="p-4 bg-carbon-gray-50 rounded-lg border border-carbon-gray-200">
              <p className="text-sm text-carbon-gray-500">Crunch Carbon Share</p>
              <p className="text-xl font-bold text-carbon-gray-900">
                {crunchCarbonSharePercentage.toFixed(1)}%
              </p>
              <p className="text-xs text-carbon-gray-500 mt-1">Platform fee</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
