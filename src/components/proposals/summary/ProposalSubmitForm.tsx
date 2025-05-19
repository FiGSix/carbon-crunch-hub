
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createProposal } from "@/services/proposalService";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { refreshSession } from "@/lib/supabase/auth";
import { useAuth } from "@/contexts/auth";

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
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmitProposal = async () => {
    // Reset error state
    setErrorMessage(null);
    setIsSubmitting(true);
    
    try {
      // Perform validation before submission
      if (!clientInfo.email) {
        setErrorMessage("Client email is required.");
        setIsSubmitting(false);
        return;
      }
      
      if (!clientInfo.name) {
        setErrorMessage("Client name is required.");
        setIsSubmitting(false);
        return;
      }
      
      if (!projectInfo.name) {
        setErrorMessage("Project name is required.");
        setIsSubmitting(false);
        return;
      }
      
      if (!projectInfo.size) {
        setErrorMessage("Project size is required.");
        setIsSubmitting(false);
        return;
      }
      
      // Check if user is authenticated
      if (!user || !user.id) {
        setErrorMessage("You must be signed in to create a proposal. Please sign in and try again.");
        setIsSubmitting(false);
        return;
      }
      
      // Refresh session before submitting to ensure we have valid tokens
      try {
        await refreshSession();
      } catch (sessionError) {
        console.error("Failed to refresh session:", sessionError);
        // Continue anyway, the createProposal function will handle auth errors
      }
      
      // Submit the proposal using our service with explicit user ID
      const result = await createProposal(
        eligibility,
        clientInfo,
        projectInfo,
        user.id
      );
      
      if (result.success) {
        toast({
          title: "Proposal Created",
          description: "Your proposal has been successfully created.",
          variant: "default",
        });
        nextStep(); // Navigate to the next step or proposals list
      } else {
        // Check for specific error types and provide helpful messages
        let displayError = result.error || "Failed to create proposal. Please try again.";
        
        if (result.error?.includes("foreign key constraint")) {
          displayError = "Invalid client reference. This client may need to be properly registered first.";
        } else if (result.error?.includes("infinite recursion")) {
          displayError = "Database permission error detected. Please try again.";
        } else if (result.error?.includes("client profile")) {
          displayError = "Unable to create client profile. Please check your connection and try again.";
        } else if (result.error?.includes("logged in")) {
          displayError = "Your session has expired. Please sign in again to continue.";
        } else if (result.error?.includes("invalid input syntax for type uuid")) {
          displayError = "Authentication error. Please sign out and sign back in to continue.";
        }
        
        setErrorMessage(displayError);
        toast({
          title: "Error",
          description: displayError,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting proposal:", error);
      setErrorMessage("An unexpected error occurred. Please try again or contact support.");
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 w-full">
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {errorMessage}
            {errorMessage.includes("Database permission error") && (
              <p className="mt-2 text-sm">
                This was a known issue that has been fixed. Please try submitting again.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
      
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
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating Proposal...</>
          ) : (
            <>Generate Proposal <ArrowRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
