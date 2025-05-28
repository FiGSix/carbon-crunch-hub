
import { 
  EligibilityCriteria, 
  ClientInformation, 
  ProjectInformation 
} from "@/types/proposals";
import { Json } from "@/types/supabase";

export interface ProposalData {
  title: string;
  client_id: string;
  agent_id: string;
  eligibility_criteria: EligibilityCriteria;
  project_info: ProjectInformation;
  annual_energy: number;
  carbon_credits: number;
  client_share_percentage: number;
  agent_commission_percentage: number;
  content: {
    clientInfo: ClientInformation;
    projectInfo: ProjectInformation;
    revenue: Record<string, number>;
  };
  // Additional fields to match database schema
  client_contact_id?: string;
  status?: string;
  system_size_kwp?: number;
  unit_standard?: string;
}

// Export the ProposalCreationResult interface from the service
export { type ProposalCreationResult } from './proposalCreationService';
