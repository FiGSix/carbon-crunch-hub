import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { queryKeys } from '@/lib/queryKeys';
import { CARBON_PRICES } from '@/lib/calculations/carbon/constants';

export type RevenueScope =
  | 'pipeline'
  | 'signed'
  | 'audit_ready'
  | 'signed_audit_ready'
  | 'all';

export interface YearlyRevenueRow {
  year: string; // 'blend' | '2025' ... '2037'
  label: string;
  price: number;
  estimated: boolean;
  tonnes: number;
  total: number;
  client: number;
  partner: number;
  superPartner: number;
  crunch: number;
}

export interface AdminRevenueYearlyTable {
  rows: YearlyRevenueRow[];
  subtotalCurrent: YearlyRevenueRow; // Blend + 2025-2030
  subtotalEstimated: YearlyRevenueRow; // 2031-2037
  grandTotal: YearlyRevenueRow;
  projectCount: number;
}

const BLEND_CUTOFF_DATE = new Date('2024-12-31T23:59:59');
const CURRENT_YEARS = ['2025', '2026', '2027', '2028', '2029', '2030'];
const ESTIMATED_YEARS = ['2031', '2032', '2033', '2034', '2035', '2036', '2037'];
const EST_ESCALATION = 1.05; // 5% p.a. beyond 2030, per agreed convention

// Estimated prices: 5% p.a. escalation on the 2030 rate
const ESTIMATED_PRICES: Record<string, number> = ESTIMATED_YEARS.reduce(
  (acc, year, i) => {
    acc[year] = Math.round(CARBON_PRICES['2030'] * Math.pow(EST_ESCALATION, i + 1));
    return acc;
  },
  {} as Record<string, number>
);

const emptyRow = (year: string, label: string, price: number, estimated: boolean): YearlyRevenueRow => ({
  year,
  label,
  price,
  estimated,
  tonnes: 0,
  total: 0,
  client: 0,
  partner: 0,
  superPartner: 0,
  crunch: 0,
});

const addInto = (target: YearlyRevenueRow, source: YearlyRevenueRow) => {
  target.tonnes += source.tonnes;
  target.total += source.total;
  target.client += source.client;
  target.partner += source.partner;
  target.superPartner += source.superPartner;
  target.crunch += source.crunch;
};

/**
 * Admin-only year-by-year revenue breakdown (Blend -> 2037) with a scope filter.
 * Reuses the same split math as useAdminVintageRevenueBreakdown:
 *   total = carbon_credits * price[year]
 *   client / partner by proposal percentages
 *   super partner by super_partner_commissions.commission_rate (0 when none)
 *   crunch = remainder
 */
