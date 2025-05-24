
import { InvitationRequest } from "./types.ts";

export function validateInvitationRequest(requestData: any): InvitationRequest {
  // Validate required fields
  const requiredFields = ['proposalId', 'clientEmail', 'invitationToken'];
  const missingFields = requiredFields.filter(field => !requestData[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  const { 
    proposalId, 
    clientEmail, 
    clientName = 'Client', 
    invitationToken,
    projectName = 'Carbon Credit Project',
    clientId 
  }: InvitationRequest = requestData;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clientEmail)) {
    throw new Error("Invalid email format");
  }

  return {
    proposalId,
    clientEmail,
    clientName,
    invitationToken,
    projectName,
    clientId
  };
}
