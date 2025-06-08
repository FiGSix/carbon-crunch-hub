
import { calculateAnnualEnergy, calculateCarbonCredits } from '@/lib/calculations/carbon';

export function calculateYearlyEnergy(systemSizeKWp: number, year: number, commissionDate?: string): number {
  const annualEnergy = calculateAnnualEnergy(systemSizeKWp);
  
  // Pro-rate for commission year if needed
  if (commissionDate && year === new Date(commissionDate).getFullYear()) {
    const commissionDateTime = new Date(commissionDate);
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const remainingDays = Math.max(0, Math.floor((yearEnd.getTime() - commissionDateTime.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const totalDaysInYear = Math.floor((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return annualEnergy * (remainingDays / totalDaysInYear);
  }
  
  return annualEnergy;
}

export function calculateYearlyCarbonCredits(systemSizeKWp: number, year: number, commissionDate?: string): number {
  const yearlyEnergy = calculateYearlyEnergy(systemSizeKWp, year, commissionDate);
  return (yearlyEnergy / 1000) * 0.928; // Convert to MWh and apply emission factor
}

export function calculateTotalMWhGenerated(systemSizeKWp: number, revenue: Record<string, number>, commissionDate?: string): number {
  return Object.keys(revenue).reduce((total, year) => {
    return total + (calculateYearlyEnergy(systemSizeKWp, parseInt(year), commissionDate) / 1000);
  }, 0);
}

export function calculateTotalCarbonCredits(systemSizeKWp: number, revenue: Record<string, number>, commissionDate?: string): number {
  return Object.keys(revenue).reduce((total, year) => {
    return total + calculateYearlyCarbonCredits(systemSizeKWp, parseInt(year), commissionDate);
  }, 0);
}
