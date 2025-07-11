
export { UnifiedDataService } from './UnifiedDataService';
export { CacheManager } from './cache/CacheManager';
export { ProfileDataService } from './profile/ProfileDataService';
export { ProposalsDataService } from './proposals/ProposalsDataService';
export { DashboardDataService } from './dashboard/DashboardDataService';
export { ClientSearchService } from './clients/ClientSearchService';
export { ClientDataService } from './clients/ClientDataService';
export { UnifiedClientService } from './clients/UnifiedClientService';

export { ClientFetcher, ClientCreator } from './clients/operations';
export { ClientSearch } from './clients/ClientSearch';

// Export the unified carbon calculation service
export { UnifiedCarbonService } from '@/services/calculations/carbon';

export type { UnifiedClient, ClientSearchResult, PaginatedClientsResult, CreateClientData } from './clients/types';
export type { SystemSpecs, CarbonCalculationResult } from '@/services/calculations/carbon';
