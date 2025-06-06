
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, RefreshCw, PlayCircle } from 'lucide-react';

interface ComprehensiveCorrectionProps {
  onRunCorrection: () => void;
  loading: boolean;
}

export function ComprehensiveCorrection({ onRunCorrection, loading }: ComprehensiveCorrectionProps) {
  return (
    <div className="space-y-4">
      <h4 className="font-medium text-carbon-gray-900 flex items-center">
        <PlayCircle className="h-4 w-4 mr-2" />
        Comprehensive Data Correction
      </h4>
      <p className="text-sm text-carbon-gray-600">
        Runs all correction functions in sequence: system sizes → carbon calculations → fee percentages.
      </p>
      <Button
        onClick={onRunCorrection}
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Running Comprehensive Correction...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Run Comprehensive Data Correction
          </>
        )}
      </Button>
    </div>
  );
}
