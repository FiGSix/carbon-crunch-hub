
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { createProposal } from "@/services/proposals/unifiedProposalService";
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
    
    try {
      const proposalTitle = projectInfo.name || `Solar Project for ${clientInfo.name}`;
      
      const result = await createProposal(
        proposalTitle,
        user.id,
        eligibility,
        projectInfo,
        clientInfo,
        selectedClientId || undefined
      );
      
      if (result.success) {
        toast({
          title: "Proposal Created Successfully",
          description: selectedClientId 
            ? "Your proposal has been created for the selected client."
            : "Your proposal has been created and a new client profile has been set up automatically.",
        });
        
        navigate('/proposals');
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create proposal.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in proposal submission:", error);
      toast({
        title: "Unexpected Error",
        description: "Something went wrong while creating your proposal.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
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
              Creating Proposal...
            </>
          ) : (
            "Create Proposal"
          )}
        </Button>
      </div>
    </form>
  );
}
