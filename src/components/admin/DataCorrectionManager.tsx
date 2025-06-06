
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Database, RefreshCw, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CorrectionResult {
  system_size_corrections: number;
  carbon_value_corrections: number;
  percentage_corrections: number;
  completed_at: string;
}

export function DataCorrectionManager() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CorrectionResult | null>(null);

  // Only show to admins
  if (userRole !== 'admin') {
    return null;
  }

  const runComprehensiveCorrection = async () => {
    setLoading(true);
    
    try {
      console.log("Starting comprehensive data correction...");
      
      const { data, error } = await supabase.rpc('run_comprehensive_data_correction');
      
      if (error) {
        console.error("Data correction error:", error);
        throw error;
      }
      
      console.log("Data correction completed:", data);
      
      // Type guard to ensure data matches our expected structure
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const result = data as CorrectionResult;
        setLastResult(result);
        
        toast({
          title: "Data Correction Complete",
          description: `Successfully corrected ${result.system_size_corrections} system sizes, ${result.carbon_value_corrections} carbon calculations, and ${result.percentage_corrections} fee percentages.`,
        });
      } else {
        throw new Error("Unexpected response format from database function");
      }
      
      // Trigger a global refresh of proposal data
      window.dispatchEvent(new CustomEvent('proposal-status-changed', {
        detail: { type: 'data-correction-complete' }
      }));
      
    } catch (error) {
      console.error("Error running data correction:", error);
      toast({
        title: "Data Correction Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runIndividualCorrection = async (functionName: 'update_system_size_kwp' | 'recalculate_carbon_values' | 'recalculate_proposal_percentages', description: string) => {
    setLoading(true);
    
    try {
      console.log(`Running ${functionName}...`);
      
      const { data, error } = await supabase.rpc(functionName);
      
      if (error) {
        console.error(`${functionName} error:`, error);
        throw error;
      }
      
      console.log(`${functionName} completed:`, data);
      
      toast({
        title: `${description} Complete`,
        description: `Successfully processed ${Array.isArray(data) ? data.length : 'all'} records.`,
      });
      
    } catch (error) {
      console.error(`Error running ${functionName}:`, error);
      toast({
        title: `${description} Failed`,
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="retro-card mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Data Correction Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> These functions will update proposal data across the entire database. 
            Please ensure you have a recent backup before proceeding with comprehensive corrections.
          </AlertDescription>
        </Alert>

        {/* Comprehensive Correction */}
        <div className="space-y-4">
          <h4 className="font-medium text-carbon-gray-900 flex items-center">
            <PlayCircle className="h-4 w-4 mr-2" />
            Comprehensive Data Correction
          </h4>
          <p className="text-sm text-carbon-gray-600">
            Runs all correction functions in sequence: system sizes → carbon calculations → fee percentages.
          </p>
          <Button
            onClick={runComprehensiveCorrection}
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

        {/* Individual Corrections */}
        <div className="space-y-4">
          <h4 className="font-medium text-carbon-gray-900">Individual Corrections</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h5 className="text-sm font-medium">System Sizes</h5>
              <p className="text-xs text-carbon-gray-600">
                Extract and populate missing system_size_kwp values from project_info.
              </p>
              <Button
                onClick={() => runIndividualCorrection('update_system_size_kwp', 'System Size Update')}
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
                onClick={() => runIndividualCorrection('recalculate_carbon_values', 'Carbon Recalculation')}
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
                onClick={() => runIndividualCorrection('recalculate_proposal_percentages', 'Percentage Recalculation')}
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

        {/* Last Result Display */}
        {lastResult && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h5 className="font-medium text-green-800 mb-2">Last Correction Results</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">System Sizes:</span> {lastResult.system_size_corrections} corrected
              </div>
              <div>
                <span className="font-medium">Carbon Values:</span> {lastResult.carbon_value_corrections} corrected
              </div>
              <div>
                <span className="font-medium">Percentages:</span> {lastResult.percentage_corrections} corrected
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2">
              Completed at: {new Date(lastResult.completed_at).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
