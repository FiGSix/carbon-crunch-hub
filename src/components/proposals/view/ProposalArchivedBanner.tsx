
import React from "react";
import { Archive, Clock } from "lucide-react";
import { CardFooter } from "@/components/ui/card";

interface ProposalArchivedBannerProps {
  archivedAt?: string;
  reviewLaterUntil?: string;
}

export function ProposalArchivedBanner({ archivedAt, reviewLaterUntil }: ProposalArchivedBannerProps) {
  if (!archivedAt && !reviewLaterUntil) return null;
  
  const isArchived = !!archivedAt;
  
  return (
    <CardFooter className="border-t pt-6">
      <div className="w-full flex items-center justify-center bg-carbon-gray-100 p-4 rounded-lg border border-carbon-gray-200">
        {isArchived ? (
          <>
            <Archive className="text-carbon-gray-500 h-5 w-5 mr-2" />
            <p className="text-carbon-gray-700 font-medium">
              This proposal was archived on {new Date(archivedAt).toLocaleDateString()}
            </p>
          </>
        ) : (
          <>
            <Clock className="text-carbon-blue-500 h-5 w-5 mr-2" />
            <p className="text-carbon-blue-700 font-medium">
              You marked this proposal for review later on {new Date(reviewLaterUntil!).toLocaleDateString()}
            </p>
          </>
        )}
      </div>
    </CardFooter>
  );
}
