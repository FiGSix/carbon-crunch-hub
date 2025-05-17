
// Re-export all proposal types from the main types file
export type {
  EligibilityCriteria,
  ClientInformation,
  ProjectInformation,
  ProposalContent,
  FormStep,
  ProposalData,
  ProposalListItem as Proposal // Export ProposalListItem as Proposal for backward compatibility
} from "@/types/proposals";
