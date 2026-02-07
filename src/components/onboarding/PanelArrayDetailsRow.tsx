import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormError } from "@/components/ui/form-error";
import { cn } from "@/lib/utils";

export interface PanelArrayDetail {
  brand: string;
  size_wp: number | null;
  quantity: number | null;
  total_kwp: number | null;
}

const PANEL_BRANDS = [
  "JA Solar",
  "Jinko Solar",
  "Longi Solar",
  "Canadian Solar",
  "Trina Solar",
  "Q Cells",
  "REC Solar",
  "Sunpower",
  "Other"
];

interface PanelArrayDetailsRowProps {
  index: number;
  panel: PanelArrayDetail;
  onChange: (index: number, field: keyof PanelArrayDetail, value: string | number | null) => void;
  onBlur?: (index: number, field: keyof PanelArrayDetail) => void;
  showLabels?: boolean;
  errors?: Record<string, string>;
}

export function PanelArrayDetailsRow({ 
  index, 
  panel, 
  onChange, 
  onBlur,
  showLabels = true,
  errors = {}
}: PanelArrayDetailsRowProps) {
  const getFieldError = (field: string) => errors[`panel_${index}_${field}`];
  
  const handleBlur = (field: keyof PanelArrayDetail) => {
    if (onBlur) {
      onBlur(index, field);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
      <div className="text-sm font-medium text-muted-foreground">Array {index + 1}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          {showLabels && (
            <Label className="text-xs">
              Panel Brand <span className="text-destructive">*</span>
            </Label>
          )}
          <Select
            value={panel.brand || ''}
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
              {PANEL_BRANDS.map((brand) => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormError message={getFieldError('brand')} />
        </div>

        <div className="space-y-1.5">
          {showLabels && (
            <Label className="text-xs">
              Size (Wp) <span className="text-destructive">*</span>
            </Label>
          )}
          <Input
            type="number"
            step="1"
            value={panel.size_wp ?? ''}
            onChange={(e) => onChange(index, 'size_wp', e.target.value ? parseFloat(e.target.value) : null)}
            onBlur={() => handleBlur('size_wp')}
            placeholder="550"
            className={cn(getFieldError('size_wp') && "border-destructive")}
          />
          <FormError message={getFieldError('size_wp')} />
        </div>

        <div className="space-y-1.5">
          {showLabels && (
            <Label className="text-xs">
              Number of Panels <span className="text-destructive">*</span>
            </Label>
          )}
          <Input
            type="number"
            step="1"
            value={panel.quantity ?? ''}
            onChange={(e) => onChange(index, 'quantity', e.target.value ? parseInt(e.target.value) : null)}
            onBlur={() => handleBlur('quantity')}
            placeholder="100"
            className={cn(getFieldError('quantity') && "border-destructive")}
          />
          <FormError message={getFieldError('quantity')} />
        </div>

        <div className="space-y-1.5">
          {showLabels && <Label className="text-xs">Total kWp</Label>}
          <Input
            type="number"
            step="0.01"
            value={panel.total_kwp ?? ''}
            readOnly
            className="bg-muted/50 cursor-not-allowed"
            placeholder="Auto-calculated"
          />
        </div>
      </div>
    </div>
  );
}
