import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface InverterDetail {
  brand: string;
  model: string;
  capacity_kw: number | null;
  serial: string;
}

const INVERTER_BRANDS = [
  "ABB", "Afore", "Alpha ESS", "Ario", "Atess", "Deye", "Dyness", 
  "Enphase", "FoxESS", "Fronius", "GivEnergy", "GoodWe", "Growatt", 
  "Huawei", "Lux", "Megarevo", "SigEnergy", "Sineng", "SMA", "Solis", 
  "SolarEdge", "Sungrow", "SunSynk", "Victron", "Other"
];

interface InverterDetailsRowProps {
  index: number;
  inverter: InverterDetail;
  onChange: (index: number, field: keyof InverterDetail, value: string | number | null) => void;
  showLabels?: boolean;
}

export function InverterDetailsRow({ index, inverter, onChange, showLabels = true }: InverterDetailsRowProps) {
  return (
    <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
      <div className="text-sm font-medium text-muted-foreground">Inverter {index + 1}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          {showLabels && <Label className="text-xs">Brand</Label>}
          <Select
            value={inverter.brand || ''}
            onValueChange={(value) => onChange(index, 'brand', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {INVERTER_BRANDS.map((brand) => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          {showLabels && <Label className="text-xs">Model</Label>}
          <Input
            value={inverter.model || ''}
            onChange={(e) => onChange(index, 'model', e.target.value)}
            placeholder="Model name"
          />
        </div>

        <div className="space-y-1.5">
          {showLabels && <Label className="text-xs">Capacity (kW)</Label>}
          <Input
            type="number"
            step="0.01"
            value={inverter.capacity_kw ?? ''}
            onChange={(e) => onChange(index, 'capacity_kw', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="kW"
          />
        </div>

        <div className="space-y-1.5">
          {showLabels && <Label className="text-xs">Serial Number</Label>}
          <Input
            value={inverter.serial || ''}
            onChange={(e) => onChange(index, 'serial', e.target.value)}
            placeholder="Serial number"
          />
        </div>
      </div>
    </div>
  );
}
