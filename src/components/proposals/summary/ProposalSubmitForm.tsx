import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSimpleProposal } from "@/services/proposals/simple/proposalCreation";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProposalSubmitFormProps {
  eligibility: EligibilityCriteria;
  clientInfo: ClientInformation;
  projectInfo: ProjectInformation;
  nextStep: () => void;
  prevStep: () => void;
  selectedClientId?: string | null;
}

export function ProposalSubmitForm({ 
  eligibility, 
  clientInfo, 
  projectInfo, 
  nextStep, 
  prevStep,
  selectedClientId
}: ProposalSubmitFormProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [creationStatus, setCreationStatus] = useState<{
    stage: 'idle' | 'creating-client' | 'creating-proposal' | 'validating' | 'complete';
    message?: string;
    warnings?: string[];
  }>({ stage: 'idle' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a proposal",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    setCreationStatus({ stage: 'creating-client', message: 'Setting up client profile...' });
    
    try {
      const result = await createSimpleProposal(
        projectInfo.name,
        user.id,
        eligibility,
        projectInfo,
        clientInfo,
        selectedClientId || undefined
      );
      
      if (result.success) {
        setCreationStatus({ 
          stage: 'complete', 
          message: 'Proposal created successfully'
        });

        toast({
          title: "Proposal Created Successfully",
          description: selectedClientId 
            ? "Your proposal has been created for the selected client."
            : "Your proposal has been created and a new client profile has been set up automatically.",
        });
        
        // Navigate directly to proposals list
        navigate('/proposals');
      } else {
        setCreationStatus({ stage: 'idle' });
        toast({
          title: "Error",
          description: result.error || "Failed to create proposal.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in proposal submission:", error);
      setCreationStatus({ stage: 'idle' });
      toast({
        title: "Unexpected Error",
        description: "Something went wrong while creating your proposal.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCreationStatus = () => {
    if (creationStatus.stage === 'idle') return null;

    const getStatusIcon = () => {
      switch (creationStatus.stage) {
        case 'creating-client':
        case 'creating-proposal':
        case 'validating':
          return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
        case 'complete':
          return <CheckCircle className="h-4 w-4 text-green-600" />;
        default:
          return null;
      }
    };

    const getStatusMessage = () => {
      switch (creationStatus.stage) {
        case 'creating-client':
          return selectedClientId ? 'Verifying client details...' : 'Creating new client profile...';
        case 'creating-proposal':
          return 'Creating proposal with carbon calculations...';
        case 'validating':
          return 'Validating client linkage...';
        case 'complete':
          return 'Proposal created successfully!';
        default:
          return creationStatus.message || 'Processing...';
      }
    };

    return (
      <Alert className="mb-4 border-blue-200 bg-blue-50">
        {getStatusIcon()}
        <AlertDescription className="text-blue-800">
          {getStatusMessage()}
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {renderCreationStatus()}
      
      {/* Show client creation info for new clients */}
      {!selectedClientId && clientInfo.name && !isSubmitting && (
        <Alert className="mb-4 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            A new client profile will be created for <strong>{clientInfo.name}</strong> ({clientInfo.email})
            {clientInfo.companyName && ` from ${clientInfo.companyName}`}.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between w-full">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={isSubmitting}
        >
          Previous
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {creationStatus.stage === 'creating-client' ? 'Setting up client...' : 'Creating Proposal...'}
            </>
          ) : (
            "Create Proposal"
          )}
        </Button>
      </div>
    </form>
  );
}
