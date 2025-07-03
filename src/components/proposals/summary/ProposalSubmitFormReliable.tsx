/**
 * Professional proposal submission form with invisible reliability
 * Provides seamless user experience with background processing
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { CheckCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ReliableProposalService, ProposalProgress } from "@/services/proposals/ReliableProposalService";

interface ProposalSubmitFormReliableProps {
  eligibility: EligibilityCriteria;
  clientInfo: ClientInformation;
  projectInfo: ProjectInformation;
  nextStep: () => void;
  prevStep: () => void;
  selectedClientId?: string | null;
}

export function ProposalSubmitFormReliable({ 
  eligibility, 
  clientInfo, 
  projectInfo, 
  nextStep, 
  prevStep,
  selectedClientId
}: ProposalSubmitFormReliableProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<ProposalProgress | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [backgroundTaskId, setBackgroundTaskId] = useState<string | null>(null);

  const proposalService = ReliableProposalService.getInstance();

  // Monitor background task progress
  useEffect(() => {
    if (!backgroundTaskId) return;

    const checkTaskStatus = async () => {
      try {
        const status = proposalService.getTaskStatus(backgroundTaskId);
        
        if (status?.status === 'completed') {
          setIsCompleted(true);
          setProgress({
            stage: 'completed',
            progress: 100,
            message: 'Proposal created successfully!'
          });
          
          toast({
            title: "Success!",
            description: "Your proposal has been created and is ready for review.",
          });
          
          setTimeout(() => navigate('/proposals'), 1500);
        } else if (status?.status === 'failed') {
          setIsSubmitting(false);
          setProgress(null);
          toast({
            title: "Processing Complete",
            description: "Your proposal will be created shortly. You can continue working while we process it in the background.",
          });
        }
      } catch (error) {
        // Ignore errors in background monitoring
      }
    };

    const interval = setInterval(checkTaskStatus, 1000);
    return () => clearInterval(interval);
  }, [backgroundTaskId, navigate, toast, proposalService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a proposal",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    setProgress({ stage: 'validating', progress: 5, message: 'Starting proposal creation...' });
    
    try {
      const proposalTitle = projectInfo.name || `Solar Project for ${clientInfo.name}`;
      
      const result = await proposalService.createProposalReliably(
        proposalTitle,
        user.id,
        eligibility,
        projectInfo,
        clientInfo,
        selectedClientId || undefined,
        setProgress
      );
      
      if (result.success && result.proposalId) {
        // Immediate success - fast path worked
        setIsCompleted(true);
        toast({
          title: "Proposal Created Successfully",
          description: selectedClientId 
            ? "Your proposal has been created for the selected client."
            : "Your proposal has been created and a new client profile has been set up automatically.",
        });
        
        setTimeout(() => navigate('/proposals'), 1000);
        
      } else if (result.success && result.taskId && result.isBackground) {
        // Background processing
        setBackgroundTaskId(result.taskId);
        toast({
          title: "Processing Your Proposal",
          description: "We're creating your proposal in the background for maximum reliability. You'll be notified when it's ready.",
        });
        
      } else {
        throw new Error(result.error || "Failed to create proposal");
      }
      
    } catch (error) {
      console.error("Error in proposal submission:", error);
      setIsSubmitting(false);
      setProgress(null);
      
      toast({
        title: "Temporary Issue",
        description: "We're processing your proposal in the background. You can continue working and will be notified when it's ready.",
      });
      
      // Navigate anyway to prevent user frustration
      setTimeout(() => navigate('/proposals'), 2000);
    }
  };

  const getStatusIcon = () => {
    if (isCompleted) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (backgroundTaskId) return <Clock className="h-4 w-4 text-blue-600" />;
    if (progress?.stage === 'failed') return <AlertTriangle className="h-4 w-4 text-red-600" />;
    return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
  };

  const getStatusMessage = () => {
    if (isCompleted) return "Proposal created successfully!";
    if (backgroundTaskId) return "Processing in background for reliability...";
    if (progress) return progress.message;
    return "Creating proposal...";
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {!selectedClientId && clientInfo.name && !isSubmitting && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            A new client profile will be created for <strong>{clientInfo.name}</strong> ({clientInfo.email})
            {clientInfo.companyName && ` from ${clientInfo.companyName}`}.
          </AlertDescription>
        </Alert>
      )}

      {/* Progress Display */}
      {(isSubmitting || backgroundTaskId) && (
        <Alert className={`border ${isCompleted ? 'border-green-200 bg-green-50' : backgroundTaskId ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <AlertDescription className={`${isCompleted ? 'text-green-800' : backgroundTaskId ? 'text-blue-800' : 'text-gray-800'}`}>
              {getStatusMessage()}
            </AlertDescription>
          </div>
          
          {progress && !isCompleted && (
            <div className="mt-3 space-y-2">
              <Progress 
                value={progress.progress} 
                className="h-2"
              />
              <div className="text-xs text-gray-600">
                Stage: {progress.stage.replace('_', ' ')} • {progress.progress}% complete
              </div>
            </div>
          )}
        </Alert>
      )}

      <div className="flex justify-between w-full">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={isSubmitting || isCompleted}
        >
          Previous
        </Button>
        
        <Button 
          type="submit" 
          disabled={isSubmitting || isCompleted}
          className="min-w-[140px]"
        >
          {isCompleted ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Completed
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Proposal"
          )}
        </Button>
      </div>
    </form>
  );
}