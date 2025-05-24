
export interface RequestBody {
  token: string;
  email?: string;
}

export interface ResponseBody {
  success: boolean;
  valid: boolean;
  proposalId?: string;
  clientEmail?: string;
  error?: string;
  version?: string;
  deploymentTime?: string;
}

export interface ValidationResult {
  proposal_id?: string;
  client_email?: string;
  is_valid: boolean;
}
