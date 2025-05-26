
export interface SetTokenResult {
  success: boolean;
  valid: boolean;
  proposalId?: string;
  clientEmail?: string;
  clientId?: string;
  clientReferenceId?: string;
  error?: string;
  version?: string;
  deploymentTime?: string;
}
