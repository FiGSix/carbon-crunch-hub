
// Re-export everything from the refactored modules for backward compatibility
export { 
  createSimpleProposal,
  findOrCreateClient,
  searchSimpleClients,
  calculateClientSharePercentage,
  calculateAgentCommissionPercentage,
  getClientPortfolioSize,
  getAgentPortfolioSize
} from './simple';
