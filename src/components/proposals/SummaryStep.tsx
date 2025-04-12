
import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { 
  calculateAnnualEnergy, 
  calculateCarbonCredits, 
  calculateRevenue,
  getClientSharePercentage,
  getAgentCommissionPercentage,
  getCarbonPriceForYear
} from "./utils/proposalCalculations";
import { createProposal } from "@/services/proposalService";
import { EligibilityCriteria } from "./types";
import { useToast } from "@/hooks/use-toast";

interface SummaryStepProps {
  eligibility: EligibilityCriteria;
  clientInfo: {
    name: string;
    email: string;
    phone: string;
    companyName: string;
    existingClient: boolean;
  };
  projectInfo: {
    name: string;
    address: string;
    size: string;
    commissionDate: string;
    additionalNotes: string;
  };
  nextStep: () => void;
  prevStep: () => void;
}

export function SummaryStep({ 
  eligibility,
  clientInfo, 
  projectInfo, 
  nextStep, 
  prevStep 
}: SummaryStepProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const revenue = calculateRevenue(projectInfo.size);
  const clientSharePercentage = getClientSharePercentage(projectInfo.size);
  const agentCommissionPercentage = getAgentCommissionPercentage(projectInfo.size);
  const crunchCarbonSharePercentage = 100 - clientSharePercentage - agentCommissionPercentage;

  const handleSubmitProposal = async () => {
    setIsSubmitting(true);
    
    try {
      const result = await createProposal(
        eligibility,
        clientInfo,
        projectInfo
      );
      
      if (result.success) {
        toast({
          title: "Proposal Created",
          description: "Your proposal has been successfully created.",
          variant: "default",
        });
        nextStep(); // Navigate to the next step or proposals list
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create proposal",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error submitting proposal:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the proposal.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="retro-card">
      <CardHeader>
        <CardTitle>Proposal Summary</CardTitle>
        <CardDescription>
          Review the proposal details before finalizing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Client Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-carbon-gray-500">Name</p>
                <p className="font-medium">{clientInfo.name}</p>
              </div>
              <div>
                <p className="text-sm text-carbon-gray-500">Email</p>
                <p className="font-medium">{clientInfo.email}</p>
              </div>
              <div>
                <p className="text-sm text-carbon-gray-500">Phone</p>
                <p className="font-medium">{clientInfo.phone || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-carbon-gray-500">Company</p>
                <p className="font-medium">{clientInfo.companyName || "—"}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Project Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-carbon-gray-500">Project Name</p>
                <p className="font-medium">{projectInfo.name}</p>
              </div>
              <div>
                <p className="text-sm text-carbon-gray-500">System Size</p>
                <p className="font-medium">{projectInfo.size} MWp</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-carbon-gray-500">Address</p>
                <p className="font-medium">{projectInfo.address}</p>
              </div>
              <div>
                <p className="text-sm text-carbon-gray-500">Commission Date</p>
                <p className="font-medium">{projectInfo.commissionDate && new Date(projectInfo.commissionDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Carbon Credit Projection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-carbon-gray-500">Estimated Annual Energy</p>
                <p className="font-medium">{calculateAnnualEnergy(projectInfo.size).toLocaleString()} kWh</p>
              </div>
              <div>
                <p className="text-sm text-carbon-gray-500">Estimated Annual Carbon Credits</p>
                <p className="font-medium">{calculateCarbonCredits(projectInfo.size).toFixed(2)} tCO₂</p>
              </div>
            </div>
            
            <h4 className="font-medium text-carbon-gray-700 mb-2">Projected Revenue by Year</h4>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-carbon-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-carbon-gray-700 border border-carbon-gray-200">Year</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-carbon-gray-700 border border-carbon-gray-200">Carbon Price (R/tCO₂)</th>
                    <th className="px-4 py-2 text-right text-sm font-medium text-carbon-gray-700 border border-carbon-gray-200">Estimated Revenue (R)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(revenue).map(([year, amount]) => (
                    <tr key={year}>
                      <td className="px-4 py-2 text-sm border border-carbon-gray-200">{year}</td>
                      <td className="px-4 py-2 text-sm border border-carbon-gray-200">
                        {getCarbonPriceForYear(year)}
                      </td>
                      <td className="px-4 py-2 text-sm text-right border border-carbon-gray-200">R {amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Revenue Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-carbon-green-50 rounded-lg border border-carbon-green-200">
                <p className="text-sm text-carbon-gray-500">Client Share</p>
                <p className="text-xl font-bold text-carbon-green-600">{clientSharePercentage}%</p>
                <p className="text-xs text-carbon-gray-500 mt-1">Based on portfolio size</p>
              </div>
              <div className="p-4 bg-carbon-blue-50 rounded-lg border border-carbon-blue-200">
                <p className="text-sm text-carbon-gray-500">Agent Commission</p>
                <p className="text-xl font-bold text-carbon-blue-600">{agentCommissionPercentage}%</p>
                <p className="text-xs text-carbon-gray-500 mt-1">Based on portfolio size</p>
              </div>
              <div className="p-4 bg-carbon-gray-50 rounded-lg border border-carbon-gray-200">
                <p className="text-sm text-carbon-gray-500">Crunch Carbon Share</p>
                <p className="text-xl font-bold text-carbon-gray-900">
                  {crunchCarbonSharePercentage.toFixed(1)}%
                </p>
                <p className="text-xs text-carbon-gray-500 mt-1">Platform fee</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <Button 
          variant="outline" 
          onClick={prevStep}
          className="retro-button"
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Previous
        </Button>
        <Button 
          onClick={handleSubmitProposal}
          disabled={isSubmitting}
          className="bg-carbon-green-500 hover:bg-carbon-green-600 text-white retro-button"
        >
          {isSubmitting ? (
            <>Generating Proposal...</>
          ) : (
            <>Generate Proposal <ArrowRight className="ml-2 h-4 w-4" /></>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
