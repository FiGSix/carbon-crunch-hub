import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormError } from "@/components/ui/form-error";
import { cn } from "@/lib/utils";

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
  onBlur?: (index: number, field: keyof InverterDetail) => void;
  showLabels?: boolean;
  errors?: Record<string, string>;
}

export function InverterDetailsRow({ 
  index, 
  inverter, 
  onChange, 
  onBlur,
  showLabels = true,
  errors = {}
}: InverterDetailsRowProps) {
  const getFieldError = (field: string) => errors[`inverter_${index}_${field}`];
  
  const handleBlur = (field: keyof InverterDetail) => {
    if (onBlur) {
      onBlur(index, field);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
      <div className="text-sm font-medium text-muted-foreground">Inverter {index + 1}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          {showLabels && (
            <Label className="text-xs">
              Brand <span className="text-destructive">*</span>
            </Label>
          )}
          <Select
            value={inverter.brand || ''}
            onValueChange={(value) => {
              onChange(index, 'brand', value);
            }}
          >
            <SelectTrigger 
              className={cn(getFieldError('brand') && "border-destructive")}
              onBlur={() => handleBlur('brand')}
            >
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {INVERTER_BRANDS.map((brand) => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormError message={getFieldError('brand')} />
        </div>

        <div className="space-y-1.5">
          {showLabels && (
            <Label className="text-xs">
              Model <span className="text-destructive">*</span>
            </Label>
          )}
          <Input
            value={inverter.model || ''}
            onChange={(e) => onChange(index, 'model', e.target.value)}
            onBlur={() => handleBlur('model')}
            placeholder="Model name"
            className={cn(getFieldError('model') && "border-destructive")}
          />
          <FormError message={getFieldError('model')} />
        </div>

        <div className="space-y-1.5">
          {showLabels && (
            <Label className="text-xs">
              Capacity (kW) <span className="text-destructive">*</span>
            </Label>
          )}
          <Input
            type="number"
            step="0.01"
            value={inverter.capacity_kw ?? ''}
            onChange={(e) => onChange(index, 'capacity_kw', e.target.value ? parseFloat(e.target.value) : null)}
            onBlur={() => handleBlur('capacity_kw')}
            placeholder="kW"
            className={cn(getFieldError('capacity_kw') && "border-destructive")}
          />
          <FormError message={getFieldError('capacity_kw')} />
        </div>

        <div className="space-y-1.5">
          {showLabels && (
            <Label className="text-xs">
              Serial Number <span className="text-destructive">*</span>
            </Label>
          )}
          <Input
            value={inverter.serial || ''}
            onChange={(e) => onChange(index, 'serial', e.target.value)}
            onBlur={() => handleBlur('serial')}
            placeholder="Serial number"
            className={cn(getFieldError('serial') && "border-destructive")}
          />
          <FormError message={getFieldError('serial')} />
        </div>
      </div>
    </div>
  );
}
