
import { lazy, Suspense } from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle } from "lucide-react";

// Lazy load dialogs to reduce initial bundle size
const TermsDialog = lazy(() => import("./TermsDialog").then(m => ({ default: m.TermsDialog })));
const PrivacyPolicyDialog = lazy(() => import("./PrivacyPolicyDialog").then(m => ({ default: m.PrivacyPolicyDialog })));

interface RegisterTermsProps {
  showAgentTerms: boolean;
  termsAccepted: boolean;
  setTermsAccepted: (accepted: boolean) => void;
  termsDialogOpen: boolean;
  setTermsDialogOpen: (open: boolean) => void;
  privacyDialogOpen: boolean;
  setPrivacyDialogOpen: (open: boolean) => void;
  onTermsAccept: () => void;
  isLoading: boolean;
}

export function RegisterTerms({
  showAgentTerms,
  termsAccepted,
  setTermsAccepted,
  termsDialogOpen,
  setTermsDialogOpen,
  privacyDialogOpen,
  setPrivacyDialogOpen,
  onTermsAccept,
  isLoading
}: RegisterTermsProps) {
  return (
    <>
      {showAgentTerms && (
        <div className="space-y-2 border-t pt-4 mt-4">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="terms" 
              checked={termsAccepted}
              onCheckedChange={(checked) => {
                setTermsAccepted(checked === true);
              }}
              disabled={isLoading}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
              >
                I agree to the 
                <Suspense fallback={<span className="text-carbon-green-600">Terms & Conditions</span>}>
                  <TermsDialog
                    open={termsDialogOpen}
                    onOpenChange={setTermsDialogOpen}
                    onAccept={onTermsAccept}
                    isLoading={isLoading}
                  />
                </Suspense>
              </label>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center text-sm text-carbon-gray-600">
        <CheckCircle className="h-4 w-4 text-carbon-green-500 mr-2" />
        <span>
          By signing up, you agree to our{" "}
          <Suspense fallback={<span className="text-carbon-green-600">Privacy Policy</span>}>
            <PrivacyPolicyDialog
              open={privacyDialogOpen}
              onOpenChange={setPrivacyDialogOpen}
              isLoading={isLoading}
            />
          </Suspense>
        </span>
      </div>
    </>
  );
}
