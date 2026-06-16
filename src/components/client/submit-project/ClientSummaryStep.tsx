import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EligibilityCriteria, ProjectInformation } from "@/types/proposals";
import { ProjectInformationSection } from "@/components/proposals/summary/ProjectInformationSection";
import { CarbonCreditSection } from "@/components/proposals/summary/CarbonCreditSection";
import { RevenueDistributionSection } from "@/components/proposals/summary/RevenueDistributionSection";
import { submitClientProject } from "@/services/proposals/clientProjectSubmission";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface ClientSummaryStepProps {
  eligibility: EligibilityCriteria;
  projectInfo: ProjectInformation;
  prevStep: () => void;
}

export function ClientSummaryStep({
  eligibility,
  projectInfo,
  prevStep,
}: ClientSummaryStepProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitClientProject(eligibility, projectInfo, user.id);

      if (result.success) {
        toast({
          title: "Project Submitted!",
          description: "Your project has been submitted for review. You'll find it in your Proposals list.",
        });
        navigate("/proposals");
      } else {
        toast({
          title: "Submission Failed",
          description: result.error || "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="retro-card">
      <CardHeader>
        <CardTitle>Review & Submit</CardTitle>
        <CardDescription>
          Review your project details before submitting for review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <ProjectInformationSection projectInfo={projectInfo} />
          <CarbonCreditSection
            systemSize={projectInfo.size}
            commissionDate={projectInfo.commissionDate}
            phases={projectInfo.phases}
            isMultiPhase={projectInfo.isMultiPhase}
          />
          <RevenueDistributionSection
            systemSize={projectInfo.size}
            isClient={true}
            commissionDate={projectInfo.commissionDate}
            phases={projectInfo.phases}
            isMultiPhase={projectInfo.isMultiPhase}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={prevStep} disabled={submitting}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Project"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
