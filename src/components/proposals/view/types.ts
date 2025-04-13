
export interface ProposalData {
  id: string;
  title: string;
  status: string;
  content: any;
  client_id: string;
  agent_id: string | null;
  created_at: string;
  signed_at: string | null;
  invitation_viewed_at: string | null;
  archived_at: string | null;
  archived_by: string | null;
  review_later_until: string | null;
}

export interface ProposalOperationResult {
  success: boolean;
  error?: string;
}
