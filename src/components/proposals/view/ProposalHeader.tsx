
import React from "react";
import { CheckCircle2 } from "lucide-react";
import { ProposalExportButton } from "@/components/proposals/components/ProposalExportButton";

interface ProposalHeaderProps {
  title: string;
  showInvitationBadge: boolean;
  projectSize?: string;
  projectName?: string;
}

export function ProposalHeader({ 
  title, 
  showInvitationBadge, 
  projectSize, 
  projectName 
}: ProposalHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
      <div>
        <h1 className="text-3xl font-bold text-carbon-gray-900">{title}</h1>
        <p className="text-carbon-gray-600">Carbon Credit Proposal</p>
      </div>
      <div className="flex items-center">
        {showInvitationBadge && (
          <div className="flex items-center bg-carbon-green-50 text-carbon-green-700 px-4 py-2 rounded-lg mr-3">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            <span>Viewing invitation</span>
          </div>
        )}
        {projectSize && projectName && (
          <ProposalExportButton 
            systemSize={projectSize} 
            projectName={projectName}
          />
        )}
      </div>
    </div>
  );
}
