
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
}
