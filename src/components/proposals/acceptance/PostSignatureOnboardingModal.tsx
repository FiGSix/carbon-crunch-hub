import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
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

interface PostSignatureOnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  token?: string | null;
}

export function PostSignatureOnboardingModal({
  open,
  onOpenChange,
  proposalId,
  token,
}: PostSignatureOnboardingModalProps) {
  const navigate = useNavigate();

  const handleProceedToOnboarding = () => {
    navigate('/onboarding');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
            </div>
            <AlertDialogTitle className="text-2xl">
              Thanks for signing your Cession Agreement
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-4">
            <p className="font-medium text-foreground">
              You're almost done.
            </p>
            
            <p>
              Next, we'll onboard your project by adding:
            </p>
            
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>System details (size, inverter, panels, etc.)</li>
              <li>Compliance info (COC, invoices, meter serials)</li>
              <li>Data access for your inverter or meter</li>
            </ul>
            
            <p className="text-muted-foreground italic">
              Your EPC partner can help complete this step quickly.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="gap-3">
          <AlertDialogCancel onClick={handleBackToDashboard}>
            Back to Dashboard
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleProceedToOnboarding}>
            Proceed to Onboarding
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
