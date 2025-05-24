
import { useState } from "react";
import { ProposalData } from "@/types/proposals";

/**
 * Custom hook to manage proposal data state
 */
export function useProposalDataState() {
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState<string | null>(null);

  return {
    proposal,
    setProposal,
    loading,
    setLoading,
    error,
    setError,
    clientEmail,
    setClientEmail
  };
}
