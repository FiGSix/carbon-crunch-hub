import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RotateCcw, Zap, Leaf, TrendingUp } from "lucide-react";
import type { QuickCalcResult } from "@/pages/QuickCalc";
import { format } from "date-fns";

interface QuickCalcResultsProps {
  result: QuickCalcResult;
  onReset: () => void;
}

export const QuickCalcResults = ({ result, onReset }: QuickCalcResultsProps) => {
  const { annualEnergyKwh, carbonCreditsPerYear, revenueByYear, systemSizeKwp, commissionDate, province, yieldFactor } = result;

  // Calculate totals
  const totalRevenue = Object.values(revenueByYear).reduce((sum, val) => sum + val, 0);
  const years = Object.keys(revenueByYear).sort();
  const commissionYear = commissionDate.getFullYear();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Annual Energy</h3>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Zap className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {annualEnergyKwh.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground mt-1">kWh per year</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Carbon Credits</h3>
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Leaf className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {carbonCreditsPerYear.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-muted-foreground mt-1">tCO₂e per year</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
            <div className="p-2 bg-crunch-yellow/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-crunch-yellow" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">
            R {totalRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {commissionYear} - 2030
          </p>
        </motion.div>
      </div>

      {/* Revenue Forecast Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Revenue Forecast</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {systemSizeKwp.toLocaleString()} kWp • {province} • Commission: {format(commissionDate, "MMM d, yyyy")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Based on {province} solar yield: {yieldFactor.toLocaleString()} kWh/kWp/year
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Year
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  MWh Generated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Carbon Credits (tCO₂e)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Client Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {years.map((year) => {
                const yearNumber = parseInt(year);
                const revenue = revenueByYear[year];
                
                // Calculate pro-rated values for commission year
                let mwhGenerated = annualEnergyKwh / 1000;
                let creditsGenerated = carbonCreditsPerYear;
                
                if (yearNumber === commissionYear) {
                  const yearStart = new Date(yearNumber, 0, 1);
                  const yearEnd = new Date(yearNumber, 11, 31);
                  const remainingDays = Math.max(0, Math.floor((yearEnd.getTime() - commissionDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                  const totalDaysInYear = Math.floor((yearEnd.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  const prorationFactor = remainingDays / totalDaysInYear;
                  
                  mwhGenerated = mwhGenerated * prorationFactor;
                  creditsGenerated = creditsGenerated * prorationFactor;
                }
                
                return (
                  <tr key={year} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                      {mwhGenerated.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-muted-foreground">
                      {creditsGenerated.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-foreground">
                      R {revenue.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-muted/50 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  Total
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-foreground">
                  -
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-foreground">
                  -
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-foreground">
                  R {totalRevenue.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Disclaimer & Reset */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/30 border border-border rounded-xl p-6">
        <p className="text-sm text-muted-foreground text-center md:text-left">
          <strong>Note:</strong> This is an estimate only. Final figures may vary based on actual system performance and market conditions.
        </p>
        <Button
          onClick={onReset}
          variant="outline"
          className="shrink-0"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset Calculator
        </Button>
      </div>
    </motion.div>
  );
};
