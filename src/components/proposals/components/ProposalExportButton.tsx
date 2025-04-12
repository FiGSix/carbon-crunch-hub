
import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { 
  calculateAnnualEnergy, 
  calculateCarbonCredits, 
  getCarbonPriceForYear 
} from "../utils/proposalCalculations";
import { useToast } from "@/hooks/use-toast";

interface ProposalExportButtonProps {
  systemSize: string;
  projectName: string;
}

export function ProposalExportButton({ systemSize, projectName }: ProposalExportButtonProps) {
  const { toast } = useToast();

  const handleExportCSV = () => {
    try {
      // Generate years list (current year + 6 years)
      const currentYear = new Date().getFullYear();
      const years = Array.from({ length: 7 }, (_, i) => (currentYear + i).toString());
      
      // Calculate data
      const annualEnergy = calculateAnnualEnergy(systemSize);
      const carbonCredits = calculateCarbonCredits(systemSize);
      
      // Create CSV data
      const csvHeader = ["Year", "Carbon Price (R/tCO₂)", "Carbon Credits (tCO₂)", "Estimated Revenue (R)"];
      const csvData = years.map(year => {
        const carbonPrice = getCarbonPriceForYear(year).replace("R ", "");
        const revenue = carbonCredits * parseFloat(carbonPrice);
        return [
          year,
          carbonPrice,
          carbonCredits.toFixed(2),
          revenue.toFixed(2)
        ];
      });
      
      // Create CSV content
      const csvContent = [
        csvHeader.join(","),
        ...csvData.map(row => row.join(","))
      ].join("\n");
      
      // Generate file name
      const safeProjectName = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const fileName = `${safeProjectName}_carbon_projections_${date}.csv`;
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Clean up to avoid memory leaks
      
      // Show success toast
      toast({
        title: "Download Started",
        description: "Your CSV file is being downloaded.",
      });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({
        title: "Download Failed",
        description: "There was a problem exporting your data.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Button 
      onClick={handleExportCSV} 
      variant="outline" 
      size="sm" 
      className="text-carbon-blue-600"
    >
      <Download className="h-4 w-4 mr-1" /> Export Projections
    </Button>
  );
}
