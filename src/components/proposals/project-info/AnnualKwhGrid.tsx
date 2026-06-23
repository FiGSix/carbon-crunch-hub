import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AnnualKwhByYear, GENERATION_YEARS } from "@/types/proposals";

interface AnnualKwhGridProps {
  value: AnnualKwhByYear | undefined;
  onChange: (next: AnnualKwhByYear) => void;
  idPrefix?: string;
  compact?: boolean;
}

/** Sanity cap: 50 GWh / year per project or phase. */
const MAX_KWH_PER_YEAR = 50_000_000;

export function AnnualKwhGrid({ value, onChange, idPrefix = "annual-kwh", compact }: AnnualKwhGridProps) {
  const current = value || {};

  const handleChange = (year: string, raw: string) => {
    const parsed = raw === "" ? undefined : Math.min(MAX_KWH_PER_YEAR, Math.max(0, Number(raw) || 0));
    onChange({ ...current, [year]: parsed });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-sm font-semibold">Estimated Annual Generation (kWh)</Label>
        <p className="text-xs text-muted-foreground">
          Enter the estimated kWh produced by the system for each vintage year. Values are used as
          entered — no pro-rating is applied.
        </p>
      </div>
      <div className={`grid gap-3 ${compact ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-3"}`}>
        {GENERATION_YEARS.map((year) => (
          <div key={year} className="space-y-1">
            <Label htmlFor={`${idPrefix}-${year}`} className="text-xs">{year}</Label>
            <Input
              id={`${idPrefix}-${year}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_KWH_PER_YEAR}
              step={1}
              placeholder="0"
              value={current[year as keyof AnnualKwhByYear] ?? ""}
              onChange={(e) => handleChange(year, e.target.value)}
              className="retro-input"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
