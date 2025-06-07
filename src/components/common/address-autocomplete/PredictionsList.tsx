
import React from "react";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { MapPin } from "lucide-react";

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface PredictionsListProps {
  predictions: Prediction[];
  onSelectPrediction: (prediction: Prediction) => void;
  isOpen: boolean;
}

export function PredictionsList({ predictions, onSelectPrediction, isOpen }: PredictionsListProps) {
  if (!isOpen || predictions.length === 0) {
    return null;
  }

  return (
    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
      <Command>
        <CommandList>
          <CommandGroup>
            {predictions.map((prediction, index) => (
              <CommandItem
                key={`${prediction.place_id}-${index}`}
                value={prediction.description}
                onSelect={() => onSelectPrediction(prediction)}
                className="cursor-pointer hover:bg-accent"
              >
                <div className="flex items-center space-x-2 w-full">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm">
                      {prediction.structured_formatting?.main_text || prediction.description}
                    </p>
                    {prediction.structured_formatting?.secondary_text && (
                      <p className="truncate text-xs text-muted-foreground">
                        {prediction.structured_formatting.secondary_text}
                      </p>
                    )}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}
