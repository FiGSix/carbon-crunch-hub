
import React from 'react';

interface CorrectionResult {
  system_size_corrections: number;
  carbon_value_corrections: number;
  percentage_corrections: number;
  completed_at: string;
}

interface CorrectionResultsProps {
  result: CorrectionResult;
}

export function CorrectionResults({ result }: CorrectionResultsProps) {
  return (
    <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
      <h5 className="font-medium text-green-800 mb-2">Last Correction Results</h5>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="font-medium">System Sizes:</span> {result.system_size_corrections} corrected
        </div>
        <div>
          <span className="font-medium">Carbon Values:</span> {result.carbon_value_corrections} corrected
        </div>
        <div>
          <span className="font-medium">Percentages:</span> {result.percentage_corrections} corrected
        </div>
      </div>
      <p className="text-xs text-green-600 mt-2">
        Completed at: {new Date(result.completed_at).toLocaleString()}
      </p>
    </div>
  );
}
