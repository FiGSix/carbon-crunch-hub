
export interface InvitationRequest {
  proposalId: string;
  clientEmail: string;
  clientName: string;
  invitationToken: string;
  projectName: string;
  clientId?: string;
  agentEmail?: string; // Agent email fetched server-side for CC
}

export interface EmailTemplateData {
  clientName: string;
  projectName: string;
  invitationLink: string;
  tokenPreview: string;
  proposalId: string;
  systemSize?: string;
  carbonCredits?: number;
  agentFirstName?: string;
  agentLastName?: string;
  agentCompanyName?: string;
  agentEmail?: string;
}
