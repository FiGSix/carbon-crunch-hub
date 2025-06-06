
import React from 'react';
import { Button } from '@/components/ui/button';

type CorrectionFunction = 'update_system_size_kwp' | 'recalculate_carbon_values' | 'recalculate_proposal_percentages';

interface IndividualCorrectionsProps {
  onRunCorrection: (functionName: CorrectionFunction, description: string) => void;
  loading: boolean;
}

export function IndividualCorrections({ onRunCorrection, loading }: IndividualCorrectionsProps) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-carbon-gray-900">Individual Corrections</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <h5 className="text-sm font-medium">System Sizes</h5>
          <p className="text-xs text-carbon-gray-600">
            Extract and populate missing system_size_kwp values from project_info.
          </p>
          <Button
            onClick={() => onRunCorrection('update_system_size_kwp', 'System Size Update')}
            disabled={loading}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Fix System Sizes
          </Button>
        </div>

        <div className="space-y-2">
          <h5 className="text-sm font-medium">Carbon Calculations</h5>
          <p className="text-xs text-carbon-gray-600">
            Recalculate annual energy and carbon credits based on system sizes.
          </p>
          <Button
            onClick={() => onRunCorrection('recalculate_carbon_values', 'Carbon Recalculation')}
            disabled={loading}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Fix Carbon Values
          </Button>
        </div>

        <div className="space-y-2">
          <h5 className="text-sm font-medium">Fee Percentages</h5>
          <p className="text-xs text-carbon-gray-600">
            Update client share and agent commission percentages based on portfolio sizes.
          </p>
          <Button
            onClick={() => onRunCorrection('recalculate_proposal_percentages', 'Percentage Recalculation')}
            disabled={loading}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Fix Percentages
          </Button>
        </div>
      </div>
    </div>
  );
}
