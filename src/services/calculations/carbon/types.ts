import { UserRole } from '@/contexts/auth/types';

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

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface PortfolioTotals {
  totalSystemSizeKwp: number;
  totalCarbonCredits: number;
  totalAnnualEnergy: number;
  totalRevenue: number;
}