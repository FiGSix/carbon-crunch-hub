
import React from "react";
import { Archive } from "lucide-react";
import { CardFooter } from "@/components/ui/card";

interface ProposalArchivedBannerProps {
  archivedAt: string;
}

export function ProposalArchivedBanner({ archivedAt }: ProposalArchivedBannerProps) {
  return (
    <CardFooter className="border-t pt-6">
      <div className="w-full flex items-center justify-center bg-carbon-gray-100 p-4 rounded-lg border border-carbon-gray-200">
        <Archive className="text-carbon-gray-500 h-5 w-5 mr-2" />
        <p className="text-carbon-gray-700 font-medium">
          This proposal was archived on {new Date(archivedAt).toLocaleDateString()}
        </p>
      </div>
    </CardFooter>
  );
}
