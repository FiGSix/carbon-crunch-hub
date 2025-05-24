
export interface InvitationRequest {
  proposalId: string;
  clientEmail: string;
  clientName: string;
  invitationToken: string;
  projectName: string;
  clientId?: string;
}

export interface EmailTemplateData {
  clientName: string;
  projectName: string;
  invitationLink: string;
  tokenPreview: string;
  proposalId: string;
}
