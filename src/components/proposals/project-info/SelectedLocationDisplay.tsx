import { MapPin, CheckCircle2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SelectedLocationDisplayProps {
  address: string;
  gpsLat?: number;
  gpsLng?: number;
  addressSource?: 'autocomplete' | 'pin_drop' | 'manual';
  onEdit: () => void;
}

export function SelectedLocationDisplay({
  address,
  gpsLat,
  gpsLng,
  addressSource,
  onEdit
}: SelectedLocationDisplayProps) {
  const isPinDropped = addressSource === 'pin_drop';
  
  return (
    <div className="p-4 border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900/50 rounded-lg space-y-3 animate-in fade-in-50 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-0.5 p-2 rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-foreground">Location Selected</h4>
              <Badge variant="outline" className="text-xs">
                {isPinDropped ? (
                  <><MapPin className="h-3 w-3 mr-1" />Pin-dropped location</>
                ) : (
                  <>🔍 Searched address</>
                )}
              </Badge>
            </div>
            
            <p className="text-sm text-foreground font-medium">{address}</p>
            
            {gpsLat && gpsLng && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>GPS: {gpsLat.toFixed(6)}, {gpsLng.toFixed(6)}</span>
              </div>
            )}
          </div>
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          className="shrink-0"
        >
          <Edit2 className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </div>
    </div>
  );
}
