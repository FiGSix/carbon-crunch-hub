
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ArrowLeft, FileText, X } from "lucide-react";
import { 
  calculateAnnualEnergy, 
  calculateCarbonCredits, 
  calculateRevenue,
  getClientSharePercentage,
  getAgentCommissionPercentage,
  getCarbonPriceForYear
} from "@/components/proposals/utils/proposalCalculations";

interface ProposalData {
  id: string;
  title: string;
  status: string;
  content: any;
  client_id: string;
  agent_id: string | null;
  created_at: string;
  signed_at: string | null;
  invitation_viewed_at: string | null;
}

const ViewProposal = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchProposal = async () => {
      try {
        setLoading(true);
        
        if (token) {
          // Validate the token and get the proposal ID
          const { data: proposalId, error: validationError } = await supabase.rpc('validate_invitation_token', { token });
          
          if (validationError || !proposalId) {
            setError("This invitation link is invalid or has expired.");
            setLoading(false);
            return;
          }
          
          // Mark the invitation as viewed
          await supabase
            .from('proposals')
            .update({ invitation_viewed_at: new Date().toISOString() })
            .eq('invitation_token', token);
          
          // Now fetch the proposal with the validated ID
          const { data, error: fetchError } = await supabase
            .from('proposals')
            .select('*')
            .eq('id', proposalId)
            .single();
          
          if (fetchError) {
            throw fetchError;
          }
          
          setProposal(data);
        } else if (id) {
          // Regular fetch by ID (for authenticated users)
          const { data, error: fetchError } = await supabase
            .from('proposals')
            .select('*')
            .eq('id', id)
            .single();
          
          if (fetchError) {
            throw fetchError;
          }
          
          setProposal(data);
        } else {
          setError("No proposal ID or invitation token provided.");
        }
      } catch (err) {
        console.error("Error fetching proposal:", err);
        setError("Failed to load the proposal. It may have been deleted or you don't have permission to view it.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProposal();
  }, [id, token]);
  
  const handleApprove = async () => {
    try {
      if (!proposal?.id) return;
      
      const { error } = await supabase
        .from('proposals')
        .update({ 
          status: 'approved',
          signed_at: new Date().toISOString()
        })
        .eq('id', proposal.id);
      
      if (error) throw error;
      
      toast({
        title: "Proposal Approved",
        description: "Thank you for approving this proposal.",
      });
      
      // Refresh the proposal data
      setProposal(prev => prev ? {...prev, status: 'approved', signed_at: new Date().toISOString()} : null);
    } catch (error) {
      console.error("Error approving proposal:", error);
      toast({
        title: "Error",
        description: "Failed to approve proposal. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleReject = async () => {
    try {
      if (!proposal?.id) return;
      
      const { error } = await supabase
        .from('proposals')
        .update({ status: 'rejected' })
        .eq('id', proposal.id);
      
      if (error) throw error;
      
      toast({
        title: "Proposal Rejected",
        description: "The proposal has been rejected.",
      });
      
      // Refresh the proposal data
      setProposal(prev => prev ? {...prev, status: 'rejected'} : null);
    } catch (error) {
      console.error("Error rejecting proposal:", error);
      toast({
        title: "Error",
        description: "Failed to reject proposal. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-carbon-gray-500">Loading proposal...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <Card className="retro-card">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>There was a problem loading this proposal</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-carbon-gray-700">{error}</p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="retro-button"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (!proposal) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-carbon-gray-500">Proposal not found</p>
        </div>
      </div>
    );
  }
  
  // Extract client and project info from the proposal content
  const clientInfo = proposal.content?.clientInfo || {};
  const projectInfo = proposal.content?.projectInfo || {};
  
  // Calculate metrics based on project size
  const projectSize = parseFloat(projectInfo.size || '0');
  const revenue = calculateRevenue(projectInfo.size);
  const clientSharePercentage = getClientSharePercentage(projectInfo.size);
  const agentCommissionPercentage = getAgentCommissionPercentage(projectInfo.size);
  const crunchCarbonSharePercentage = 100 - clientSharePercentage - agentCommissionPercentage;
  
  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-carbon-gray-900">{proposal.title}</h1>
          <p className="text-carbon-gray-600">Carbon Credit Proposal</p>
        </div>
        {token && (
          <div className="flex items-center bg-carbon-green-50 text-carbon-green-700 px-4 py-2 rounded-lg">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            <span>Viewing invitation</span>
          </div>
        )}
      </div>
      
      <div className="space-y-8">
        <Card className="retro-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Proposal Details
            </CardTitle>
            <CardDescription>
              Review the details of this carbon credit proposal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Client Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-carbon-gray-500">Name</p>
                    <p className="font-medium">{clientInfo.name || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-carbon-gray-500">Email</p>
                    <p className="font-medium">{clientInfo.email || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-carbon-gray-500">Phone</p>
                    <p className="font-medium">{clientInfo.phone || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-carbon-gray-500">Company</p>
                    <p className="font-medium">{clientInfo.companyName || "—"}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Project Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-carbon-gray-500">Project Name</p>
                    <p className="font-medium">{projectInfo.name || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-carbon-gray-500">System Size</p>
                    <p className="font-medium">{projectInfo.size || "0"} MWp</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-carbon-gray-500">Address</p>
                    <p className="font-medium">{projectInfo.address || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-carbon-gray-500">Commission Date</p>
                    <p className="font-medium">
                      {projectInfo.commissionDate ? 
                        new Date(projectInfo.commissionDate).toLocaleDateString() : 
                        "Not specified"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Carbon Credit Projection</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-carbon-gray-500">Estimated Annual Energy</p>
                    <p className="font-medium">{calculateAnnualEnergy(projectInfo.size).toLocaleString()} kWh</p>
                  </div>
                  <div>
                    <p className="text-sm text-carbon-gray-500">Estimated Annual Carbon Credits</p>
                    <p className="font-medium">{calculateCarbonCredits(projectInfo.size).toFixed(2)} tCO₂</p>
                  </div>
                </div>
                
                <h4 className="font-medium text-carbon-gray-700 mb-2">Projected Revenue by Year</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-carbon-gray-50">
                        <th className="px-4 py-2 text-left text-sm font-medium text-carbon-gray-700 border border-carbon-gray-200">Year</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-carbon-gray-700 border border-carbon-gray-200">Carbon Price (R/tCO₂)</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-carbon-gray-700 border border-carbon-gray-200">Estimated Revenue (R)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenue && Object.entries(revenue).map(([year, amount]) => (
                        <tr key={year}>
                          <td className="px-4 py-2 text-sm border border-carbon-gray-200">{year}</td>
                          <td className="px-4 py-2 text-sm border border-carbon-gray-200">
                            {getCarbonPriceForYear(year)}
                          </td>
                          <td className="px-4 py-2 text-sm text-right border border-carbon-gray-200">R {amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Revenue Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-carbon-green-50 rounded-lg border border-carbon-green-200">
                    <p className="text-sm text-carbon-gray-500">Client Share</p>
                    <p className="text-xl font-bold text-carbon-green-600">{clientSharePercentage}%</p>
                    <p className="text-xs text-carbon-gray-500 mt-1">Based on portfolio size</p>
                  </div>
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
                </div>
              </div>
            </div>
          </CardContent>
          
          {token && proposal.status === 'pending' && (
            <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between border-t pt-6">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive/10"
                onClick={handleReject}
              >
                <X className="mr-2 h-4 w-4" /> Reject Proposal
              </Button>
              <Button 
                className="w-full sm:w-auto bg-carbon-green-500 hover:bg-carbon-green-600 text-white"
                onClick={handleApprove}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Proposal
              </Button>
            </CardFooter>
          )}
          
          {proposal.status === 'approved' && (
            <CardFooter className="border-t pt-6">
              <div className="w-full flex items-center justify-center bg-carbon-green-50 p-4 rounded-lg border border-carbon-green-200">
                <CheckCircle2 className="text-carbon-green-500 h-5 w-5 mr-2" />
                <p className="text-carbon-green-700 font-medium">
                  This proposal has been approved on {new Date(proposal.signed_at || '').toLocaleDateString()}
                </p>
              </div>
            </CardFooter>
          )}
          
          {proposal.status === 'rejected' && (
            <CardFooter className="border-t pt-6">
              <div className="w-full flex items-center justify-center bg-carbon-red-50 p-4 rounded-lg border border-carbon-red-200">
                <X className="text-carbon-red-500 h-5 w-5 mr-2" />
                <p className="text-carbon-red-700 font-medium">
                  This proposal has been rejected
                </p>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ViewProposal;
