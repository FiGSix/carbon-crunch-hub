import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";

interface AddressInputModeProps {
  mode: 'search' | 'map';
  onModeChange: (mode: 'search' | 'map') => void;
}

export function AddressInputMode({ mode, onModeChange }: AddressInputModeProps) {
  return (
    <div className="flex gap-2 mb-4">
      <Button
        type="button"
        variant={mode === 'search' ? 'default' : 'outline'}
        onClick={() => onModeChange('search')}
        className="flex-1"
      >
        <Search className="w-4 h-4 mr-2" />
        Search Address
      </Button>
      <Button
        type="button"
        variant={mode === 'map' ? 'default' : 'outline'}
        onClick={() => onModeChange('map')}
        className="flex-1"
      >
        <MapPin className="w-4 h-4 mr-2" />
        Pin Drop on Map
      </Button>
    </div>
  );
}
