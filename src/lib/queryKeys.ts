/**
 * Centralized Query Keys for React Query
 * 
 * This module provides a standardized approach to query key management
 * following React Query best practices:
 * - Hierarchical structure for easy invalidation
 * - Consistent naming patterns
 * - Type safety
 * - Reusability
 */

export const queryKeys = {
  // Authentication related queries
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    profile: (userId?: string) => [...queryKeys.auth.all, 'profile', userId] as const,
  },

  // Dashboard related queries
  dashboard: {
    all: ['dashboard'] as const,
    stats: (userId: string, userRole: string) => 
      [...queryKeys.dashboard.all, 'stats', userId, userRole] as const,
    unifiedData: (userId: string, userRole: string) => 
      [...queryKeys.dashboard.all, 'unified-data', userId, userRole] as const,
    agentPortfolio: (userId: string) => 
      [...queryKeys.dashboard.all, 'agent-portfolio', userId] as const,
    // Phase 2: New metrics by stage query key
    metricsByStage: (userId: string, userRole: string) => 
      [...queryKeys.dashboard.all, 'metrics-by-stage', userId, userRole] as const,
    clientOnboardingActions: (userId: string) =>
      [...queryKeys.dashboard.all, 'client-onboarding-actions', userId] as const,
    vintageRevenue: (userId: string) =>
      [...queryKeys.dashboard.all, 'vintage-revenue', userId] as const,
    agentVintageRevenue: (userId: string) =>
      [...queryKeys.dashboard.all, 'agent-vintage-revenue', userId] as const,
    adminVintageRevenue: () =>
      [...queryKeys.dashboard.all, 'admin-vintage-revenue'] as const,
    adminRevenueYearlyTable: (scope: string) =>
      [...queryKeys.dashboard.all, 'admin-revenue-yearly-table', scope] as const,
  },

  // Proposals related queries
  proposals: {
    all: ['proposals'] as const,
    list: (userId: string, userRole: string, filters?: Record<string, any>) => 
      [...queryKeys.proposals.all, 'list', userId, userRole, filters] as const,
    detail: (proposalId: string) => 
      [...queryKeys.proposals.all, 'detail', proposalId] as const,
    token: (token: string) => 
      [...queryKeys.proposals.all, 'token', token] as const,
    search: (userId: string, userRole: string, searchParams: Record<string, any>) =>
      [...queryKeys.proposals.all, 'search', userId, userRole, searchParams] as const,
  },

  // Clients related queries
  clients: {
    all: ['clients'] as const,
    list: (userId: string, userRole: string, pagination?: { limit: number; offset: number }) =>
      [...queryKeys.clients.all, 'list', userId, userRole, pagination] as const,
    search: (searchTerm: string, agentId?: string) =>
      [...queryKeys.clients.all, 'search', searchTerm, agentId] as const,
    detail: (clientId: string) =>
      [...queryKeys.clients.all, 'detail', clientId] as const,
  },

  // Agent management related queries
  agents: {
    all: ['agents'] as const,
    leads: (statusFilter?: string, searchTerm?: string) =>
      ['agents', 'leads', statusFilter, searchTerm] as const,
    management: {
      all: ['agents', 'management'] as const,
      list: (filters: Record<string, any>, pagination: { page: number; size: number }) =>
        ['agents', 'management', 'list', filters, pagination] as const,
      stats: () => ['agents', 'management', 'stats'] as const,
      count: () => ['agents', 'management', 'count'] as const,
      tabCounts: () => ['agents', 'management', 'tab-counts'] as const,
      invited: () => ['agents', 'management', 'invited'] as const,
      pending: () => ['agents', 'management', 'pending'] as const,
      suspended: () => ['agents', 'management', 'suspended'] as const,
    },
    commissions: {
      all: ['agents', 'commissions'] as const,
      list: (agentId: string, filters?: Record<string, any>) =>
        ['agents', 'commissions', 'list', agentId, filters] as const,
      stats: (agentId: string) =>
        ['agents', 'commissions', 'stats', agentId] as const,
    },
  },

  // Notifications related queries
  notifications: {
    all: ['notifications'] as const,
    list: (userId: string, filters?: { read?: boolean }) =>
      [...queryKeys.notifications.all, 'list', userId, filters] as const,
  },

  // System settings related queries
  systemSettings: {
    all: ['system-settings'] as const,
    carbonPrices: () => [...queryKeys.systemSettings.all, 'carbon-prices'] as const,
    general: () => [...queryKeys.systemSettings.all, 'general'] as const,
  },
} as const;

/**
 * Query key utilities for common operations
 */
export const queryKeyUtils = {
  /**
   * Get all dashboard related query keys for invalidation
   */
  getDashboardKeys: (userId?: string, userRole?: string) => {
    if (userId && userRole) {
      return [
        queryKeys.dashboard.stats(userId, userRole),
        queryKeys.dashboard.unifiedData(userId, userRole),
        queryKeys.dashboard.agentPortfolio(userId),
        queryKeys.dashboard.metricsByStage(userId, userRole), // Phase 2: Added new key
      ];
    }
    return [queryKeys.dashboard.all];
  },

  /**
   * Get all proposal related query keys for invalidation
   */
  getProposalKeys: (userId?: string, userRole?: string) => {
    if (userId && userRole) {
      return [queryKeys.proposals.list(userId, userRole)];
    }
    return [queryKeys.proposals.all];
  },

  /**
   * Get all agent management keys for invalidation
   */
  getAgentManagementKeys: () => [
    queryKeys.agents.management.all,
  ],

  /**
   * Get all client related keys for invalidation
   */
  getClientKeys: (userId?: string, userRole?: string) => {
    if (userId && userRole) {
      return [queryKeys.clients.list(userId, userRole)];
    }
    return [queryKeys.clients.all];
  },
} as const;

/**
 * Type helpers for query keys
 */
export type QueryKey = any[];
export type DashboardQueryKey = any[];
export type ProposalsQueryKey = any[];
export type ClientsQueryKey = any[];
export type AgentsQueryKey = any[];