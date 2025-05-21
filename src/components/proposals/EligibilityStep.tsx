
import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, CheckCircle2, CircleX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EligibilityCriteria } from "@/types/proposals";

interface EligibilityStepProps {
  eligibility: EligibilityCriteria;
  toggleEligibility: (field: keyof EligibilityCriteria) => void;
  isEligible: boolean;
  nextStep: () => void;
}

export function EligibilityStep({ 
  eligibility, 
  toggleEligibility, 
  isEligible, 
  nextStep 
}: EligibilityStepProps) {
  const navigate = useNavigate();

  // New function to confirm all eligibility criteria at once
  const confirmAllCriteria = () => {
    Object.keys(eligibility).forEach((key) => {
      if (!eligibility[key as keyof EligibilityCriteria]) {
        toggleEligibility(key as keyof EligibilityCriteria);
      }
    });
  };

  return (
    <Card className="retro-card">
      <CardHeader>
        <CardTitle>Eligibility Check</CardTitle>
        <CardDescription>
          Verify that the project meets all eligibility criteria for carbon credits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 mb-4 rounded-lg bg-carbon-gray-50 border border-carbon-gray-200">
          <Button 
            variant="secondary" 
            className="w-full" 
            onClick={confirmAllCriteria}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Confirm All Eligibility Criteria
          </Button>
          <p className="text-sm text-carbon-gray-500 mt-2">
            By confirming all criteria, you attest that this project meets all the eligibility requirements listed below.
          </p>
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox 
            id="inSouthAfrica" 
            checked={eligibility.inSouthAfrica}
            onCheckedChange={() => toggleEligibility("inSouthAfrica")}
          />
          <div className="space-y-1">
            <Label 
              htmlFor="inSouthAfrica" 
              className="font-medium text-carbon-gray-900"
            >
              The project is located in South Africa
            </Label>
            <p className="text-sm text-carbon-gray-500">
              The renewable energy system must be physically located within South Africa.
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <Checkbox 
            id="notRegistered" 
            checked={eligibility.notRegistered}
            onCheckedChange={() => toggleEligibility("notRegistered")}
          />
          <div className="space-y-1">
            <Label 
              htmlFor="notRegistered" 
              className="font-medium text-carbon-gray-900"
            >
              Not registered in another GHG program
            </Label>
            <p className="text-sm text-carbon-gray-500">
              The project is not currently registered under any other greenhouse gas reduction program.
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <Checkbox 
            id="under15MWp" 
            checked={eligibility.under15MWp}
            onCheckedChange={() => toggleEligibility("under15MWp")}
          />
          <div className="space-y-1">
            <Label 
              htmlFor="under15MWp" 
              className="font-medium text-carbon-gray-900"
            >
              The system is under 15 MWp in capacity
            </Label>
            <p className="text-sm text-carbon-gray-500">
              The total capacity of the renewable energy system must be less than 15 MWp.
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <Checkbox 
            id="commissionedAfter2022" 
            checked={eligibility.commissionedAfter2022}
            onCheckedChange={() => toggleEligibility("commissionedAfter2022")}
          />
          <div className="space-y-1">
            <Label 
              htmlFor="commissionedAfter2022" 
              className="font-medium text-carbon-gray-900"
            >
              Commissioned on or after September 15, 2022
            </Label>
            <p className="text-sm text-carbon-gray-500">
              The system must have been commissioned (put into operation) on or after September 15, 2022.
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <Checkbox 
            id="legalOwnership" 
            checked={eligibility.legalOwnership}
            onCheckedChange={() => toggleEligibility("legalOwnership")}
          />
          <div className="space-y-1">
            <Label 
              htmlFor="legalOwnership" 
              className="font-medium text-carbon-gray-900"
            >
              Legal ownership of system or green attributes
            </Label>
            <p className="text-sm text-carbon-gray-500">
              The client must have legal ownership of either the renewable energy system or its green attributes.
            </p>
          </div>
        </div>
        
        <div className="mt-6 p-4 rounded-lg bg-carbon-gray-50 border border-carbon-gray-200">
          <div className="flex items-start">
            <div className="mr-3">
              {isEligible ? 
                <CheckCircle2 className="h-6 w-6 text-carbon-green-500" /> : 
                <CircleX className="h-6 w-6 text-destructive" />
              }
            </div>
            <div>
              <h3 className="font-medium text-carbon-gray-900">
                {isEligible ? 
                  "Project is eligible for carbon credits" : 
                  "Project does not meet all eligibility criteria"
                }
              </h3>
              <p className="text-sm text-carbon-gray-600 mt-1">
                {isEligible ? 
                  "This project meets all the requirements to generate carbon credits through CrunchCarbon." : 
                  "Please ensure all eligibility criteria are met before proceeding."
                }
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-6">
        <Button 
          variant="outline" 
          onClick={() => navigate("/proposals")}
          className="retro-button"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Cancel
        </Button>
        <Button 
          onClick={nextStep} 
          disabled={!isEligible}
          className="retro-button"
        >
          Next Step <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
