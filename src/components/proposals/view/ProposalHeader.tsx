

import { useState } from "react";
import { CheckCircle2, ChevronLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProposalPdfButton } from "./ProposalPdfButton";
import { SignedAgreementDownloadButton } from "./SignedAgreementDownloadButton";
import { ProposalInviteButton } from "@/components/proposals/components/ProposalInviteButton";
import { ProposalEditDialog } from "./ProposalEditDialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth";
import { Proposal } from "@/components/proposals/types";
import { ProposalData } from "@/types/proposals";

interface ProposalHeaderProps {
  title: string;
  showInvitationBadge: boolean;
  projectSize?: string;
  projectName?: string;
  isDeleted?: boolean;
  showBackButton?: boolean;
  proposalId?: string;
  proposal?: Proposal;
  proposalData?: ProposalData;
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
  proposalData,
  onProposalUpdate
}: ProposalHeaderProps) {
  const navigate = useNavigate();
  const { user, userRole, profile } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Determine if editing is allowed
  const editableStatuses = ['draft', 'sent', 'pending'];
  const canEdit = !isDeleted 
    && proposal 
    && editableStatuses.includes(proposal.status || '')
    && (userRole === 'admin' || (userRole === 'agent' && proposal.agent_id === user?.id));

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
        
        {/* Signed Agreement Download button - Shown for all users on signed proposals */}
        {!isDeleted && proposalId && proposal?.status === 'approved' && (
          <SignedAgreementDownloadButton 
            proposalId={proposalId} 
            proposalTitle={title}
          />
        )}
        
        {/* PDF Download button for agents and admins */}
        {!isDeleted && (userRole === "agent" || userRole === "admin") && proposalId && (
          <ProposalPdfButton 
            proposalId={proposalId} 
            proposalTitle={title}
          />
        )}
        
        {/* Edit button - agents/admins on editable proposals */}
        {canEdit && proposalData && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
            className="flex items-center gap-1"
          >
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        )}

        {/* Invitation Button - Shown for agents and admins viewing proposals */}
        {proposal && (userRole === "agent" || userRole === "admin") && !isDeleted && (
          <ProposalInviteButton 
            proposal={proposal as any} 
            onProposalUpdate={onProposalUpdate}
          />
        )}
      </div>

      {/* Edit Dialog */}
      {canEdit && proposalData && (
        <ProposalEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          proposal={proposalData}
          onSaved={() => onProposalUpdate?.()}
        />
      )}
    </div>
  );
}
