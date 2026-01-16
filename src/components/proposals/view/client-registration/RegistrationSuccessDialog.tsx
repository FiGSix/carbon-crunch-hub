import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RegistrationSuccessDialogProps {
  open: boolean;
  email: string;
  onClose: () => void;
}

export function RegistrationSuccessDialog({ 
  open, 
  email, 
  onClose 
}: RegistrationSuccessDialogProps) {
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      toast({
        title: "Verification email sent",
        description: "Please check your inbox for the new verification link.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to resend",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const handleBackToHome = () => {
    onClose();
    window.location.href = '/';
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            Thank You for Registering!
          </DialogTitle>
          <DialogDescription className="text-base space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Mail className="w-5 h-5" />
              <span>We've sent a verification email to:</span>
            </div>
            <p className="font-medium text-foreground">{email}</p>
            <p className="text-sm">
              Please click the link in your email to verify your account. 
              Once verified, you can sign in to view and manage your proposals.
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleBackToHome} className="w-full">
            Back to Home
          </Button>
          <Button 
            variant="outline" 
            onClick={handleResendEmail} 
            disabled={resending}
            className="w-full"
          >
            {resending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Resend verification email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
