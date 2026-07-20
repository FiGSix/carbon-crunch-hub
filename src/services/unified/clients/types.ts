
export interface UnifiedClient {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  isRegistered: boolean;
  userId?: string;
  projectCount: number;
  totalKwp: number;
  createdAt: string;
  createdBy?: string;
  agentCompanyName?: string;
  agentId?: string;
  isActive: boolean;
  clientType?: 'registered_user' | 'contact_prospect' | 'contact_active' | 'team_member';
  parentCompanyId?: string;
  clientCompanyId?: string | null;
  isTeamMember: boolean;
  hasProfile?: boolean;

}

export interface ClientSearchResult {
  id: string;
  name: string;
  email: string;
  company?: string;
  isRegistered: boolean;
}

export interface PaginatedClientsResult {
  clients: UnifiedClient[];
  hasMore: boolean;
  totalCount: number;
  nextOffset: number;
}

export interface CreateClientData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  registrationNumber?: string;
  notes?: string;
  createdBy: string;
  isActive?: boolean;
  parentCompanyId?: string;
  isTeamMember?: boolean;
}
