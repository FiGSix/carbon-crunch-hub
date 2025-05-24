
export interface SetTokenResult {
  success: boolean;
  valid: boolean;
  proposalId?: string;
  clientEmail?: string;
  error?: string;
  version?: string;
  deploymentTime?: string;
}
