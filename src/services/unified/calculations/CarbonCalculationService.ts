
import { UnifiedCarbonService, SystemSpecs, CarbonCalculationResult } from '@/services/calculations/UnifiedCarbonService';
import { UserRole } from '@/contexts/auth/types';

/**
 * @deprecated Use UnifiedCarbonService directly instead
 * This service is kept for backward compatibility and delegates to UnifiedCarbonService
 */
export class CarbonCalculationService {
  // Re-export types for backward compatibility
  static readonly SystemSpecs = UnifiedCarbonService;
  static readonly CarbonCalculationResult = UnifiedCarbonService;

  /**
   * @deprecated Use UnifiedCarbonService.validateSystemSize instead
   */
  static validateSystemSize(sizeKwp: number, unitStandard: string = 'kWp') {
    const normalizedSize = UnifiedCarbonService.normalizeToKWp(sizeKwp, unitStandard);
    const validation = UnifiedCarbonService.validateSystemSize(normalizedSize);
    
    return {
      isValid: validation.isValid,
      normalizedSizeKwp: normalizedSize,
      error: validation.error
    };
  }

  /**
   * @deprecated Use UnifiedCarbonService.calculateComplete instead
   */
  static async calculateCarbonCredits(specs: SystemSpecs, userRole?: UserRole): Promise<CarbonCalculationResult> {
    return UnifiedCarbonService.calculateComplete(specs, undefined, userRole);
  }

  /**
   * @deprecated Use UnifiedCarbonService.formatSystemSize instead
   */
  static formatSystemSize(sizeKwp: number, preferredUnit: 'auto' | 'kWp' | 'MWp' = 'auto'): string {
    return UnifiedCarbonService.formatSystemSize(sizeKwp, preferredUnit);
  }

  /**
   * @deprecated Use UnifiedCarbonService.calculatePortfolioTotals instead
   */
  static calculatePortfolioTotals(proposals: Array<{
    system_size_kwp?: number;
    carbon_credits?: number;
    annual_energy?: number;
  }>) {
    return UnifiedCarbonService.calculatePortfolioTotals(proposals);
  }
}

// Re-export types for backward compatibility
export type { SystemSpecs, CarbonCalculationResult };
