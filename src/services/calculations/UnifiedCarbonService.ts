
import { UserRole } from '@/contexts/auth/types';
import { dynamicCarbonPricingService } from '@/lib/calculations/carbon/dynamicPricing';

export interface SystemSpecs {
  sizeKwp: number;
  location?: string;
  unitStandard?: 'kWp' | 'MWp';
  commissionDate?: string | Date;
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
  revenueByYear: Record<string, number>;
}

/**
 * Unified Carbon Calculation Service
 * Single source of truth for all carbon-related calculations
 * Replaces fragmented calculation logic across the codebase
 */
export class UnifiedCarbonService {
  // Standard constants
  private static readonly DEFAULT_ANNUAL_GENERATION_FACTOR = 1200; // kWh per kWp per year
  private static readonly DEFAULT_CARBON_FACTOR = 0.928; // kg CO2 per MWh
  private static readonly DEFAULT_CLIENT_SHARE = 75; // 75%
  private static readonly DEFAULT_AGENT_COMMISSION = 15; // 15%
  private static readonly CRUNCH_COMMISSION = 10; // 10%

  /**
   * Normalize system size to kWp
   */
  static normalizeToKWp(systemSize: string | number, unit?: string): number {
    if (typeof systemSize === 'string') {
      const sizeStr = systemSize.toLowerCase().trim();
      const numericValue = parseFloat(sizeStr);
      
      if (isNaN(numericValue)) return 0;
      
      if (sizeStr.includes('mwp') || sizeStr.includes('mw')) {
        return numericValue * 1000;
      }
      return numericValue;
    }
    
    const sizeValue = typeof systemSize === 'number' ? systemSize : parseFloat(systemSize);
    if (isNaN(sizeValue)) return 0;
    
    // Check unit parameter
    if (unit?.toLowerCase().includes('mw')) {
      return sizeValue * 1000;
    }
    
    return sizeValue;
  }

  /**
   * Validate system size constraints
   */
  static validateSystemSize(sizeKwp: number): {
    isValid: boolean;
    error?: string;
  } {
    if (sizeKwp <= 0) {
      return {
        isValid: false,
        error: 'System size must be greater than 0 kWp'
      };
    }

    if (sizeKwp > 15000) {
      return {
        isValid: false,
        error: 'System size cannot exceed 15,000 kWp (15 MWp)'
      };
    }

    return { isValid: true };
  }

  /**
   * Calculate annual energy generation
   */
  static calculateAnnualEnergy(systemSizeKwp: number): number {
    return systemSizeKwp * this.DEFAULT_ANNUAL_GENERATION_FACTOR;
  }

  /**
   * Calculate carbon credits (tonnes CO2 per year)
   */
  static calculateCarbonCredits(systemSizeKwp: number): number {
    const annualEnergyKwh = this.calculateAnnualEnergy(systemSizeKwp);
    return (annualEnergyKwh / 1000) * this.DEFAULT_CARBON_FACTOR;
  }

  /**
   * Get client share percentage based on portfolio size
   */
  static getClientSharePercentage(portfolioKWp: number): number {
    if (portfolioKWp < 5000) return 63;
    if (portfolioKWp < 10000) return 66.5;
    if (portfolioKWp < 20000) return 67.9;
    if (portfolioKWp < 30000) return 70;
    return 73.5;
  }

  /**
   * Get agent commission percentage based on portfolio size
   */
  static getAgentCommissionPercentage(portfolioKWp: number): number {
    return portfolioKWp < 15000 ? 4 : 7;
  }

  /**
   * Calculate revenue by year using dynamic pricing
   */
  static async calculateRevenueByYear(
    carbonCreditsPerYear: number,
    clientSharePercentage: number,
    commissionDate?: string | Date
  ): Promise<Record<string, number>> {
    const carbonPrices = await dynamicCarbonPricingService.getCarbonPrices();
    const revenue: Record<string, number> = {};
    
    const commissionDateTime = commissionDate ? new Date(commissionDate) : null;
    
    Object.entries(carbonPrices).forEach(([year, price]) => {
      const yearNum = parseInt(year);
      let yearCredits = carbonCreditsPerYear;
      
      // Pro-rate for commission year if date is provided
      if (commissionDateTime && yearNum === commissionDateTime.getFullYear()) {
        const yearStart = new Date(yearNum, 0, 1);
        const yearEnd = new Date(yearNum, 11, 31);
        const remainingDays = Math.max(0, Math.floor((yearEnd.getTime() - commissionDateTime.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const totalDaysInYear = Math.floor((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        yearCredits = carbonCreditsPerYear * (remainingDays / totalDaysInYear);
      }
      
      revenue[year] = Math.round(yearCredits * price * (clientSharePercentage / 100));
    });
    
    return revenue;
  }

  /**
   * Main calculation method - comprehensive carbon credits and revenue calculation
   */
  static async calculateComplete(
    specs: SystemSpecs,
    portfolioKWp?: number,
    userRole?: UserRole
  ): Promise<CarbonCalculationResult> {
    // Normalize and validate system size
    const systemSizeKwp = this.normalizeToKWp(specs.sizeKwp, specs.unitStandard);
    const validation = this.validateSystemSize(systemSizeKwp);
    
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Calculate basic metrics
    const annualEnergyKwh = this.calculateAnnualEnergy(systemSizeKwp);
    const carbonCreditsPerYear = this.calculateCarbonCredits(systemSizeKwp);

    // Determine portfolio size for share calculations
    const effectivePortfolioKWp = portfolioKWp || systemSizeKwp;
    const clientSharePercentage = this.getClientSharePercentage(effectivePortfolioKWp);
    const agentCommissionPercentage = this.getAgentCommissionPercentage(effectivePortfolioKWp);

    // Calculate revenue by year
    const revenueByYear = await this.calculateRevenueByYear(
      carbonCreditsPerYear,
      clientSharePercentage,
      specs.commissionDate
    );

    // Calculate total annual revenue (using current year price)
    const currentYear = new Date().getFullYear().toString();
    const currentYearRevenue = revenueByYear[currentYear] || 0;
    
    // Calculate revenue distributions
    const totalRevenuePerYear = Math.round(carbonCreditsPerYear * 25); // Fallback calculation
    const clientRevenuePerYear = currentYearRevenue;
    const agentCommissionPerYear = Math.round(totalRevenuePerYear * (agentCommissionPercentage / 100));
    const crunchCommissionPerYear = Math.round(totalRevenuePerYear * (this.CRUNCH_COMMISSION / 100));

    return {
      annualEnergyKwh,
      carbonCreditsPerYear,
      clientSharePercentage,
      agentCommissionPercentage,
      totalRevenuePerYear,
      clientRevenuePerYear,
      agentCommissionPerYear,
      crunchCommissionPerYear,
      systemSizeKwp,
      revenueByYear
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
   * Calculate portfolio totals for dashboard metrics
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
      totalRevenue: totals.totalCarbonCredits * 25 // Using standard carbon price
    };
  }
}
