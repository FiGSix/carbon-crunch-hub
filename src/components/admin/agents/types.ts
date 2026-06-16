export interface AgentData {
  agent_id: string;
  agent_name: string;
  agent_email: string;
  company_name: string | null;
  agent_status: string;
  access_level: string;
  commission_override: number | null;
  last_active_at: string | null;
  total_proposals: number;
  active_proposals: number;
  signed_proposals: number;
  total_commission: number;
  join_date: string | null;
  onboarding_completed: boolean;
  portfolio_size_kwp: number;
  // Invitation fields
  is_invitation?: boolean;
  invitation_id?: string;
  invitation_token?: string;
  invitation_expires_at?: string;
  invited_by_email?: string;
}
