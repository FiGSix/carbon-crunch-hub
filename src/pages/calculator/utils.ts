
// Calculate results for a solar system based on size and commissioning date
export const calculateResults = (systemSize: number, commissioningDate: Date): CalculationResults => {
  const dailyGeneration = systemSize * 4.5; // kWh per day
  const yearStart = new Date(commissioningDate.getFullYear(), 0, 1);
  const yearEnd = new Date(commissioningDate.getFullYear(), 11, 31);
  
  // Calculate days in the first year (for prorated calculation)
  const daysInFirstYear = Math.max(1, Math.floor((yearEnd.getTime() - commissioningDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const daysInYear = 365;
  
  // Calculate first year's generation (prorated)
  const firstYearGeneration = dailyGeneration * daysInFirstYear;
  
  // Calculate full year generation
  const fullYearGeneration = dailyGeneration * daysInYear;
  
  // Carbon emission factor: 1.033 kg CO₂ per kWh
  const emissionFactor = 1.033;
  
  // Calculate yearly data from commissioning to 2030
  const yearsData: YearData[] = [];
  const startYear = commissioningDate.getFullYear();
  const endYear = 2030;
  
  for (let year = startYear; year <= endYear; year++) {
    const isFirstYear = year === startYear;
    const yearGeneration = isFirstYear ? firstYearGeneration : fullYearGeneration;
    const yearCarbonOffset = (yearGeneration * emissionFactor) / 1000; // Convert kg to tonnes
    const yearCarbonCredits = Math.floor(yearCarbonOffset); // 1 credit = 1 tonne
    
    yearsData.push({
      year,
      generation: yearGeneration,
      carbonOffset: yearCarbonOffset,
      carbonCredits: yearCarbonCredits
    });
  }
  
  // Coal calculation: 1 kWh of electricity ≈ 0.33 kg of coal
  const coalFactor = 0.33;
  const totalCoalAvoided = fullYearGeneration * coalFactor;
  
  return {
    annualGeneration: fullYearGeneration,
    coalAvoided: totalCoalAvoided,
    carbonOffset: (fullYearGeneration * emissionFactor) / 1000, // Convert kg to tonnes
    carbonCredits: Math.floor((fullYearGeneration * emissionFactor) / 1000), // 1 credit = 1 tonne
    yearsData
  };
};

// Format numbers with appropriate suffixes (k, M)
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  } else {
    return num.toFixed(1);
  }
};

import { CalculationResults, YearData } from "./types";
