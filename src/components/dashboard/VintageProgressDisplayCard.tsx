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

  // Calculate completion percentage based on stage status
  // - Completed stages: 100% of weight
  // - In Progress stages: 30% of weight
  // - Pending stages: 0%
  const completionPercentage = auditStages.reduce((total, stage) => {
    const status = statusData[stage.id];
    if (status === 'completed') {
      return total + stage.weight;
    } else if (status === 'in_progress') {
      return total + (stage.weight * 0.3);
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
          <div className="text-center mb-4">
            <div className="text-5xl font-bold text-primary">
              {completionPercentage}%
            </div>
          </div>

          {/* Stage pills */}
          <div className="space-y-2">
            {auditStages.map((stage) => {
              const status = statusData[stage.id];
              const bgColor = 
                status === 'completed' ? '#8ED973' : 
                status === 'in_progress' ? '#FFCD03' : 
                '#FF581D';
              const statusText = 
                status === 'completed' ? 'Completed' : 
                status === 'in_progress' ? 'In Progress' : 
                'Pending';

              return (
                <div
                  key={stage.id}
                  className="flex items-center justify-between px-4 py-2 rounded-full"
                  style={{ backgroundColor: bgColor }}
                >
                  <span className="text-sm font-medium text-gray-900">{stage.name}</span>
                  <span className="text-sm font-semibold text-gray-900">{statusText}</span>
                </div>
              );
            })}
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
