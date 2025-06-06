
/**
 * Utility functions for sorting proposals
 */
import { ProposalListItem } from '@/types/proposals';

/**
 * Apply client-side sorting to proposals
 */
export function applyClientSideSorting(proposals: ProposalListItem[], sortBy: string): ProposalListItem[] {
  const sortedProposals = [...proposals];
  
  switch (sortBy) {
    case 'oldest':
      return sortedProposals.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    case 'title':
      return sortedProposals.sort((a, b) => a.name.localeCompare(b.name));
    case 'status':
      return sortedProposals.sort((a, b) => a.status.localeCompare(b.status));
    case 'newest':
    default:
      return sortedProposals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
