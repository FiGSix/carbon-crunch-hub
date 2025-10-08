

import { CheckCircle2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProposalPdfButton } from "./ProposalPdfButton";
import { ProposalInviteButton } from "@/components/proposals/components/ProposalInviteButton";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { Proposal } from "@/components/proposals/types";

interface ProposalHeaderProps {
  title: string;
  showInvitationBadge: boolean;
  projectSize?: string;
  projectName?: string;
  isDeleted?: boolean;
  showBackButton?: boolean;
  proposalId?: string;
  proposal?: Proposal;
  onProposalUpdate?: () => void;
}

export function ProposalHeader({ 
  title, 
  showInvitationBadge, 
  projectSize, 
  projectName,
  isDeleted,
  showBackButton = true,
  proposalId,
  proposal,
  onProposalUpdate
}: ProposalHeaderProps) {
  const navigate = useNavigate();
  const { userRole, profile } = useAuth();

  const handleBack = () => {
    navigate('/proposals');
  };

  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    } else if (profile?.first_name) {
      return profile.first_name;
    } else if (profile?.company_name) {
      return profile.company_name;
    }
    return 'User';
  };

  const formatUserRole = (role: string | null): string => {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
      <div className="flex items-center space-x-4">
        {showBackButton && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBack}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-carbon-gray-900">{title}</h1>
          <div className="flex flex-col">
            <p className="text-carbon-gray-600">Carbon Credit Proposal</p>
            {userRole === "agent" && (
              <p className="text-sm text-carbon-gray-500">
                Logged in as <span className="font-semibold">{getUserDisplayName()}</span> ({formatUserRole(userRole)})
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {showInvitationBadge && (
          <div className="flex items-center bg-carbon-green-50 text-carbon-green-700 px-4 py-2 rounded-lg">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            <span>Viewing invitation</span>
          </div>
        )}
        
        {/* PDF Download button for agents and admins */}
        {!isDeleted && (userRole === "agent" || userRole === "admin") && proposalId && (
          <ProposalPdfButton 
            proposalId={proposalId} 
            proposalTitle={title}
          />
        )}
        
        {/* Invitation Button - Shown for agents and admins viewing proposals */}
        {proposal && (userRole === "agent" || userRole === "admin") && !isDeleted && (
          <ProposalInviteButton 
            proposal={proposal as any} 
            onProposalUpdate={onProposalUpdate}
          />
        )}
      </div>
    </div>
  );
}
