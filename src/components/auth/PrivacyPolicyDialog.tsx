
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";

interface PrivacyPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
}

export const PrivacyPolicyDialog = ({ open, onOpenChange, isLoading }: PrivacyPolicyDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button 
          type="button" 
          variant="link" 
          className="h-auto p-0 text-carbon-green-600 hover:underline"
          disabled={isLoading}
        >
          Terms and Privacy Policy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Terms of Service & Privacy Policy
          </DialogTitle>
          <DialogDescription>
            Last updated: April 9, 2025
          </DialogDescription>
        </DialogHeader>
        
        <div className="text-sm space-y-4 mt-4">
          <h3 className="font-bold text-lg mb-2">Privacy Policy</h3>
          <p>
            This Privacy Policy explains how Crunch Carbon collects, shares, and uses any information that relates to you when you use our Site, engage with us on social media, or otherwise interact with us (your "Personal Data"). This Privacy Policy also explains the rights you have concerning the Personal Data that we process and how you can exercise these rights.
          </p>

          <div>
            <h3 className="font-bold text-base mb-2">Principles</h3>
            <p>Crunch Carbon manifests its commitment to privacy and data protection by embracing the following principles.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Crunch Carbon uses Personal Data lawfully, fairly, and in a transparent manner.</li>
              <li>Crunch Carbon collects no more Personal Data than necessary, and only for a legitimate purpose.</li>
              <li>Crunch Carbon retains no more data than necessary or for a longer period than needed.</li>
              <li>Crunch Carbon protects Personal Data with appropriate security measures.</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-base mb-2">Data We Collect</h3>
            <p>This policy applies only to information collected on our website. We collect two types of information from visitors to our websites:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Personal Data.</li>
              <li>Non-personal Data.</li>
            </ul>
            <p className="mt-2">"Personal Data" is information that identifies you personally and that you provide to us, such as your name, address, telephone number, email address, and sometimes your Internet Protocol (IP) address.</p>
            <p className="mt-2">"Non-personal Data" can be technical in nature. It does not identify you personally.</p>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              I Understand
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
