
/**
 * Calculate the annual energy production in kWh based on system size
 */
export const calculateAnnualEnergy = (systemSize: string): number => {
  const sizeInKWp = parseFloat(systemSize) * 1000; // Convert MWp to kWp
  const dailyKWh = sizeInKWp * 4.5; // Average 4.5 hours of sun per day
  return dailyKWh * 365; // Annual energy in kWh
};

/**
 * Calculate the carbon credits based on annual energy production
 */
export const calculateCarbonCredits = (systemSize: string): number => {
  const annualEnergy = calculateAnnualEnergy(systemSize);
  // Conversion factor: 1 MWh = 1.02 tCO2 (approximate for South Africa's grid)
  return (annualEnergy / 1000) * 1.02; // Convert kWh to MWh and then to tCO2
};

/**
 * Calculate projected revenue based on carbon credit prices by year
 */
export const calculateRevenue = (systemSize: string): Record<string, number> => {
  const carbonCredits = calculateCarbonCredits(systemSize);
  const carbonPrices = {
    2024: 78.36,
    2025: 93.19,
    2026: 110.78,
    2027: 131.64,
    2028: 156.30,
    2029: 185.30,
    2030: 190.55,
  };
  
  const revenue: Record<string, number> = {};
  Object.entries(carbonPrices).forEach(([year, price]) => {
    revenue[year] = Math.round(carbonCredits * price);
  });
  
  return revenue;
};

/**
 * Calculate client share percentage based on portfolio size
 */
export const getClientSharePercentage = (portfolioSize: string): number => {
  const size = parseFloat(portfolioSize); // In MWp
  
  if (size < 5) return 63;
  if (size < 10) return 66.5;
  if (size < 30) return 70;
  return 73.5;
};

/**
 * Calculate agent commission percentage
 */
export const getAgentCommissionPercentage = (portfolioSize: string): number => {
  const size = parseFloat(portfolioSize); // In MWp
  return size < 15 ? 4 : 7;
};

/**
 * Get carbon price for a specific year
 */
export const getCarbonPriceForYear = (year: string): string => {
  const prices: Record<string, string> = {
    "2024": "R 78.36",
    "2025": "R 93.19",
    "2026": "R 110.78",
    "2027": "R 131.64",
    "2028": "R 156.30",
    "2029": "R 185.30",
    "2030": "R 190.55"
  };
  
  return prices[year] || "";
};
