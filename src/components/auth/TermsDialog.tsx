
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
            <p>WHEREAS, the Referring Agent is engaged in the business of providing services to the renewable energy sector, including but not limited to engineering, procurement, construction (EPC) services, project development, consulting, or other services relating to photovoltaic (solar) systems;</p>
            <p>AND WHEREAS, Crunch Carbon facilitates the registration, auditing, verification, and sale of verified carbon credits and seeks to acquire clients through referral partners;</p>
            <p>NOW THEREFORE, in consideration of the mutual covenants contained herein, the parties agree as follows:</p>
          </div>
          
          <div>
            <p className="font-bold">1. Scope of Services</p>
            <p>The Referring Agent agrees to:</p>
            <p>a. Identify and refer qualifying clients who own solar PV systems to Crunch Carbon;</p>
            <p>b. Assist in the onboarding process, where required;</p>
            <p>c. Manage administrative tasks related to referrals, including document collection and client liaison;</p>
            <p>d. Obtain all necessary documents and information required for registration, auditing, verification and monetisation of carbon credits.</p>
          </div>
          
          <div>
            <p className="font-bold">2. Compensation</p>
            <p>a. Crunch Carbon shall pay the Referring Agent a referral fee at the rate displayed within the Crunch Carbon platform or otherwise communicated in writing.</p>
            <p>b. Referral fees are payable annually following the successful completion of financial and carbon audits.</p>
            <p>c. All compensation structures will be communicated in writing and may be updated from time to time, provided such updates do not retrospectively reduce the Referring Agent's previously earned fees.</p>
          </div>
          
          <div>
            <p className="font-bold">3. Term</p>
            <p>This Agreement shall commence upon the Referring Agent's acceptance of the terms via online sign-up and shall remain in force for as long as the referred client(s) remain enrolled in Crunch Carbon's programme, unless terminated in accordance with Clause 4.</p>
          </div>
          
          <div>
            <p className="font-bold">4. Termination</p>
            <p>a. Either party may terminate this Agreement with 30 (thirty) days' written notice.</p>
            <p>b. The Referring Agent shall be entitled to referral fees earned prior to the termination date.</p>
            <p>c. If the Referring Agent fails to comply with Clause 1 (a–d), Crunch Carbon may issue a written notice requiring rectification within 7 working days. Failure to rectify may result in immediate termination without further compensation.</p>
            <p>d. Termination does not release either party from obligations relating to confidentiality, non-circumvention, or outstanding compensation.</p>
          </div>
          
          <div>
            <p className="font-bold">5. Confidentiality (NDA)</p>
            <p>a. Both parties shall treat all non-public, confidential, proprietary, technical, financial, project-related, client-related, or business information disclosed under this Agreement ("Confidential Information") as strictly confidential.</p>
            <p>b. Confidential Information may not be disclosed to any third party without prior written consent, except where required by law.</p>
            <p>c. Confidentiality obligations survive termination of this Agreement for a period of five (5) years.</p>
            <p>d. Confidential Information includes (but is not limited to):</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>client data and project specifics</li>
              <li>pricing, methodology, audit processes</li>
              <li>carbon credit strategies, market insights, partners, buyers</li>
              <li>business models, financials, internal documentation</li>
              <li>software systems, platform designs, and technical processes</li>
            </ul>
            <p>e. Information that becomes publicly available through no breach of this Agreement shall not be considered confidential.</p>
          </div>
          
          <div>
            <p className="font-bold">6. Non-Circumvention</p>
            <p>a. The Referring Agent agrees not to circumvent, bypass, compete with, or attempt to replicate Crunch Carbon's carbon credit processes, systems, methodologies, project structures, verification models, pricing, technology, or commercial relationships.</p>
            <p>b. The Referring Agent shall not directly or indirectly solicit or engage with Crunch Carbon's:</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>clients</li>
              <li>buyer networks</li>
              <li>audit or verification partners</li>
              <li>financial partners</li>
              <li>platform users</li>
            </ul>
            <p>for the purpose of offering competing carbon credit services or any service that performs the same economic function as Crunch Carbon's offering.</p>
            <p>c. The Referring Agent shall not attempt to register clients, systems, attributes, or projects with any alternative carbon programme using knowledge, processes, documentation, or data obtained through Crunch Carbon.</p>
            <p>d. This non-circumvention clause remains in effect for three (3) years following termination of this Agreement.</p>
            <p>e. Any breach of this clause will entitle Crunch Carbon to:</p>
            <ul className="list-disc ml-6 space-y-1">
              <li>immediate termination;</li>
              <li>withholding of compensation;</li>
              <li>injunctive relief;</li>
              <li>recovery of damages and lost earnings.</li>
            </ul>
          </div>
          
          <div>
            <p className="font-bold">7. Indemnification</p>
            <p>The Referring Agent agrees to indemnify, defend, and hold harmless Crunch Carbon, its directors, employees, and partners from any claims or losses arising from the Referring Agent's actions, negligence, misrepresentations, or breach of this Agreement.</p>
          </div>
          
          <div>
            <p className="font-bold">8. Governing Law</p>
            <p>This Agreement shall be governed by and interpreted in accordance with the laws of the Republic of South Africa. All disputes shall be resolved through arbitration in accordance with the rules of the Arbitration Foundation of Southern Africa (AFSA).</p>
          </div>
          
          <div>
            <p className="font-bold">9. Entire Agreement</p>
            <p>This document constitutes the entire agreement between the parties and supersedes all prior discussions, negotiations, or agreements. Any amendments must be made in writing and signed by both parties.</p>
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
