
export interface CalculationResults {
  annualGeneration: number;
  coalAvoided: number;
  carbonOffset: number;
  carbonCredits: number;
  yearsData: YearData[];
}

export interface YearData {
  year: number;
  generation: number;
  carbonOffset: number;
  carbonCredits: number;
}
