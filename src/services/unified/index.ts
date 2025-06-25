
export { UnifiedDataService } from './UnifiedDataService';
export { CacheManager } from './cache/CacheManager';
export { ProfileDataService } from './profile/ProfileDataService';
export { ProposalsDataService } from './proposals/ProposalsDataService';
export { DashboardDataService } from './dashboard/DashboardDataService';
export { ClientSearchService } from './clients/ClientSearchService';
export { ClientDataService } from './clients/ClientDataService';
export { UnifiedClientService } from './clients/UnifiedClientService';

// Export the new unified carbon calculation service
export { UnifiedCarbonService } from '@/services/calculations/UnifiedCarbonService';

// Deprecated - use UnifiedCarbonService instead
export { CarbonCalculationService } from './calculations/CarbonCalculationService';

export type { UnifiedClient, ClientSearchResult } from './clients/UnifiedClientService';
export type { SystemSpecs, CarbonCalculationResult } from '@/services/calculations/UnifiedCarbonService';
