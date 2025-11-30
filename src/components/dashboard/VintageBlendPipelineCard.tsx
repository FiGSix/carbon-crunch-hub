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

const vintageYears: { value: VintageYear; label: string }[] = [
  { value: 'blend', label: 'Blend' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028', label: '2028' },
  { value: '2029', label: '2029' },
  { value: '2030', label: '2030' },
];

export function VintageBlendPipelineCard() {
  const [selectedVintage, setSelectedVintage] = useState<VintageYear>('blend');
  const { statusData } = useVintageAuditStatus(selectedVintage);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          Vintage Status:
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
      <CardContent className="pt-6">
        <div className="space-y-3">
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
              <div key={stage.id} className="flex items-center gap-3">
                <div
                  className="px-4 py-2 rounded-full"
                  style={{ backgroundColor: bgColor }}
                >
                  <span className="text-sm font-medium text-white">{stage.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{statusText}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