export function useAdminRevenueYearlyTable(scope: RevenueScope) {
  const { user, userRole } = useAuth();

  return useQuery({
    queryKey: queryKeys.dashboard.adminRevenueYearlyTable(scope),
    queryFn: async (): Promise<AdminRevenueYearlyTable> => {
      const emptyTable: AdminRevenueYearlyTable = {
        rows: [],
        subtotalCurrent: emptyRow('subtotal-current', 'Subtotal (Blend-2030)', 0, false),
        subtotalEstimated: emptyRow('subtotal-estimated', 'Subtotal (2031-2037 est.)', 0, true),
        grandTotal: emptyRow('grand-total', 'Grand total', 0, false),
        projectCount: 0,
      };

      if (!user?.id || userRole !== 'admin') return emptyTable;

      const revenueLogger = logger.withContext({
        component: 'useAdminRevenueYearlyTable',
        feature: 'admin-revenue-yearly-table',
        userId: user.id,
      });

      // Proposals with onboarding audit flag
      const { data: proposals, error } = await supabase
        .from('proposals')
        .select(`
          id,
          carbon_credits,
          client_share_percentage,
          agent_commission_percentage,
          signed_at,
          status,
          project_onboarding(audit_ready)
        `)
        .is('deleted_at', null);

      if (error) {
        revenueLogger.error('Failed to fetch proposals for yearly revenue table', { error: error.message });
        throw error;
      }

      // Super partner commission rates per proposal
      const { data: spCommissions, error: spError } = await supabase
        .from('super_partner_commissions')
        .select('proposal_id, commission_rate');

      if (spError) {
        revenueLogger.error('Failed to fetch super partner commissions', { error: spError.message });
        throw spError;
      }

      const spRateByProposal = new Map<string, number>();
      spCommissions?.forEach((row) => {
        if (row.proposal_id && row.commission_rate != null) {
          spRateByProposal.set(row.proposal_id, Number(row.commission_rate));
        }
      });

      // Scope filtering
      const inScope = (p: any): boolean => {
        const isSigned = !!p.signed_at || p.status === 'signed';
        const onboarding = Array.isArray(p.project_onboarding)
          ? p.project_onboarding[0]
          : p.project_onboarding;
        const isAuditReady = onboarding?.audit_ready === true;

        switch (scope) {
          case 'pipeline':
            return !isSigned;
          case 'signed':
            return isSigned;
          case 'audit_ready':
            return isAuditReady;
          case 'signed_audit_ready':
            return isSigned || isAuditReady;
          case 'all':
            return true;
        }
      };

      const scoped = (proposals || []).filter(inScope);

      // Initialise rows
      const rows: YearlyRevenueRow[] = [
        emptyRow('blend', 'Blend (2022-2024)', CARBON_PRICES['2024'], false),
        ...CURRENT_YEARS.map((y) => emptyRow(y, y, CARBON_PRICES[y], false)),
        ...ESTIMATED_YEARS.map((y) => emptyRow(y, y, ESTIMATED_PRICES[y], true)),
      ];
      const rowByYear = new Map(rows.map((r) => [r.year, r]));

      scoped.forEach((p) => {
        const carbonCredits = p.carbon_credits || 0;
        const clientPct = p.client_share_percentage || 0;
        const agentPct = p.agent_commission_percentage || 0;
        const spPct = spRateByProposal.get(p.id) || 0;
        const signedAt = p.signed_at ? new Date(p.signed_at) : null;

        const applyYear = (row: YearlyRevenueRow) => {
          const total = carbonCredits * row.price;
          const client = total * (clientPct / 100);
          const partner = total * (agentPct / 100);
          const superPartner = total * (spPct / 100);
          row.tonnes += carbonCredits;
          row.total += total;
          row.client += client;
          row.partner += partner;
          row.superPartner += superPartner;
          row.crunch += total - client - partner - superPartner;
        };

        // Blend only for projects signed on/before 2024-12-31
        if (signedAt && signedAt <= BLEND_CUTOFF_DATE) {
          applyYear(rowByYear.get('blend')!);
        }
        CURRENT_YEARS.forEach((y) => applyYear(rowByYear.get(y)!));
        ESTIMATED_YEARS.forEach((y) => applyYear(rowByYear.get(y)!));
      });

      // Round everything
      const roundRow = (r: YearlyRevenueRow) => {
        r.tonnes = Math.round(r.tonnes);
        r.total = Math.round(r.total);
        r.client = Math.round(r.client);
        r.partner = Math.round(r.partner);
        r.superPartner = Math.round(r.superPartner);
        r.crunch = Math.round(r.crunch);
      };
      rows.forEach(roundRow);

      const subtotalCurrent = emptyRow('subtotal-current', 'Subtotal (Blend-2030)', 0, false);
      const subtotalEstimated = emptyRow('subtotal-estimated', 'Subtotal (2031-2037 est.)', 0, true);
      const grandTotal = emptyRow('grand-total', 'Grand total', 0, false);

      rows.forEach((r) => {
        if (r.year === 'blend' || CURRENT_YEARS.includes(r.year)) addInto(subtotalCurrent, r);
        if (ESTIMATED_YEARS.includes(r.year)) addInto(subtotalEstimated, r);
      });
      addInto(grandTotal, subtotalCurrent);
      addInto(grandTotal, subtotalEstimated);

      revenueLogger.info('Yearly revenue table calculated', {
        scope,
        projectCount: scoped.length,
      });

      return {
        rows,
        subtotalCurrent,
        subtotalEstimated,
        grandTotal,
        projectCount: scoped.length,
      };
    },
    enabled: !!user?.id && userRole === 'admin',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
