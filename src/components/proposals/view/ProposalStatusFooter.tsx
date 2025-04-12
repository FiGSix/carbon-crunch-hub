
import React from "react";
import { CheckCircle2, X } from "lucide-react";
import { CardFooter } from "@/components/ui/card";

interface ProposalStatusFooterProps {
  status: string;
  signedAt?: string | null;
}

export function ProposalStatusFooter({ status, signedAt }: ProposalStatusFooterProps) {
  if (status === 'approved') {
    return (
      <CardFooter className="border-t pt-6">
        <div className="w-full flex items-center justify-center bg-carbon-green-50 p-4 rounded-lg border border-carbon-green-200">
          <CheckCircle2 className="text-carbon-green-500 h-5 w-5 mr-2" />
          <p className="text-carbon-green-700 font-medium">
            This proposal has been approved on {new Date(signedAt || '').toLocaleDateString()}
          </p>
        </div>
      </CardFooter>
    );
  }
  
  if (status === 'rejected') {
    return (
      <CardFooter className="border-t pt-6">
        <div className="w-full flex items-center justify-center bg-carbon-red-50 p-4 rounded-lg border border-carbon-red-200">
          <X className="text-carbon-red-500 h-5 w-5 mr-2" />
          <p className="text-carbon-red-700 font-medium">
            This proposal has been rejected
          </p>
        </div>
      </CardFooter>
    );
  }
  
  return null;
}
