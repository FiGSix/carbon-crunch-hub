import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";

// Define the return type for consistent interface
export interface ProposalCreationResult {
  success: boolean;
  proposalId?: string;
  error?: string;
  clientValidation?: {
    isValid: boolean;
    warnings: string[];
  };
}

export interface ProposalOperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Updated ProposalData interface to match database schema
export interface ProposalData {
  id?: string;
  title: string;
  agent_id: string;
  eligibility_criteria: EligibilityCriteria;
  project_info: ProjectInformation;
  client_info: ClientInformation;
  annual_energy: number;
  carbon_credits: number;
  client_share: number;
  agent_commission: number;
  selected_client_id?: string;
  client_id?: string;
  client_reference_id?: string;
  status?: string;
  system_size_kwp?: number;
  unit_standard?: string;
  client_share_percentage?: number;
  agent_commission_percentage?: number;
  content?: any;
  created_at?: string;
}

// Enhanced client result type
export interface ClientResult {
  clientsTableId: string; // ID from clients table (always present)
  profileId?: string; // ID from profiles table (only for registered users)
  isRegisteredUser: boolean;
}
