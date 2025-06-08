
// Proposal utility functions
import { ProposalListItem } from "@/types/proposals";
import { logger } from "@/lib/logger";

export const proposalUtils = {
  /**
   * Sort proposals by creation date (newest first)
   */
  sortByDate: (proposals: ProposalListItem[]): ProposalListItem[] => {
    return [...proposals].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  /**
   * Filter proposals by status
   */
  filterByStatus: (proposals: ProposalListItem[], status: string): ProposalListItem[] => {
    return proposals.filter(proposal => proposal.status === status);
  },

  /**
   * Get proposal count by status
   */
  getStatusCounts: (proposals: ProposalListItem[]) => {
    const counts = {
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      archived: 0
    };

    proposals.forEach(proposal => {
      if (proposal.status in counts) {
        counts[proposal.status as keyof typeof counts]++;
      }
    });

    return counts;
  },

  /**
   * Log proposal operation
   */
  logOperation: (operation: string, proposalId: string, details?: any) => {
    logger.info(`Proposal ${operation}`, { proposalId, details });
  }
};
