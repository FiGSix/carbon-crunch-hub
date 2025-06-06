
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { CorrectionAlert } from './correction/CorrectionAlert';
import { ComprehensiveCorrection } from './correction/ComprehensiveCorrection';
import { IndividualCorrections } from './correction/IndividualCorrections';
import { CorrectionResults } from './correction/CorrectionResults';
import { CorrectionResult, CorrectionFunction } from './correction/types';

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
        // More careful type conversion
        const result: CorrectionResult = {
          system_size_corrections: Number(data.system_size_corrections) || 0,
          carbon_value_corrections: Number(data.carbon_value_corrections) || 0,
          percentage_corrections: Number(data.percentage_corrections) || 0,
          completed_at: String(data.completed_at) || new Date().toISOString()
        };
        
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

  const runIndividualCorrection = async (functionName: CorrectionFunction, description: string) => {
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
        <CorrectionAlert />
        
        <ComprehensiveCorrection 
          onRunCorrection={runComprehensiveCorrection}
          loading={loading}
        />
        
        <IndividualCorrections 
          onRunCorrection={runIndividualCorrection}
          loading={loading}
        />

        {lastResult && <CorrectionResults result={lastResult} />}
      </CardContent>
    </Card>
  );
}
