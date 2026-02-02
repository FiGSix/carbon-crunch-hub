import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  showLabels?: boolean;
}

export function PanelArrayDetailsRow({ index, panel, onChange, showLabels = true }: PanelArrayDetailsRowProps) {
  return (
    <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
      <div className="text-sm font-medium text-muted-foreground">Array {index + 1}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1.5">
          {showLabels && <Label className="text-xs">Panel Brand</Label>}
          <Select
            value={panel.brand || ''}
            onValueChange={(value) => onChange(index, 'brand', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {PANEL_BRANDS.map((brand) => (
                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          {showLabels && <Label className="text-xs">Size (Wp)</Label>}
          <Input
            type="number"
            step="1"
            value={panel.size_wp ?? ''}
            onChange={(e) => onChange(index, 'size_wp', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="550"
          />
        </div>

        <div className="space-y-1.5">
          {showLabels && <Label className="text-xs">Number of Panels</Label>}
          <Input
            type="number"
            step="1"
            value={panel.quantity ?? ''}
            onChange={(e) => onChange(index, 'quantity', e.target.value ? parseInt(e.target.value) : null)}
            placeholder="100"
          />
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
