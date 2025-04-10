
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface TermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  isLoading: boolean;
}

export const TermsDialog = ({ open, onOpenChange, onAccept, isLoading }: TermsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button 
          type="button" 
          variant="link" 
          className="h-auto p-0 text-carbon-green-600 hover:underline"
          disabled={isLoading}
        >
          Agent Referral Agreement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Crunch Carbon Agent Referral Agreement
          </DialogTitle>
          <DialogDescription>
            Please read the following agreement carefully
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 text-sm mt-4">
          <div className="text-center">
            <p className="font-bold">Crunch Carbon Agent Referral Agreement</p>
            <p>Crunch Carbon (Pty) Ltd</p>
            <p>Registration No: 2019/54306/07</p>
            <p>4 Sandown Valley Crescent, Sandown, Sandton, 2031</p>
            <p>(Hereinafter referred to as "Crunch Carbon")</p>
          </div>
          
          <div>
            <p className="font-bold">RECITALS</p>
            <p>WHEREAS, the Referring Agent is engaged in the business of providing services to the renewable energy sector such as engineering, procurement, construction (EPC) services, or otherwise works with clients who own photovoltaic (solar) systems;</p>
            <p>AND WHEREAS, Crunch Carbon is engaged in the facilitation, auditing, and sale of verified carbon credits and seeks to acquire new clients via such referral relationships;</p>
            <p>NOW THEREFORE, in consideration of the mutual covenants and promises contained herein, the parties agree as follows:</p>
          </div>
          
          <div>
            <p className="font-bold">1. Scope of Services</p>
            <p>The Referring Agent agrees to:</p>
            <p>a. Identify and refer qualifying clients who own solar PV systems to Crunch Carbon;</p>
            <p>b. Assist in the onboarding process of referred clients, where required;</p>
            <p>c. Manage all administrative tasks related to the referral process, including document collection and client liaison;</p>
            <p>d. Obtain all necessary documents and information from referred clients as required by Crunch Carbon to facilitate the registration, verification, and sale of carbon credits.</p>
          </div>
          
          <div>
            <p className="font-bold">2. Compensation</p>
            <p>a. Crunch Carbon shall pay the Referring Agent a referral fee as outlined within the portal.</p>
            <p>b. Referral fees will be calculated based on verified client projects and payable on an annual basis following the successful completion of a financial audit.</p>
            <p>c. All compensation will be communicated in writing to the Referring Agent.</p>
          </div>
          
          <div>
            <p className="font-bold">3. Term</p>
            <p>This Agreement shall commence upon the Referring Agent's acceptance via online sign-up and shall remain in force for the duration their referred client(s) remains on the program, unless terminated earlier in accordance with Clause 4.</p>
          </div>
          
          <div>
            <p className="font-bold">4. Termination</p>
            <p>a. Either party may terminate this Agreement with 30 (thirty) days' written notice to the other.</p>
            <p>b. In the event of termination, the Referring Agent shall be entitled to any referral fees earned prior to the termination date.</p>
            <p>c. Should the Referring Agent fail to comply with the duties outlined in Clause 1 (a–d), Crunch Carbon shall issue a notice allowing 7 working days to rectify such failures. Failure to comply may result in immediate termination with no compensation.</p>
          </div>
          
          <div>
            <p className="font-bold">5. Confidentiality</p>
            <p>Both parties agree to treat all non-public, proprietary, or sensitive information shared during the course of this Agreement as strictly confidential and shall not disclose such information to any third party without prior written consent, except as required by law.</p>
          </div>
          
          <div>
            <p className="font-bold">6. Indemnification</p>
            <p>The Referring Agent agrees to indemnify, defend, and hold harmless Crunch Carbon, its affiliates, directors, and employees from any claims, losses, or liabilities arising from the Referring Agent's actions, negligence, or breach of this Agreement.</p>
          </div>
          
          <div>
            <p className="font-bold">7. Governing Law</p>
            <p>This Agreement shall be governed by and interpreted in accordance with the laws of the Republic of South Africa. Any disputes arising from this Agreement shall be subject to the hearing and adjudication by the council of the South African arbitrators.</p>
          </div>
          
          <div>
            <p className="font-bold">8. Entire Agreement</p>
            <p>This document constitutes the entire agreement between Crunch Carbon and the Referring Agent. It supersedes all prior discussions, agreements, or understandings related to the subject matter herein.</p>
          </div>
          
          <div className="pt-4">
            <Button
              onClick={onAccept}
              className="w-full bg-carbon-green-500 hover:bg-carbon-green-600"
            >
              I Agree to the Terms & Conditions
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
