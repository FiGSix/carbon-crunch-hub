import { UserRole } from '@/contexts/auth/types';

export interface SystemSpecs {
  sizeKwp: number;
  location?: string;
  unitStandard?: 'kWp' | 'MWp';
}

export interface CarbonCalculationResult {
  annualEnergyKwh: number;
  carbonCreditsPerYear: number;
  clientSharePercentage: number;
  agentCommissionPercentage: number;
  totalRevenuePerYear: number;
  clientRevenuePerYear: number;
  agentCommissionPerYear: number;
  crunchCommissionPerYear: number;
  systemSizeKwp: number;
}

/**
 * Unified carbon calculation service
 * Single source of truth for all carbon-related calculations
 */
export class CarbonCalculationService {
  // Standard constants
  private static readonly DEFAULT_ANNUAL_GENERATION_FACTOR = 1200; // kWh per kWp per year
  private static readonly DEFAULT_CARBON_FACTOR = 0.5; // kg CO2 per kWh
  private static readonly DEFAULT_CARBON_PRICE = 50; // $ per tonne CO2
  private static readonly DEFAULT_CLIENT_SHARE = 0.75; // 75%
  private static readonly DEFAULT_AGENT_COMMISSION = 0.15; // 15%
  private static readonly CRUNCH_COMMISSION = 0.10; // 10%

  /**
   * Validate system size constraints
   */
  static validateSystemSize(sizeKwp: number, unitStandard: string = 'kWp'): {
    isValid: boolean;
    normalizedSizeKwp: number;
    error?: string;
  } {
    let normalizedSize = sizeKwp;

    // Normalize to kWp
    if (unitStandard.toLowerCase().includes('mw')) {
      normalizedSize = sizeKwp * 1000;
    }

    if (normalizedSize <= 0) {
      return {
        isValid: false,
        normalizedSizeKwp: normalizedSize,
        error: 'System size must be greater than 0 kWp'
      };
    }

    if (normalizedSize > 15000) {
      return {
        isValid: false,
        normalizedSizeKwp: normalizedSize,
        error: 'System size cannot exceed 15,000 kWp (15 MWp)'
      };
    }

    return {
      isValid: true,
      normalizedSizeKwp: normalizedSize
    };
  }

  /**
   * Calculate carbon credits and revenue for a solar system
   */
  static calculateCarbonCredits(specs: SystemSpecs, userRole?: UserRole): CarbonCalculationResult {
    // Validate and normalize system size
    const validation = this.validateSystemSize(specs.sizeKwp, specs.unitStandard);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const systemSizeKwp = validation.normalizedSizeKwp;

    // Calculate annual energy generation
    const annualEnergyKwh = systemSizeKwp * this.DEFAULT_ANNUAL_GENERATION_FACTOR;

    // Calculate carbon credits (tonnes CO2 per year)
    const carbonCreditsPerYear = (annualEnergyKwh * this.DEFAULT_CARBON_FACTOR) / 1000;

    // Calculate revenue shares
    const totalRevenuePerYear = carbonCreditsPerYear * this.DEFAULT_CARBON_PRICE;
    
    // Determine commission rates based on user role
    let clientSharePercentage = this.DEFAULT_CLIENT_SHARE;
    let agentCommissionPercentage = this.DEFAULT_AGENT_COMMISSION;

    // Admin users might have different rates
    if (userRole === 'admin') {
      // Keep defaults for now, but this is where custom rates could be applied
    }

    const clientRevenuePerYear = totalRevenuePerYear * clientSharePercentage;
    const agentCommissionPerYear = totalRevenuePerYear * agentCommissionPercentage;
    const crunchCommissionPerYear = totalRevenuePerYear * this.CRUNCH_COMMISSION;

    return {
      annualEnergyKwh,
      carbonCreditsPerYear,
      clientSharePercentage,
      agentCommissionPercentage,
      totalRevenuePerYear,
      clientRevenuePerYear,
      agentCommissionPerYear,
      crunchCommissionPerYear,
      systemSizeKwp
    };
  }

  /**
   * Format system size for display
   */
  static formatSystemSize(sizeKwp: number, preferredUnit: 'auto' | 'kWp' | 'MWp' = 'auto'): string {
    if (preferredUnit === 'MWp' || (preferredUnit === 'auto' && sizeKwp >= 1000)) {
      return `${(sizeKwp / 1000).toFixed(3)} MWp`;
    }
    return `${sizeKwp} kWp`;
  }

  /**
   * Calculate portfolio totals for an agent
   */
  static calculatePortfolioTotals(proposals: Array<{
    system_size_kwp?: number;
    carbon_credits?: number;
    annual_energy?: number;
  }>): {
    totalSystemSizeKwp: number;
    totalCarbonCredits: number;
    totalAnnualEnergy: number;
    totalRevenue: number;
  } {
    const totals = proposals.reduce((acc, proposal) => {
      acc.totalSystemSizeKwp += proposal.system_size_kwp || 0;
      acc.totalCarbonCredits += proposal.carbon_credits || 0;
      acc.totalAnnualEnergy += proposal.annual_energy || 0;
      return acc;
    }, {
      totalSystemSizeKwp: 0,
      totalCarbonCredits: 0,
      totalAnnualEnergy: 0
    });

    return {
      ...totals,
      totalRevenue: totals.totalCarbonCredits * this.DEFAULT_CARBON_PRICE
    };
  }
}
