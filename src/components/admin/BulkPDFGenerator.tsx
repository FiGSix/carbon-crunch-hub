
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { FileText, Play, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface BatchStatus {
  id: string;
  status: string;
  total_proposals: number;
  processed_proposals: number;
  successful_generations: number;
  failed_generations: number;
  created_at: string;
  started_at: string;
  completed_at: string;
  error_message: string;
}

interface ProposalMissingPdf {
  id: string;
  title: string;
  status: string;
  created_at: string;
  pdf_generation_status: string;
}

export function BulkPDFGenerator() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<BatchStatus | null>(null);
  const [proposalsMissingPdfs, setProposalsMissingPdfs] = useState<ProposalMissingPdf[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMissingProposals = async () => {
    try {
      const { data, error } = await supabase.rpc('get_proposals_missing_pdfs');
      if (error) throw error;
      setProposalsMissingPdfs(data || []);
    } catch (error) {
      console.error('Error fetching missing proposals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch proposals missing PDFs",
        variant: "destructive",
      });
    }
  };

  const fetchLatestBatch = async () => {
    try {
      const { data, error } = await supabase
        .from('pdf_generation_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setCurrentBatch(data);
      }
    } catch (error) {
      // No batches yet is fine
      console.log('No previous batches found');
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchMissingProposals(), fetchLatestBatch()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Poll for batch updates when generating
  useEffect(() => {
    if (!isGenerating || !currentBatch) return;

    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('pdf_generation_batches')
          .select('*')
          .eq('id', currentBatch.id)
          .single();

        if (data) {
          setCurrentBatch(data);
          
          if (data.status === 'completed' || data.status === 'failed') {
            setIsGenerating(false);
            await fetchMissingProposals(); // Refresh the missing proposals list
            
            toast({
              title: data.status === 'completed' ? "Success" : "Batch Failed",
              description: data.status === 'completed' 
                ? `PDF generation completed. ${data.successful_generations} successful, ${data.failed_generations} failed.`
                : `Batch failed: ${data.error_message}`,
              variant: data.status === 'completed' ? "default" : "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Error polling batch status:', error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isGenerating, currentBatch, toast]);

  const startBulkGeneration = async () => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('bulk-generate-pdfs');

      if (error) throw error;

      if (data.batchId) {
        setCurrentBatch({
          id: data.batchId,
          status: 'processing',
          total_proposals: data.totalProposals,
          processed_proposals: 0,
          successful_generations: 0,
          failed_generations: 0,
          created_at: new Date().toISOString(),
          started_at: new Date().toISOString(),
          completed_at: '',
          error_message: ''
        });

        toast({
          title: "PDF Generation Started",
          description: `Started generating PDFs for ${data.totalProposals} proposals`,
        });
      } else {
        setIsGenerating(false);
        toast({
          title: "No PDFs to Generate",
          description: data.message,
        });
      }
    } catch (error) {
      setIsGenerating(false);
      console.error('Error starting bulk generation:', error);
      toast({
        title: "Error",
        description: "Failed to start bulk PDF generation",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bulk PDF Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = currentBatch && currentBatch.total_proposals > 0 
    ? (currentBatch.processed_proposals / currentBatch.total_proposals) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Bulk PDF Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Proposals missing PDFs: <span className="font-semibold">{proposalsMissingPdfs.length}</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={isGenerating}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button
                onClick={startBulkGeneration}
                disabled={isGenerating || proposalsMissingPdfs.length === 0}
              >
                <Play className="h-4 w-4 mr-1" />
                Generate All PDFs
              </Button>
            </div>
          </div>

          {proposalsMissingPdfs.length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                All proposals have PDFs generated. No action needed.
              </AlertDescription>
            </Alert>
          )}

          {currentBatch && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Current Batch Status</h4>
                <Badge className={getStatusColor(currentBatch.status)}>
                  {currentBatch.status}
                </Badge>
              </div>
              
              {currentBatch.status === 'processing' && (
                <div className="space-y-2">
                  <Progress value={progressPercentage} className="w-full" />
                  <p className="text-sm text-gray-600">
                    {currentBatch.processed_proposals} of {currentBatch.total_proposals} processed
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Successful: {currentBatch.successful_generations}</span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>Failed: {currentBatch.failed_generations}</span>
                </div>
                <div>
                  <span>Total: {currentBatch.total_proposals}</span>
                </div>
              </div>

              {currentBatch.error_message && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {currentBatch.error_message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {proposalsMissingPdfs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Proposals Missing PDFs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {proposalsMissingPdfs.map((proposal) => (
                <div key={proposal.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <span className="font-medium">{proposal.title}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({new Date(proposal.created_at).toLocaleDateString()})
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {proposal.pdf_generation_status || 'pending'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
