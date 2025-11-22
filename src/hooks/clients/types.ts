
export interface ClientData {
  client_id: string;
  client_name: string;
  client_email: string;
  company_name: string;
  total_mwp: number;
  project_count: number;
  agent_company_name?: string;
  agent_id?: string;
  is_active: boolean;
  client_type?: 'registered_user' | 'contact_prospect' | 'contact_active' | 'team_member';
  is_team_member?: boolean;
  
  // Portfolio client share override fields
  portfolio_client_share_override?: number | null;
  portfolio_override_set_at?: string | null;
  portfolio_override_set_by?: string | null;
}

export interface UseMyClientsResult {
  clients: ClientData[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refreshClients: () => void;
}
