
export interface Proposal {
  id: string;
  name: string;
  client: string;
  date: string;
  size: number;
  status: string;
  revenue: number;
  invitation_sent_at?: string;
  invitation_viewed_at?: string;
  invitation_expires_at?: string;
}

export interface ProposalListProps {
  proposals: Proposal[];
  onProposalUpdate?: () => void;
}

export interface ClientInformation {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  existingClient: boolean;
}
