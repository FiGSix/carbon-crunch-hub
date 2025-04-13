
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createProposal } from "@/services/proposalService";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "../types";

interface ProposalSubmitFormProps {
  eligibility: EligibilityCriteria;
  clientInfo: ClientInformation;
  projectInfo: ProjectInformation;
  nextStep: () => void;
  prevStep: () => void;
}

export function ProposalSubmitForm({ 
  eligibility,
  clientInfo, 
  projectInfo, 
  nextStep, 
  prevStep 
}: ProposalSubmitFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitProposal = async () => {
    setIsSubmitting(true);
    
    try {
      const result = await createProposal(
        eligibility,
        clientInfo,
        projectInfo
      );
      
      if (result.success) {
        toast({
          title: "Proposal Created",
          description: "Your proposal has been successfully created.",
          variant: "default",
        });
        nextStep(); // Navigate to the next step or proposals list
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create proposal",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting proposal:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the proposal.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-between border-t pt-6">
      <Button 
        variant="outline" 
        onClick={prevStep}
        className="retro-button"
        disabled={isSubmitting}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Previous
      </Button>
      <Button 
        onClick={handleSubmitProposal}
        disabled={isSubmitting}
        className="retro-button"
      >
        {isSubmitting ? (
          <>Generating Proposal...</>
        ) : (
          <>Generate Proposal <ArrowRight className="ml-2 h-4 w-4" /></>
        )}
      </Button>
    </div>
  );
}
