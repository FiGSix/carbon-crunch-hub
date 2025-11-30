import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StageStatus = 'pending' | 'in_progress' | 'completed';

interface AuditStage {
  id: string;
  weight: number;
  name: string;
}

const auditStages: AuditStage[] = [
  { id: 'project_onboarding', weight: 20, name: 'Project Onboarding' },
  { id: 'energy_data_analysis', weight: 20, name: 'Energy Data Analysis' },
  { id: 'independent_external_audit', weight: 30, name: 'Independent External Audit' },
  { id: 'verra_audit', weight: 15, name: 'Verra Audit' },
  { id: 'vcu_issue', weight: 5, name: 'VCU or Carbon Credit Issue' },
  { id: 'vcu_sale', weight: 5, name: 'Sale of VCU or Carbon Credit' },
  { id: 'payments', weight: 5, name: 'Payments' },
];

export function VintageStatusCard() {
  const [stageStatuses, setStageStatuses] = useState<Record<string, StageStatus>>(
    auditStages.reduce((acc, stage) => ({ ...acc, [stage.id]: 'pending' }), {})
  );

  const handleStatusChange = (stageId: string, status: StageStatus) => {
    setStageStatuses(prev => ({ ...prev, [stageId]: status }));
  };

  const getStatusLabel = (status: StageStatus): string => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return 'Pending';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vintage Status: Blend</CardTitle>
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
                      value={stageStatuses[stage.id]}
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
