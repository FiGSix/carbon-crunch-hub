import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Mail, Clock, CheckCircle2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { AgentCounts } from './types';
import { StatusKey } from './statusBadge';
import { cn } from '@/lib/utils';

interface Props {
  activeFilter: StatusKey;
  onSelect: (key: StatusKey) => void;
}

const CARDS: {
  key: Exclude<StatusKey, 'inactive' | 'suspended' | 'all'> | 'all';
  label: string;
  countKey: keyof AgentCounts;
  icon: typeof Users;
  accent: string;
  activeAccent: string;
}[] = [
  {
    key: 'all',
    label: 'Total Partners',
    countKey: 'total',
    icon: Users,
    accent: 'text-muted-foreground',
    activeAccent: 'ring-2 ring-primary',
  },
  {
    key: 'invited',
    label: 'Invited',
    countKey: 'invited',
    icon: Mail,
    accent: 'text-amber-600',
    activeAccent: 'ring-2 ring-amber-500',
  },
  {
    key: 'pending_approval',
    label: 'Pending',
    countKey: 'pending_approval',
    icon: Clock,
    accent: 'text-amber-600',
    activeAccent: 'ring-2 ring-amber-500',
  },
  {
    key: 'active',
    label: 'Active',
    countKey: 'active',
    icon: CheckCircle2,
    accent: 'text-green-600',
    activeAccent: 'ring-2 ring-green-500',
  },
];

export function PartnerStatsCards({ activeFilter, onSelect }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.agents.management.all, 'counts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_agents_management_counts');
      if (error) throw error;
      const row = (data as any[])?.[0];
      return (row ?? { invited: 0, pending_approval: 0, active: 0, total: 0 }) as AgentCounts;
    },
  });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {CARDS.map(({ key, label, countKey, icon: Icon, accent, activeAccent }) => {
        const isActive = activeFilter === key;
        const count = data ? Number(data[countKey] ?? 0) : null;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-pressed={isActive}
            className="text-left"
          >
            <Card
              className={cn(
                'p-4 hover:shadow-md transition-all cursor-pointer',
                isActive && activeAccent,
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {label}
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {isLoading || count === null ? '—' : count.toLocaleString()}
                  </p>
                </div>
                <Icon className={cn('h-6 w-6', accent)} />
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
