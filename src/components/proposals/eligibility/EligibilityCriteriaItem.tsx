
import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface EligibilityCriteriaItemProps {
  id: keyof EligibilityCriteria;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

// Import the type just to use in the interface
import { EligibilityCriteria } from "@/types/proposals";

export function EligibilityCriteriaItem({
  id,
  title,
  description,
  checked,
  onCheckedChange,
}: EligibilityCriteriaItemProps) {
  return (
    <div className="flex items-start space-x-3">
      <Checkbox 
        id={id} 
        checked={checked}
        onCheckedChange={() => onCheckedChange(!checked)}
      />
      <div className="space-y-1">
        <Label 
          htmlFor={id} 
          className="font-medium text-carbon-gray-900"
        >
          {title}
        </Label>
        <p className="text-sm text-carbon-gray-500">
          {description}
        </p>
      </div>
    </div>
  );
}
