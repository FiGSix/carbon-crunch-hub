
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
}

export interface UseMyClientsResult {
  clients: ClientData[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refreshClients: () => void;
}
