import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVintageAuditStatus, auditStages, type VintageYear } from '@/hooks/audit/useVintageAuditStatus';
import { useVintageProgressNotes } from '@/hooks/audit/useVintageProgressNotes';
import { Progress } from '@/components/ui/progress';

const vintageYears: { value: VintageYear; label: string }[] = [
  { value: 'blend', label: 'Blend' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028', label: '2028' },
  { value: '2029', label: '2029' },
  { value: '2030', label: '2030' },
];

export function VintageProgressDisplayCard() {
  const [selectedVintage, setSelectedVintage] = useState<VintageYear>('blend');
  const { statusData } = useVintageAuditStatus(selectedVintage);
  const { notes } = useVintageProgressNotes(selectedVintage);

  // Calculate completion percentage based on completed stages
  const completionPercentage = auditStages.reduce((total, stage) => {
    if (statusData[stage.id] === 'completed') {
      return total + stage.weight;
    }
    return total;
  }, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          Vintage Progress:
          <Select value={selectedVintage} onValueChange={(v) => setSelectedVintage(v as VintageYear)}>
            <SelectTrigger className="w-[100px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {vintageYears.map((year) => (
                <SelectItem key={year.value} value={year.value}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Prominent percentage display */}
          <div className="text-center">
            <div className="text-5xl font-bold text-primary mb-2">
              {completionPercentage}%
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          {/* Progress notes */}
          {notes && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {notes}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
