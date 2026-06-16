import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { ProjectPhase } from "@/types/proposals";
import { getMinimumDateString } from "@/utils/dateValidation";

interface ProjectPhasesInputProps {
  phases: ProjectPhase[];
  onChange: (phases: ProjectPhase[]) => void;
}

export function ProjectPhasesInput({ phases, onChange }: ProjectPhasesInputProps) {
  const addPhase = () => {
    const newPhase: ProjectPhase = {
      phaseNumber: phases.length + 1,
      phaseName: `Phase ${phases.length + 1}`,
      sizeKWp: 0,
      commissionDate: ""
    };
    onChange([...phases, newPhase]);
  };

  const removePhase = (index: number) => {
    const updated = phases.filter((_, i) => i !== index).map((p, i) => ({
      ...p,
      phaseNumber: i + 1,
      phaseName: p.phaseName?.replace(/Phase \d+/, `Phase ${i + 1}`)
    }));
    onChange(updated);
  };

  const updatePhase = (index: number, field: keyof ProjectPhase, value: string | number) => {
    const updated = [...phases];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const totalSize = phases.reduce((sum, p) => sum + (p.sizeKWp || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Project Phases</Label>
        <Button
          type="button"
          onClick={addPhase}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Phase
        </Button>
      </div>

      {phases.map((phase, index) => (
        <div key={index} className="p-4 border rounded-lg space-y-4 bg-card">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Phase {phase.phaseNumber}</h4>
            {phases.length > 1 && (
              <Button
                type="button"
                onClick={() => removePhase(index)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`phase-name-${index}`}>Phase Name (Optional)</Label>
              <Input
                id={`phase-name-${index}`}
                value={phase.phaseName || ""}
                onChange={(e) => updatePhase(index, "phaseName", e.target.value)}
                placeholder={`Phase ${phase.phaseNumber}`}
                className="retro-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`phase-size-${index}`}>System Size (kWp) *</Label>
              <Input
                id={`phase-size-${index}`}
                type="number"
                step="0.01"
                min="0"
                max="15000"
                value={phase.sizeKWp || ""}
                onChange={(e) => updatePhase(index, "sizeKWp", parseFloat(e.target.value) || 0)}
                className="retro-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`phase-date-${index}`}>Commission Date *</Label>
              <div className="relative">
                <Input
                  id={`phase-date-${index}`}
                  type="date"
                  value={phase.commissionDate}
                  onChange={(e) => updatePhase(index, "commissionDate", e.target.value)}
                  className="retro-input"
                  required
                  min={getMinimumDateString()}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-carbon-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="p-4 bg-muted rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total System Size:</span>
          <span className="text-lg font-bold">{parseFloat(totalSize.toFixed(3))} kWp</span>
        </div>
        {totalSize >= 15000 && (
          <p className="text-xs text-destructive mt-2">
            Total system size must be less than 15,000 kWp
          </p>
        )}
      </div>
    </div>
  );
}
