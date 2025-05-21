
/**
 * Type definitions for carbon calculations
 */

export interface YearData {
  year: number;
  generation: number;
  carbonOffset: number;
  carbonCredits: number;
}

export interface CalculationResults {
  annualGeneration: number;
  coalAvoided: number;
  carbonOffset: number;
  carbonCredits: number;
  yearsData: YearData[];
}
