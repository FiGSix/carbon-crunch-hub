
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, RefreshCw, CheckCircle, AlertTriangle, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface PopulationResult {
  proposal_id: string;
  client_email: string;
  found_client_id: string;
  action_taken: string;
}

interface ComprehensiveResult {
  client_reference_fixes: number;
  system_size_corrections: number;
  carbon_value_corrections: number;
  percentage_corrections: number;
  completed_at: string;
}

export function ClientPopulationManager() {
  const { userRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [populationResults, setPopulationResults] = useState<PopulationResult[]>([]);
  const [comprehensiveResult, setComprehensiveResult] = useState<ComprehensiveResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Only show to admins
  if (userRole !== 'admin') {
    return null;
  }

  const runClientPopulation = async () => {
    setLoading(true);
    
    try {
      console.log("Starting client population process...");
      
      const { data, error } = await supabase.rpc('populate_missing_client_references');
      
      if (error) {
        console.error("Client population error:", error);
        throw error;
      }
      
      console.log("Client population completed:", data);
      
      if (data && Array.isArray(data)) {
        setPopulationResults(data);
        
        toast({
          title: "Client Population Complete",
          description: `Successfully processed ${data.length} proposals and populated client references.`,
        });
      } else {
        setPopulationResults([]);
        toast({
          title: "Client Population Complete",
          description: "No missing client references found to populate.",
        });
      }
      
    } catch (error) {
      console.error("Error running client population:", error);
      toast({
        title: "Client Population Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runComprehensiveCorrection = async () => {
    setLoading(true);
    
    try {
      console.log("Starting comprehensive data correction...");
      
      const { data, error } = await supabase.rpc('run_comprehensive_data_correction');
      
      if (error) {
        console.error("Comprehensive correction error:", error);
        throw error;
      }
      
      console.log("Comprehensive correction completed:", data);
      
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const result: ComprehensiveResult = {
          client_reference_fixes: Number(data.client_reference_fixes) || 0,
          system_size_corrections: Number(data.system_size_corrections) || 0,
          carbon_value_corrections: Number(data.carbon_value_corrections) || 0,
          percentage_corrections: Number(data.percentage_corrections) || 0,
          completed_at: String(data.completed_at) || new Date().toISOString()
        };
        
        setComprehensiveResult(result);
        
        toast({
          title: "Comprehensive Correction Complete",
          description: `Fixed ${result.client_reference_fixes} client references, ${result.system_size_corrections} system sizes, ${result.carbon_value_corrections} carbon calculations, and ${result.percentage_corrections} percentages.`,
        });
      }
      
      // Trigger a global refresh
      window.dispatchEvent(new CustomEvent('proposal-status-changed', {
        detail: { type: 'comprehensive-correction-complete' }
      }));
      
    } catch (error) {
      console.error("Error running comprehensive correction:", error);
      toast({
        title: "Comprehensive Correction Failed",
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
          <Users className="h-5 w-5 mr-2" />
          Client Population Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-blue-200 bg-blue-50">
          <Database className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            This tool populates the clients table using existing proposal data and fixes data inconsistencies across the system.
          </AlertDescription>
        </Alert>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Client Population */}
          <div className="space-y-3">
            <h4 className="font-medium text-carbon-gray-900 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Populate Client References
            </h4>
            <p className="text-sm text-carbon-gray-600">
              Extract client information from proposals and create client records where missing.
            </p>
            <Button
              onClick={runClientPopulation}
              disabled={loading}
              className="w-full"
              size="sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Populating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Populate Client Data
                </>
              )}
            </Button>
          </div>

          {/* Comprehensive Correction */}
          <div className="space-y-3">
            <h4 className="font-medium text-carbon-gray-900 flex items-center">
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Full Data Correction
            </h4>
            <p className="text-sm text-carbon-gray-600">
              Complete data correction including client refs, system sizes, carbon calculations, and percentages.
            </p>
            <Button
              onClick={runComprehensiveCorrection}
              disabled={loading}
              variant="outline"
              className="w-full"
              size="sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Running Correction...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Run Comprehensive Correction
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results Section */}
        {(populationResults.length > 0 || comprehensiveResult) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-carbon-gray-900">Results</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>

            {comprehensiveResult && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Comprehensive Correction Complete:</strong><br />
                  • {comprehensiveResult.client_reference_fixes} client references fixed<br />
                  • {comprehensiveResult.system_size_corrections} system sizes corrected<br />
                  • {comprehensiveResult.carbon_value_corrections} carbon calculations updated<br />
                  • {comprehensiveResult.percentage_corrections} percentage corrections made<br />
                  <span className="text-xs">Completed at: {new Date(comprehensiveResult.completed_at).toLocaleString()}</span>
                </AlertDescription>
              </Alert>
            )}

            {populationResults.length > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Client Population Complete:</strong> {populationResults.length} proposals processed
                </AlertDescription>
              </Alert>
            )}

            {showDetails && populationResults.length > 0 && (
              <div className="max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                <h5 className="font-medium mb-2">Population Details:</h5>
                {populationResults.map((result, index) => (
                  <div key={index} className="text-sm mb-2 p-2 bg-white rounded border">
                    <div><strong>Email:</strong> {result.client_email}</div>
                    <div><strong>Action:</strong> {result.action_taken}</div>
                    <div><strong>Client ID:</strong> {result.found_client_id}</div>
                    <div className="text-xs text-gray-500">Proposal: {result.proposal_id}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 p-3 bg-carbon-yellow-50 rounded-lg border border-carbon-yellow-200">
          <p className="text-sm text-carbon-yellow-700">
            <strong>Note:</strong> Always run client population before comprehensive correction for best results. 
            The comprehensive correction includes all validation and calculation fixes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
