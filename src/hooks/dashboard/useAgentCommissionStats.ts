
import { useMemo } from 'react';
import { ProposalListItem } from '@/types/proposals';
import { logger } from '@/lib/logger';
import { useOptimizedAgentCommissionStats, AgentCommissionStats } from './useOptimizedAgentCommissionStats';

export { AgentCommissionStats };

export function useAgentCommissionStats(proposals: ProposalListItem[]): AgentCommissionStats {
  // Use the optimized version for better performance
  return useOptimizedAgentCommissionStats(proposals);
}
