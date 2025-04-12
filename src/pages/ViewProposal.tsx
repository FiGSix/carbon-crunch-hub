
import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ArrowLeft, FileText, X, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ProposalSkeleton } from "@/components/proposals/loading/ProposalSkeleton";
import { ProposalExportButton } from "@/components/proposals/components/ProposalExportButton";
import { RevenueDistributionSection } from "@/components/proposals/summary/RevenueDistributionSection";
import { CarbonCreditSection } from "@/components/proposals/summary/CarbonCreditSection";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  
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
      setShowApproveDialog(false);
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
      setShowRejectDialog(false);
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
        <ProposalSkeleton />
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
  
  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-carbon-gray-900">{proposal.title}</h1>
          <p className="text-carbon-gray-600">Carbon Credit Proposal</p>
        </div>
        <div className="flex items-center">
          {token && (
            <div className="flex items-center bg-carbon-green-50 text-carbon-green-700 px-4 py-2 rounded-lg mr-3">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              <span>Viewing invitation</span>
            </div>
          )}
          {projectInfo.size && projectInfo.name && (
            <ProposalExportButton 
              systemSize={projectInfo.size} 
              projectName={projectInfo.name}
            />
          )}
        </div>
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
              
              {projectInfo.size && (
                <>
                  <CarbonCreditSection systemSize={projectInfo.size} />
                  <RevenueDistributionSection systemSize={projectInfo.size} />
                </>
              )}
            </div>
          </CardContent>
          
          {token && proposal.status === 'pending' && (
            <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between border-t pt-6">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setShowRejectDialog(true)}
              >
                <X className="mr-2 h-4 w-4" /> Reject Proposal
              </Button>
              <Button 
                className="w-full sm:w-auto bg-carbon-green-500 hover:bg-carbon-green-600 text-white"
                onClick={() => setShowApproveDialog(true)}
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
      
      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this proposal? This action indicates your acceptance of the terms and conditions outlined in the proposal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleApprove}
              className="bg-carbon-green-500 hover:bg-carbon-green-600 text-white"
            >
              Yes, Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Reject Confirmation Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this proposal? If you have any questions or would like to discuss modifications, please contact the agent directly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ViewProposal;
