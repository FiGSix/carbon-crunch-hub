import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type StageStatus = 'pending' | 'in_progress' | 'completed';
export type VintageYear = 'blend' | '2025' | '2026' | '2027' | '2028' | '2029' | '2030';

export interface AuditStage {
  id: string;
  weight: number;
  name: string;
}

export const auditStages: AuditStage[] = [
  { id: 'project_onboarding', weight: 20, name: 'Project Onboarding' },
  { id: 'energy_data_analysis', weight: 20, name: 'Energy Data Analysis' },
  { id: 'independent_external_audit', weight: 30, name: 'Independent External Audit' },
  { id: 'verra_audit', weight: 15, name: 'Verra Audit' },
  { id: 'vcu_issue', weight: 5, name: 'Issue Carbon Credits' },
  { id: 'vcu_sale', weight: 5, name: 'Sale of Carbon Credit' },
  { id: 'payments', weight: 5, name: 'Payments' },
];

interface VintageAuditStatusRecord {
  id: string;
  vintage_year: string;
  stage_id: string;
  status: StageStatus;
  updated_at: string;
  updated_by: string | null;
}

export function useVintageAuditStatus(vintageYear: VintageYear) {
  const queryClient = useQueryClient();

  const { data: statusData = {}, isLoading } = useQuery({
    queryKey: ['vintage-audit-status', vintageYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vintage_audit_status')
        .select('*')
        .eq('vintage_year', vintageYear);

      if (error) throw error;

      // Convert array to object keyed by stage_id
      const statusMap: Record<string, StageStatus> = {};
      data?.forEach((record: VintageAuditStatusRecord) => {
        statusMap[record.stage_id] = record.status;
      });

      // Fill in missing stages with 'pending'
      auditStages.forEach(stage => {
        if (!statusMap[stage.id]) {
          statusMap[stage.id] = 'pending';
        }
      });

      return statusMap;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ stageId, status }: { stageId: string; status: StageStatus }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('vintage_audit_status')
        .upsert({
          vintage_year: vintageYear,
          stage_id: stageId,
          status,
          updated_by: userData.user?.id,
        }, {
          onConflict: 'vintage_year,stage_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vintage-audit-status', vintageYear] });
      toast.success('Status updated');
    },
    onError: (error) => {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    },
  });

  return {
    statusData,
    isLoading,
    updateStatus: updateStatus.mutate,
  };
}
