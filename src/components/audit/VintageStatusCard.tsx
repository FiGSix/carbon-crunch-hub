import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVintageAuditStatus, auditStages, type VintageYear, type StageStatus } from '@/hooks/audit/useVintageAuditStatus';

const vintageYears: { value: VintageYear; label: string }[] = [
  { value: 'blend', label: 'Blend' },
  { value: '2025', label: '2025' },
  { value: '2026', label: '2026' },
  { value: '2027', label: '2027' },
  { value: '2028', label: '2028' },
  { value: '2029', label: '2029' },
  { value: '2030', label: '2030' },
];

export function VintageStatusCard() {
  const [selectedVintage, setSelectedVintage] = useState<VintageYear>('blend');
  const { statusData, updateStatus } = useVintageAuditStatus(selectedVintage);

  const handleStatusChange = (stageId: string, status: StageStatus) => {
    updateStatus({ stageId, status });
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Vintage Status:
          <Select value={selectedVintage} onValueChange={(v) => setSelectedVintage(v as VintageYear)}>
            <SelectTrigger className="w-[120px] h-8">
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
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-3 font-medium text-sm text-muted-foreground w-20">
                  Weight
                </th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground">
                  Stage
                </th>
                <th className="text-left p-3 font-medium text-sm text-muted-foreground w-48">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {auditStages.map((stage, index) => (
                <tr
                  key={stage.id}
                  className={index !== auditStages.length - 1 ? 'border-b border-border' : ''}
                >
                  <td className="p-3 font-medium text-foreground">
                    {stage.weight}%
                  </td>
                  <td className="p-3 text-foreground">
                    {stage.name}
                  </td>
                  <td className="p-3">
                    <Select
                      value={statusData[stage.id] || 'pending'}
                      onValueChange={(value) => handleStatusChange(stage.id, value as StageStatus)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
