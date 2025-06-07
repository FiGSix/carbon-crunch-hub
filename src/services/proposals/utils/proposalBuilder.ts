
import { EligibilityCriteria, ProjectInformation, ClientInformation } from "@/types/proposals";
import { 
  calculateAnnualEnergy, 
  calculateCarbonCredits, 
  getClientSharePercentage,
  getAgentCommissionPercentage,
  calculateRevenue,
  calculateAgentCommissionRevenue,
  calculateCrunchCommissionRevenue,
  getCrunchCommissionPercentage
} from "@/lib/calculations/carbon";
import { calculateClientSpecificRevenue } from "@/lib/calculations/carbon/clientPricing";
import { dynamicCarbonPricingService } from "@/lib/calculations/carbon/dynamicPricing";
import { logger } from "@/lib/logger";
import { normalizeToKWp } from "@/lib/calculations/carbon/core";
import { calculateClientPortfolio } from "../portfolioCalculationService";

interface ClientResult {
  clientId: string;
  isRegisteredUser: boolean;
}

export async function buildProposalData(
  title: string,
  agentId: string,
  eligibilityCriteria: EligibilityCriteria,
  projectInfo: ProjectInformation,
  clientInfo: ClientInformation,
  selectedClientId?: string,
  clientResult?: ClientResult
) {
  const proposalLogger = logger.withContext({
    component: 'ProposalBuilder',
    method: 'buildProposalData'
  });

  // Calculate all values here
  const systemSizeKWp = normalizeToKWp(projectInfo.size);
  const calculatedAnnualEnergy = calculateAnnualEnergy(systemSizeKWp);
  const calculatedCarbonCredits = calculateCarbonCredits(systemSizeKWp);
  
  // Calculate portfolio-based percentages
  let clientSharePercentage: number;
  let agentCommissionPercentage: number;
  let portfolioSize = systemSizeKWp;

  if (selectedClientId) {
    try {
      // Get existing portfolio for the client
      const portfolioData = await calculateClientPortfolio(selectedClientId);
      portfolioSize = portfolioData.totalKWp + systemSizeKWp; // Include this new project
      
      // Calculate percentages based on total portfolio
      clientSharePercentage = getClientSharePercentage(portfolioSize);
      agentCommissionPercentage = getAgentCommissionPercentage(portfolioSize);
      
      proposalLogger.info("Portfolio-based calculation", {
        existingPortfolioKWp: portfolioData.totalKWp,
        newProjectKWp: systemSizeKWp,
        totalPortfolioKWp: portfolioSize,
        clientShare: clientSharePercentage,
        agentCommission: agentCommissionPercentage
      });
    } catch (error) {
      proposalLogger.warn("Failed to calculate portfolio-based percentages, using individual project", {
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fallback to individual project calculation
      clientSharePercentage = getClientSharePercentage(systemSizeKWp);
      agentCommissionPercentage = getAgentCommissionPercentage(systemSizeKWp);
    }
  } else {
    // No client selected, use individual project calculation
    clientSharePercentage = getClientSharePercentage(systemSizeKWp);
    agentCommissionPercentage = getAgentCommissionPercentage(systemSizeKWp);
  }

  // Calculate revenue breakdowns for all parties using dynamic pricing
  const marketRevenue = await calculateRevenue(systemSizeKWp, projectInfo.commissionDate);
  const agentCommissionRevenue = await calculateAgentCommissionRevenue(
    systemSizeKWp, 
    agentCommissionPercentage, 
    projectInfo.commissionDate
  );
  
  // Calculate Crunch Carbon commission
  const crunchCommissionPercentage = getCrunchCommissionPercentage(
    clientSharePercentage, 
    agentCommissionPercentage
  );
  const crunchCommissionRevenue = await calculateCrunchCommissionRevenue(
    systemSizeKWp, 
    crunchCommissionPercentage, 
    projectInfo.commissionDate
  );

  // Calculate client-specific revenue using portfolio-based pricing
  const clientSpecificRevenue: Record<string, number> = {};
  const carbonPrices = await dynamicCarbonPricingService.getCarbonPrices();
  
  for (const [year, price] of Object.entries(carbonPrices)) {
    const yearNum = parseInt(year);
    let yearCredits = calculatedCarbonCredits;
    
    // Apply pro-rata logic for commission year if date is provided
    if (projectInfo.commissionDate && yearNum === new Date(projectInfo.commissionDate).getFullYear()) {
      const commissionDateTime = new Date(projectInfo.commissionDate);
      const yearStart = new Date(yearNum, 0, 1);
      const yearEnd = new Date(yearNum, 11, 31);
      const remainingDays = Math.max(0, Math.floor((yearEnd.getTime() - commissionDateTime.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const totalDaysInYear = Math.floor((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Pro-rate the credits for the partial year
      yearCredits = calculatedCarbonCredits * (remainingDays / totalDaysInYear);
    }
    
    // Calculate client-specific revenue for this year
    clientSpecificRevenue[year] = await calculateClientSpecificRevenue(year, yearCredits, portfolioSize);
  }

  proposalLogger.info("Final calculated values with client-specific pricing", {
    systemSizeKWp,
    portfolioSize,
    annualEnergy: calculatedAnnualEnergy,
    carbonCredits: calculatedCarbonCredits,
    clientShare: clientSharePercentage,
    agentCommission: agentCommissionPercentage,
    crunchCommission: crunchCommissionPercentage,
    marketRevenueTotal: Object.values(marketRevenue).reduce((sum, val) => sum + val, 0),
    clientSpecificRevenueTotal: Object.values(clientSpecificRevenue).reduce((sum, val) => sum + val, 0)
  });

  // Determine client IDs based on registration status
  let finalClientId: string | undefined;
  let finalClientReferenceId: string | undefined;

  if (selectedClientId) {
    if (clientResult?.isRegisteredUser) {
      finalClientId = selectedClientId;
      finalClientReferenceId = selectedClientId;
    } else {
      finalClientReferenceId = selectedClientId;
    }
  }

  // Build proposal data with comprehensive revenue breakdown
  const proposalData = {
    title,
    agent_id: agentId,
    eligibility_criteria: eligibilityCriteria as any,
    project_info: projectInfo as any,
    annual_energy: calculatedAnnualEnergy,
    carbon_credits: calculatedCarbonCredits,
    client_share_percentage: clientSharePercentage,
    agent_commission_percentage: agentCommissionPercentage,
    content: {
      clientInfo,
      projectInfo,
      portfolioSize, // Store portfolio size for transparency
      marketRevenue, // Market-rate revenue breakdown
      clientSpecificRevenue, // Client-specific revenue breakdown 
      agentCommissionRevenue,
      crunchCommissionRevenue,
      calculationMetadata: {
        portfolioBasedPricing: !!selectedClientId,
        portfolioSize,
        calculatedAt: new Date().toISOString(),
        carbonPricesUsed: carbonPrices
      }
    } as any,
    status: 'draft',
    system_size_kwp: systemSizeKWp,
    unit_standard: 'kWp',
    ...(finalClientId && { client_id: finalClientId }),
    ...(finalClientReferenceId && { client_reference_id: finalClientReferenceId })
  };

  proposalLogger.info("Built proposal data with comprehensive revenue breakdown and client-specific pricing", {
    title: proposalData.title,
    systemSizeKWp: proposalData.system_size_kwp,
    portfolioSize,
    clientSharePercentage: proposalData.client_share_percentage,
    agentCommissionPercentage: proposalData.agent_commission_percentage,
    crunchCommissionPercentage,
    hasMarketRevenue: !!marketRevenue,
    hasClientSpecificRevenue: !!clientSpecificRevenue,
    hasAgentCommissionData: !!agentCommissionRevenue,
    hasCrunchCommissionData: !!crunchCommissionRevenue
  });

  return proposalData;
}
