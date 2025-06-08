
// Barrel file for simple proposal service
export { createSimpleProposal } from './proposalCreation';
export { findOrCreateClient, searchSimpleClients } from './clientService';
export { 
  calculateClientSharePercentage, 
  calculateAgentCommissionPercentage,
  getClientPortfolioSize,
  getAgentPortfolioSize
} from './portfolioCalculations';
