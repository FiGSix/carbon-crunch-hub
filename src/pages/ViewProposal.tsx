
import React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ProposalSkeleton } from "@/components/proposals/loading/ProposalSkeleton";
import { ProposalHeader } from "@/components/proposals/view/ProposalHeader";
import { ProposalError } from "@/components/proposals/view/ProposalError";
import { ProposalDetails } from "@/components/proposals/view/ProposalDetails";
import { useViewProposal } from "@/hooks/useViewProposal";

const ViewProposal = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const {
    proposal,
    loading,
    error,
    handleApprove,
    handleReject
  } = useViewProposal(id, token);
  
  if (loading) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <ProposalSkeleton />
      </div>
    );
  }
  
  if (error) {
    return <ProposalError errorMessage={error} />;
  }
  
  if (!proposal) {
    return (
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-carbon-gray-500">Proposal not found</p>
        </div>
      </div>
    );
  }
  
  // Extract project info from the proposal content for the header
  const projectInfo = proposal.content?.projectInfo || {};
  
  return (
    <div className="container max-w-5xl mx-auto px-4 py-12">
      <ProposalHeader
        title={proposal.title}
        showInvitationBadge={!!token}
        projectSize={projectInfo.size}
        projectName={projectInfo.name}
      />
      
      <div className="space-y-8">
        <ProposalDetails 
          proposal={proposal}
          token={token}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    </div>
  );
};

export default ViewProposal;
