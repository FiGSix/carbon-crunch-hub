
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
  notes?: string;
  createdBy: string;
}
