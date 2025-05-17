
import React from "react";
import { CheckCircle2, Clock, Mail } from "lucide-react";
import { Proposal } from "../types";

interface InvitationStatusProps {
  proposal: Proposal;
}

export function InvitationStatus({ proposal }: InvitationStatusProps) {
  if (proposal.invitation_viewed_at) {
    return (
      <div className="flex items-center text-carbon-green-600">
        <CheckCircle2 className="h-4 w-4 mr-1" />
        <span className="text-xs">Viewed</span>
      </div>
    );
  } else if (proposal.invitation_sent_at) {
    if (proposal.invitation_expires_at && new Date(proposal.invitation_expires_at) < new Date()) {
      return (
        <div className="flex items-center text-carbon-gray-500">
          <Clock className="h-4 w-4 mr-1" />
          <span className="text-xs">Expired</span>
        </div>
      );
    }
    return (
      <div className="flex items-center text-carbon-blue-600">
        <Mail className="h-4 w-4 mr-1" />
        <span className="text-xs">Sent</span>
      </div>
    );
  }
  return null;
}
