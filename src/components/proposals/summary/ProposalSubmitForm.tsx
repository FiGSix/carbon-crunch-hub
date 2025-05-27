
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { createProposal } from "@/services/proposalService";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { Loader2 } from "lucide-react";

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
      const result = await createProposal(
        eligibility,
        clientInfo,
        projectInfo,
        user.id,
        selectedClientId || undefined
      );
      
      if (result.success) {
        toast({
          title: "Proposal Created Successfully",
          description: "Your proposal has been created and is ready for client review. A PDF is being generated automatically.",
        });
        
        // Move to next step, which will navigate to the proposals list
        nextStep();
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
